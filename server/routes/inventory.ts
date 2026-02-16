import { Router, Request, Response } from "express";
import { db } from "../storage";
import {
    products, inventoryMovements, insertProductSchema, users,
    productCategories, productGroups, productUnits,
    insertProductCategorySchema, insertProductGroupSchema, insertProductUnitSchema,
    productionTasks
} from "../../shared/schema";
import { getOrgIdFromRequest } from "../auth_util";
import { AuthenticatedRequest } from "../types";
import { logAudit } from "../lib/audit";
import { requirePermission } from "../middleware/permission_check";

const router = Router();

/**
 * Obtiene el inventario de productos enriquecido con predicciones cognitivas de agotamiento.
 * @route GET /api/inventory/products
 */
router.get("/products", requirePermission("inventory.read"), async (req: Request, res: Response): Promise<void> => {
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

        // 1. Fetch real consumption data (30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const consumptionData = await db
            .select({
                productId: inventoryMovements.productId,
                totalConsumed: sql<number>`SUM(ABS(${inventoryMovements.quantity}))`
            })
            .from(inventoryMovements)
            .where(and(
                eq(inventoryMovements.organizationId, orgId),
                sql`${inventoryMovements.type} IN ('sale', 'production_input')`,
                sql`${inventoryMovements.date} >= ${thirtyDaysAgo.toISOString()}`
            ))
            .groupBy(inventoryMovements.productId);

        const consumptionMap = new Map(consumptionData.map(c => [c.productId, Number(c.totalConsumed) || 0]));

        // Enrich with REAL Cognitive Predictions
        const enriched = inv.map(p => {
            const totalConsumed30d = consumptionMap.get(p.id) || 0;
            const dailyUsage = totalConsumed30d / 30; // Simple average

            // Avoid division by zero
            const effectiveDailyUsage = dailyUsage === 0 ? 0.1 : dailyUsage; // Fallback to 0.1 to avoid infinite days

            const daysRemaining = p.stock > 0 ? Math.floor(p.stock / effectiveDailyUsage) : 0;

            const predictedDepletionDate = new Date();
            predictedDepletionDate.setDate(predictedDepletionDate.getDate() + daysRemaining);

            const reorderPoint = p.reorderPointDays || 7;
            const isCritical = p.criticalityLevel === 'critical' || p.criticalityLevel === 'high';

            // Logic: If critical, we want more buffer (e.g. 1.5x reorder point)
            const safetyFactor = isCritical ? 1.5 : 1.0;
            const alertThresholdDays = Math.ceil(reorderPoint * safetyFactor);

            const shouldRestock = daysRemaining < alertThresholdDays;

            // Suggest order to cover 30 days + safety stock
            const targetStockDays = 30;
            const suggestedOrder = Math.max(0, Math.ceil((targetStockDays * effectiveDailyUsage) - p.stock));

            return {
                ...p,
                category: p.categoryRef?.name || p.category,
                unit: p.unitRef?.name || p.unit,
                uom: p.unitRef?.abbreviation || p.unit,
                cognitive: {
                    dailyUsage: parseFloat(effectiveDailyUsage.toFixed(2)),
                    daysRemaining,
                    predictedDepletionDate,
                    shouldRestock,
                    suggestedOrder,
                    demandVariability: p.demandVariability || 'stable',
                    criticalityLevel: p.criticalityLevel || 'medium',
                    reorderPointDays: reorderPoint,
                    riskFactor: isCritical ? 'High' : 'Normal',
                    reasoning: {
                        demandTrend: dailyUsage > 0 ? "Active Consumption" : "No recent movement",
                        stockStatus: daysRemaining < 3 ? "Critical Low" : daysRemaining < 7 ? "Low" : "Healthy",
                        recommendation: shouldRestock ? `Restock immediately (+${suggestedOrder})` : "Monitor"
                    }
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
router.get("/products/:id", requirePermission("inventory.read"), async (req: Request, res: Response): Promise<void> => {
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

router.get("/categories", requirePermission("inventory.read"), async (req: Request, res: Response): Promise<void> => {
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

router.post("/categories", requirePermission('inventory.write'), async (req: Request, res: Response): Promise<void> => {
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

router.patch("/categories/:id", requirePermission('inventory.write'), async (req: Request, res: Response): Promise<void> => {
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

router.get("/groups", requirePermission("inventory.read"), async (req: Request, res: Response): Promise<void> => {
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

router.post("/groups", requirePermission('inventory.write'), async (req: Request, res: Response): Promise<void> => {
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

router.patch("/groups/:id", requirePermission('inventory.write'), async (req: Request, res: Response): Promise<void> => {
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

router.get("/units", requirePermission("inventory.read"), async (req: Request, res: Response): Promise<void> => {
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

router.post("/units", requirePermission('inventory.write'), async (req: Request, res: Response): Promise<void> => {
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

router.patch("/units/:id", requirePermission('inventory.write'), async (req: Request, res: Response): Promise<void> => {
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
router.post("/products", requirePermission('inventory.write'), async (req: Request, res: Response): Promise<void> => {
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

        // Log action
        await logAudit(
            req,
            orgId,
            (req.user as any)?.id || "system",
            "CREATE_PRODUCT",
            product.id,
            {
                message: `Nuevo producto registrado: ${product.name} (SKU: ${product.sku || 'N/A'})`,
                name: product.name,
                sku: product.sku
            }
        );

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
router.patch("/products/:id", requirePermission('inventory.write'), async (req: Request, res: Response): Promise<void> => {
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

            // Log action
            await logAudit(
                req,
                orgId,
                (req.user as any)?.id || "system",
                "UPDATE_PRODUCT",
                productId,
                {
                    message: `Actualización de parámetros del producto ${productId}`,
                    changes: updates
                }
            );
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
router.delete("/products/:id", requirePermission('inventory.write'), async (req: Request, res: Response): Promise<void> => {
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

        // Log action
        await logAudit(
            req,
            orgId,
            req.user?.id || "system",
            "DELETE_PRODUCT",
            productId,
            {
                message: `Producto eliminado/archivado: ${product.name}`,
                name: product.name
            }
        );

        res.json({ success: true, message: "Item deleted safely" });
    } catch (error) {
        console.error("Delete product error:", error);
        res.status(500).json({ message: "Failed to delete product" });
    }
});

/**
 * Analiza el impacto de un producto en la cadena de producción.
 * @route GET /api/inventory/products/:id/production-impact
 */
router.get("/products/:id/production-impact", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const productId = req.params.id;

        // 1. Get the product itself to verify existence
        const product = await db.query.products.findFirst({
            where: and(eq(products.id, productId), eq(products.organizationId, orgId))
        });

        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }

        // 2. Find all recipes/tasks that use this product as an input
        // Since recipeData is JSONB, we'll fetch all recipes and filter in memory for flexibility/simplicity in this iteration
        const allRecipes = await db.select().from(productionTasks).where(and(
            eq(productionTasks.organizationId, orgId),
            eq(productionTasks.isRecipe, true),
            eq(productionTasks.active, true)
        ));

        const impactedRecipes = allRecipes.filter(recipe => {
            const data = recipe.recipeData as { inputs?: Array<{ itemId: string, quantity: number }> } | null;
            return data?.inputs?.some(input => input.itemId === productId);
        });

        if (impactedRecipes.length === 0) {
            res.json({
                productId,
                productName: product.name,
                impactedRecipes: [],
                totalPotentialLoss: 0,
                message: "No active production recipes depend on this product."
            });
            return;
        }

        // 3. For each impacted recipe, identify the OUTPUT product and calculate value
        const impactDetails = await Promise.all(impactedRecipes.map(async (recipe) => {
            const data = recipe.recipeData as {
                inputs?: Array<{ itemId: string, quantity: number }>,
                outputs?: Array<{ itemId: string, quantity: number }>
            };

            const inputConfig = data.inputs?.find(i => i.itemId === productId);
            const outputConfig = data.outputs?.[0]; // Assuming single main output for simplicity

            if (!outputConfig) return null;

            // Fetch output product details
            const outputProduct = await db.query.products.findFirst({
                where: eq(products.id, outputConfig.itemId)
            });

            if (!outputProduct) return null;

            // Calculate "Value at Risk"
            // If we have 0 input, we can produce 0 output.
            // But let's frame it as: "Per batch, this input is critical for generating $X value"
            const potentialValuePerBatch = (outputProduct.price || 0) * outputConfig.quantity;

            return {
                recipeId: recipe.id,
                recipeName: recipe.name,
                inputRequiredPerBatch: inputConfig?.quantity || 0,
                outputProduct: {
                    id: outputProduct.id,
                    name: outputProduct.name,
                    price: outputProduct.price
                },
                potentialValuePerBatch: potentialValuePerBatch / 100 // Convert cents to main currency unit
            };
        }));

        const validImpacts = impactDetails.filter(i => i !== null);
        const totalPotentialValuePerBatch = validImpacts.reduce((sum, item) => sum + (item?.potentialValuePerBatch || 0), 0);

        res.json({
            productId,
            productName: product.name,
            impactedRecipes: validImpacts,
            totalPotentialValuePerBatch,
            currency: "MXN",
            message: `Stopping supply of ${product.name} halts ${validImpacts.length} production processes.`
        });

    } catch (error) {
        console.error("Impact Analysis Error:", error);
        res.status(500).json({ message: "Failed to analyze impact" });
    }
});

export default router;
