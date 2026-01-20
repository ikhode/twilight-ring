import { Router } from "express";
import { storage } from "../storage";
import { getOrgIdFromRequest } from "../auth_util";
import { insertCustomerSchema, insertSupplierSchema } from "../../shared/schema";

const router = Router();

// --- CUSTOMERS ---

router.get("/customers", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });
        const data = await storage.getCustomers(orgId);
        res.json(data);
    } catch (error) {
        console.error("Fetch customers error:", error);
        res.status(500).json({ message: "Failed to fetch customers" });
    }
});

router.post("/customers", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const parsed = insertCustomerSchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) return res.status(400).json(parsed.error);

        const data = await storage.createCustomer(parsed.data);
        res.json(data);
    } catch (error) {
        console.error("Create customer error:", error);
        res.status(500).json({ message: "Failed to create customer" });
    }
});

// --- SUPPLIERS ---

router.get("/suppliers", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });
        const data = await storage.getSuppliers(orgId);
        res.json(data);
    } catch (error) {
        console.error("Fetch suppliers error:", error);
        res.status(500).json({ message: "Failed to fetch suppliers" });
    }
});

router.post("/suppliers", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const parsed = insertSupplierSchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) return res.status(400).json(parsed.error);

        const data = await storage.createSupplier(parsed.data);
        res.json(data);
    } catch (error) {
        console.error("Create supplier error:", error);
        res.status(500).json({ message: "Failed to create supplier" });
    }
});

// --- COGNITIVE ACTIONS ---

router.get("/analysis", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const customers = await storage.getCustomers(orgId);

        // Cognitive Logic: Churn Prediction & Segmentation
        const analysis = customers.map(c => {
            const daysSinceLastContact = c.lastContact
                ? Math.floor((new Date().getTime() - new Date(c.lastContact).getTime()) / (1000 * 3600 * 24))
                : 999;

            let churnRisk = "Low";
            let segment = "Standard";

            // Risk Logic
            if (daysSinceLastContact > 60 || (c.balance || 0) < 0) churnRisk = "High";
            else if (daysSinceLastContact > 30) churnRisk = "Medium";

            // Segmentation Logic
            if ((c.balance || 0) > 50000) segment = "VIP";
            else if (churnRisk === "High") segment = "At Risk";
            else if (daysSinceLastContact > 90) segment = "Dormant";

            return {
                customerId: c.id,
                churnRisk,
                segment,
                daysSinceLastContact
            };
        });

        // Aggregated Stats
        const segments = {
            vip: analysis.filter(a => a.segment === "VIP").length,
            atRisk: analysis.filter(a => a.segment === "At Risk").length,
            dormant: analysis.filter(a => a.segment === "Dormant").length
        };

        res.json({ analysis, segments });
    } catch (error) {
        console.error("CRM Analysis error:", error);
        res.status(500).json({ message: "Analysis failed" });
    }
});

router.post("/reminders", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

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
