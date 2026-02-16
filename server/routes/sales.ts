import { db } from "../storage";
import {
    sales, products, inventoryMovements, payments, cashRegisters, cashTransactions, bankAccounts,
    customers
} from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { Router } from "express";
import { getOrgIdFromRequest, getAuthenticatedUser } from "../auth_util";
import { logAudit } from "../lib/audit";
import { EventBus } from "../services/event-bus";
import { requireModule } from "../middleware/moduleGuard";
import { FacturapiService } from "../services/FacturapiService";
import { requirePermission } from "../middleware/permission_check";

const router = Router();
router.use(requireModule("/sales"));

/**
 * Registra una venta, actualiza inventario, genera movimiento y registra el pago.
 */
router.post("/", requirePermission("sales.pos"), async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req);
        if (!user) return res.status(401).json({ message: "Unauthorized" });
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { items, driverId, vehicleId, customerId, paymentStatus, paymentMethod, bankAccountId } = req.body;
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ message: "Invalid payload: items array required" });
        }

        // 1. Pre-Validation
        const inventoryErrors: string[] = [];
        const productData: Record<string, any> = {};

        for (const item of items) {
            const [product] = await db.select().from(products).where(and(eq(products.id, item.productId), eq(products.organizationId, orgId)));
            if (!product || product.isArchived) {
                inventoryErrors.push(`El producto ${item.productId} no existe o está archivado.`);
            } else if (product.stock < item.quantity) {
                inventoryErrors.push(`Stock insuficiente para "${product.name}": disponible ${product.stock}, solicitado ${item.quantity}.`);
            } else {
                productData[item.productId] = product;
            }
        }

        if (inventoryErrors.length > 0) {
            return res.status(400).json({ message: "Validación de Inventario Fallida", errors: inventoryErrors });
        }

        const stats = { success: 0, errors: 0 };
        const successfulSales: any[] = [];

        // 2. Process items
        for (const item of items) {
            try {
                const product = productData[item.productId];

                const [saleRecord] = await db.insert(sales).values({
                    organizationId: orgId,
                    productId: item.productId,
                    customerId: customerId || null,
                    quantity: item.quantity,
                    totalPrice: item.price * item.quantity,
                    driverId: driverId || null,
                    vehicleId: vehicleId || null,
                    paymentStatus: paymentStatus || "pending",
                    paymentMethod: paymentMethod || null,
                    bankAccountId: bankAccountId || null,
                    deliveryStatus: "pending",
                    // Restaurant / POS Fields
                    orderType: (item as any).orderType || "takeout",
                    tableNumber: (item as any).tableNumber || null,
                    pax: (item as any).pax || 1,
                    kitchenStatus: "pending",
                    modifiers: (item as any).modifiers || [],
                    date: new Date(),
                } as any).returning();

                await db.update(products)
                    .set({ stock: product.stock - item.quantity })
                    .where(eq(products.id, item.productId));

                await db.insert(inventoryMovements).values({
                    organizationId: orgId,
                    productId: item.productId,
                    quantity: -item.quantity,
                    type: "sale",
                    referenceId: saleRecord.id,
                    beforeStock: product.stock,
                    afterStock: product.stock - item.quantity,
                    date: new Date(),
                    notes: `Venta #${saleRecord.id.slice(0, 8)}`
                });

                stats.success++;
                successfulSales.push(saleRecord);

                // LOYALTY POINTS LOGIC
                if (customerId) {
                    try {
                        const pointsToAward = Math.floor(saleRecord.totalPrice / 1000); // 1 point per $10.00 (1000 cents)
                        if (pointsToAward > 0) {
                            await db.execute(sql`
                                UPDATE customers 
                                SET loyalty_points = COALESCE(loyalty_points, 0) + ${pointsToAward}
                                WHERE id = ${customerId}
                            `);
                        }
                    } catch (loyaltyErr) {
                        console.error("Failed to award loyalty points:", loyaltyErr);
                    }
                }

                await logAudit(orgId, user.id, "CREATE_SALE", saleRecord.id, { total: saleRecord.totalPrice });

            } catch (err) {
                console.error("Sale item error:", err);
                stats.errors++;
            }
        }

        if (successfulSales.length > 0) {
            const totalAmount = successfulSales.reduce((sum, s) => sum + s.totalPrice, 0);

            // Emit Event
            EventBus.emit(orgId, "sale.completed", {
                saleIds: successfulSales.map(s => s.id),
                customerId,
                totalAmount
            }).catch(err => console.error("EventBus Error:", err));

            res.json({ message: "Sales processed", stats });
        } else {
            res.status(400).json({ message: "No sales processed", stats });
        }

    } catch (error) {
        console.error("Sales Error:", error);
        res.status(500).json({ message: "Error processing sales" });
    }
});

router.get("/orders", requirePermission("sales.read"), async (req, res) => {
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
        res.status(500).json({ message: "Error fetching sales orders" });
    }
});

router.get("/stats", requirePermission("sales.read"), async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

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

        const salesByDate: Record<string, number> = {};
        allSales.forEach(s => {
            const day = s.date ? new Date(s.date).toISOString().split('T')[0] : 'unknown';
            salesByDate[day] = (salesByDate[day] || 0) + s.totalPrice;
        });

        const chartData = Object.entries(salesByDate)
            .map(([date, amount]) => ({ date, amount: amount / 100 }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const productSales: Record<string, { count: number, revenue: number, id: string }> = {};
        allSales.forEach(s => {
            if (!productSales[s.productId]) {
                productSales[s.productId] = { count: 0, revenue: 0, id: s.productId };
            }
            productSales[s.productId].count += s.quantity;
            productSales[s.productId].revenue += s.totalPrice;
        });

        const topProductIds = Object.keys(productSales).sort((a, b) => productSales[b].revenue - productSales[a].revenue).slice(0, 5);

        let topProducts: any[] = [];
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

        res.json({ days: chartData, topProducts });

    } catch (error) {
        res.status(500).json({ message: "Error fetching stats" });
    }
});

router.patch("/:id/pay", requirePermission("sales.pos"), async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req);
        if (!user) return res.status(401).json({ message: "Unauthorized" });
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { paymentMethod, bankAccountId } = req.body;
        const [sale] = await db.select().from(sales).where(and(eq(sales.id, req.params.id), eq(sales.organizationId, orgId)));

        if (!sale) return res.status(404).json({ message: "Sale not found" });

        await db.update(sales)
            .set({ paymentStatus: 'paid', paymentMethod, bankAccountId })
            .where(eq(sales.id, sale.id));

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
                    timestamp: new Date(),
                    performedBy: user.id
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

router.patch("/:id/delivery", requirePermission("sales.pos"), async (req, res) => {
    try {
        const { status } = req.body;
        await db.update(sales).set({ deliveryStatus: status }).where(eq(sales.id, req.params.id));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Delivery update failed" });
    }
});

/**
 * CFDI 4.0 Stamping
 */
router.post("/:id/stamp", requirePermission("sales.stamp"), async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const result = await FacturapiService.stampInvoice(req.params.id, orgId);
        res.json(result);
    } catch (error: any) {
        console.error("Stamping error:", error);
        res.status(500).json({ message: error.message || "Failed to stamp invoice" });
    }
});

/**
 * Download Invoice PDF
 */
router.get("/:id/pdf", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const [sale] = await db.select().from(sales).where(and(eq(sales.id, req.params.id), eq(sales.organizationId, orgId)));
        if (!sale || !sale.fiscalUuid) return res.status(404).json({ message: "Invoice not found or not stamped" });

        const pdfBuffer = await FacturapiService.downloadPdf(sale.fiscalUuid, orgId);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=Factura_${sale.fiscalUuid.slice(0, 8)}.pdf`);
        res.send(Buffer.from(pdfBuffer));
    } catch (error: any) {
        console.error("PDF download error:", error);
        res.status(500).json({ message: error.message || "Failed to download PDF" });
    }
});

export default router;
