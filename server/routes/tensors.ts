import { Router } from "express";
import { storage, db } from "../storage";
import { getOrgIdFromRequest } from "../auth_util";
import { sales, products, expenses } from "../../shared/schema";
import { eq, and, sql, gte } from "drizzle-orm";

const router = Router();

/**
 * Tensor Data Endpoint for AI/ML
 * Provides aggregated data for cognitive models
 */
router.get("/tensors", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Sales Tensor: [Day, Orders, Revenue]
        const salesData = await db.select({
            day: sql<number>`EXTRACT(DAY FROM ${sales.date})`,
            orders: sql<number>`count(*)`,
            revenue: sql<number>`sum(${sales.totalPrice})`
        })
            .from(sales)
            .where(and(eq(sales.organizationId, orgId), gte(sales.date, thirtyDaysAgo)))
            .groupBy(sql`EXTRACT(DAY FROM ${sales.date})`)
            .orderBy(sql`EXTRACT(DAY FROM ${sales.date})`);

        const salesTensor = salesData.map(s => [s.day, s.orders, s.revenue]);

        // Inventory Tensor: [ItemId, StockLevel, ReorderPoint]
        const inventoryData = await db.select({
            itemId: products.id,
            stockLevel: products.stock,
            reorderPoint: products.minStock
        })
            .from(products)
            .where(eq(products.organizationId, orgId))
            .limit(100);

        const inventoryTensor = inventoryData.map(i => [
            parseInt(i.itemId.replace(/\D/g, '')) || 0, // Extract number from UUID
            i.stockLevel,
            i.reorderPoint
        ]);

        // Purchases/Expenses Tensor: [Day, Amount, CategoryId]
        const purchasesData = await db.select({
            day: sql<number>`EXTRACT(DAY FROM ${expenses.date})`,
            amount: sql<number>`sum(${expenses.amount})`,
            category: expenses.category
        })
            .from(expenses)
            .where(and(eq(expenses.organizationId, orgId), gte(expenses.date, thirtyDaysAgo)))
            .groupBy(sql`EXTRACT(DAY FROM ${expenses.date})`, expenses.category)
            .orderBy(sql`EXTRACT(DAY FROM ${expenses.date})`);

        const purchasesTensor = purchasesData.map(p => [
            p.day,
            p.amount,
            p.category === 'payroll' ? 1 : p.category === 'inventory' ? 2 : p.category === 'operating' ? 3 : 0
        ]);

        res.json({
            sales: salesTensor,
            inventory: inventoryTensor,
            purchases: purchasesTensor,
            metadata: {
                salesCount: salesTensor.length,
                inventoryCount: inventoryTensor.length,
                purchasesCount: purchasesTensor.length,
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error("Tensor data error:", error);
        res.status(500).json({ message: "Failed to generate tensor data" });
    }
});

export default router;
