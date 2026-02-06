import { Router, Request, Response } from "express";
import { db, storage } from "../storage";
import { getOrgIdFromRequest, getAuthenticatedUser } from "../auth_util";
import { insertPieceworkTicketSchema, insertProductionTaskSchema } from "../../shared/schema";
import {
    pieceworkTickets,
    productionTasks,
    products,
    payrollAdvances,
    employees,
    expenses,
    inventoryMovements,
    cashRegisters,
    cashTransactions,
    users,
    userOrganizations
} from "../../shared/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { logAudit } from "../lib/audit";

const router = Router();

// Helper to get performer ID safe for Cashier
async function getPerformerId(req: Request, orgId: string): Promise<string> {
    const user = await getAuthenticatedUser(req);
    if (user) return user.id;

    // If no user (Kiosk mode), find a fallback user (Admin or Owner)
    const admin = await db.query.userOrganizations.findFirst({
        where: and(
            eq(userOrganizations.organizationId, orgId),
            eq(userOrganizations.role, 'admin')
        )
    });
    // Fallback to strict "system" placeholder if we had one, but we must link to a valid user ID.
    // Assuming at least one admin exists.
    return admin?.userId || '00000000-0000-0000-0000-000000000000';
}

/**
 * Obtiene el listado de tickets de destajo con filtros opcionales.
 */
router.get("/tickets", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { employeeId, status, batchId } = req.query;
        const targetEmployeeId = employeeId as string;
        const ticketStatus = status as string;
        const targetBatchId = batchId as string;

        const conditions = [eq(pieceworkTickets.organizationId, orgId)];

        if (targetEmployeeId) {
            conditions.push(eq(pieceworkTickets.employeeId, targetEmployeeId));
        }

        if (ticketStatus) {
            if (ticketStatus.includes(',')) {
                conditions.push(inArray(pieceworkTickets.status, ticketStatus.split(',') as any[]));
            } else {
                conditions.push(eq(pieceworkTickets.status, ticketStatus));
            }
        }

        if (targetBatchId) {
            conditions.push(eq(pieceworkTickets.batchId, targetBatchId));
        }

        console.log(`[DEBUG_TICKETS] Org: ${orgId}, Employee: ${targetEmployeeId}, Status: ${ticketStatus}`);

        const tickets = await db.query.pieceworkTickets.findMany({
            where: and(...conditions),
            with: { employee: true },
            orderBy: [desc(pieceworkTickets.createdAt)]
        });

        console.log(`[DEBUG_TICKETS] Found: ${tickets.length}`);

        res.json(tickets.map(t => ({
            ...t,
            employeeName: t.employee?.name || "Desconocido"
        })));
    } catch (error) {
        console.error("Fetch tickets error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

/**
 * Obtiene un ticket individual por ID.
 */
router.get("/tickets/:id", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const ticket = await db.query.pieceworkTickets.findFirst({
            where: and(
                eq(pieceworkTickets.id, req.params.id),
                eq(pieceworkTickets.organizationId, orgId)
            ),
            with: { employee: true }
        });

        if (!ticket) {
            res.status(404).json({ message: "Ticket not found" });
            return;
        }

        res.json({
            ...ticket,
            employeeName: ticket.employee?.name || "Desconocido"
        });
    } catch (error) {
        console.error("Fetch ticket error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

/**
 * Obtiene el listado de tareas disponibles desde la BD.
 */
router.get("/tasks", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const tasks = await db.select().from(productionTasks)
            .where(and(
                eq(productionTasks.organizationId, orgId),
                eq(productionTasks.active, true)
            ));

        // Fallback seed if empty (for demo purposes)
        res.json(tasks);
    } catch (error) {
        console.error("Fetch tasks error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// NEW: Rate Management (Create Task)
router.post("/tasks", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const parsed = insertProductionTaskSchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error });
            return;
        }

        const [task] = await db.insert(productionTasks).values(parsed.data).returning();

        // Audit
        const user = await getAuthenticatedUser(req);
        if (user) await logAudit(orgId, user.id, "CREATE_TASK", task.id, { name: task.name, price: task.unitPrice });

        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: "Failed to create task" });
    }
});

// Update Task
router.put("/tasks/:id", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const taskId = req.params.id;
        const payload = req.body;

        // Validate payload if necessary (partial update) or use schema
        // For simplicity, updating fields directly but ideally use schema

        await db.update(productionTasks)
            .set({
                name: payload.name,
                unitPrice: payload.unitPrice,
                minRate: payload.minRate,
                maxRate: payload.maxRate,
                unit: payload.unit
            })
            .where(and(
                eq(productionTasks.id, taskId),
                eq(productionTasks.organizationId, orgId)
            ));

        res.json({ success: true });
    } catch (error) {
        console.error("Update task error:", error);
        res.status(500).json({ message: "Failed to update task" });
    }
});

router.delete("/tasks/:id", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const taskId = req.params.id;

        await db.delete(productionTasks)
            .where(and(
                eq(productionTasks.id, taskId),
                eq(productionTasks.organizationId, orgId)
            ));

        // Audit
        const user = await getAuthenticatedUser(req);
        if (user) await logAudit(orgId, user.id, "DELETE_TASK", taskId, { taskId });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete task" });
    }
});

/**
 * Obtiene el listado de adelantos de nómina pendientes.
 */
router.get("/advances", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { employeeId, status } = req.query;
        const targetEmployeeId = employeeId as string;
        const advanceStatus = (status as string) || "pending";

        const conditions = [eq(payrollAdvances.organizationId, orgId)];

        if (targetEmployeeId) {
            conditions.push(eq(payrollAdvances.employeeId, targetEmployeeId));
        }

        if (advanceStatus) {
            conditions.push(eq(payrollAdvances.status, advanceStatus));
        }

        const advances = await db.query.payrollAdvances.findMany({
            where: and(...conditions),
            orderBy: [desc(payrollAdvances.date)]
        });

        res.json(advances);
    } catch (error) {
        console.error("Fetch advances error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

/**
 * Registra un nuevo ticket de destajo.
 */
router.post("/tickets", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // Note: Schema expects employeeId, not userId.
        // Ensure payload sends employeeId
        const payload = {
            ...req.body,
            organizationId: orgId,
            totalAmount: req.body.quantity * req.body.unitPrice
        };

        const parsed = insertPieceworkTicketSchema.safeParse(payload);

        if (!parsed.success) {
            console.error("Validation error:", parsed.error);
            res.status(400).json({ error: parsed.error });
            return;
        }

        // --- VALIDATION & LIMITS ---
        const [taskDef] = await db.select().from(productionTasks).where(and(
            eq(productionTasks.organizationId, orgId),
            eq(productionTasks.name, parsed.data.taskName)
        )).limit(1);

        if (taskDef) {
            const user = await getAuthenticatedUser(req);
            const membership = await db.query.userOrganizations.findFirst({
                where: and(eq(userOrganizations.userId, user!.id), eq(userOrganizations.organizationId, orgId))
            });
            const isAdmin = membership?.role === 'admin';

            if (!isAdmin) {
                if (taskDef.minRate && parsed.data.unitPrice < taskDef.minRate) {
                    res.status(400).json({ message: `La tarifa es menor al mínimo permitido ($${(taskDef.minRate / 100).toFixed(2)})` });
                    return;
                }
                if (taskDef.maxRate && parsed.data.unitPrice > taskDef.maxRate) {
                    res.status(400).json({ message: `La tarifa excede el máximo permitido ($${(taskDef.maxRate / 100).toFixed(2)})` });
                    return;
                }
            }
        }

        const [ticket] = await db.insert(pieceworkTickets).values(parsed.data).returning();

        // Increment Employee Balance
        await db.update(employees)
            .set({ balance: sql`${employees.balance} + ${parsed.data.totalAmount}` })
            .where(eq(employees.id, parsed.data.employeeId));

        // Audit Ticket Creation (Traceability of payments)
        const user = await getAuthenticatedUser(req);
        if (user) await logAudit(orgId, user.id, "CREATE_TICKET", ticket.id, {
            amount: ticket.totalAmount,
            employee: parsed.data.employeeId,
            task: parsed.data.taskName
        });

        // --- RECIPE PROCESSING ---
        // Task definition already fetched above as taskDef

        if (taskDef && taskDef.isRecipe && taskDef.recipeData) {
            const recipe = taskDef.recipeData as any;
            const ticketQty = parsed.data.quantity;
            const selectedInputId = req.body.selectedInputId; // New: Specific input to consume

            // 1. Inputs (Consumption)
            if (recipe.inputs && Array.isArray(recipe.inputs)) {
                // If selective mode is active and we have a selection, filter inputs
                // Otherwise use all inputs (composite mode)
                const inputsToProcess = (selectedInputId)
                    ? recipe.inputs.filter((i: any) => i.itemId === selectedInputId)
                    : recipe.inputs;

                for (const input of inputsToProcess) {
                    const requiredQty = input.quantity * ticketQty;

                    // Check Inventory (Prevent negative stock)
                    const [currentProduct] = await db.select().from(products).where(and(eq(products.id, input.itemId), eq(products.organizationId, orgId)));

                    if (currentProduct && (currentProduct.stock - requiredQty < 0)) {
                        // Option A: Throw error (Strict)
                        // throw new Error(`Insufficient stock for ${input.itemId}. Required: ${requiredQty}, Available: ${currentProduct.stock}`);

                        // Option B: Allow but log (Current user preference seems to be "details" adjustment, implying they want it fixed or visible)
                        // Let's stick to allowing it but ensuring the UI shows it red (which we did). 
                        // BUT, for "underlying details", preventing it is better for data integrity.
                        // However, without a way to "add stock" easily in the UI flow, this might block production.
                        // Let's just log a warning for now and let it go negative, as the UI now handles it.
                        console.warn(`[Inventory] Negative stock alert for ${input.itemId}: ${currentProduct.stock} - ${requiredQty}`);
                    }

                    await db.update(products)
                        .set({ stock: sql`${products.stock} - ${requiredQty}` })
                        .where(and(eq(products.id, input.itemId), eq(products.organizationId, orgId)));

                    await db.insert(inventoryMovements).values({
                        organizationId: orgId,
                        productId: input.itemId,
                        quantity: -requiredQty,
                        type: "production_input",
                        referenceId: ticket.id,
                        notes: `Consumo: ${taskDef.name} (Ticket ${ticket.id.slice(0, 6)})`
                    });
                }
            }

            // 2. Outputs (Production)
            if (recipe.outputs && Array.isArray(recipe.outputs)) {
                for (const output of recipe.outputs) {
                    const producedQty = output.quantity * ticketQty;

                    await db.update(products)
                        .set({ stock: sql`${products.stock} + ${producedQty}` })
                        .where(and(eq(products.id, output.itemId), eq(products.organizationId, orgId)));

                    await db.insert(inventoryMovements).values({
                        organizationId: orgId,
                        productId: output.itemId,
                        quantity: producedQty,
                        type: "production_output",
                        referenceId: ticket.id,
                        notes: `Producción: ${taskDef.name} (Ticket ${ticket.id.slice(0, 6)})`
                    });
                }
            }
        }

        res.status(201).json(ticket);
    } catch (error) {
        console.error("Create ticket error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// NEW: Approve Ticket
router.post("/tickets/:id/approve", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const ticketId = req.params.id;

        // Verify ownership
        const [ticket] = await db.select().from(pieceworkTickets).where(and(
            eq(pieceworkTickets.id, ticketId),
            eq(pieceworkTickets.organizationId, orgId)
        ));

        if (!ticket) {
            res.status(404).json({ message: "Ticket not found" });
            return;
        }

        await db.update(pieceworkTickets)
            .set({ status: 'approved', approvedBy: (req as any).user?.id || 'admin', updatedAt: new Date() })
            .where(eq(pieceworkTickets.id, ticketId));

        res.json({ success: true });
    } catch (error) {
        console.error("Approve error:", error);
        res.status(500).json({ message: "Failed to approve ticket" });
    }
});

// NEW: Pay Single Ticket (Quick Action)
router.post("/tickets/:id/pay", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const ticketId = req.params.id;

        const [ticket] = await db.update(pieceworkTickets)
            .set({ status: 'paid', updatedAt: new Date() })
            .where(and(
                eq(pieceworkTickets.id, ticketId),
                eq(pieceworkTickets.organizationId, orgId)
            ))
            .returning();

        if (ticket) {
            // 1. Record Expense
            await db.insert(expenses).values({
                organizationId: orgId,
                amount: ticket.totalAmount,
                category: 'payroll',
                description: `Pago Ticket: ${ticket.taskName} (ID: ${ticket.id.slice(0, 8)})`,
                date: new Date()
            });

            // 2. Update Cash Register (If open)
            const register = await db.query.cashRegisters.findFirst({
                where: and(
                    eq(cashRegisters.organizationId, orgId),
                    eq(cashRegisters.status, 'open')
                )
            });

            if (register && register.currentSessionId) {
                const performerId = await getPerformerId(req, orgId);
                await db.insert(cashTransactions).values({
                    organizationId: orgId,
                    registerId: register.id,
                    sessionId: register.currentSessionId,
                    type: "out",
                    category: "payroll",
                    amount: ticket.totalAmount,
                    description: `Pago Ticket: ${ticket.taskName}`,
                    performedBy: performerId
                });

                await db.update(cashRegisters)
                    .set({ balance: sql`${cashRegisters.balance} - ${ticket.totalAmount}` })
                    .where(eq(cashRegisters.id, register.id));
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Pay ticket error:", error);
        res.status(500).json({ message: "Failed to pay ticket" });
    }
});

/**
 * Registra un nuevo adelanto de nómina.
 */
router.post("/advances", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { employeeId, amount, status } = req.body;
        const advanceStatus = status || "paid"; // Default to paid if creating from Cashier

        const [advance] = await db.insert(payrollAdvances).values({
            organizationId: orgId,
            employeeId,
            amount,
            status: advanceStatus,
            date: new Date()
        }).returning();

        // Decrement Employee Balance (Employee owes money / reduces payable)
        await db.update(employees)
            .set({ balance: sql`${employees.balance} - ${amount}` })
            .where(eq(employees.id, employeeId));

        // If paid immediately, record expense AND deduct from Cash Register
        if (advanceStatus === 'paid') {
            await db.insert(expenses).values({
                organizationId: orgId,
                amount: amount,
                category: 'payroll',
                description: `Adelanto de Nómina (ID: ${advance.id.slice(0, 8)})`,
                date: new Date()
            });

            // Update Cash Register (If open)
            const register = await db.query.cashRegisters.findFirst({
                where: and(
                    eq(cashRegisters.organizationId, orgId),
                    eq(cashRegisters.status, 'open')
                )
            });

            if (register && register.currentSessionId) {
                const performerId = await getPerformerId(req, orgId);
                await db.insert(cashTransactions).values({
                    organizationId: orgId,
                    registerId: register.id,
                    sessionId: register.currentSessionId,
                    type: "out",
                    category: "payroll",
                    amount: amount,
                    description: `Adelanto de Nómina (ID: ${advance.id.slice(0, 8)})`,
                    performedBy: performerId
                });

                await db.update(cashRegisters)
                    .set({ balance: sql`${cashRegisters.balance} - ${amount}` })
                    .where(eq(cashRegisters.id, register.id));
            }
        }

        res.status(201).json(advance);
    } catch (error) {
        console.error("Create advance error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

/**
 * Procesa el pago de tickets y adelantos (Payout).
 */
router.post("/payout", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { ticketIds, advanceIds } = req.body; // Expect arrays of IDs

        if (!Array.isArray(ticketIds) || !Array.isArray(advanceIds)) {
            res.status(400).json({ message: "Invalid payload" });
            return;
        }

        // Transactional update logic (simulated with sequential awaits for MVP)
        let totalTicketAmount = 0;
        let totalAdvanceAmount = 0;

        // 1. Process Tickets
        if (ticketIds.length > 0) {
            const ticketsToPay = await db.query.pieceworkTickets.findMany({
                where: and(
                    eq(pieceworkTickets.organizationId, orgId),
                    inArray(pieceworkTickets.id, ticketIds)
                )
            });
            totalTicketAmount = ticketsToPay.reduce((sum, t) => sum + t.totalAmount, 0);

            await db.update(pieceworkTickets)
                .set({ status: 'paid', updatedAt: new Date() })
                .where(inArray(pieceworkTickets.id, ticketIds));
        }

        // 2. Process Advances
        if (advanceIds.length > 0) {
            const advancesToPay = await db.query.payrollAdvances.findMany({
                where: and(
                    eq(payrollAdvances.organizationId, orgId),
                    inArray(payrollAdvances.id, advanceIds)
                )
            });
            totalAdvanceAmount = advancesToPay.reduce((sum, a) => sum + a.amount, 0);

            await db.update(payrollAdvances)
                .set({ status: 'paid' })
                .where(inArray(payrollAdvances.id, advanceIds));
        }

        const netPayout = totalTicketAmount - totalAdvanceAmount;

        // 3. Record Expense & Cash Transaction
        if (netPayout > 0) {
            await db.insert(expenses).values({
                organizationId: orgId,
                amount: netPayout,
                category: 'payroll',
                description: `Pago de Nómina/Destajo (Tickets: ${ticketIds.length})`,
                date: new Date()
            });

            // Update Cash Register
            const register = await db.query.cashRegisters.findFirst({
                where: and(
                    eq(cashRegisters.organizationId, orgId),
                    eq(cashRegisters.status, 'open')
                )
            });

            if (register && register.currentSessionId) {
                const performerId = await getPerformerId(req, orgId);
                await db.insert(cashTransactions).values({
                    organizationId: orgId,
                    registerId: register.id,
                    sessionId: register.currentSessionId,
                    type: "out",
                    category: "payroll",
                    amount: netPayout,
                    description: `Pago Nómina (Tickets: ${ticketIds.length})`,
                    performedBy: performerId
                });

                await db.update(cashRegisters)
                    .set({ balance: sql`${cashRegisters.balance} - ${netPayout}` })
                    .where(eq(cashRegisters.id, register.id));
            }
        }

        res.json({
            success: true,
            processedTickets: ticketIds.length,
            processedAdvances: advanceIds.length,
            netPayout
        });

    } catch (error) {
        console.error("Payout error:", error);
        res.status(500).json({ message: "Payout failed", error: String(error) });
    }
});

// NEW: Productivity Reports
router.get("/reports/productivity", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // Simple aggregation driven report
        // Group by Employee and Sum Ticket Totals
        const report = await db.select({
            employeeId: pieceworkTickets.employeeId,
            employeeName: employees.name,
            totalTickets: sql<number>`count(${pieceworkTickets.id})`,
            totalEarned: sql<number>`sum(${pieceworkTickets.totalAmount})`
        })
            .from(pieceworkTickets)
            .leftJoin(employees, eq(pieceworkTickets.employeeId, employees.id))
            .where(eq(pieceworkTickets.organizationId, orgId))
            .groupBy(pieceworkTickets.employeeId, employees.name)
            .orderBy(desc(sql`sum(${pieceworkTickets.totalAmount})`));

        res.json(report);
    } catch (error) {
        res.status(500).json({ message: "Failed to generate report" });
    }
});

export const pieceworkRoutes = router;
