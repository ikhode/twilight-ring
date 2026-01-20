import { Express, Request, Response } from "express";
import { db } from "../storage";
import { processes } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";

/**
 * Registra todas las rutas relacionadas con el motor de automatización y flujos de trabajo.
 * 
 * @param {import("express").Express} app - Instancia de la aplicación Express
 */
export function registerAutomationRoutes(app: Express): void {

    /**
     * Provee el catálogo de disparadores (triggers), acciones y condiciones disponibles para el motor de automatización.
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.get("/api/automation/catalog", async (req: Request, res: Response): Promise<void> => {
        res.json({
            triggers: [
                { id: 'manual', name: 'Activación Manual', description: 'Se inicia cuando un usuario presiona un botón', icon: 'zap' },
                { id: 'inventory_low', name: 'Inventario Bajo', description: 'Cuando un producto baja del stock mínimo', icon: 'package' },
                { id: 'fraud_warning', name: 'Alerta de Fraude', description: 'Detectado por AI Guardian en Radar', icon: 'shield-alert' },
                { id: 'new_lead', name: 'Nuevo Prospecto CRM', description: 'Cuando se registra un cliente potencial', icon: 'users' },
            ],
            actions: [
                { id: 'send_email', name: 'Enviar Correo', description: 'Manda un email al equipo responsable', icon: 'mail' },
                { id: 'create_refund', name: 'Generar Reembolso', description: 'Procesa la devolución automáticamente', icon: 'banknote' },
                { id: 'discord_notify', name: 'Notificar Operaciones', description: 'Envía un mensaje al canal de Discord', icon: 'message-square' },
                { id: 'update_crm', name: 'Actualizar CRM', description: 'Cambia el estado del contacto', icon: 'user-plus' },
            ],
            conditions: [
                { id: 'amount_check', name: 'Validar Monto', description: 'Si el total es > o < a X', icon: 'filter' },
                { id: 'status_check', name: 'Validar Estado', description: 'Si el estado coincide con X', icon: 'check-circle' },
            ]
        });
    });

    /**
     * Obtiene el listado de todos los flujos de automatización configurados para la organización.
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.get("/api/automations", async (req: Request, res: Response): Promise<void> => {
        try {
            const orgId = await getOrgIdFromRequest(req);
            if (!orgId) {
                res.status(401).json({ message: "No autorizado" });
                return;
            }

            const automations = await db.query.processes.findMany({
                where: and(
                    eq(processes.organizationId, orgId),
                    eq(processes.type, 'automation')
                )
            });
            res.json(automations);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: err.message });
        }
    });

    /**
     * Sugiere flujos de automatización inteligentes basados en la actividad y configuraciones de la organización.
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.get("/api/automation/suggestions", async (req: Request, res: Response): Promise<void> => {
        try {
            // In a real scenario, we'd query metrics (sales, anomalies) from DB
            const suggestions = [
                {
                    id: 'suggest-fraud',
                    name: 'Detección de Fraude B2B',
                    description: 'Basado en picos de ventas inusuales detectados por Radar.',
                    trigger: { name: 'Venta de Alto Valor', icon: 'shield-alert' },
                    workflow: {
                        nodes: [
                            { id: 't-1', type: 'trigger', data: { name: 'Venta > $10k', icon: 'shield-alert' } },
                            { id: 'c-1', type: 'condition', data: { name: '¿Cliente nuevo?' } },
                            { id: 'a-1', type: 'action', data: { id: 'discord_notify', name: 'Alertar a Gerencia' } }
                        ],
                        edges: [
                            { id: 'e1', source: 't-1', target: 'c-1' },
                            { id: 'e2', source: 'c-1', target: 'a-1', sourceHandle: 'yes' }
                        ]
                    }
                },
                {
                    id: 'suggest-stock',
                    name: 'Reabastecimiento Predictivo',
                    description: 'Tus niveles de inventario están bajando más rápido de lo esperado.',
                    trigger: { name: 'Stock Bajo Crítico', icon: 'package' },
                    workflow: {
                        nodes: [
                            { id: 't-2', type: 'trigger', data: { name: 'Stock < 10%', icon: 'package' } },
                            { id: 'a-2', type: 'action', data: { id: 'create_refund', name: 'Generar Orden de Compra' } }
                        ],
                        edges: [{ id: 'e3', source: 't-2', target: 'a-2' }]
                    }
                }
            ];

            res.json(suggestions);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: err.message });
        }
    });

    /**
     * Guarda o actualiza un flujo de trabajo de automatización.
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.post("/api/automations/save", async (req: Request, res: Response): Promise<void> => {
        try {
            const orgId = await getOrgIdFromRequest(req);
            if (!orgId) {
                res.status(401).json({ message: "No autorizado" });
                return;
            }

            const { id, name, description, workflowData } = req.body;

            if (id) {
                // Update
                const [updated] = await db.update(processes)
                    .set({ name, description, workflowData, updatedAt: new Date() })
                    .where(and(eq(processes.id, id), eq(processes.organizationId, orgId)))
                    .returning();
                res.json(updated);
            } else {
                // Create
                const [created] = await db.insert(processes)
                    .values({
                        organizationId: orgId,
                        name,
                        description,
                        type: 'automation',
                        workflowData,
                    })
                    .returning();
                res.json(created);
            }
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: err.message });
        }
    });

    /**
     * Elimina un flujo de automatización específico.
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.delete("/api/automations/:id", async (req: Request, res: Response): Promise<void> => {
        try {
            const orgId = await getOrgIdFromRequest(req);
            if (!orgId) {
                res.status(401).json({ message: "No autorizado" });
                return;
            }

            await db.delete(processes)
                .where(and(eq(processes.id, req.params.id), eq(processes.organizationId, orgId)));

            res.json({ success: true });
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: err.message });
        }
    });
}
