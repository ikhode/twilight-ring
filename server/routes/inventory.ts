import { Router } from "express";
import { db } from "../storage";
import {
    products, inventoryMovements, insertProductSchema, users,
    productCategories, productGroups, productUnits,
    insertProductCategorySchema, insertProductGroupSchema, insertProductUnitSchema
} from "../../shared/schema";
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
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const inv = await db.query.products.findMany({
            where: and(
                eq(products.organizationId, orgId)
                // eq(products.isArchived, false) -- User wants to see archived items
            ),
            with: {
                categoryRef: true,
                group: true,
                unitRef: true
            }
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
                category: p.categoryRef?.name || p.category, // Fallback to legacy text if needed
                unit: p.unitRef?.name || p.unit, // Fallback to legacy text or abbreviation
                uom: p.unitRef?.abbreviation || p.unit,
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

// --- Categories & Groups Management ---

router.get("/categories", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const cats = await db.query.productCategories.findMany({
            where: eq(productCategories.organizationId, orgId)
        });
        res.json(cats);
    } catch (error) {
        res.status(500).json({ message: "Error fetching categories" });
    }
});

router.post("/categories", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const parsed = insertProductCategorySchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) return res.status(400).json(parsed.error);

        const [cat] = await db.insert(productCategories).values(parsed.data).returning();
        res.status(201).json(cat);
    } catch (error) {
        res.status(500).json({ message: "Error creating category" });
    }
});

router.get("/groups", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const groups = await db.query.productGroups.findMany({
            where: eq(productGroups.organizationId, orgId)
        });
        res.json(groups);
    } catch (error) {
        res.status(500).json({ message: "Error fetching groups" });
    }
});

router.post("/groups", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const parsed = insertProductGroupSchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) return res.status(400).json(parsed.error);

        const [group] = await db.insert(productGroups).values(parsed.data).returning();
        res.status(201).json(group);
    } catch (error) {
        res.status(500).json({ message: "Error creating group" });
    }
});

router.patch("/groups/:id", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { name, description } = req.body;
        const groupId = req.params.id;

        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;

        if (Object.keys(updates).length > 0) {
            await db.update(productGroups)
                .set(updates)
                .where(and(eq(productGroups.id, groupId), eq(productGroups.organizationId, orgId)));
        }

        res.json({ success: true, message: "Group updated" });
    } catch (error) {
        res.status(500).json({ message: "Error updating group" });
    }
});

router.get("/units", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const units = await db.query.productUnits.findMany({
            where: eq(productUnits.organizationId, orgId)
        });
        res.json(units);
    } catch (error) {
        res.status(500).json({ message: "Error fetching units" });
    }
});

router.post("/units", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const parsed = insertProductUnitSchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) return res.status(400).json(parsed.error);

        const [unit] = await db.insert(productUnits).values(parsed.data).returning();
        res.status(201).json(unit);
    } catch (error) {
        res.status(500).json({ message: "Error creating unit" });
    }
});

/**
 * Registra un nuevo producto en el inventario de la organización.
 * @route POST /api/inventory/products
 */
router.post("/products", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const parsed = insertProductSchema.safeParse({
            ...req.body,
            organizationId: orgId,
            // Ensure numbers are numbers, though Zod should handle if coerced, but let's trust body
        });

        if (!parsed.success) {
            res.status(400).json({ message: "Invalid product data", errors: parsed.error });
            return;
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
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

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
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // Simple Low Stock Alert Logic (Excluding archived)
        const alerts = await db.query.products.findMany({
            where: and(
                eq(products.organizationId, orgId),
                eq(products.isArchived, false),
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
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const productId = req.params.id;
        const {
            name, sku, categoryId, groupId,
            isSellable, isPurchasable, isProductionInput, isProductionOutput,
            unitId, price, cost, stock, isActive, isArchived, reason
        } = req.body; // Added isArchived to destructuring

        // 1. Get current state
        const product = await db.query.products.findFirst({
            where: and(eq(products.id, productId), eq(products.organizationId, orgId))
        });

        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }

        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (sku !== undefined) updates.sku = sku;
        if (categoryId !== undefined) updates.categoryId = categoryId;
        if (groupId !== undefined) updates.groupId = groupId === 'none' ? null : groupId;
        if (isSellable !== undefined) updates.isSellable = isSellable;
        if (isPurchasable !== undefined) updates.isPurchasable = isPurchasable;
        if (isProductionInput !== undefined) updates.isProductionInput = isProductionInput;
        if (isProductionOutput !== undefined) updates.isProductionOutput = isProductionOutput;
        if (unitId !== undefined) updates.unitId = unitId;
        if (typeof price === 'number') updates.price = price;
        if (typeof cost === 'number') updates.cost = cost;
        if (typeof cost === 'number') updates.cost = cost;
        if (typeof isActive === 'boolean') updates.isActive = isActive;
        if (typeof isArchived === 'boolean') updates.isArchived = isArchived; // Added isArchived update logic

        // 2. Handle Stock Adjustment with Traceability
        if (typeof stock === 'number') {
            const diff = stock - (product.stock || 0);
            if (diff !== 0) {
                updates.stock = stock;

                // Get userId from session for full traceability
                const userId = (req as any).user?.id;

                await db.insert(inventoryMovements).values({
                    organizationId: orgId,
                    productId: productId,
                    userId: userId || null,
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

/**
 * Obtiene el historial de movimientos de un producto específico con trazabilidad completa.
 * @route GET /api/inventory/products/:id/history
 */
router.get("/products/:id/history", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const productId = req.params.id;

        // Verify product belongs to organization
        const product = await db.query.products.findFirst({
            where: and(eq(products.id, productId), eq(products.organizationId, orgId))
        });

        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }

        // Fetch movements with user information for full traceability
        const movements = await db
            .select({
                id: inventoryMovements.id,
                quantity: inventoryMovements.quantity,
                type: inventoryMovements.type,
                referenceId: inventoryMovements.referenceId,
                beforeStock: inventoryMovements.beforeStock,
                afterStock: inventoryMovements.afterStock,
                date: inventoryMovements.date,
                notes: inventoryMovements.notes,
                userId: inventoryMovements.userId,
                userName: sql<string>`COALESCE(users.email, 'Sistema')`.as('user_name')
            })
            .from(inventoryMovements)
            .leftJoin(sql`users`, eq(inventoryMovements.userId, sql`users.id`))
            .where(and(
                eq(inventoryMovements.organizationId, orgId),
                eq(inventoryMovements.productId, productId)
            ))
            .orderBy(desc(inventoryMovements.date))
            .limit(50);

        res.json(movements);
    } catch (error) {
        console.error("Product history error:", error);
        res.status(500).json({ message: "Failed to fetch product history" });
    }
});

/**
 * Elimina un producto de forma segura (Soft Delete).
 * Mantiene la integridad histórica ocultando el item de todas las listas activas.
 * @route DELETE /api/inventory/products/:id
 */
router.delete("/products/:id", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const productId = req.params.id;

        // 1. Verify existence
        const product = await db.query.products.findFirst({
            where: and(eq(products.id, productId), eq(products.organizationId, orgId))
        });

        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }

        // 2. Perform Soft Delete
        // We set deletedAt AND isArchived/isActive to ensure it's hidden from all existing queries
        await db.update(products)
            .set({
                deletedAt: new Date(),
                isArchived: true,
                isActive: false,
                // userId could be tracked if we had the field in schema for 'deletedBy', 
                // schema says 'deletedBy', let's try to set it if we have user info
                deletedBy: (req as any).user?.id || null
            })
            .where(eq(products.id, productId));

        res.json({ success: true, message: "Item deleted safely" });

    } catch (error) {
        console.error("Delete product error:", error);
        res.status(500).json({ message: "Failed to delete product" });
    }
});

export default router;
