import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { getOrgIdFromRequest } from "../auth_util";
import { insertPieceworkTicketSchema } from "../../shared/schema";

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

            const { userId, employeeId, status } = req.query;
            const targetUserId = (userId || employeeId) as string;
            const ticketStatus = status as string;

            const conditions = [eq(schema.pieceworkTickets.organizationId, orgId)];

            if (targetUserId) {
                // Determine if it's userId (operator) or employeeId (linked via user relation? No, schema says userId refs users)
                // However, pieceworkTickets.userId references users.id. 
                // Employees are in 'employees' table. 
                // We need to clarify if tickets are linked to 'users' or 'employees'.
                // Schema: userId -> users.id. 
                // ProductionTerminal uses mocked 'userId'.
                // We will assume for now filtering by userId matches the schema.
                conditions.push(eq(schema.pieceworkTickets.userId, targetUserId));
            }

            if (ticketStatus) {
                conditions.push(eq(schema.pieceworkTickets.status, ticketStatus));
            }

            const tickets = await db.query.pieceworkTickets.findMany({
                where: and(...conditions),
                with: { user: true },
                orderBy: [desc(schema.pieceworkTickets.createdAt)]
            });

            res.json(tickets.map(t => ({
                ...t,
                employee: t.user?.name || "Desconocido"
            })));
        } catch (error) {
            console.error("Fetch tickets error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    /**
     * Obtiene el listado de tareas disponibles.
     */
    app.get("/api/piecework/tasks", async (req: Request, res: Response): Promise<void> => {
        // Mock list for now, eventually from db table
        res.json([
            "Corte de Pantalón",
            "Costura Lateral",
            "Dobladillo",
            "Planchado Final",
            "Empaque",
            "Ojales",
            "Botones"
        ]);
    });

    /**
     * Registra un nuevo ticket de destajo.
     */
    app.post("/api/piecework/tickets", async (req: Request, res: Response): Promise<void> => {
        try {
            const orgId = await getOrgIdFromRequest(req);
            if (!orgId) return res.status(401).json({ message: "Unauthorized" });

            const parsed = insertPieceworkTicketSchema.safeParse({
                ...req.body,
                organizationId: orgId,
                totalAmount: req.body.quantity * req.body.unitPrice
            });

            if (!parsed.success) {
                return res.status(400).json({ error: parsed.error });
            }

            const ticket = await storage.createPieceworkTicket(parsed.data);
            res.status(201).json(ticket);
        } catch (error) {
            console.error("Create ticket error:", error);
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
                        eq(schema.pieceworkTickets.organizationId, orgId),
                        inArray(schema.pieceworkTickets.id, ticketIds)
                    )
                });
                totalTicketAmount = ticketsToPay.reduce((sum, t) => sum + t.totalAmount, 0);

                await db.update(schema.pieceworkTickets)
                    .set({ status: 'paid', updatedAt: new Date() })
                    .where(inArray(schema.pieceworkTickets.id, ticketIds));
            }

            // 2. Process Advances
            if (advanceIds.length > 0) {
                const advancesToPay = await db.query.payrollAdvances.findMany({
                    where: and(
                        eq(schema.payrollAdvances.organizationId, orgId),
                        inArray(schema.payrollAdvances.id, advanceIds)
                    )
                });
                totalAdvanceAmount = advancesToPay.reduce((sum, a) => sum + a.amount, 0);

                await db.update(schema.payrollAdvances)
                    .set({ status: 'paid' })
                    .where(inArray(schema.payrollAdvances.id, advanceIds));
            }

            const netPayout = totalTicketAmount - totalAdvanceAmount;

            // 3. Record Expense
            if (netPayout > 0) {
                await db.insert(schema.expenses).values({
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
