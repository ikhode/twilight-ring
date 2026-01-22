import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { getOrgIdFromRequest } from "../auth_util";
import { insertPieceworkTicketSchema } from "../../shared/schema";
import { db } from "../storage";
import {
    pieceworkTickets,
    productionTasks,
    payrollAdvances,
    employees,
    expenses,
    inventoryMovements
} from "../../shared/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import * as schema from "../../shared/schema";

/**
 * Registra todas las rutas relacionadas con el Control de Destajo (Piecework).
 * 
 * @param {import("express").Express} app - Aplicación Express
 * @returns {void}
 */
export function registerPieceworkRoutes(app: Express): void {
    /**
     * Obtiene el listado de tickets de destajo con filtros opcionales.
     */
    app.get("/api/piecework/tickets", async (req: Request, res: Response): Promise<void> => {
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
    app.get("/api/piecework/tasks", async (req: Request, res: Response): Promise<void> => {
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

    /**
     * Obtiene el listado de adelantos de nómina pendientes.
     */
    app.get("/api/piecework/advances", async (req: Request, res: Response): Promise<void> => {
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
    app.post("/api/piecework/tickets", async (req: Request, res: Response): Promise<void> => {
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

            // Record Inventory Movement Logic (Optional: Deduction of material?)
            // For now we just record the ticket.

            res.status(201).json(ticket);
        } catch (error) {
            console.error("Create ticket error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    /**
     * Registra un nuevo adelanto de nómina.
     */
    app.post("/api/piecework/advances", async (req: Request, res: Response): Promise<void> => {
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
    app.post("/api/piecework/payout", async (req: Request, res: Response): Promise<void> => {
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
}
