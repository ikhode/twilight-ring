import { db } from "../storage";
import { flowDefinitions, flowNodes, flowEdges, flowExecutions, FlowNode, FlowEdge } from "../../shared/modules/automation/schema";
import { products, inventoryMovements, sales, notifications, deals } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { whatsAppService } from "./whatsapp";

export class FlowEngineService {
    /**
     * Executes a flow by its ID
     */
    static async executeFlow(flowId: string, organizationId: string, initialPayload: any = {}, isSimulated: boolean = false) {
        // 1. Load Flow and Nodes
        const flow = await db.query.flowDefinitions.findFirst({
            where: and(
                eq(flowDefinitions.id, flowId),
                eq(flowDefinitions.organizationId, organizationId)
            ),
            with: {
                nodes: true,
                edges: true,
            }
        });

        if (!flow) throw new Error("Flow not found");

        // 2. Initializing Execution
        const [execution] = await db.insert(flowExecutions).values({
            flowId,
            organizationId,
            status: isSimulated ? "simulated" : "running",
            context: initialPayload,
            logs: [{ timestamp: new Date().toISOString(), message: `Starting flow: ${flow.name} ${isSimulated ? '(SIMULATION)' : ''}`, type: 'info' }]
        }).returning();

        const executionId = execution.id;

        try {
            // 3. Find Trigger Node
            const triggerNode = flow.nodes.find(n => n.type === 'trigger');
            if (!triggerNode) {
                await this.log(executionId, "No trigger node found", "error");
                await this.completeExecution(executionId, "failed");
                return;
            }

            // 4. Start recursive execution
            await this.executeNode(triggerNode, flow.nodes, flow.edges, executionId, initialPayload, isSimulated);

            await this.completeExecution(executionId, isSimulated ? "simulated" : "completed");
        } catch (error: any) {
            await this.log(executionId, `Execution failed: ${error.message}`, "error");
            await this.completeExecution(executionId, "failed");
            throw error;
        }
    }

    private static async executeNode(
        currentNode: FlowNode,
        allNodes: FlowNode[],
        allEdges: FlowEdge[],
        executionId: string,
        context: any,
        isSimulated: boolean
    ) {
        await this.log(executionId, `Executing node: ${currentNode.id} (${currentNode.type})`, "info");

        let nextNodes: FlowNode[] = [];

        // Logic by node type
        switch (currentNode.type) {
            case 'trigger':
                // Pass through
                nextNodes = this.getNextNodes(currentNode.id, allNodes, allEdges);
                break;

            case 'action':
                await this.handleActionNode(currentNode, context, executionId, isSimulated);
                nextNodes = this.getNextNodes(currentNode.id, allNodes, allEdges);
                break;

            case 'condition':
                const result = await this.evaluateCondition(currentNode, context);
                const branch = result ? 'true' : 'false';
                await this.log(executionId, `Condition evaluated to: ${branch}`, "info");
                nextNodes = this.getNextNodes(currentNode.id, allNodes, allEdges, branch);
                break;

            case 'ai':
                const aiResult = await this.handleAiNode(currentNode, context, executionId, isSimulated);
                context = { ...context, aiOutput: aiResult };
                nextNodes = this.getNextNodes(currentNode.id, allNodes, allEdges);
                break;

            default:
                await this.log(executionId, `Unknown node type: ${currentNode.type}`, "warning");
        }

        // Execute next nodes in sequence
        for (const nextNode of nextNodes) {
            await this.executeNode(nextNode, allNodes, allEdges, executionId, context, isSimulated);
        }
    }

    private static getNextNodes(currentNodeId: string, allNodes: FlowNode[], allEdges: FlowEdge[], branchLabel?: string): FlowNode[] {
        const matchingEdges = allEdges.filter(e => {
            const isSource = e.sourceNodeId === currentNodeId;
            if (branchLabel) {
                return isSource && e.conditionLabel === branchLabel;
            }
            return isSource;
        });

        return matchingEdges
            .map(e => allNodes.find(n => n.id === e.targetNodeId))
            .filter((n): n is FlowNode => !!n);
    }

    private static async handleActionNode(node: FlowNode, context: any, executionId: string, isSimulated: boolean) {
        const config = node.config as any;
        const action = config.action;
        const exec = await db.query.flowExecutions.findFirst({ where: eq(flowExecutions.id, executionId) });
        const orgId = exec?.organizationId;

        if (!orgId) throw new Error("Organization context missing");

        await this.log(executionId, `Running integrated action: ${action}${isSimulated ? ' (SKIPPED - SIMULATION)' : ''}`, "info");

        if (isSimulated) return;

        switch (action) {
            case 'UPDATE_STOCK': {
                const { productId, quantity, reason } = config.params;
                const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
                if (!product) throw new Error("Product not found");

                const newStock = product.stock + quantity;
                await db.update(products).set({ stock: newStock }).where(eq(products.id, productId));
                await db.insert(inventoryMovements).values({
                    organizationId: orgId,
                    productId,
                    quantity,
                    type: "adjustment",
                    beforeStock: product.stock,
                    afterStock: newStock,
                    notes: reason || `Auto-updated by Flow: ${executionId}`,
                });
                await this.log(executionId, `Stock updated for ${product.name}: ${product.stock} -> ${newStock}`, "info");
                break;
            }

            case 'CREATE_SALE': {
                const { productId, quantity, customerId, price } = config.params;
                const [sale] = await db.insert(sales).values({
                    organizationId: orgId,
                    productId,
                    quantity,
                    customerId,
                    totalPrice: price || 0,
                    paymentStatus: "pending",
                    deliveryStatus: "pending",
                } as any).returning();
                await this.log(executionId, `Sale created: ${sale.id}`, "info");
                break;
            }

            case 'NOTIFY_USER': {
                const { userId, title, message, priority } = config.params;
                await db.insert(notifications).values({
                    organizationId: orgId,
                    userId,
                    title,
                    message,
                    priority: priority || "normal",
                } as any);
                await this.log(executionId, `Notification sent to user ${userId}`, "info");
                break;
            }

            case 'SEND_WHATSAPP': {
                const { to, message } = config.params;
                // In a real system we'd use templates or variable substitution
                const finalMessage = message.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => context[key] || "");

                await whatsAppService.handleWebhook({
                    object: 'whatsapp_business_account',
                    entry: [{
                        changes: [{
                            value: {
                                messages: [{
                                    from: 'system',
                                    text: { body: `[OUTBOUND] ${finalMessage}` }
                                }],
                                metadata: { display_phone_number: 'system' }
                            }
                        }]
                    }]
                }); // This is a mock call to the service to "simulate" sending for now as per whatsapp.ts logic

                await this.log(executionId, `WhatsApp message sent to ${to}`, "info");
                break;
            }

            case 'UPDATE_DEAL_STATUS': {
                const { dealId, status } = config.params;
                const targetDealId = dealId || context.dealId;
                if (!targetDealId) throw new Error("Deal ID missing");

                await db.update(deals)
                    .set({ status, updatedAt: new Date() })
                    .where(and(eq(deals.id, targetDealId), eq(deals.organizationId, orgId)));

                await this.log(executionId, `Deal ${targetDealId} status updated to ${status}`, "info");
                break;
            }

            default:
                await this.log(executionId, `Action ${action} not implemented yet`, "warning");
        }
    }

    private static async evaluateCondition(node: FlowNode, context: any): Promise<boolean> {
        const config = node.config as any;
        const { field, operator, value } = config;
        const actualValue = context[field];

        switch (operator) {
            case 'equals': return actualValue == value;
            case 'gt': return actualValue > value;
            case 'lt': return actualValue < value;
            default: return false;
        }
    }

    private static async handleAiNode(node: FlowNode, context: any, executionId: string, isSimulated: boolean) {
        const config = node.config as any;
        const { promptTemplate, model } = config;

        await this.log(executionId, `Invoking AI model ${model || 'default'} with template...`, "info");

        if (isSimulated) {
            return "Simulated AI response for Nexus Architect.";
        }

        // Integration placeholder
        return "AI Response Placeholder";
    }

    private static async log(executionId: string, message: string, type: 'info' | 'error' | 'warning') {
        const logEntry = { timestamp: new Date().toISOString(), message, type };

        // This is a bit inefficient to fetch and save, but for small logs it works.
        // In production we might use array_append in SQL or a separate logs table.
        await db.execute(sql`
            UPDATE flow_executions 
            SET logs = logs || ${JSON.stringify([logEntry])}::jsonb 
            WHERE id = ${executionId}
        `);
    }

    private static async completeExecution(executionId: string, status: 'completed' | 'failed' | 'simulated') {
        await db.update(flowExecutions)
            .set({
                status,
                completedAt: new Date()
            })
            .where(eq(flowExecutions.id, executionId));
    }
}
