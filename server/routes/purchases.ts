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
                    await receiveItem(orgId, { ...record, product: productStr }); // Pass product data for expense creation
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

// Helper to create finance transaction
async function createExpenseFromPurchase(orgId: string, purchase: any) {
    // Determine category based on product type or default to 'Materials'
    // For now, we use a generic 'Expense' placeholder or try to find a matching category

    await db.insert(expenses).values({
        organizationId: orgId,
        type: "expense",
        amount: purchase.totalAmount, // Already in cents
        description: `Compra: ${purchase.product?.name || 'Insumo'} (${purchase.quantity} u.)`,
        date: new Date(),
        status: "completed",
        category: "Abastecimiento", // Simple string for now as per schema
        metadata: { purchaseId: purchase.id, supplierId: purchase.supplierId }
    });
}

/**
 * Marks a purchase item as received, updates inventory, and RECORDS EXPENSE.
 */
async function receiveItem(orgId: string, purchase: any) {
    // 1. Update Purchase Status
    await db.update(purchases)
        .set({ deliveryStatus: "received", paymentStatus: "paid" }) // Assuming COD or immediate liability
        .where(eq(purchases.id, purchase.id));

    // 2. Update Inventory (Stock + Weighted Average Cost)
    const [product] = await db.select().from(products).where(eq(products.id, purchase.productId));
    if (product) {
        const newStock = (product.stock || 0) + purchase.quantity;

        // Calculate new Weighted Average Cost
        // (OldCost * OldStock + NewCost * NewQty) / NewTotalStock
        const currentTotalValue = (product.cost || 0) * (product.stock || 0);
        const purchaseTotalValue = purchase.totalAmount; // This is total for the line
        const newCost = newStock > 0 ? Math.round((currentTotalValue + purchaseTotalValue) / newStock) : 0;

        await db.update(products)
            .set({ stock: newStock, cost: newCost })
            .where(eq(products.id, purchase.productId));

        // Log Movement
        await db.insert(inventoryMovements).values({
            organizationId: orgId,
            productId: purchase.productId,
            type: "in",
            quantity: purchase.quantity,
            reason: "purchase_receive",
            referenceId: purchase.id,
            beforeStock: product.stock || 0,
            afterStock: newStock,
            date: new Date(),
            notes: `Recepción Compra #${purchase.id.slice(0, 8)}`
        });
    }

    // 3. CORE INTEGRATION: Record Financial Expense
    // Check if "finance" module is active for this org?
    // For now, we assume if you have purchases, you have finance or at least want the record.
    await createExpenseFromPurchase(orgId, purchase);
}

router.patch("/:id/receive", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { id } = req.params;

        const [purchase] = await db.query.purchases.findMany({
            where: and(eq(purchases.id, id), eq(purchases.organizationId, orgId)),
            with: { product: true }
        });

        if (!purchase) return res.status(404).json({ message: "Purchase not found" });
        if (purchase.deliveryStatus === "received") return res.status(400).json({ message: "Already received" });

        await receiveItem(orgId, purchase);

        res.json({ message: "Purchase received, inventory updated, and expense recorded." });
    } catch (error) {
        console.error("Receive purchase error:", error);
        res.status(500).json({ message: "Error receiving item" });
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
