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

        // 3. Payroll-Driven Production Inference (La Inferencia Cognitiva)
        // En lugar de una receta estática, usamos lo que realmente sucedió (Tickets).

        // A. Obtener todos los tickets asociados a este lote
        const tickets = await db.query.pieceworkTickets.findMany({
            where: and(eq(pieceworkTickets.batchId, instanceId), eq(pieceworkTickets.organizationId, orgId)),
            with: {
                // Necesitamos saber si la tarea es de "Entrada" (Input) o "Salida" (Output)
                // Por ahora, usamos heurísticas o metadatos. 
                // Idealmente la Tarea tendría un flag "isInputDriver" o "isOutputDriver".
                // Para MVP Universal: 
                // - La tarea con mayor cantidad de Unidades (pza) suele ser la Entrada (Destopado).
                // - La tarea con unidad de peso (kg) o marcada como final suele ser la Salida (Pelado).
            }
        });

        // B. Análisis de Tickets (Heurística Cognitiva)
        let inferredInputQty = 0;
        let inferredOutputQty = 0;

        // Agrupar por nombre de tarea para identificar fases
        const taskGroups: Record<string, { qty: number, unit: string, count: number }> = {};

        tickets.forEach(t => {
            const name = t.taskName || "General";
            if (!taskGroups[name]) taskGroups[name] = { qty: 0, unit: "pza", count: 0 };
            taskGroups[name].qty += t.quantity;
            taskGroups[name].count++;
            // Try to infer unit from context or task definition if available. 
            // Assuming quantity is consistent per task.
        });

        // Lógica de Inferencia:
        // 1. Buscar la "Entrada" (Mayor volumen en piezas -> Coco Entero)
        // 2. Buscar la "Salida Principal" (Peso/Kilos o etapa final -> Pulpa)

        // Si el usuario mandó 'estimatedInput', confiamos en él, si no, inferimos del maximo conteo de piezas.
        if (estimatedInput > 0) {
            inferredInputQty = estimatedInput;
        } else {
            // Find task with max quantity assuming it's the raw material count (Destopado)
            // Filter only 'pza' tasks logic here if possible
            const maxTask = Object.values(taskGroups).sort((a, b) => b.qty - a.qty)[0];
            if (maxTask) inferredInputQty = maxTask.qty;
        }

        // Para el output, usamos lo que mandó el usuario en 'yields' (que viene del frontend calculateEstimate) 
        // O sumamos los tickets de tasks que parezcan ser de salida (e.g. 'Pelado', 'Empaque')
        inferredOutputQty = Number(yields) || 0;

        console.log(`[Cognitive Production] Inferred Input: ${inferredInputQty}, Inferred Output: ${inferredOutputQty}`);

        // C. Ejecución de Movimientos de Inventario

        const processDef = await getProcess(req.body.processId || (await db.select().from(processInstances).where(eq(processInstances.id, instanceId))).map(p => p.processId)[0], orgId);

        if (processDef) {
            const workflow = processDef.workflowData as any;

            // 1. Consumo Insumo Principal (e.g. Coco Entero)
            const inputProductId = workflow?.inputProductId || workflow?.meta?.inputProductId;
            if (inputProductId && inferredInputQty > 0) {
                await db.update(products)
                    .set({ stock: sql`${products.stock} - ${inferredInputQty}` })
                    .where(and(eq(products.id, inputProductId), eq(products.organizationId, orgId)));

                await db.insert(inventoryMovements).values({
                    organizationId: orgId,
                    productId: inputProductId,
                    quantity: -inferredInputQty,
                    type: "production_use",
                    referenceId: instanceId,
                    notes: `Consumo (Basado en Tickets): ${inferredInputQty} u.`,
                    date: new Date()
                });
            }

            // 2. Producción Producto Principal (e.g. Pulpa)
            // Support multiple outputs: Take the first one as MAIN for automatic stock increment.
            let outputProductId = workflow?.outputProductId || workflow?.meta?.outputProductId;

            // New Array Support
            if (Array.isArray(workflow?.outputProductIds) && workflow.outputProductIds.length > 0) {
                outputProductId = workflow.outputProductIds[0];
            }

            if (outputProductId && inferredOutputQty > 0) {
                await db.update(products)
                    .set({ stock: sql`${products.stock} + ${inferredOutputQty}` })
                    .where(and(eq(products.id, outputProductId), eq(products.organizationId, orgId)));

                await db.insert(inventoryMovements).values({
                    organizationId: orgId,
                    productId: outputProductId,
                    quantity: inferredOutputQty,
                    type: "production",
                    referenceId: instanceId,
                    notes: `Producción Principal (Inferencia): ${inferredOutputQty} kg/u.`,
                    date: new Date()
                });
            }

            // 3. Co-Productos (Agua, Hueso, etc.)
            // Estos vienen explícitos en el request 'coProducts' o se infieren
            const reqCoProducts = req.body.coProducts || []; // [{ productId, quantity, notes }]

            for (const cp of reqCoProducts) {
                if (cp.productId && cp.quantity > 0) {
                    await db.update(products)
                        .set({ stock: sql`${products.stock} + ${Number(cp.quantity)}` })
                        .where(and(eq(products.id, cp.productId), eq(products.organizationId, orgId)));

                    await db.insert(inventoryMovements).values({
                        organizationId: orgId,
                        productId: cp.productId,
                        quantity: Number(cp.quantity),
                        type: "production_coproduct", // New type ideally
                        referenceId: instanceId,
                        notes: `Co-Producto Generado: ${cp.notes || ''}`,
                        date: new Date()
                    });
                }
            }
        }

        // 4. Cognitive Analysis
        // Emitir evento al "Cerebro" para que analice rendimientos y genere insights
        CognitiveEngine.emit({
            orgId,
            type: "production_finish",
            data: {
                instanceId,
                processName: processDef?.name || "Desconocido",
                yields: Number(yields),
                estimatedInput: Number(estimatedInput),
                notes
            }
        });

        res.json({ success: true, message: "Batch finished and processed by AI" });

    } catch (error) {
        console.error("Error finishing batch:", error);
        res.status(500).json({ message: "Failed to finish batch" });
    }
});

export default router;
