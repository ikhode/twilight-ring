import { Router } from "express";
import { db } from "../storage";
import {
    purchases, products, inventoryMovements, suppliers, expenses,
    insertPurchaseSchema, insertSupplierSchema, userOrganizations
} from "../../shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { getOrgIdFromRequest, getAuthenticatedUser } from "../auth_util";

const router = Router();

/**
 * Lists all purchases for the organization.
 */
router.get("/", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const data = await db.query.purchases.findMany({
            where: eq(purchases.organizationId, orgId),
            orderBy: [desc(purchases.date)],
            with: {
                supplier: true,
                product: true,
                driver: true,
                vehicle: true
            }
        });
        res.json(data);
    } catch (error) {
        console.error("Purchases list error:", error);
        res.status(500).json({ message: "Error fetching purchases" });
    }
});

/**
 * Creates a new purchase order.
 * Expects: { supplierId, items: [{ productId, quantity, cost }], logisticsMethod, driverId, vehicleId, freightCost, paymentMethod }
 */
router.post("/", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { supplierId, items, logisticsMethod, driverId, vehicleId, freightCost, paymentMethod, status, batchId: incomingBatchId } = req.body;
        const batchId = incomingBatchId || `PO-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

        if (!items || !Array.isArray(items)) {
            res.status(400).json({ message: "Items array required" });
            return;
        }

        // Idempotency: Check if batch already exists
        const existing = await db.query.purchases.findFirst({
            where: and(eq(purchases.batchId, batchId), eq(purchases.organizationId, orgId))
        });
        if (existing) {
            res.status(400).json({ message: "Esta orden de compra ya ha sido procesada o el ID de lote está duplicado.", batchId });
            return;
        }

        // Get user for approval check
        const user = await getAuthenticatedUser(req);
        const membership = await db.query.userOrganizations.findFirst({
            where: and(eq(userOrganizations.userId, user!.id), eq(userOrganizations.organizationId, orgId))
        });
        const isAdmin = membership?.role === 'admin';

        const stats = { success: 0, errors: 0 };
        const createdIds = [];

        for (const item of items) {
            try {
                // Verify product belongs to org
                const [productStr] = await db.select().from(products).where(and(eq(products.id, item.productId), eq(products.organizationId, orgId)));
                if (!productStr) {
                    console.error(`Product ${item.productId} not found or unauthorized`);
                    stats.errors++;
                    continue;
                }

                const totalAmount = item.cost * item.quantity;
                const requiresApproval = !isAdmin && totalAmount > 500000; // Example: > $5,000 MXN requires admin

                const [record] = await db.insert(purchases).values({
                    organizationId: orgId,
                    supplierId,
                    productId: item.productId,
                    quantity: item.quantity,
                    totalAmount,
                    batchId,
                    paymentStatus: status === "paid" ? "paid" : "pending",
                    paymentMethod: paymentMethod || null,
                    deliveryStatus: status === "received" ? "received" : "pending",
                    logisticsMethod: logisticsMethod || "delivery",
                    driverId: driverId || null,
                    vehicleId: vehicleId || null,
                    freightCost: freightCost || 0,
                    isApproved: !requiresApproval,
                    approvedBy: !requiresApproval ? user!.id : null,
                    date: new Date(),
                    paidAt: status === "paid" ? new Date() : null,
                    receivedAt: status === "received" ? new Date() : null,
                    notes: item.notes || null
                }).returning();

                createdIds.push(record.id);
                stats.success++;

                // If created as 'received' and approved, process stock
                if (status === "received" && record.isApproved) {
                    await receivePurchaseStock(orgId, record);
                }

                // If created as 'paid' and approved, record expense
                if (status === "paid" && record.isApproved) {
                    await recordPurchasePayment(orgId, record);
                }

            } catch (err) {
                console.error("Error creating purchase item:", err);
                stats.errors++;
            }
        }

        res.json({ message: "Purchase order created", stats, batchId, ids: createdIds });

    } catch (error) {
        console.error("Create purchase error:", error);
        res.status(500).json({ message: "Error creating purchase" });
    }
});

/**
 * Marks a purchase item as received (Update Stock).
 */
async function receivePurchaseStock(orgId: string, purchase: any) {
    // 1. Update Inventory (Stock + Weighted Average Cost)
    const [product] = await db.select().from(products).where(eq(products.id, purchase.productId));
    if (product) {
        const newStock = (product.stock || 0) + purchase.quantity;

        // Calculate new Weighted Average Cost
        const currentTotalValue = (product.cost || 0) * (product.stock || 0);
        const purchaseTotalValue = purchase.totalAmount;
        const newCost = newStock > 0 ? Math.round((currentTotalValue + purchaseTotalValue) / newStock) : product.cost;

        await db.update(products)
            .set({ stock: newStock, cost: newCost })
            .where(eq(products.id, purchase.productId));

        // Log Movement
        await db.insert(inventoryMovements).values({
            organizationId: orgId,
            productId: purchase.productId,
            type: "purchase",
            quantity: purchase.quantity,
            referenceId: purchase.id,
            beforeStock: product.stock || 0,
            afterStock: newStock,
            date: new Date(),
            notes: `Recepción Compra #${purchase.id.slice(0, 8)}`
        });
    }

    // 2. Update Purchase Status
    await db.update(purchases)
        .set({ deliveryStatus: "received", receivedAt: new Date() })
        .where(eq(purchases.id, purchase.id));

    // --- NEW: Emit to Cognitive Engine for Stock Monitoring ---
    const { CognitiveEngine } = await import("../lib/cognitive-engine");
    CognitiveEngine.emit({
        orgId,
        type: "employee_action", // Using generic for now or I could add "inventory_refill"
        data: {
            action: "purchase_received",
            productId: purchase.productId,
            quantity: purchase.quantity,
            notes: `Stock incrementado para producto ${product?.name || 'Insumo'}`
        }
    });
}

/**
 * Registers payment for a purchase (Finance).
 */
async function recordPurchasePayment(orgId: string, purchase: any) {
    // 1. Find the product name for description
    const [product] = await db.select({ name: products.name }).from(products).where(eq(products.id, purchase.productId)).limit(1);

    // 2. Record Financial Expense
    await db.insert(expenses).values({
        organizationId: orgId,
        amount: purchase.totalAmount,
        description: `Pago Compra: ${product?.name || 'Insumo'} (${purchase.quantity} u.)`,
        date: new Date(),
        category: "Abastecimiento",
        supplierId: purchase.supplierId
    });

    // 3. Update Purchase Status
    await db.update(purchases)
        .set({ paymentStatus: "paid", paidAt: new Date() })
        .where(eq(purchases.id, purchase.id));
}

/**
 * Records freight cost as a separate expense.
 */
async function recordFreightExpense(orgId: string, purchase: any, amount: number) {
    await db.insert(expenses).values({
        organizationId: orgId,
        amount: amount,
        description: `Flete de Compra #${purchase.id.slice(0, 8)}`,
        date: new Date(),
        category: "Logística",
        // metadata not supported in current schema
    });
}

router.patch("/:id/receive", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { id } = req.params;
        const [purchase] = await db.query.purchases.findMany({
            where: and(eq(purchases.id, id), eq(purchases.organizationId, orgId)),
        });

        if (!purchase) {
            res.status(404).json({ message: "Purchase not found" });
            return;
        }
        if (purchase.deliveryStatus === "received") {
            res.status(400).json({ message: "Already received" });
            return;
        }

        await receivePurchaseStock(orgId, purchase);
        res.json({ message: "Stock updated successfully." });
    } catch (error) {
        console.error("Receive purchase error:", error);
        res.status(500).json({ message: "Error receiving item" });
    }
});

router.patch("/:id/pay", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { id } = req.params;
        const { paymentMethod } = req.body;

        const [purchase] = await db.query.purchases.findMany({
            where: and(eq(purchases.id, id), eq(purchases.organizationId, orgId)),
        });

        if (!purchase) {
            res.status(404).json({ message: "Purchase not found" });
            return;
        }
        if (purchase.paymentStatus === "paid") {
            res.status(400).json({ message: "Already paid" });
            return;
        }

        // Update method if provided
        if (paymentMethod) {
            await db.update(purchases).set({ paymentMethod }).where(eq(purchases.id, id));
            purchase.paymentMethod = paymentMethod;
        }

        await recordPurchasePayment(orgId, purchase);
        res.json({ message: "Payment registered successfully." });
    } catch (error) {
        console.error("Pay purchase error:", error);
        res.status(500).json({ message: "Error processing payment" });
    }
});

router.patch("/:id/logistics", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { id } = req.params;
        const { driverId, vehicleId, freightCost, logisticsMethod } = req.body;

        const [existing] = await db.select().from(purchases).where(and(eq(purchases.id, id), eq(purchases.organizationId, orgId))).limit(1);
        if (!existing) {
            res.status(404).json({ message: "Purchase not found" });
            return;
        }

        const updateData: any = {};
        if (driverId !== undefined) updateData.driverId = driverId;
        if (vehicleId !== undefined) updateData.vehicleId = vehicleId;
        if (freightCost !== undefined) updateData.freightCost = freightCost;
        if (logisticsMethod !== undefined) updateData.logisticsMethod = logisticsMethod;

        const [updated] = await db.update(purchases)
            .set(updateData)
            .where(eq(purchases.id, id))
            .returning();

        res.json(updated);
    } catch (error) {
        console.error("Update purchase logistics error:", error);
        res.status(500).json({ message: "Error updating logistics" });
    }
});

/**
 * Approves a whole batch of purchases (Admin Only).
 */
router.patch("/batch/:batchId/approve", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        const user = await getAuthenticatedUser(req);
        if (!orgId || !user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const membership = await db.query.userOrganizations.findFirst({
            where: and(eq(userOrganizations.userId, user.id), eq(userOrganizations.organizationId, orgId))
        });
        if (membership?.role !== 'admin') {
            res.status(403).json({ message: "Only administrators can approve purchase orders" });
            return;
        }

        const { batchId } = req.params;

        await db.update(purchases)
            .set({ isApproved: true, approvedBy: user.id })
            .where(and(eq(purchases.batchId, batchId), eq(purchases.organizationId, orgId)));

        res.json({ message: "Batch approved successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error approving batch" });
    }
});

/**
 * Receives all items in a batch.
 */
router.patch("/batch/:batchId/receive", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { batchId } = req.params;
        const pendingItems = await db.query.purchases.findMany({
            where: and(
                eq(purchases.batchId, batchId),
                eq(purchases.organizationId, orgId),
                eq(purchases.deliveryStatus, "pending"),
                eq(purchases.isApproved, true)
            )
        });

        if (pendingItems.length === 0) {
            res.status(400).json({ message: "No pending or approved items found in this batch" });
            return;
        }

        for (const item of pendingItems) {
            await receivePurchaseStock(orgId, item);
        }

        res.json({ message: `${pendingItems.length} items received successfully` });
    } catch (error) {
        res.status(500).json({ message: "Error receiving batch" });
    }
});

// End of Router



/**
 * --- NEW FEATURES ---
 */

// Supplier Management
router.get("/suppliers", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const allSuppliers = await db.query.suppliers.findMany({
            where: eq(suppliers.organizationId, orgId)
        });
        res.json(allSuppliers);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch suppliers" });
    }
});

router.post("/suppliers", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const parsed = insertSupplierSchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) {
            res.status(400).json(parsed.error);
            return;
        }

        const [supplier] = await db.insert(suppliers).values(parsed.data).returning();
        res.status(201).json(supplier);
    } catch (error) {
        res.status(500).json({ message: "Failed to create supplier" });
    }
});

router.put("/suppliers/:id", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const { id } = req.params;

        const [updated] = await db.update(suppliers)
            .set(req.body)
            .where(and(eq(suppliers.id, id), eq(suppliers.organizationId, orgId)))
            .returning();

        if (!updated) {
            res.status(404).json({ message: "Supplier not found" });
            return;
        }
        res.json(updated);

    } catch (error) {
        res.status(500).json({ message: "Failed to update supplier" });
    }
});

// Cost Analysis (Simple Average Cost History)
router.get("/history/cost-analysis", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // Get purchases grouped by product to see cost evolution
        // For MVP, we just return the purchase history as raw data for the frontend to chart
        const history = await db.query.purchases.findMany({
            where: and(
                eq(purchases.organizationId, orgId),
                eq(purchases.deliveryStatus, "received")
            ),
            with: { product: true },
            orderBy: [desc(purchases.date)],
            limit: 50
        });

        const analysis = history.map(p => ({
            date: p.date,
            product: p.product?.name,
            quantity: p.quantity,
            totalCost: p.totalAmount,
            unitCost: p.quantity > 0 ? Math.round(p.totalAmount / p.quantity) : 0
        }));

        res.json(analysis);
    } catch (error) {
        res.status(500).json({ message: "Failed to generate cost analysis" });
    }
});

export default router;
