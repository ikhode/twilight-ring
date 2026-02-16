import { db } from "../storage";
import { flowDefinitions } from "../../shared/modules/automation/schema";
import { eq, and, sql } from "drizzle-orm";
import { FlowEngineService } from "./flow-engine";
import { webhooks } from "../../shared/schema";
import crypto from "crypto";

export type SystemEvent =
    | "customer.created"
    | "customer.updated"
    | "deal.created"
    | "deal.status_changed"
    | "sale.completed"
    | "inventory.low"
    | "production.order_created"
    | "production.order_completed"
    | "mrp.recommendation_created";

export class EventBus {
    /**
     * Emits a system event and triggers relevant automation flows
     */
    static async emit(orgId: string, eventType: SystemEvent, payload: any) {
        console.log(`[EventBus] Emitting event: ${eventType} for Org: ${orgId}`);

        try {
            // --- AUTOMATION FLOWS ---
            const activeFlows = await db.query.flowDefinitions.findMany({
                where: and(
                    eq(flowDefinitions.organizationId, orgId),
                    eq(flowDefinitions.status, "active")
                ),
                with: {
                    nodes: true
                }
            });

            for (const flow of activeFlows) {
                const triggerNode = flow.nodes.find(n =>
                    n.type === 'trigger' &&
                    (n.config as any)?.eventType === eventType
                );

                if (triggerNode) {
                    console.log(`[EventBus] Triggering flow: ${flow.name} (${flow.id})`);
                    FlowEngineService.executeFlow(flow.id, orgId, payload)
                        .catch(err => console.error(`[EventBus] Flow execution error:`, err));
                }
            }

            // --- WEBHOOK DISPATCH ---
            const activeWebhooks = await db.query.webhooks.findMany({
                where: and(
                    eq(webhooks.organizationId, orgId),
                    eq(webhooks.isActive, true)
                )
            });

            for (const hook of activeWebhooks) {
                const subscribedEvents = hook.events as string[];
                if (subscribedEvents.includes(eventType)) {
                    console.log(`[EventBus] Dispatching Webhook: ${hook.name} -> ${hook.url}`);

                    const timestamp = Date.now();
                    const body = JSON.stringify({
                        event: eventType,
                        timestamp,
                        payload
                    });

                    const signature = crypto
                        .createHmac("sha256", hook.secret)
                        .update(`${timestamp}.${body}`)
                        .digest("hex");

                    fetch(hook.url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Nexus-Signature": signature,
                            "X-Nexus-Timestamp": timestamp.toString()
                        },
                        body
                    }).then(async (res) => {
                        await db.update(webhooks)
                            .set({
                                lastTriggeredAt: new Date(),
                                lastFailureReason: res.ok ? null : `HTTP ${res.status}`
                            })
                            .where(eq(webhooks.id, hook.id));
                    }).catch(async (err) => {
                        console.error(`[EventBus] Webhook failure:`, err);
                        await db.update(webhooks)
                            .set({ lastFailureReason: err.message })
                            .where(eq(webhooks.id, hook.id));
                    });
                }
            }
        } catch (error) {
            console.error(`[EventBus] Error processing event ${eventType}:`, error);
        }
    }
}
