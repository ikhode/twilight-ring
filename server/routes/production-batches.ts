import { Router } from "express";
import { db } from "../storage";
import { products } from "../../shared/schema";
import { eq, and, gte } from "drizzle-orm";
import { getOrgIdFromKioskRequest } from "../kiosk_util";

const router = Router();

/**
 * Get available production batches (raw materials/products for production)
 * Returns products with stock > 0 suitable for production tasks
 */
router.get("/batches", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromKioskRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // Get products with available stock
        // In a real scenario, you might filter by category (raw materials, etc.)
        const batches = await db.select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            currentStock: products.currentStock,
            unit: products.unit,
            category: products.category
        })
            .from(products)
            .where(and(
                eq(products.organizationId, orgId),
                gte(products.currentStock, 1) // Only products with stock
            ))
            .limit(50);

        // Transform to batch format
        const formattedBatches = batches.map(product => ({
            id: product.sku || `LOTE-${product.id}`,
            name: product.name,
            quality: product.category || 'GENERAL',
            stock: product.currentStock,
            unit: product.unit
        }));

        res.json(formattedBatches);
    } catch (error) {
        console.error("Get batches error:", error);
        res.status(500).json({ message: "Failed to fetch batches" });
    }
});

export default router;
