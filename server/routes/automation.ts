import { Router, Request, Response } from "express";
import { db } from "../storage";
import {
    flowDefinitions,
    flowNodes,
    flowEdges,
    flowExecutions,
    insertFlowDefinitionSchema,
    insertFlowNodeSchema,
    insertFlowEdgeSchema
} from "../../shared/modules/automation/schema";
import { eq, and, desc } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";
import { AuthenticatedRequest } from "../types";
import { FlowEngineService } from "../services/flow-engine";
import { Express } from "express";

const router = Router();

/**
 * List all flows for the organization
 */
router.get("/flows", async (req: Request, res: Response) => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const flows = await db.query.flowDefinitions.findMany({
            where: eq(flowDefinitions.organizationId, orgId),
            orderBy: [desc(flowDefinitions.updatedAt)]
        });

        res.json(flows);
    } catch (error) {
        res.status(500).json({ message: "Error fetching flows", error: String(error) });
    }
});

/**
 * Get a specific flow with its nodes and edges
 */
router.get("/flows/:id", async (req: Request, res: Response) => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const flow = await db.query.flowDefinitions.findFirst({
            where: and(eq(flowDefinitions.id, req.params.id), eq(flowDefinitions.organizationId, orgId)),
            with: {
                nodes: true,
                edges: true
            }
        });

        if (!flow) return res.status(404).json({ message: "Flow not found" });

        res.json(flow);
    } catch (error) {
        res.status(500).json({ message: "Error fetching flow", error: String(error) });
    }
});

/**
 * Create or Update a flow (save diagram)
 */
router.post("/flows/save", async (req: Request, res: Response) => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { id, name, description, nodes, edges } = req.body;

        let flowId = id;

        await db.transaction(async (tx) => {
            // 1. Create or Update Definition
            if (flowId) {
                await tx.update(flowDefinitions)
                    .set({ name, description, updatedAt: new Date() })
                    .where(and(eq(flowDefinitions.id, flowId), eq(flowDefinitions.organizationId, orgId)));
            } else {
                const [newFlow] = await tx.insert(flowDefinitions).values({
                    organizationId: orgId,
                    name,
                    description,
                    status: 'draft'
                }).returning();
                flowId = newFlow.id;
            }

            // 2. Clear old nodes/edges
            await tx.delete(flowNodes).where(eq(flowNodes.flowId, flowId));
            await tx.delete(flowEdges).where(eq(flowEdges.flowId, flowId));

            // 3. Insert new nodes
            if (nodes && nodes.length > 0) {
                await tx.insert(flowNodes).values(nodes.map((n: any) => ({
                    id: n.id,
                    flowId,
                    type: n.type,
                    config: n.data || {},
                    position: n.position || { x: 0, y: 0 },
                    metadata: n.metadata || {}
                })));
            }

            // 4. Insert new edges
            if (edges && edges.length > 0) {
                await tx.insert(flowEdges).values(edges.map((e: any) => ({
                    id: e.id,
                    flowId,
                    sourceNodeId: e.source,
                    targetNodeId: e.target,
                    conditionLabel: e.label || null
                })));
            }
        });

        res.json({ success: true, flowId });
    } catch (error) {
        console.error("Save flow error:", error);
        res.status(500).json({ message: "Error saving flow", error: String(error) });
    }
});

/**
 * Execute a flow
 */
router.post("/flows/:id/execute", async (req: Request, res: Response) => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { payload, isSimulated } = req.body;

        // Execute background task
        FlowEngineService.executeFlow(req.params.id, orgId, payload || {}, !!isSimulated)
            .catch(err => console.error(`Async execution error for flow ${req.params.id}:`, err));

        res.json({ message: "Execution started", status: "running" });
    } catch (error) {
        res.status(500).json({ message: "Error starting execution", error: String(error) });
    }
});

/**
 * Get execution history
 */
router.get("/flows/:id/executions", async (req: Request, res: Response) => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const history = await db.query.flowExecutions.findMany({
            where: and(eq(flowExecutions.flowId, req.params.id), eq(flowExecutions.organizationId, orgId)),
            orderBy: [desc(flowExecutions.startedAt)],
            limit: 20
        });

        res.json(history);
    } catch (error) {
        res.status(500).json({ message: "Error fetching executions", error: String(error) });
    }
});

export function registerAutomationRoutes(app: Express) {
    app.use("/api/automation", router);
}
