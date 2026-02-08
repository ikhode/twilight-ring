import { Router, Request, Response } from "express";
import { db } from "../storage";
import { processInstances, processEvents, inventoryMovements, products, pieceworkTickets, processes, productionActivityLogs, rcaReports, aiInsights } from "../../shared/schema";
import { eq, sql, and, desc } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";
import { CognitiveEngine } from "../lib/cognitive-engine";
import { AuthenticatedRequest } from "../types";
import { User, insertPieceworkTicketSchema, insertProductionTaskSchema, insertProductionActivityLogSchema } from "../../shared/schema";

const router = Router();




/**
 * Lista procesos definidos para la organización.
 */
router.post("/production/activity", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const parsed = insertProductionActivityLogSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Invalid data", details: parsed.error });
            return;
        }

        const [product] = await db.insert(productionActivityLogs).values({
            ...parsed.data,
            organizationId: orgId,
            creatorId: (req as AuthenticatedRequest).user?.id, // Autenticación del creador
        }).returning();
        res.status(201).json(product);
    } catch (error) {
        console.error("Error creating production activity:", error);
        res.status(500).json({ message: "Failed to create production activity" });
    }
});

/**
 * Lista procesos definidos para la organización.
 */
router.get("/processes", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const list = await db.select().from(processes).where(eq(processes.organizationId, orgId)).orderBy(sql`${processes.orderIndex} ASC`);
        res.json(list);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch processes" });
    }
});

/**
 * Lista instancias activas (Lotes actuales).
 */
router.get("/instances", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const activeInstances = await db.select({
            id: processInstances.id,
            processId: processInstances.processId,
            status: processInstances.status,
            startedAt: processInstances.startedAt,
            processName: processes.name
        })
            .from(processInstances)
            .leftJoin(processes, eq(processInstances.processId, processes.id))
            .where(and(
                eq(processes.organizationId, orgId),
                eq(processInstances.status, "active")
            ));

        res.json(activeInstances);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch instances" });
    }
});

/**
 * Get all production batches (active and completed) for traceability.
 */
router.get("/instances/all", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const list = await db.select({
            id: processInstances.id,
            processId: processInstances.processId,
            status: processInstances.status,
            startedAt: processInstances.startedAt,
            completedAt: processInstances.completedAt,
            processName: processes.name,
            aiContext: processInstances.aiContext
        })
            .from(processInstances)
            .leftJoin(processes, eq(processInstances.processId, processes.id))
            .where(eq(processes.organizationId, orgId))
            .orderBy(sql`${processInstances.startedAt} DESC`);

        res.json(list);
    } catch (error) {
        console.error("Error fetching all instances:", error);
        res.status(500).json({ message: "Failed to fetch all batches" });
    }
});

/**
 * Get full traceability data for a specific instance.
 */
router.get("/instances/:id/traceability", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const instanceId = req.params.id;

        // 1. Fetch Events
        const eventsList = await db.select()
            .from(processEvents)
            .where(eq(processEvents.instanceId, instanceId))
            .orderBy(sql`${processEvents.timestamp} ASC`);

        // 2. Fetch RCA Reports
        const reportsList = await db.select()
            .from(rcaReports)
            .where(eq(rcaReports.instanceId, instanceId));

        // 3. Fetch Insights (filtered by instanceId in data jsonb)
        const insightsList = await db.select()
            .from(aiInsights)
            .where(and(
                eq(aiInsights.organizationId, orgId),
                sql`${aiInsights.data}->>'instanceId' = ${instanceId}`
            ));

        // 4. Fetch related Piecework Tickets
        const ticketsList = await db.select()
            .from(pieceworkTickets)
            .where(and(
                eq(pieceworkTickets.batchId, instanceId),
                eq(pieceworkTickets.organizationId, orgId)
            ));

        res.json({
            events: eventsList,
            reports: reportsList,
            insights: insightsList,
            tickets: ticketsList
        });
    } catch (error) {
        console.error("Error fetching traceability:", error);
        res.status(500).json({ message: "Failed to fetch traceability data" });
    }
});

/**
 * Crea una nueva instancia de proceso (Lote de producción).
 */
router.post("/instances", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { processId, metadata, sourceBatchId } = req.body;

        const [instance] = await db.insert(processInstances).values({
            processId,
            status: "active",
            startedAt: new Date(),
            sourceBatchId: sourceBatchId || null,
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
router.post("/events", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

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
 * Reporta producción de destajo (Genera Ticket).
 */
router.post("/report", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { instanceId, employeeId, quantity, unit } = req.body;

        // 1. Get Instance -> Process -> Rate
        const [instance] = await db.select().from(processInstances).where(eq(processInstances.id, instanceId));
        if (!instance) {
            res.status(404).json({ message: "Instance not found" });
            return;
        }

        const [process] = await db.select().from(processes).where(eq(processes.id, instance.processId));
        if (!process) {
            res.status(404).json({ message: "Process not found" });
            return;
        }

        const workflow = process.workflowData as any;
        let rate = Number(workflow?.piecework?.rate) || 0; // Expecting cents

        // HEURISTIC: If rate is extremely low (e.g. < 5) but piecework is enabled, 
        // it might have been saved in dollars instead of cents accidentally.
        if (workflow?.piecework?.enabled && rate > 0 && rate < 5) {
            console.log(`[DEBUG] Detected low rate (${rate}), auto-multiplying by 100 for safety.`);
            rate = Math.round(rate * 100);
        }

        const safeQuantity = Number(quantity) || 0;
        const amount = Math.round(safeQuantity * rate);

        console.log(`[DEBUG REPORT] Creating ticket: Quantity=${safeQuantity}, Rate=${rate}, Amount=${amount}, Instance=${instanceId}`);

        // --- INVENTORY VALIDATION & CONSUMPTION (STRICT MODE) ---
        // 1. Identify Input Product from Workflow
        const inputProductId = workflow?.inputProductId || workflow?.meta?.inputProductId;
        // 2. Determine Consumption Ratio (Default 1:1 or from recipe)
        // For MVP, we assume 1 unit of Output consumes 1 unit of Input unless specified otherwise.
        // Ideally this comes from a BOM/Recipe table.
        const consumptionRatio = 1;
        const requiredInput = safeQuantity * consumptionRatio;

        if (inputProductId && requiredInput > 0) {
            // 3. Check Stock
            const [inputProduct] = await db.select().from(products).where(and(eq(products.id, inputProductId), eq(products.organizationId, orgId)));

            if (!inputProduct) {
                res.status(400).json({ message: "Error de Configuración", error: "El insumo configurado en el proceso no existe en el inventario." });
                return;
            }

            if (inputProduct.stock < requiredInput) {
                // STRICT BLOCKING
                res.status(400).json({
                    message: "Validación de Materia Prima Fallida",
                    error: `Stock insuficiente de "${inputProduct.name}": disponible ${inputProduct.stock}, requerido ${requiredInput}. Deteniendo proceso.`
                });
                return;
            }

            // 4. Deduct Stock Immediately (Real-time tracking)
            // Note: Some flows might prefer to deduct at "Finish Batch", but for strict control we deduct per ticket.
            // If the user wants "Backflush" (at the end), we'd skip this. 
            // For now, based on user request "detener si se agota", we deduct NOW.

            await db.update(products)
                .set({ stock: sql`${products.stock} - ${requiredInput}` })
                .where(eq(products.id, inputProductId));

            await db.insert(inventoryMovements).values({
                organizationId: orgId,
                productId: inputProductId,
                quantity: -requiredInput,
                type: "production_use",
                referenceId: instanceId,
                notes: `Consumo por Ticket de Destajo: ${safeQuantity}u generadas.`,
                date: new Date()
            });
        }
        // -------------------------------------------------------

        // 2. Create Ticket
        const [ticket] = await db.insert(pieceworkTickets).values({
            organizationId: orgId,
            batchId: instanceId,
            employeeId: employeeId,
            creatorId: req.user?.id, // Autenticación del creador
            taskName: process.name,
            quantity: Number(quantity),
            unitPrice: rate,
            totalAmount: amount,
            status: "pending",
            createdAt: new Date()
        }).returning();

        res.status(201).json(ticket);

    } catch (error) {
        console.error("Error creating ticket:", error);
        res.status(500).json({ message: "Failed to create ticket" });
    }
});

/**
 * Obtiene el resumen de producción (OEE y Eficiencia).
 */
router.get("/summary", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const allInstances = await db.query.processInstances.findMany({
            where: (pi, { eq }) => sql`${pi.processId} IN (SELECT id FROM processes WHERE organization_id = ${orgId})`,
            orderBy: (pi, { desc }) => [desc(pi.startedAt)],
            limit: 100
        });

        const activeCount = allInstances.filter(i => i.status === "active").length;
        const completedInstances = allInstances.filter(i => i.status === "completed");
        const completedCount = completedInstances.length;

        // 1. Calculate Average Cycle Time (in hours)
        let totalCycleTimeMs = 0;
        let validCompletedCount = 0;
        completedInstances.forEach(i => {
            if (i.startedAt && i.completedAt) {
                totalCycleTimeMs += new Date(i.completedAt).getTime() - new Date(i.startedAt).getTime();
                validCompletedCount++;
            }
        });
        const avgCycleTimeHours = validCompletedCount > 0
            ? (totalCycleTimeMs / validCompletedCount / (1000 * 60 * 60)).toFixed(1)
            : "0.0";

        // 2. Fetch Waste (Merma) from anomalies in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const anomalies = await db.select()
            .from(processEvents)
            .where(and(
                eq(processEvents.eventType, "anomaly"),
                sql`${processEvents.timestamp} > ${thirtyDaysAgo}`,
                sql`${processEvents.instanceId} IN (SELECT id FROM process_instances WHERE process_id IN (SELECT id FROM processes WHERE organization_id = ${orgId}))`
            ));

        // Real Waste Calculation: Sum quantity from anomalies vs Total Production
        let totalWasteQty = 0;
        anomalies.forEach(a => {
            totalWasteQty += Number((a.data as any)?.quantity) || 0;
        });

        // Calculate Total Production from Key Metrics or Completed Instances
        let totalProductionQty = 0;
        completedInstances.forEach(i => {
            const ctx = i.aiContext as any;
            // Support both object yields {pid: qty} and legacy single number
            if (ctx?.yields) {
                if (typeof ctx.yields === 'object' && ctx.yields.final) {
                    // logic from /finish route stores { final: yields }
                    const final = ctx.yields.final;
                    if (typeof final === 'object') {
                        totalProductionQty += Object.values(final).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
                    } else {
                        totalProductionQty += Number(final) || 0;
                    }
                } else {
                    totalProductionQty += Number(ctx.yields) || 0;
                }
            }
        });

        // Avoid division by zero
        const totalVolume = totalProductionQty + totalWasteQty;
        const wastePercentage = totalVolume > 0
            ? ((totalWasteQty / totalVolume) * 100).toFixed(1)
            : "0.0";

        // 3. Efficiency (For now: Completion Rate)
        // Future: Compare actual duration vs expected duration from process_steps
        const totalStarted = activeCount + completedCount;
        const efficiency = totalStarted > 0
            ? ((completedCount / totalStarted) * 100).toFixed(1)
            : "0.0";

        res.json({
            activeCount,
            completedCount,
            totalCount: allInstances.length,
            efficiency,
            waste: wastePercentage,
            avgCycleTime: avgCycleTimeHours,
            recentInstances: allInstances.slice(0, 5),
            activeInstances: allInstances.filter(i => i.status === "active")
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

router.post("/instances/:id/finish", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const instanceId = req.params.id;
        const { yields = 0, estimatedInput = 0, notes } = req.body;

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

            // 1. Consumo Insumo Principal
            const inputProductId = workflow?.inputProductId || workflow?.meta?.inputProductId;
            if (inputProductId && inferredInputQty > 0) {
                // NEW: Validate Stock before deduction
                const [inputProduct] = await db.select().from(products).where(and(eq(products.id, inputProductId), eq(products.organizationId, orgId)));
                if (!inputProduct || inputProduct.stock < inferredInputQty) {
                    res.status(400).json({
                        message: "Validación de Materia Prima Fallida",
                        error: `Stock insuficiente de "${inputProduct?.name || 'Insumo'}": disponible ${inputProduct?.stock || 0}, requerido ${inferredInputQty}.`
                    });
                    return;
                }

                await db.update(products)
                    .set({ stock: sql`${products.stock} - ${inferredInputQty}` })
                    .where(and(eq(products.id, inputProductId), eq(products.organizationId, orgId)));

                await db.insert(inventoryMovements).values({
                    organizationId: orgId,
                    productId: inputProductId,
                    quantity: -inferredInputQty,
                    type: "production_use",
                    referenceId: instanceId,
                    notes: `Consumo (Inferencia): ${inferredInputQty} u.`,
                    date: new Date()
                });
            }

            // 2. Procesar Rendimientos Dinámicos (Yields)
            // 'yields' puede ser un objeto { productId: quantity } o un número (legacy)
            if (typeof yields === 'object' && yields !== null) {
                for (const [pid, qty] of Object.entries(yields)) {
                    if (qty && (qty as number) > 0) {
                        await db.update(products)
                            .set({ stock: sql`${products.stock} + ${Number(qty)}` })
                            .where(and(eq(products.id, pid), eq(products.organizationId, orgId)));

                        await db.insert(inventoryMovements).values({
                            organizationId: orgId,
                            productId: pid,
                            quantity: Number(qty),
                            type: "production",
                            referenceId: instanceId,
                            notes: `Producción (Captura Dinámica)`,
                            date: new Date()
                        });
                    }
                }
            } else {
                // Fallback Legacy: Producción Producto Principal
                let outputProductId = workflow?.outputProductId || workflow?.outputProductIds?.[0];
                const legacyQty = Number(yields) || 0;
                if (outputProductId && legacyQty > 0) {
                    await db.update(products)
                        .set({ stock: sql`${products.stock} + ${legacyQty}` })
                        .where(and(eq(products.id, outputProductId), eq(products.organizationId, orgId)));

                    await db.insert(inventoryMovements).values({
                        organizationId: orgId,
                        productId: outputProductId,
                        quantity: legacyQty,
                        type: "production",
                        referenceId: instanceId,
                        notes: `Producción Principal (Legacy)`,
                        date: new Date()
                    });
                }
            }

            // 3. Co-Productos (Legacy support or additional manual entries)
            const reqCoProducts = req.body.coProducts || [];
            for (const cp of reqCoProducts) {
                if (cp.productId && cp.quantity > 0) {
                    await db.update(products)
                        .set({ stock: sql`${products.stock} + ${Number(cp.quantity)}` })
                        .where(and(eq(products.id, cp.productId), eq(products.organizationId, orgId)));

                    await db.insert(inventoryMovements).values({
                        organizationId: orgId,
                        productId: cp.productId,
                        quantity: Number(cp.quantity),
                        type: "production_coproduct",
                        referenceId: instanceId,
                        notes: `Co-Producto: ${cp.notes || ''}`,
                        date: new Date()
                    });
                }
            }
        }

        // 4. Cognitive Analysis
        // Emitir evento al "Cerebro" para que analice rendimientos y genere insights
        const totalYield = typeof yields === 'object' && yields !== null
            ? Object.values(yields).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
            : Number(yields) || 0;

        CognitiveEngine.emit({
            orgId,
            type: "production_finish",
            data: {
                instanceId,
                processName: processDef?.name || "Desconocido",
                yields: totalYield,
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

/**
 * FLOOR CONTROL: Get active activity logs for supervision.
 */
router.get("/logs/active", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // Fetch logs with employee info (simple join or fetch)
        // Drizzle Query Builder is better for relations if setup, but we'll use raw select & manual join for control
        const logs = await db.select({
            id: productionActivityLogs.id,
            employeeId: productionActivityLogs.employeeId,
            activityType: productionActivityLogs.activityType, // 'production', 'break', etc
            status: productionActivityLogs.status,
            startedAt: productionActivityLogs.startedAt,
            endedAt: productionActivityLogs.endedAt,
            taskId: productionActivityLogs.taskId,
            notes: productionActivityLogs.notes,
            metadata: productionActivityLogs.metadata
        })
            .from(productionActivityLogs)
            .where(and(
                eq(productionActivityLogs.organizationId, orgId),
                sql`${productionActivityLogs.status} IN ('active', 'pending_verification')`
            ))
            .orderBy(productionActivityLogs.startedAt);

        res.json(logs);
    } catch (error) {
        console.error("Error fetching active logs:", error);
        res.status(500).json({ message: "Failed to fetch logs" });
    }
});

/**
 * FLOOR CONTROL: Finalize a log (Supervisor Verification).
 * Creates a piecework ticket if it was a production task.
 */
router.post("/logs/finalize", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { logId, quantity, notes, status } = req.body; // status: 'approved', 'rejected'

        const [log] = await db.select().from(productionActivityLogs).where(eq(productionActivityLogs.id, logId));
        if (!log) {
            res.status(404).json({ message: "Log not found" });
            return;
        }

        // 1. Update Log Status
        await db.update(productionActivityLogs)
            .set({
                status: 'completed',
                quantity: Number(quantity) || 0,
                notes: notes ? `${log.notes || ''} | Sup: ${notes}` : log.notes
            })
            .where(eq(productionActivityLogs.id, logId));

        // 2. If Approved Production -> Create Ticket
        if (status === 'approved' && log.activityType === 'production' && quantity > 0) {
            // Need task details for rate
            // Assuming we stored taskId in log. If not, we might need to lookup.
            // For MVP, we'll fetch task or use a default rate from payload if provided (security risk, better fetch).
            // Let's assume taskId matches process for now or use generic.

            // Note: We need a rate. 
            // Ideally: Fetch task definition.
            // const [task] = await db.select().from(productionTasks).where(eq(productionTasks.id, log.taskId));
            // const rate = task?.unitPrice || 0;

            // Fallback for this iteration: Just create the ticket with 0 price if rate missing, admin fixes later.
            // OR: Allow supervisor to set rate? No.

            // Simplification: We just record the ticket.

            await db.insert(pieceworkTickets).values({
                organizationId: orgId,
                employeeId: log.employeeId,
                creatorId: req.user?.id,
                taskName: "Producción Kiosko", // Or fetch Name
                quantity: Number(quantity),
                unitPrice: 0, // Placeholder
                totalAmount: 0,
                status: "approved",
                approvedBy: req.user?.id,
                notes: `Generated from Activity Log ${logId}`,
                createdAt: new Date()
            });
        }

        res.json({ success: true });

    } catch (error) {
        console.error("Error finalizing log:", error);
        res.status(500).json({ message: "Failed to finalize log" });
    }
});

export default router;
