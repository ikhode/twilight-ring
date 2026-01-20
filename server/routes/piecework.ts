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
     * Obtiene el listado de tickets de destajo para la organización.
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.get("/api/piecework/tickets", async (req: Request, res: Response): Promise<void> => {
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

    /**
     * Registra un nuevo ticket de destajo, calculando el monto total.
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.post("/api/piecework/tickets", async (req: Request, res: Response): Promise<void> => {
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
