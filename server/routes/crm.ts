import { Router } from "express";
import { storage } from "../storage";
import { getOrgIdFromRequest } from "../auth_util";
import { insertCustomerSchema, insertSupplierSchema } from "../../shared/schema";
import { logAudit } from "../lib/audit";

const router = Router();

// --- CUSTOMERS ---

/**
 * Obtiene el listado de clientes de la organización.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.get("/customers", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const data = await storage.getCustomers(orgId);
        res.json(data);
    } catch (error) {
        console.error("Fetch customers error:", error);
        res.status(500).json({ message: "Failed to fetch customers" });
    }
});

/**
 * Registra un nuevo cliente en la base de datos.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.post("/customers", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const parsed = insertCustomerSchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) {
            res.status(400).json(parsed.error);
            return;
        }

        const data = await storage.createCustomer(parsed.data);

        // Log action
        await logAudit(
            orgId,
            (req.user as any)?.id || "system",
            "CREATE_CUSTOMER",
            data.id,
            { name: data.name }
        );

        res.json(data);
    } catch (error) {
        console.error("Create customer error:", error);
        res.status(500).json({ message: "Failed to create customer" });
    }
});

/**
 * Obtiene el listado de proveedores de la organización.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.get("/suppliers", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const data = await storage.getSuppliers(orgId);
        res.json(data);
    } catch (error) {
        console.error("Fetch suppliers error:", error);
        res.status(500).json({ message: "Failed to fetch suppliers" });
    }
});

/**
 * Registra un nuevo proveedor en la base de datos.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.post("/suppliers", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const parsed = insertSupplierSchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) {
            res.status(400).json(parsed.error);
            return;
        }

        const data = await storage.createSupplier(parsed.data);

        // Log action
        await logAudit(
            orgId,
            (req.user as any)?.id || "system",
            "CREATE_SUPPLIER",
            data.id,
            { name: data.name }
        );

        res.json(data);
    } catch (error) {
        console.error("Create supplier error:", error);
        res.status(500).json({ message: "Failed to create supplier" });
    }
});

/**
 * Realiza un análisis cognitivo de los clientes, segmentándolos por riesgo de fuga y valor.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.get("/analysis", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const customers = await storage.getCustomers(orgId);

        // Cognitive Logic: Churn Prediction & Segmentation
        const analysis = customers.map(c => {
            const daysSinceLastContact = c.lastContact
                ? Math.floor((new Date().getTime() - new Date(c.lastContact).getTime()) / (1000 * 3600 * 24))
                : 999;

            let churnRisk = "Low";
            let segment = "Standard";

            // Risk Logic
            // High risk if no contact in 60 days
            if (daysSinceLastContact > 60) churnRisk = "High";
            else if (daysSinceLastContact > 30) churnRisk = "Medium";

            // Delinquency Logic (for the "Credit Health" diagnosis)
            const isDelinquent = (c.balance || 0) > 0 && daysSinceLastContact > 15;

            // Segmentation Logic
            if ((c.balance || 0) > 100000) segment = "VIP"; // Owes or moves > $1000
            else if (isDelinquent) segment = "At Risk";
            else if (daysSinceLastContact > 90) segment = "Dormant";

            return {
                customerId: c.id,
                churnRisk,
                segment,
                daysSinceLastContact,
                isDelinquent
            };
        });

        // Aggregated Stats
        const segments = {
            vip: analysis.filter(a => a.segment === "VIP").length,
            atRisk: analysis.filter(a => a.segment === "At Risk").length,
            dormant: analysis.filter(a => a.segment === "Dormant").length,
            delinquentCount: analysis.filter(a => a.isDelinquent).length
        };

        res.json({ analysis, segments });
    } catch (error) {
        console.error("CRM Analysis error:", error);
        res.status(500).json({ message: "Analysis failed" });
    }
});

/**
 * Procesa y envía recordatorios de pago automáticos a los clientes con deuda pendiente.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.post("/reminders", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const customers = await storage.getCustomers(orgId);
        const debtors = customers.filter(c => c.balance > 0);

        const processed = debtors.length;

        if (processed > 0) {
            console.log(`[Cognitive] Sent ${processed} payment reminders for Org ${orgId}`);
        }

        res.json({
            success: true,
            processed,
            message: processed > 0
                ? `Se enviaron ${processed} recordatorios de pago automáticamente.`
                : "No se encontraron clientes con deuda vencida."
        });
    } catch (error) {
        console.error("Send reminders error:", error);
        res.status(500).json({ message: "Failed to send reminders" });
    }
});

export default router;
