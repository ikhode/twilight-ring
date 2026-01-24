import { Router } from "express";
import { db } from "../storage";
import {
    purchases, products, inventoryMovements, suppliers,
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
                product: true
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
 * Expects: { supplierId, items: [{ productId, quantity, cost }] }
 * Logic: One purchase record per item for simplicity given the schema structure.
 */
router.post("/", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { supplierId, items, status } = req.body;

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
                    totalAmount, // This acts as line total
                    paymentStatus: "pending",
                    deliveryStatus: status === "received" ? "received" : "pending",
                    date: new Date()
                }).returning();

                createdIds.push(record.id);
                stats.success++;

                // If created as 'received' immediately, process stock
                if (status === "received") {
                    await receiveItem(orgId, record);
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
 * Marks a purchase item as received and updates inventory + weighted average cost.
 */
router.patch("/:id/receive", async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const [purchase] = await db.select().from(purchases).where(and(eq(purchases.id, id), eq(purchases.organizationId, orgId)));

        if (!purchase) return res.status(404).json({ message: "Purchase not found" });
        if (purchase.deliveryStatus === "received") return res.status(400).json({ message: "Already received" });

        // Update status
        await db.update(purchases)
            .set({ deliveryStatus: "received" })
            .where(eq(purchases.id, id));

        // Process Stock & Cost
        if (purchase.productId) {
            await receiveItem(orgId, purchase);
        }

        res.json({ message: "Item received", success: true });

    } catch (error) {
        console.error("Receive purchase error:", error);
        res.status(500).json({ message: "Error receiving item" });
    }
});

// Helper function to handle stock increase and cost averaging
async function receiveItem(orgId: string, purchase: any) {
    const [product] = await db.select().from(products).where(and(eq(products.id, purchase.productId), eq(products.organizationId, orgId)));
    if (!product) return;

    // Calculate Weighted Average Cost
    // currentTotalValue = stock * currentCost
    // newTotalValue = currentTotalValue + (purchaseQty * purchaseCost)
    // newStock = stock + purchaseQty
    // newCost = newTotalValue / newStock

    const currentStock = product.stock || 0;
    const currentCost = product.cost || 0;
    const purchaseQty = purchase.quantity;
    const purchaseTotalCost = purchase.totalAmount; // totalAmount is quantity * unitCost

    const newStock = currentStock + purchaseQty;
    const newTotalValue = (currentStock * currentCost) + purchaseTotalCost;
    const newCost = newStock > 0 ? Math.round(newTotalValue / newStock) : purchaseTotalCost / purchaseQty;

    // Update Product
    await db.update(products).set({
        stock: newStock,
        cost: newCost
    }).where(and(eq(products.id, purchase.productId), eq(products.organizationId, orgId)));

    // Log Movement
    await db.insert(inventoryMovements).values({
        organizationId: orgId,
        productId: purchase.productId,
        quantity: purchaseQty,
        type: "purchase",
        referenceId: purchase.id,
        beforeStock: currentStock,
        afterStock: newStock,
        date: new Date(),
        notes: `Recepción Compra #${purchase.id.slice(0, 8)}`
    });
}

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
