import { Router } from "express";
import { db } from "../storage";
import {
    purchases, products, inventoryMovements, suppliers, expenses,
    insertPurchaseSchema, insertSupplierSchema
} from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";

const router = Router();

/**
 * Lists all purchases for the organization.
 */
router.get("/", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

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
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { supplierId, items, logisticsMethod, driverId, vehicleId, freightCost, paymentMethod, status } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ message: "Items array required" });
        }

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

                const [record] = await db.insert(purchases).values({
                    organizationId: orgId,
                    supplierId,
                    productId: item.productId,
                    quantity: item.quantity,
                    totalAmount,
                    paymentStatus: status === "paid" ? "paid" : "pending",
                    paymentMethod: paymentMethod || null,
                    deliveryStatus: status === "received" ? "received" : "pending",
                    logisticsMethod: logisticsMethod || "delivery",
                    driverId: driverId || null,
                    vehicleId: vehicleId || null,
                    freightCost: freightCost || 0,
                    date: new Date(),
                    paidAt: status === "paid" ? new Date() : null,
                    receivedAt: status === "received" ? new Date() : null,
                    notes: item.notes || null // Save quality/variant metadata
                }).returning();

                createdIds.push(record.id);
                stats.success++;

                // If created as 'received', process stock
                if (status === "received") {
                    await receivePurchaseStock(orgId, record);
                }

                // If created as 'paid', record expense
                if (status === "paid") {
                    await recordPurchasePayment(orgId, record);
                }

                // If freightCost exists, record it as a separate expense
                if (freightCost > 0) {
                    await recordFreightExpense(orgId, record, freightCost);
                }

            } catch (err) {
                console.error("Error creating purchase item:", err);
                stats.errors++;
            }
        }

        res.json({ message: "Purchase processed", stats, ids: createdIds });

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
        type: "expense",
        amount: purchase.totalAmount,
        description: `Pago Compra: ${product?.name || 'Insumo'} (${purchase.quantity} u.)`,
        date: new Date(),
        status: "completed",
        category: "Abastecimiento",
        metadata: { purchaseId: purchase.id, supplierId: purchase.supplierId }
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
        type: "expense",
        amount: amount,
        description: `Flete de Compra #${purchase.id.slice(0, 8)}`,
        date: new Date(),
        status: "completed",
        category: "Logística",
        metadata: { purchaseId: purchase.id, logistics: true }
    });
}

router.patch("/:id/receive", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { id } = req.params;
        const [purchase] = await db.query.purchases.findMany({
            where: and(eq(purchases.id, id), eq(purchases.organizationId, orgId)),
        });

        if (!purchase) return res.status(404).json({ message: "Purchase not found" });
        if (purchase.deliveryStatus === "received") return res.status(400).json({ message: "Already received" });

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
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { id } = req.params;
        const { paymentMethod } = req.body;

        const [purchase] = await db.query.purchases.findMany({
            where: and(eq(purchases.id, id), eq(purchases.organizationId, orgId)),
        });

        if (!purchase) return res.status(404).json({ message: "Purchase not found" });
        if (purchase.paymentStatus === "paid") return res.status(400).json({ message: "Already paid" });

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
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { id } = req.params;
        const { driverId, vehicleId, freightCost, logisticsMethod } = req.body;

        const [existing] = await db.select().from(purchases).where(and(eq(purchases.id, id), eq(purchases.organizationId, orgId))).limit(1);
        if (!existing) return res.status(404).json({ message: "Purchase not found" });

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

// End of Router



/**
 * --- NEW FEATURES ---
 */

// Supplier Management
router.get("/suppliers", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

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
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const parsed = insertSupplierSchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) return res.status(400).json(parsed.error);

        const [supplier] = await db.insert(suppliers).values(parsed.data).returning();
        res.status(201).json(supplier);
    } catch (error) {
        res.status(500).json({ message: "Failed to create supplier" });
    }
});

router.put("/suppliers/:id", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });
        const { id } = req.params;

        const [updated] = await db.update(suppliers)
            .set(req.body)
            .where(and(eq(suppliers.id, id), eq(suppliers.organizationId, orgId)))
            .returning();

        if (!updated) return res.status(404).json({ message: "Supplier not found" });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: "Failed to update supplier" });
    }
});

// Cost Analysis (Simple Average Cost History)
router.get("/history/cost-analysis", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

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
