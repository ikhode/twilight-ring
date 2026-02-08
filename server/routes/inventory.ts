import { Router, Request, Response } from "express";
import { db } from "../storage";
import {
    products, inventoryMovements, insertProductSchema, users,
    productCategories, productGroups, productUnits,
    insertProductCategorySchema, insertProductGroupSchema, insertProductUnitSchema
} from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";
import { AuthenticatedRequest } from "../types";

const router = Router();

/**
 * Obtiene el inventario de productos enriquecido con predicciones cognitivas de agotamiento.
 * @route GET /api/inventory/products
 */
router.get("/products", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        console.log(`[Inv GET] Requesting products for OrgID: ${orgId}`);
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
            const dailyUsage = Math.floor(Math.random() * 8) + 2;
            const daysRemaining = p.stock > 0 ? Math.floor(p.stock / dailyUsage) : 0;

            const predictedDepletionDate = new Date();
            predictedDepletionDate.setDate(predictedDepletionDate.getDate() + daysRemaining);

            return {
                ...p,
                category: p.categoryRef?.name || p.category,
                unit: p.unitRef?.name || p.unit,
                uom: p.unitRef?.abbreviation || p.unit,
                cognitive: {
                    dailyUsage,
                    daysRemaining,
                    predictedDepletionDate,
                    shouldRestock: daysRemaining < 7,
                    suggestedOrder: daysRemaining < 7 ? Math.round(dailyUsage * 30) : 0
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
 * Obtiene un producto específico por ID.
 * @route GET /api/inventory/products/:id
 */
router.get("/products/:id", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const productId = req.params.id;
        const product = await db.query.products.findFirst({
            where: and(eq(products.id, productId), eq(products.organizationId, orgId)),
            with: {
                categoryRef: true,
                group: true,
                unitRef: true
            }
        });

        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }

        res.json(product);
    } catch (error) {
        console.error("Fetch product error:", error);
        res.status(500).json({ message: "Error fetching product" });
    }
});

// --- Categories & Groups Management ---

router.get("/categories", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const cats = await db.query.productCategories.findMany({
            where: eq(productCategories.organizationId, orgId)
        });
        res.json(cats);
    } catch (error) {
        res.status(500).json({ message: "Error fetching categories" });
    }
});

router.post("/categories", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const parsed = insertProductCategorySchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) {
            res.status(400).json(parsed.error);
            return;
        }

        const [cat] = await db.insert(productCategories).values(parsed.data).returning();
        res.status(201).json(cat);
    } catch (error) {
        res.status(500).json({ message: "Error creating category" });
    }
});

router.patch("/categories/:id", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { name } = req.body;
        const categoryId = req.params.id;

        if (!name || typeof name !== 'string') {
            res.status(400).json({ message: "Name is required" });
            return;
        }

        await db.update(productCategories)
            .set({ name })
            .where(and(eq(productCategories.id, categoryId), eq(productCategories.organizationId, orgId)));

        res.json({ success: true, message: "Category updated" });
    } catch (error) {
        res.status(500).json({ message: "Error updating category" });
    }
});

router.get("/groups", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const groups = await db.query.productGroups.findMany({
            where: eq(productGroups.organizationId, orgId)
        });
        res.json(groups);
    } catch (error) {
        res.status(500).json({ message: "Error fetching groups" });
    }
});

router.post("/groups", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const parsed = insertProductGroupSchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) {
            res.status(400).json(parsed.error);
            return;
        }

        const [group] = await db.insert(productGroups).values(parsed.data).returning();
        res.status(201).json(group);
    } catch (error) {
        res.status(500).json({ message: "Error creating group" });
    }
});

router.patch("/groups/:id", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

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

router.get("/units", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const units = await db.query.productUnits.findMany({
            where: eq(productUnits.organizationId, orgId)
        });
        res.json(units);
    } catch (error) {
        res.status(500).json({ message: "Error fetching units" });
    }
});

router.post("/units", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const parsed = insertProductUnitSchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) {
            res.status(400).json(parsed.error);
            return;
        }

        const [unit] = await db.insert(productUnits).values(parsed.data).returning();
        res.status(201).json(unit);
    } catch (error) {
        res.status(500).json({ message: "Error creating unit" });
    }
});

router.patch("/units/:id", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { name, abbreviation } = req.body;
        const unitId = req.params.id;

        const updates: Record<string, string> = {};
        if (name && typeof name === 'string') updates.name = name;
        if (abbreviation && typeof abbreviation === 'string') updates.abbreviation = abbreviation;

        if (Object.keys(updates).length === 0) {
            res.status(400).json({ message: "No valid fields to update" });
            return;
        }

        await db.update(productUnits)
            .set(updates)
            .where(and(eq(productUnits.id, unitId), eq(productUnits.organizationId, orgId)));

        res.json({ success: true, message: "Unit updated" });
    } catch (error) {
        res.status(500).json({ message: "Error updating unit" });
    }
});

/**
 * Registra un nuevo producto en el inventario de la organización.
 * @route POST /api/inventory/products
 */
router.post("/products", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const parsed = insertProductSchema.safeParse({
            ...req.body,
            organizationId: orgId,
        });

        if (!parsed.success) {
            res.status(400).json({ message: "Invalid product data", errors: parsed.error });
            return;
        }

        const [product] = await db.insert(products).values({
            ...parsed.data,
            organizationId: orgId
        } as any).returning();
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
router.get("/movements", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
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
router.get("/alerts", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const alerts = await db.query.products.findMany({
            where: and(
                eq(products.organizationId, orgId),
                eq(products.isArchived, false),
                eq(products.isActive, true),
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
router.patch("/products/:id", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const productId = req.params.id;

        const {
            name, sku, categoryId, groupId,
            isSellable, isPurchasable, isProductionInput, isProductionOutput,
            unitId, price, cost, stock, isActive, isArchived, reason
        } = req.body;

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
        if (typeof isActive === 'boolean') updates.isActive = isActive;
        if (typeof isArchived === 'boolean') updates.isArchived = isArchived;

        if (typeof stock === 'number') {
            const diff = stock - (product.stock || 0);
            if (diff !== 0) {
                updates.stock = stock;
                const userId = req.user?.id;

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
router.get("/products/:id/history", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const productId = req.params.id;

        const product = await db.query.products.findFirst({
            where: and(eq(products.id, productId), eq(products.organizationId, orgId))
        });

        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }

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
            .leftJoin(users, eq(inventoryMovements.userId, users.id))
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
router.delete("/products/:id", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const productId = req.params.id;

        const product = await db.query.products.findFirst({
            where: and(eq(products.id, productId), eq(products.organizationId, orgId))
        });

        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }

        await db.update(products)
            .set({
                deletedAt: new Date(),
                isArchived: true,
                isActive: false,
                deletedBy: req.user?.id || null
            })
            .where(eq(products.id, productId));

        res.json({ success: true, message: "Item deleted safely" });
    } catch (error) {
        console.error("Delete product error:", error);
        res.status(500).json({ message: "Failed to delete product" });
    }
});

export default router;
