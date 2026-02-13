import { Router, Request, Response } from "express";
import { db } from "../storage";
import {
    workCenters,
    billOfMaterials,
    bomItems,
    manufacturingRoutings,
    productionOrders,
    productionOrderLogs,
    qualityInspections,
    mrpRecommendations,
    insertWorkCenterSchema,
    insertBOMSchema,
    insertBOMItemSchema,
    insertProductionOrderSchema,
    products
} from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";
import { AuthenticatedRequest } from "../types";
import { ManufacturingService } from "../services/ManufacturingService";
import { logAudit } from "../lib/audit";

const router = Router();

// --- Work Centers ---
router.get("/work-centers", async (req: Request, res: Response) => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        const centers = await db.query.workCenters.findMany({
            where: eq(workCenters.organizationId, orgId)
        });
        res.json(centers);
    } catch (error) {
        res.status(500).json({ message: "Error fetching work centers" });
    }
});

router.post("/work-centers", async (req: Request, res: Response) => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        const parsed = insertWorkCenterSchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) return res.status(400).json(parsed.error);

        const [center] = await db.insert(workCenters).values(parsed.data).returning();
        res.status(201).json(center);
    } catch (error) {
        res.status(500).json({ message: "Error creating work center" });
    }
});

// --- BOMs ---
router.get("/bom", async (req: Request, res: Response) => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        const boms = await db.query.billOfMaterials.findMany({
            where: eq(billOfMaterials.organizationId, orgId),
            with: {
                product: true,
                items: true,
                routings: true
            }
        });
        res.json(boms);
    } catch (error) {
        res.status(500).json({ message: "Error fetching BOMs" });
    }
});

router.post("/bom", async (req: Request, res: Response) => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        const { header, items, routings } = req.body;

        const parsedHeader = insertBOMSchema.safeParse({ ...header, organizationId: orgId });
        if (!parsedHeader.success) return res.status(400).json(parsedHeader.error);

        const [bom] = await db.insert(billOfMaterials).values(parsedHeader.data).returning();

        if (items && items.length > 0) {
            await db.insert(bomItems).values(items.map((i: any) => ({ ...i, bomId: bom.id })));
        }

        if (routings && routings.length > 0) {
            await db.insert(manufacturingRoutings).values(routings.map((r: any) => ({ ...r, bomId: bom.id, organizationId: orgId })));
        }

        res.status(201).json(bom);
    } catch (error) {
        console.error("Create BOM error:", error);
        res.status(500).json({ message: "Error creating BOM" });
    }
});

// --- Production Orders ---
router.get("/orders", async (req: Request, res: Response) => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        const orders = await db.query.productionOrders.findMany({
            where: eq(productionOrders.organizationId, orgId),
            with: {
                product: true,
                bom: true,
                logs: true,
                qc: true
            },
            orderBy: [desc(productionOrders.createdAt)]
        });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: "Error fetching orders" });
    }
});

router.post("/orders", async (req: Request, res: Response) => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        const parsed = insertProductionOrderSchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) return res.status(400).json(parsed.error);

        const [order] = await db.insert(productionOrders).values(parsed.data).returning();

        // Trigger MRP Planning automatically
        await ManufacturingService.planMRP(order.id, orgId);

        await logAudit(orgId, (req.user as any)?.id || "system", "CREATE_PRODUCTION_ORDER", order.id, { message: `Nueva orden de producción ${order.id} creada.` });

        res.status(201).json(order);
    } catch (error) {
        console.error("Create Order error:", error);
        res.status(500).json({ message: "Error creating production order" });
    }
});

router.post("/orders/:id/finalize", async (req: Request, res: Response) => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        await ManufacturingService.finalizeProduction(req.params.id, orgId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Error finalizing order" });
    }
});

// --- MRP Status ---
router.get("/mrp/recommendations", async (req: Request, res: Response) => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        const recs = await db.query.mrpRecommendations.findMany({
            where: and(eq(mrpRecommendations.organizationId, orgId), eq(mrpRecommendations.status, 'pending')),
            with: {
                product: true
            }
        });
        res.json(recs);
    } catch (error) {
        res.status(500).json({ message: "Error fetching MRP recommendations" });
    }
});

router.post("/mrp/recommendations/:id/convert", async (req: Request, res: Response) => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        const purchase = await ManufacturingService.convertToPurchaseOrder(req.params.id, orgId);
        res.status(201).json(purchase);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : "Error converting recommendation" });
    }
});

// --- Station Activity ---
router.post("/orders/:id/log", async (req: Request, res: Response) => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        const log = await ManufacturingService.logStationActivity({
            ...req.body,
            orderId: req.params.id
        });
        res.status(201).json(log);
    } catch (error) {
        res.status(500).json({ message: "Error logging station activity" });
    }
});

export default router;
