import { db } from "../storage";
import { processInstances, processEvents, inventoryMovements, products } from "../../shared/schema";
import { eq, sql, and } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";
import { Router } from "express";

const router = Router();




/**
 * Crea una nueva instancia de proceso (Lote de producción).
 */
router.post("/instances", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { processId, metadata } = req.body;

        const [instance] = await db.insert(processInstances).values({
            processId,
            status: "active",
            startedAt: new Date(),
            aiContext: metadata || {}
        }).returning();

        res.status(201).json(instance);
    } catch (error) {
        res.status(500).json({ message: "Failed to create instance" });
    }
});

/**
 * Registra un evento de proceso (Trazabilidad y Merma).
 */
router.post("/events", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { instanceId, stepId, eventType, data, userId } = req.body;

        // 1. Log the event
        const [event] = await db.insert(processEvents).values({
            instanceId,
            stepId,
            eventType,
            data: data || {},
            userId,
            timestamp: new Date()
        }).returning();

        // 2. Automatic Inventory Adjustment for Waste (Merma)
        if (eventType === "anomaly" && data?.mermaType) {
            const productToDiscount = data.productId;
            const quantity = data.quantity; // Assuming negative for discount

            if (productToDiscount && quantity) {
                // Update product stock
                await db.update(products)
                    .set({ stock: sql`${products.stock} - ${quantity}` })
                    .where(and(eq(products.id, productToDiscount), eq(products.organizationId, orgId)));

                // Log movement
                await db.insert(inventoryMovements).values({
                    organizationId: orgId,
                    productId: productToDiscount,
                    quantity: -quantity,
                    type: "production",
                    referenceId: instanceId,
                    notes: `Merma registrada: ${data.reason || 'Sin motivo'}`
                });
            }
        }

        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ message: "Failed to log event" });
    }
});

/**
 * Obtiene el resumen de producción (OEE y Eficiencia).
 */
router.get("/summary", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const allInstances = await db.query.processInstances.findMany({
            where: (pi, { eq }) => sql`${pi.processId} IN (SELECT id FROM processes WHERE organization_id = ${orgId})`,
            orderBy: (pi, { desc }) => [desc(pi.startedAt)],
            limit: 50
        });

        const activeCount = allInstances.filter(i => i.status === "active").length;
        const completedCount = allInstances.filter(i => i.status === "completed").length;

        res.json({
            activeCount,
            completedCount,
            totalCount: allInstances.length,
            efficiency: completedCount > 0 ? 92 : 0, // Mocked OEE for now
            recentInstances: allInstances.slice(0, 5)
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch production summary" });
    }
});

// Helper to get Process definition
async function getProcess(processId: string, orgId: string) {
    return await db.query.processes.findFirst({
        where: and(eq(processes.id, processId), eq(processes.organizationId, orgId))
    });
}

router.post("/instances/:id/finish", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const instanceId = req.params.id;
        const { yields, estimatedInput, notes } = req.body;

        // 1. Update Instance Status & Context
        await db.update(processInstances)
            .set({
                status: "completed",
                completedAt: new Date(),
                aiContext: sql`jsonb_set(
                    COALESCE(${processInstances.aiContext}, '{}'::jsonb), 
                    '{yields}', 
                    ${JSON.stringify({ final: yields, estimatedInput })}::jsonb
                )`
            })
            .where(eq(processInstances.id, instanceId));

        // 2. Perform Smart Inventory Adjustment (Consumption)
        // Ideally we would find the input product ID from the Process definition (Recipe).
        // For MVP, we assume a standard "Coconut" product ID or we might need to lookup.
        // Let's deduce consumption if a product named "Coco" exists or rely on Process definition.

        // FUTURE: Fetch Process -> Recipe -> Input Product ID.
        // For now, we just log the event as a "Production Closure" which an admin can review.

        await db.insert(processEvents).values({
            instanceId,
            eventType: "complete",
            data: {
                yields,
                estimatedInput,
                notes,
                message: `Lote cerrado. Consumo estimado: ${estimatedInput} unidades.`
            },
            timestamp: new Date()
        });

        // 3. Auto-Increment Finished Goods Inventory
        // Fetch linkage from Process Definition
        const processDef = await getProcess(req.body.processId || (await db.select().from(processInstances).where(eq(processInstances.id, instanceId))).map(p => p.processId)[0], orgId);

        if (processDef) {
            const workflow = processDef.workflowData as any;
            // Check for explicit output link
            const outputProductId = workflow?.outputProductId || workflow?.meta?.outputProductId;

            if (outputProductId && yields > 0) {
                console.log(`[Production] Auto-incrementing Stock for Product ${outputProductId}. Qty: ${yields}`);

                // Update Product Stock
                await db.update(products)
                    .set({ stock: sql`${products.stock} + ${Number(yields)}` })
                    .where(and(eq(products.id, outputProductId), eq(products.organizationId, orgId)));

                // Log Movement
                await db.insert(inventoryMovements).values({
                    organizationId: orgId,
                    productId: outputProductId,
                    quantity: Number(yields),
                    type: "production",
                    referenceId: instanceId,
                    notes: `Producción Finalizada: Lote ${instanceId.slice(0, 8)}`,
                    date: new Date()
                });
            }
        }

        res.json({ success: true, message: "Batch finished" });

    } catch (error) {
        console.error("Error finishing batch:", error);
        res.status(500).json({ message: "Failed to finish batch" });
    }
});

export default router;
