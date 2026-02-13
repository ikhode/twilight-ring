import { db } from "../storage";
import {
    billOfMaterials,
    bomItems,
    products,
    productionOrders,
    productionOrderLogs,
    mrpRecommendations,
    inventoryMovements,
    purchases
} from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";

export class ManufacturingService {
    /**
     * Decomposes a Bill of Materials for a specific quantity.
     * Recursively find all raw materials needed.
     */
    static async decomposeBOM(bomId: string, quantityRequested: number): Promise<Array<{ itemId: string, name: string, quantity: number, scrap: number }>> {
        const items = await db.query.bomItems.findMany({
            where: eq(bomItems.bomId, bomId),
        });

        let results: any[] = [];

        for (const item of items) {
            const product = await db.query.products.findFirst({
                where: eq(products.id, item.itemId)
            });

            if (!product) continue;

            const quantityNeeded = Number(item.quantity) * quantityRequested;
            const scrapFactor = Number(item.scrapFactor || 0);
            const totalWithScrap = quantityNeeded * (1 + scrapFactor);

            // Check if this item has its own default BOM (sub-assembly)
            const subBOM = await db.query.billOfMaterials.findFirst({
                where: and(eq(billOfMaterials.productId, item.itemId), eq(billOfMaterials.isDefault, true))
            });

            if (subBOM) {
                // Recursive decomposition for sub-assemblies
                const subResults = await this.decomposeBOM(subBOM.id, totalWithScrap);
                results = [...results, ...subResults];
            } else {
                results.push({
                    itemId: item.itemId,
                    name: product.name,
                    quantity: totalWithScrap,
                    scrap: scrapFactor
                });
            }
        }

        // Consolidation by ItemId
        const consolidated = results.reduce((acc: any, curr: any) => {
            if (!acc[curr.itemId]) acc[curr.itemId] = { ...curr };
            else acc[curr.itemId].quantity += curr.quantity;
            return acc;
        }, {});

        return Object.values(consolidated);
    }

    /**
     * Performs Material Requirements Planning (MRP) for a production order.
     */
    static async planMRP(orderId: string, organizationId: string) {
        const order = await db.query.productionOrders.findFirst({
            where: and(eq(productionOrders.id, orderId), eq(productionOrders.organizationId, organizationId))
        });

        if (!order) throw new Error("Production Order not found");

        const requirements = await this.decomposeBOM(order.bomId, order.quantityRequested);

        for (const req of requirements) {
            const product = await db.query.products.findFirst({
                where: eq(products.id, req.itemId)
            });

            if (!product) continue;

            const currentStock = product.stock || 0;
            const shortfall = req.quantity - currentStock;

            if (shortfall > 0) {
                // Generate MRP Recommendation
                await db.insert(mrpRecommendations).values({
                    organizationId,
                    productId: req.itemId,
                    orderId: order.id,
                    requiredQuantity: req.quantity.toString(),
                    currentStock: currentStock.toString(),
                    suggestedPurchaseQuantity: shortfall.toString(),
                    status: 'pending'
                });

                // AI Insight: Flag if this is a critical item with high lead time
                // This would be consumed by the frontend to highlight urgency
            }
        }
    }

    /**
     * Calculates the estimated or real cost of a production order.
     */
    static async calculateProductionCost(orderId: string) {
        const order = await db.query.productionOrders.findFirst({
            where: eq(productionOrders.id, orderId),
            with: {
                bom: {
                    with: {
                        items: true
                    }
                }
            }
        });

        if (!order || !order.bom) return 0;

        let materialCost = 0;
        for (const item of order.bom.items) {
            const product = await db.query.products.findFirst({
                where: eq(products.id, item.itemId)
            });
            if (product) {
                const quantity = Number(item.quantity) * order.quantityRequested * (1 + Number(item.scrapFactor || 0));
                materialCost += (product.cost || 0) * quantity;
            }
        }

        // Labor cost from piecework tickets or logs could be added here
        // For now, return material cost + overhead if any
        return Math.round(materialCost);
    }

    /**
     * Finalizes production, updating inventory.
     */
    static async finalizeProduction(orderId: string, organizationId: string) {
        const order = await db.query.productionOrders.findFirst({
            where: and(eq(productionOrders.id, orderId), eq(productionOrders.organizationId, organizationId)),
            with: {
                bom: {
                    with: {
                        items: true
                    }
                }
            }
        });

        if (!order || order.status !== 'qc_pending') return;

        // 1. Deduct Raw Materials (BOM)
        const requirements = await this.decomposeBOM(order.bomId, order.quantityProduced || order.quantityRequested);
        for (const req of requirements) {
            await db.update(products)
                .set({ stock: sql`${products.stock} - ${req.quantity}` })
                .where(eq(products.id, req.itemId));

            await db.insert(inventoryMovements).values({
                organizationId,
                productId: req.itemId,
                quantity: -req.quantity,
                type: "production_input",
                referenceId: order.id,
                notes: `Consumo para Orden de Producción ${order.id}`
            });
        }

        // 2. Add Finished Product
        await db.update(products)
            .set({ stock: sql`${products.stock} + ${order.quantityProduced || order.quantityRequested}` })
            .where(eq(products.id, order.productId));

        await db.insert(inventoryMovements).values({
            organizationId,
            productId: order.productId,
            quantity: order.quantityProduced || order.quantityRequested,
            type: "production",
            referenceId: order.id,
            notes: `Entrada por Orden de Producción ${order.id}`
        });

        // 3. Complete Order
        await db.update(productionOrders)
            .set({ status: 'completed', updatedAt: new Date() })
            .where(eq(productionOrders.id, order.id));
    }
}
