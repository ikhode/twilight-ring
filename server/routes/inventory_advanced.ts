import { Router, Request, Response } from "express";
import { db } from "../storage";
import {
    locations, productStocks, transferOrders, inventoryCounts, products,
    insertLocationSchema, insertTransferOrderSchema, inventoryMovements
} from "../../shared/modules/commerce/schema";
import { eq, and, desc, sql, inArray, gte, lt, sum, count } from "drizzle-orm";
import { getOrgIdFromRequest, getAuthenticatedUser } from "../auth_util";
import { requirePermission } from "../middleware/permission_check";
import { logAudit } from "../lib/audit";

const router = Router();

// --- LOCATIONS ---

router.get("/locations", requirePermission("inventory.read"), async (req: Request, res: Response) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ message: "Unauthorized" });

    const locs = await db.select().from(locations).where(eq(locations.organizationId, orgId));
    res.json(locs);
});

router.post("/locations", requirePermission("inventory.write"), async (req: Request, res: Response) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ message: "Unauthorized" });

    const parsed = insertLocationSchema.safeParse({ ...req.body, organizationId: orgId });
    if (!parsed.success) return res.status(400).json(parsed.error);

    const [loc] = await db.insert(locations).values(parsed.data).returning();
    res.status(201).json(loc);
});

router.patch("/locations/:id", requirePermission("inventory.write"), async (req: Request, res: Response) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ message: "Unauthorized" });

    const { name, type, address, isActive, isMain } = req.body;
    await db.update(locations)
        .set({ name, type, address, isActive, isMain })
        .where(and(eq(locations.id, req.params.id), eq(locations.organizationId, orgId)));

    res.json({ success: true });
});

// --- STOCK PER LOCATION ---

router.get("/locations/:id/stock", requirePermission("inventory.read"), async (req: Request, res: Response) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ message: "Unauthorized" });

    const stocks = await db.select({
        productId: productStocks.productId,
        productName: products.name,
        sku: products.sku,
        quantity: productStocks.quantity,
        minStock: productStocks.minStock,
        maxStock: productStocks.maxStock
    })
        .from(productStocks)
        .leftJoin(products, eq(productStocks.productId, products.id))
        .where(and(eq(productStocks.locationId, req.params.id), eq(productStocks.organizationId, orgId)));

    res.json(stocks);
});


// --- TRANSFER ORDERS ---

router.get("/transfers", requirePermission("inventory.read"), async (req: Request, res: Response) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ message: "Unauthorized" });

    const transfers = await db.query.transferOrders.findMany({
        where: eq(transferOrders.organizationId, orgId),
        orderBy: [desc(transferOrders.createdAt)],
        with: {
            sourceLocation: true,
            destinationLocation: true,
        }
    });
    res.json(transfers);
});

router.post("/transfers", requirePermission("inventory.write"), async (req: Request, res: Response) => {
    const orgId = await getOrgIdFromRequest(req);
    const user = await getAuthenticatedUser(req);
    if (!orgId || !user) return res.status(401).json({ message: "Unauthorized" });

    const parsed = insertTransferOrderSchema.safeParse({
        ...req.body,
        organizationId: orgId,
        requestedBy: user.id,
        status: "requested"
    });

    if (!parsed.success) return res.status(400).json(parsed.error);

    const [transfer] = await db.insert(transferOrders).values(parsed.data).returning();

    await logAudit(req, orgId, user.id, "CREATE_TRANSFER", transfer.id, {
        from: transfer.sourceLocationId,
        to: transfer.destinationLocationId
    });

    res.status(201).json(transfer);
});

router.patch("/transfers/:id/status", requirePermission("inventory.write"), async (req: Request, res: Response) => {
    const orgId = await getOrgIdFromRequest(req);
    const user = await getAuthenticatedUser(req);
    if (!orgId || !user) return res.status(401).json({ message: "Unauthorized" });

    const { status } = req.body; // 'approved', 'in_transit', 'completed', 'cancelled'
    const transferId = req.params.id;

    const [transfer] = await db.select().from(transferOrders).where(and(eq(transferOrders.id, transferId), eq(transferOrders.organizationId, orgId)));
    if (!transfer) return res.status(404).json({ message: "Transfer not found" });

    if (status === 'completed' && transfer.status !== 'completed') {
        // EXECUTE MOVEMENT
        const items = transfer.items as Array<{ productId: string, quantity: number }>;

        for (const item of items) {
            // Deduct from Source
            if (transfer.sourceLocationId) {
                // Determine if we need to initialize records
                await initializeStockRecord(orgId, item.productId, transfer.sourceLocationId);

                await db.execute(sql`
                    UPDATE product_stocks 
                    SET quantity = quantity - ${item.quantity} 
                    WHERE product_id = ${item.productId} AND location_id = ${transfer.sourceLocationId}
                `);

                // Log Source Movement
                await db.insert(inventoryMovements).values({
                    organizationId: orgId,
                    productId: item.productId,
                    location: transfer.sourceLocationId,
                    type: "transfer_out",
                    quantity: -item.quantity,
                    referenceId: transferId,
                    date: new Date(),
                    userId: user.id
                });
            }

            // Add to Destination
            if (transfer.destinationLocationId) {
                await initializeStockRecord(orgId, item.productId, transfer.destinationLocationId);

                await db.execute(sql`
                    UPDATE product_stocks 
                    SET quantity = quantity + ${item.quantity} 
                    WHERE product_id = ${item.productId} AND location_id = ${transfer.destinationLocationId}
                `);

                // Log Dest Movement
                await db.insert(inventoryMovements).values({
                    organizationId: orgId,
                    productId: item.productId,
                    location: transfer.destinationLocationId,
                    type: "transfer_in",
                    quantity: item.quantity,
                    referenceId: transferId,
                    date: new Date(),
                    userId: user.id
                });
            }
        }
    }

    await db.update(transferOrders)
        .set({ status, completedAt: status === 'completed' ? new Date() : null })
        .where(eq(transferOrders.id, transferId));

    res.json({ success: true });
});

async function initializeStockRecord(orgId: string, productId: string, locationId: string) {
    const [exists] = await db.select().from(productStocks).where(and(
        eq(productStocks.productId, productId),
        eq(productStocks.locationId, locationId)
    ));

    if (!exists) {
        await db.insert(productStocks).values({
            organizationId: orgId,
            productId,
            locationId,
            quantity: 0
        });
    }
}


// --- IMPORT ---

router.post("/import/json", requirePermission("inventory.write"), async (req: Request, res: Response) => {
    const orgId = await getOrgIdFromRequest(req);
    const user = await getAuthenticatedUser(req);
    if (!orgId) return res.status(401).json({ message: "Unauthorized" });

    const items = req.body.items; // Expects JSON array of products

    if (!Array.isArray(items)) {
        return res.status(400).json({ message: "Invalid payload: items array required" });
    }

    let successCount = 0;
    let errors = [];

    for (const item of items) {
        try {
            // Basic validation
            if (!item.name) continue;

            const [p] = await db.insert(products).values({
                organizationId: orgId,
                name: item.name,
                sku: item.sku || null,
                price: item.price ? Math.round(Number(item.price) * 100) : 0,
                cost: item.cost ? Math.round(Number(item.cost) * 100) : 0,
                stock: item.stock ? Number(item.stock) : 0,
                description: item.description,
                category: item.category,
                isActive: true
            }).returning();

            successCount++;

            // Initial Stock Movement Log
            if (p.stock > 0) {
                await db.insert(inventoryMovements).values({
                    organizationId: orgId,
                    productId: p.id,
                    type: "adjustment", // Initial Load
                    quantity: p.stock,
                    referenceId: "IMPORT_CSV",
                    date: new Date(),
                    userId: user?.id,
                    notes: "Importación masiva inicial"
                });
            }

        } catch (err) {
            errors.push({ name: item.name, error: String(err) });
        }
    }

    await logAudit(req, orgId, user?.id || "system", "IMPORT_PRODUCTS", "BULK", { count: successCount });

    res.json({
        message: "Import processing complete",
        success: successCount,
        errors: errors.length,
        errorDetails: errors
    });
});


router.get("/reports/valuation", requirePermission("inventory.read"), async (req: Request, res: Response) => {
    try {
        const orgId = req.headers["x-organization-id"] as string;

        // 1. Current Valuation (Real-time)
        const allProducts = await db.select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            category: products.category,
            cost: products.cost,
            price: products.price,
            stock: products.stock,
            minStock: products.minStock,
        })
            .from(products)
            .where(eq(products.organizationId, orgId));

        let totalCostValue = 0;
        let totalRetailValue = 0;
        const categoryValuation: Record<string, number> = {};

        allProducts.forEach(p => {
            const stock = p.stock || 0;
            // Cost and Price are in cents
            const costVal = (stock * (p.cost || 0));
            const retailVal = (stock * (p.price || 0));

            totalCostValue += costVal;
            totalRetailValue += retailVal;

            const cat = p.category || "Uncategorized";
            if (!categoryValuation[cat]) categoryValuation[cat] = 0;
            categoryValuation[cat] += costVal;
        });

        // 2. Turnover Analysis (Last 90 Days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const recentMovements = await db.select({
            type: inventoryMovements.type,
            quantity: inventoryMovements.quantity,
            productId: inventoryMovements.productId
        })
            .from(inventoryMovements)
            .where(and(
                eq(inventoryMovements.organizationId, orgId),
                gte(inventoryMovements.date, ninetyDaysAgo)
            ));

        // Calculate COGS approximation
        let estimatedCOGS = 0;
        const productCosts = new Map(allProducts.map(p => [p.id, p.cost || 0]));

        recentMovements.forEach(m => {
            // Assuming simplified COGS logic: any OUT movement contributes to COGS? 
            // Better: only "sale" or explicit "production" usage.
            // Schema has 'type': "sale", "purchase", "production", "adjustment"
            if ((m.type === 'sale' || m.type === 'production') && m.quantity < 0) {
                const qtySold = Math.abs(m.quantity);
                const cost = productCosts.get(m.productId || "") || 0;
                estimatedCOGS += (qtySold * cost);
            }
        });

        const turnoverRatio = totalCostValue > 0 ? (estimatedCOGS / totalCostValue) : 0;
        const annualizedTurnover = turnoverRatio * 4;

        res.json({
            valuation: {
                totalCost: totalCostValue, // in cents
                totalRetail: totalRetailValue, // in cents
                potentialMargin: totalRetailValue - totalCostValue,
                marginPercentage: totalRetailValue > 0 ? ((totalRetailValue - totalCostValue) / totalRetailValue) * 100 : 0
            },
            performance: {
                cogs90Days: estimatedCOGS,
                turnoverRate90Days: turnoverRatio,
                annualizedTurnover: annualizedTurnover,
                avgDaysToSell: annualizedTurnover > 0 ? 365 / annualizedTurnover : 0
            },
            byCategory: Object.entries(categoryValuation)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
        });

    } catch (error) {
        console.error("Valuation Report Error:", error);
        res.status(500).json({ error: "Failed to generate valuation report" });
    }
});

export default router;
