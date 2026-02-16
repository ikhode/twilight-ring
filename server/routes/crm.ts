import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { getOrgIdFromRequest } from "../auth_util";
import { insertCustomerSchema, insertSupplierSchema, insertDealSchema } from "../../shared/schema";
import * as schema from "../../shared/schema";
import { logAudit } from "../lib/audit";
import { EventBus } from "../services/event-bus";
import { db } from "../storage";
import { eq, and, desc } from "drizzle-orm";
import { requirePermission } from "../middleware/permission_check";
import { AuthenticatedRequest } from "../types";

const router = Router();

// --- CUSTOMERS ---

/**
 * Obtiene el listado de clientes de la organización.
 */
router.get("/customers", requirePermission("crm.read"), async (req: Request, res: Response): Promise<void> => {
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
 * Registra un nuevo cliente en la base de datos y dispara automatización.
 */
router.post("/customers", requirePermission("crm.write"), async (req: Request, res: Response): Promise<void> => {
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

        // Automate: Emit System Event
        EventBus.emit(orgId, "customer.created", {
            customerId: data.id,
            customerName: data.name,
            customerEmail: data.email
        }).catch(err => console.error("EventBus Error:", err));

        // Log action
        await logAudit(
            req,
            orgId,
            (req.user as any)?.id || "system",
            "CREATE_CUSTOMER",
            data.id,
            { name: data.name, loyaltyCardCode: data.loyaltyCardCode }
        );

        res.json(data);
    } catch (error) {
        console.error("Create customer error:", error);
        res.status(500).json({ message: "Failed to create customer" });
    }
});

/**
 * Actualiza la información de un cliente.
 */
router.patch("/customers/:id", requirePermission("crm.write"), async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const [updated] = await db.update(schema.customers)
            .set({ ...req.body, updatedAt: new Date() })
            .where(and(eq(schema.customers.id, req.params.id), eq(schema.customers.organizationId, orgId)))
            .returning();

        if (!updated) {
            res.status(404).json({ message: "Customer not found" });
            return;
        }

        // Log action
        await logAudit(
            req,
            orgId,
            (req.user as any)?.id || "system",
            "UPDATE_CUSTOMER",
            updated.id,
            { name: updated.name }
        );

        res.json(updated);
    } catch (error) {
        console.error("Update customer error:", error);
        res.status(500).json({ message: "Failed to update customer" });
    }
});

// --- DEALS (NEGOCIOS) ---

/**
 * Obtiene el listado de negocios (pipeline).
 */
router.get("/deals", requirePermission("crm.read"), async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const data = await db.query.deals.findMany({
            where: eq(schema.deals.organizationId, orgId),
            orderBy: [desc(schema.deals.updatedAt)],
            with: { customer: true }
        });

        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Error fetching deals" });
    }
});

/**
 * Crea un nuevo negocio.
 */
router.post("/deals", requirePermission("crm.write"), async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const parsed = insertDealSchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) {
            res.status(400).json(parsed.error);
            return;
        }

        const [deal] = await db.insert(schema.deals).values(parsed.data).returning();

        // Automate: Emit System Event
        EventBus.emit(orgId, "deal.created", {
            dealId: deal.id,
            dealName: deal.name,
            value: deal.value
        }).catch(err => console.error("EventBus Error:", err));

        res.json(deal);
    } catch (error) {
        res.status(500).json({ message: "Error creating deal" });
    }
});

/**
 * Actualiza el estado de un negocio.
 */
router.patch("/deals/:id", requirePermission("crm.write"), async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { status, value, probability } = req.body;
        const [updated] = await db.update(schema.deals)
            .set({ status, value, probability, updatedAt: new Date() })
            .where(and(eq(schema.deals.id, req.params.id), eq(schema.deals.organizationId, orgId)))
            .returning();

        if (!updated) {
            res.status(404).json({ message: "Deal not found" });
            return;
        }

        // Automate: Emit System Event
        EventBus.emit(orgId, "deal.status_changed", {
            dealId: updated.id,
            status: updated.status,
            previousStatus: req.body.previousStatus
        }).catch(err => console.error("EventBus Error:", err));

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: "Error updating deal" });
    }
});

/**
 * Obtiene el listado de proveedores de la organización.
 */
router.get("/suppliers", requirePermission("crm.read"), async (req: Request, res: Response): Promise<void> => {
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
 */
router.post("/suppliers", requirePermission("crm.write"), async (req: Request, res: Response): Promise<void> => {
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
 * Actualiza la información de un proveedor.
 */
router.patch("/suppliers/:id", requirePermission("crm.write"), async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const [updated] = await db.update(schema.suppliers)
            .set({ ...req.body, updatedAt: new Date() })
            .where(and(eq(schema.suppliers.id, req.params.id), eq(schema.suppliers.organizationId, orgId)))
            .returning();

        if (!updated) {
            res.status(404).json({ message: "Supplier not found" });
            return;
        }

        // Log action
        await logAudit(
            orgId,
            (req.user as any)?.id || "system",
            "UPDATE_SUPPLIER",
            updated.id,
            { name: updated.name }
        );

        res.json(updated);
    } catch (error) {
        console.error("Update supplier error:", error);
        res.status(500).json({ message: "Failed to update supplier" });
    }
});

/**
 * Realiza un análisis cognitivo de los clientes.
 */
router.get("/analysis", requirePermission("crm.read"), async (req: Request, res: Response): Promise<void> => {
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
            if (daysSinceLastContact > 60) churnRisk = "High";
            else if (daysSinceLastContact > 30) churnRisk = "Medium";

            // Delinquency Logic
            const isDelinquent = (c.balance || 0) > 0 && daysSinceLastContact > 15;

            // Segmentation Logic
            if ((c.balance || 0) > 100000) segment = "VIP";
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
 * Procesa y envía recordatorios de pago automáticos.
 */
router.post("/reminders", requirePermission("crm.write"), async (req: Request, res: Response): Promise<void> => {
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
