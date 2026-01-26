import { Router } from "express";
import { db } from "../storage";
import {
    sales, products, inventoryMovements, payments, cashRegisters, cashTransactions, bankAccounts,
    insertSaleSchema
} from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";

import { requireModule } from "../middleware/moduleGuard";

const router = Router();
router.use(requireModule("/sales"));

/**
 * Registra una venta, actualiza inventario, genera movimiento y registra el pago.
 * @route POST /api/sales
 */
router.post("/", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { items, driverId, vehicleId, customerId, paymentStatus, paymentMethod, bankAccountId } = req.body;
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ message: "Invalid payload: items array required" });
        }

        const stats = { success: 0, errors: 0 };
        const successfulItems: any[] = [];

        // Process sequentially to manage stock updates safely
        for (const item of items) {
            try {
                // 1. Verify Stock
                const [product] = await db.select().from(products).where(and(eq(products.id, item.productId), eq(products.organizationId, orgId)));
                if (!product || product.stock < item.quantity) {
                    console.warn(`Skipping item ${item.productId}: Insufficient stock`);
                    stats.errors++;
                    continue; // Skip this item but attempt others
                }

                // 2. Create Sale Record
                const [saleRecord] = await db.insert(sales).values({
                    organizationId: orgId,
                    productId: item.productId,
                    customerId: customerId || null,
                    quantity: item.quantity,
                    totalPrice: item.price * item.quantity, // Price is unit price in cents
                    driverId: driverId || null,
                    vehicleId: vehicleId || null,
                    paymentStatus: paymentStatus || "pending",
                    paymentMethod: paymentMethod || null,
                    bankAccountId: bankAccountId || null,
                    deliveryStatus: "pending",
                    date: new Date()
                }).returning();

                // 3. Update Stock
                await db.update(products)
                    .set({ stock: product.stock - item.quantity })
                    .where(eq(products.id, item.productId));

                // 4. Record Inventory Movement
                await db.insert(inventoryMovements).values({
                    organizationId: orgId,
                    productId: item.productId,
                    quantity: -item.quantity, // Out
                    type: "sale",
                    referenceId: saleRecord.id,
                    beforeStock: product.stock,
                    afterStock: product.stock - item.quantity,
                    date: new Date(),
                    notes: `Venta #${saleRecord.id.slice(0, 8)}`
                });

                stats.success++;
                successfulItems.push(item);

            } catch (err) {
                console.error("Sale item error:", err);
                stats.errors++;
            }
        }

        // 5. Record Financial Income (Real Movement) if any success
        if (successfulItems.length > 0) {
            const totalAmount = successfulItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

            // If paymentStatus is 'paid', trigger financial record
            if (paymentStatus === 'paid') {
                if (paymentMethod === 'cash') {
                    // Affect Cash Register
                    const register = await db.query.cashRegisters.findFirst({
                        where: and(eq(cashRegisters.organizationId, orgId), eq(cashRegisters.status, 'open'))
                    });
                    if (register) {
                        await db.insert(cashTransactions).values({
                            organizationId: orgId,
                            registerId: register.id,
                            sessionId: register.currentSessionId as string,
                            amount: totalAmount,
                            type: 'in',
                            category: 'sales',
                            description: `Venta POS - Efectivo`,
                            date: new Date()
                        });
                        await db.update(cashRegisters).set({ balance: sql`${cashRegisters.balance} + ${totalAmount}` }).where(eq(cashRegisters.id, register.id));
                    }
                } else if (paymentMethod === 'transfer' && bankAccountId) {
                    // Affect Bank Account
                    await db.update(bankAccounts).set({ balance: sql`${bankAccounts.balance} + ${totalAmount}` }).where(eq(bankAccounts.id, bankAccountId));
                }

                await db.insert(payments).values({
                    organizationId: orgId,
                    amount: totalAmount,
                    type: "income",
                    method: paymentMethod || "cash",
                    referenceId: `SALE-BATCH-${Date.now()}`,
                    date: new Date()
                });
            }

            res.json({ message: "Sales processed", stats });
        } else {
            // If nothing succeeded, it means everything failed (likely due to stock)
            res.status(400).json({ message: "No se pudieron procesar los items. Verifique el stock.", stats });
        }

    } catch (error) {
        console.error("Sales Error:", error);
        res.status(500).json({ message: "Error processing sales", error: String(error) });
    }
});

/**
 * Obtiene el historial de pedidos de venta.
 * @route GET /api/sales/orders
 */
router.get("/orders", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const orders = await db.query.sales.findMany({
            where: eq(sales.organizationId, orgId),
            orderBy: [desc(sales.date)],
            limit: 50,
            with: { product: true, customer: true }
        });

        res.json(orders);
    } catch (error) {
        console.error("Sales orders error:", error);
        res.status(500).json({ message: "Error fetching sales orders" });
    }
});

/**
 * Obtiene estadísticas de ventas para el dashboard (Tendencias).
 * @route GET /api/sales/stats
 */
router.get("/stats", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        // Fetch sales for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const allSales = await db.select({
            id: sales.id,
            totalPrice: sales.totalPrice,
            date: sales.date,
            productId: sales.productId,
            quantity: sales.quantity
        })
            .from(sales)
            .where(
                and(
                    eq(sales.organizationId, orgId),
                    sql`${sales.date} >= ${thirtyDaysAgo}`
                )
            );

        // Calculate Daily Sales
        const salesByDate: Record<string, number> = {};
        allSales.forEach(s => {
            const day = s.date ? new Date(s.date).toISOString().split('T')[0] : 'unknown';
            salesByDate[day] = (salesByDate[day] || 0) + s.totalPrice;
        });

        const chartData = Object.entries(salesByDate)
            .map(([date, amount]) => ({ date, amount: amount / 100 })) // convert cents to unit
            .sort((a, b) => a.date.localeCompare(b.date));

        // Calculate Top Products
        const productSales: Record<string, { count: number, revenue: number, id: string }> = {};
        allSales.forEach(s => {
            if (!productSales[s.productId]) {
                productSales[s.productId] = { count: 0, revenue: 0, id: s.productId };
            }
            productSales[s.productId].count += s.quantity;
            productSales[s.productId].revenue += s.totalPrice;
        });

        // Enrich with Product Names
        const topProductIds = Object.keys(productSales).sort((a, b) => productSales[b].revenue - productSales[a].revenue).slice(0, 5);

        let topProducts = [];
        if (topProductIds.length > 0) {
            const productsInfo = await db.select({ id: products.id, name: products.name })
                .from(products)
                .where(sql`${products.id} IN ${topProductIds}`);

            topProducts = topProductIds.map(id => {
                const info = productsInfo.find(p => p.id === id);
                return {
                    name: info?.name || 'Unknown',
                    revenue: productSales[id].revenue / 100,
                    quantity: productSales[id].count
                };
            });
        }

        res.json({
            days: chartData,
            topProducts
        });

    } catch (error) {
        console.error("Sales stats error:", error);
        res.status(500).json({ message: "Error fetching sales stats" });
    }
});

/**
 * Registra el pago de una venta pendiente.
 * @route PATCH /api/sales/:id/pay
 */
router.patch("/:id/pay", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { paymentMethod, bankAccountId } = req.body;
        const [sale] = await db.select().from(sales).where(and(eq(sales.id, req.params.id), eq(sales.organizationId, orgId)));

        if (!sale) return res.status(404).json({ message: "Sale not found" });
        if (sale.paymentStatus === 'paid') return res.status(400).json({ message: "Sale already paid" });

        // Update Sale
        await db.update(sales)
            .set({ paymentStatus: 'paid', paymentMethod, bankAccountId })
            .where(eq(sales.id, sale.id));

        // Finance Integration
        if (paymentMethod === 'cash') {
            const register = await db.query.cashRegisters.findFirst({
                where: and(eq(cashRegisters.organizationId, orgId), eq(cashRegisters.status, 'open'))
            });
            if (register) {
                await db.insert(cashTransactions).values({
                    organizationId: orgId,
                    registerId: register.id,
                    sessionId: register.currentSessionId as string,
                    amount: sale.totalPrice,
                    type: 'in',
                    category: 'sales',
                    description: `Pago Venta #${sale.id.slice(0, 8)}`,
                    date: new Date()
                });
                await db.update(cashRegisters).set({ balance: sql`${cashRegisters.balance} + ${sale.totalPrice}` }).where(eq(cashRegisters.id, register.id));
            }
        } else if (paymentMethod === 'transfer' && bankAccountId) {
            await db.update(bankAccounts).set({ balance: sql`${bankAccounts.balance} + ${sale.totalPrice}` }).where(eq(bankAccounts.id, bankAccountId));
        }

        await db.insert(payments).values({
            organizationId: orgId,
            amount: sale.totalPrice,
            type: "income",
            method: paymentMethod,
            referenceId: `PAY-SALE-${sale.id}`,
            date: new Date()
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Payment failed" });
    }
});

/**
 * Actualiza el estado de entrega.
 * @route PATCH /api/sales/:id/delivery
 */
router.patch("/:id/delivery", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        const { status } = req.body;
        await db.update(sales).set({ deliveryStatus: status }).where(eq(sales.id, req.params.id));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Delivery update failed" });
    }
});

export default router;
