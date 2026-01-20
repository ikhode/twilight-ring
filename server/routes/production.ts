import { Router } from "express";
import { storage } from "../storage";
import { getOrgIdFromRequest } from "../auth_util";


const router = Router();

/**
 * Registra el proceso de 'Destope' para un lote de producción.
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.post("/destope", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { instanceId, employeeId, quantity, notes } = req.body;

        const event = await storage.createProcessEvent({
            instanceId,
            eventType: "destope",
            description: `Se realizó el destope de ${quantity} unidades.`,
            metadata: { quantity, employeeId, notes },
            timestamp: new Date()
        });

        res.status(201).json(event);
    } catch (error) {
        console.error("Destope error:", error);
        res.status(500).json({ message: "Failed to record destope" });
    }
});

/**
 * Registra el proceso de 'Deshuace' para un lote de producción.
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.post("/deshuace", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { instanceId, employeeId, quantity, notes } = req.body;

        const event = await storage.createProcessEvent({
            instanceId,
            eventType: "deshuace",
            description: `Se realizó el deshuace de ${quantity} unidades.`,
            metadata: { quantity, employeeId, notes },
            timestamp: new Date()
        });

        res.status(201).json(event);
    } catch (error) {
        console.error("Deshuace error:", error);
        res.status(500).json({ message: "Failed to record deshuace" });
    }
});

/**
 * Registra el proceso de 'Secado' para un lote de producción.
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.post("/secado", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { instanceId, employeeId, temperature, duration, notes } = req.body;

        const event = await storage.createProcessEvent({
            instanceId,
            eventType: "secado",
            description: `Se completó ciclo de secado: ${temperature}°C por ${duration} min.`,
            metadata: { temperature, duration, employeeId, notes },
            timestamp: new Date()
        });

        res.status(201).json(event);
    } catch (error) {
        console.error("Secado error:", error);
        res.status(500).json({ message: "Failed to record secado" });
    }
});

/**
 * Obtiene el resumen de producción filtrado por tipo de proceso.
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.get("/summary", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        // For now, return recent events of production type
        // In a real app we would aggregate data here
        const processes = await storage.getProcesses(orgId);
        const productionProcesses = processes.filter(p => p.type === "production");

        const summary = {
            activeCount: productionProcesses.filter(p => p.status === "active").length,
            totalCount: productionProcesses.length,
            recentEvents: [] // Placeholder
        };

        res.json(summary);
    } catch (error) {
        console.error("Production summary error:", error);
        res.status(500).json({ message: "Failed to fetch production summary" });
    }
});

export default router;
