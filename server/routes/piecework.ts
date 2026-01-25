import { Router, Request, Response } from "express";
import { db, storage } from "../storage";
import { getOrgIdFromRequest } from "../auth_util";
import { insertPieceworkTicketSchema, insertProductionTaskSchema } from "../../shared/schema";
import {
    pieceworkTickets,
    productionTasks,
    products,
    payrollAdvances,
    payrollAdvances,
    employees,
    expenses,
    inventoryMovements
} from "../../shared/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";

const router = Router();

/**
 * Obtiene el listado de tickets de destajo con filtros opcionales.
 */
router.get("/tickets", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { employeeId, status } = req.query;
        const targetEmployeeId = employeeId as string;
        const ticketStatus = status as string;

        const conditions = [eq(pieceworkTickets.organizationId, orgId)];

        if (targetEmployeeId) {
            conditions.push(eq(pieceworkTickets.employeeId, targetEmployeeId));
        }

        if (ticketStatus) {
            conditions.push(eq(pieceworkTickets.status, ticketStatus));
        }

        const tickets = await db.query.pieceworkTickets.findMany({
            where: and(...conditions),
            with: { employee: true },
            orderBy: [desc(pieceworkTickets.createdAt)]
        });

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
 * Obtiene el listado de tareas disponibles desde la BD.
 */
router.get("/tasks", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const tasks = await db.select().from(productionTasks)
            .where(and(
                eq(productionTasks.organizationId, orgId),
                eq(productionTasks.active, true)
            ));

        // Fallback seed if empty (for demo purposes)
        if (tasks.length === 0) {
            const defaultTasks = [
                { name: "Corte de Pantalón (Jeans)", unitPrice: 1500, unit: "pza" },
                { name: "Pegado de Bolsas", unitPrice: 500, unit: "par" },
                { name: "Dobladillo Final", unitPrice: 300, unit: "pza" },
                { name: "Planchado y Empaque", unitPrice: 800, unit: "pza" },
            ];

            const createdTasks = [];
            for (const t of defaultTasks) {
                const [newTask] = await db.insert(productionTasks).values({
                    organizationId: orgId,
                    ...t
                }).returning();
                createdTasks.push(newTask);
            }
            res.json(createdTasks);
        } else {
            res.json(tasks);
        }
    } catch (error) {
        console.error("Fetch tasks error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// NEW: Rate Management (Create Task)
router.post("/tasks", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const parsed = insertProductionTaskSchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) return res.status(400).json({ error: parsed.error });

        const [task] = await db.insert(productionTasks).values(parsed.data).returning();
        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: "Failed to create task" });
    }
});

/**
 * Obtiene el listado de adelantos de nómina pendientes.
 */
router.get("/advances", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

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
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

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
            return res.status(400).json({ error: parsed.error });
        }

        const [ticket] = await db.insert(pieceworkTickets).values(parsed.data).returning();

        // Increment Employee Balance
        await db.update(employees)
            .set({ balance: sql`${employees.balance} + ${parsed.data.totalAmount}` })
            .where(eq(employees.id, parsed.data.employeeId));

        // --- RECIPE PROCESSING ---
        // Find task definition to check for active recipe
        const [taskDef] = await db.select().from(productionTasks).where(and(
            eq(productionTasks.organizationId, orgId),
            eq(productionTasks.name, parsed.data.taskName)
        )).limit(1);

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

                    // Check Inventory (Optional: could block or allow negative)
                    // For now we allow negative but log warning in console

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

/**
 * Registra un nuevo adelanto de nómina.
 */
router.post("/advances", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

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

        // If paid immediately, record expense
        if (advanceStatus === 'paid') {
            await db.insert(expenses).values({
                organizationId: orgId,
                amount: amount,
                category: 'payroll',
                description: `Adelanto de Nómina (ID: ${advance.id.slice(0, 8)})`,
                date: new Date()
            });
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
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { ticketIds, advanceIds } = req.body; // Expect arrays of IDs

        if (!Array.isArray(ticketIds) || !Array.isArray(advanceIds)) {
            return res.status(400).json({ message: "Invalid payload" });
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

        // 3. Record Expense
        if (netPayout > 0) {
            await db.insert(expenses).values({
                organizationId: orgId,
                amount: netPayout,
                category: 'payroll',
                description: `Pago de Nómina/Destajo (Tickets: ${ticketIds.length})`,
                date: new Date()
            });
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
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

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
