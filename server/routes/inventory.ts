import { Router } from "express";
import { db } from "../storage";
import { products, inventoryMovements, insertProductSchema } from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";

const router = Router();

/**
 * Obtiene el inventario de productos enriquecido con predicciones cognitivas de agotamiento.
 * @route GET /api/inventory/products
 */
router.get("/products", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const inv = await db.query.products.findMany({
            where: eq(products.organizationId, orgId)
        });

        // Enrich with Cognitive Predictions (Mocked logic for now, utilizing real stock)
        const enriched = inv.map(p => {
            // Mock Usage Rate: Randomly assume 2-10 units sold per day for demo
            // In real app: await db.select({ count: sql`sum(quantity)` }).from(sales)...
            const dailyUsage = Math.floor(Math.random() * 8) + 2;
            const daysRemaining = p.stock > 0 ? Math.floor(p.stock / dailyUsage) : 0;

            const predictedDepletionDate = new Date();
            predictedDepletionDate.setDate(predictedDepletionDate.getDate() + daysRemaining);

            return {
                ...p,
                cognitive: {
                    dailyUsage,
                    daysRemaining,
                    predictedDepletionDate,
                    shouldRestock: daysRemaining < 7, // Alert if < 7 days left
                    suggestedOrder: daysRemaining < 7 ? Math.round(dailyUsage * 30) : 0 // Suggest 30 days worth
                }
            };
        });

        res.json(enriched);
    } catch (error) {
        console.error("Inventory error:", error);
        res.status(500).json({ message: "Error fetching inventory", error: String(error) });
    }
});

/**
 * Registra un nuevo producto en el inventario de la organización.
 * @route POST /api/inventory/products
 */
router.post("/products", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const parsed = insertProductSchema.safeParse({
            ...req.body,
            organizationId: orgId,
            // Ensure numbers are numbers, though Zod should handle if coerced, but let's trust body
        });

        if (!parsed.success) {
            return res.status(400).json({ message: "Invalid product data", errors: parsed.error });
        }

        const [product] = await db.insert(products).values(parsed.data).returning();
        res.status(201).json(product);
    } catch (error) {
        console.error("Create product error:", error);
        res.status(500).json({ message: "Error creating product", error: String(error) });
    }
});

/**
 * Obtiene el historial de movimientos de inventario.
 * @route GET /api/inventory/movements
 */
router.get("/movements", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const movements = await db.query.inventoryMovements.findMany({
            where: eq(inventoryMovements.organizationId, orgId),
            orderBy: [desc(inventoryMovements.date)],
            limit: 100,
            with: {
                product: true
            }
        });

        res.json(movements);
    } catch (error) {
        console.error("Inventory movements error:", error);
        res.status(500).json({ message: "Error fetching inventory movements" });
    }
});

/**
 * Obtiene alertas de stock bajo.
 * @route GET /api/inventory/alerts
 */
router.get("/alerts", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        // Simple Low Stock Alert Logic
        const alerts = await db.query.products.findMany({
            where: and(
                eq(products.organizationId, orgId),
                sql`${products.stock} <= ${products.minStock}`
            )
        });

        res.json(alerts);
    } catch (error) {
        console.error("Inventory alerts error:", error);
        res.status(500).json({ message: "Error fetching inventory alerts" });
    }
});

/**
 * Actualiza un producto (Stock, Precio, Estado).
 * @route PATCH /api/inventory/products/:id
 */
router.patch("/products/:id", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const productId = req.params.id;
        const { stock, price, isActive, reason } = req.body;

        // 1. Get current state
        const product = await db.query.products.findFirst({
            where: and(eq(products.id, productId), eq(products.organizationId, orgId))
        });

        if (!product) return res.status(404).json({ message: "Product not found" });

        const updates: any = {};
        if (typeof price === 'number') updates.price = price;
        if (typeof isActive === 'boolean') updates.isActive = isActive;

        // 2. Handle Stock Adjustment with Traceability
        if (typeof stock === 'number') {
            const diff = stock - product.stock;
            if (diff !== 0) {
                updates.stock = stock;

                await db.insert(inventoryMovements).values({
                    organizationId: orgId,
                    productId: productId,
                    quantity: diff,
                    type: "adjustment",
                    beforeStock: product.stock,
                    afterStock: stock,
                    notes: reason || "Ajuste manual de inventario",
                    date: new Date()
                });
            }
        }

        // 3. Apply Updates
        if (Object.keys(updates).length > 0) {
            await db.update(products)
                .set(updates)
                .where(eq(products.id, productId));
        }

        res.json({ success: true, message: "Product updated" });
    } catch (error) {
        console.error("Update product error:", error);
        res.status(500).json({ message: "Failed to update product" });
    }
});

export default router;
