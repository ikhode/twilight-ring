import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { getOrgIdFromRequest } from "../auth_util";
import { insertPieceworkTicketSchema } from "../../shared/schema";

export function registerPieceworkRoutes(app: Express) {
    app.get("/api/piecework/tickets", async (req: Request, res: Response) => {
        try {
            const orgId = await getOrgIdFromRequest(req);
            if (!orgId) return res.status(401).json({ message: "Unauthorized" });

            const tickets = await storage.getPieceworkTickets(orgId);
            res.json(tickets.map(t => ({
                ...t,
                employee: t.user?.name || "Desconocido"
            })));
        } catch (error) {
            console.error("Fetch tickets error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    app.post("/api/piecework/tickets", async (req: Request, res: Response) => {
        try {
            const orgId = await getOrgIdFromRequest(req);
            if (!orgId) return res.status(401).json({ message: "Unauthorized" });

            // Validate body
            const parsed = insertPieceworkTicketSchema.safeParse({
                ...req.body,
                organizationId: orgId,
                totalAmount: req.body.quantity * req.body.unitPrice // Calculate total backend side for safety or trust frontend? 
                // Better to trust frontend for now or calc it here.
                // Schema expects totalAmount.
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
}
