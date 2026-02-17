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

        const { items, driverId, sellerId, vehicleId, customerId, paymentStatus, paymentMethod, bankAccountId } = req.body;
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
                    sellerId: sellerId || null,
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
                                WHERE id = ${customerId} AND organization_id = ${orgId}
                            `);
                        }
                    } catch (loyaltyErr) {
                        console.error("Failed to award loyalty points:", loyaltyErr);
                    }
                }

                await logAudit(req, orgId, user.id, "CREATE_SALE", saleRecord.id, { total: saleRecord.totalPrice });

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

router.get("/customer/:customerId", requirePermission("sales.read"), async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const customerOrders = await db.query.sales.findMany({
            where: and(
                eq(sales.organizationId, orgId),
                eq(sales.customerId, req.params.customerId)
            ),
            orderBy: [desc(sales.date)],
            limit: 50,
            with: { product: true }
        });

        res.json(customerOrders);
    } catch (error) {
        console.error("Customer History Error:", error);
        res.status(500).json({ message: "Error fetching customer history" });
    }
});

router.get("/stats", requirePermission("sales.read"), async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        // Date ranges for "Current Period" vs "Previous Period" (Last 30 days vs 30-60 days ago)
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(today.getDate() - 60);

        // Fetch Current Period
        const currentSales = await db.select({
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

        // Fetch Previous Period (for Growth Calculation)
        const previousSales = await db.select({
            totalPrice: sales.totalPrice
        })
            .from(sales)
            .where(
                and(
                    eq(sales.organizationId, orgId),
                    sql`${sales.date} >= ${sixtyDaysAgo}`,
                    sql`${sales.date} < ${thirtyDaysAgo}`
                )
            );

        // Chart Data (Current Period)
        const salesByDate: Record<string, number> = {};
        currentSales.forEach(s => {
            const day = s.date ? new Date(s.date).toISOString().split('T')[0] : 'unknown';
            salesByDate[day] = (salesByDate[day] || 0) + s.totalPrice;
        });

        const chartData = Object.entries(salesByDate)
            .map(([date, amount]) => ({ date, amount: amount / 100 }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Top Products Logic
        const productSales: Record<string, { count: number, revenue: number, id: string }> = {};
        currentSales.forEach(s => {
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

        // Metrics Calculation
        const totalRevenueCurrent = currentSales.reduce((sum, s) => sum + s.totalPrice, 0);
        const totalRevenuePrevious = previousSales.reduce((sum, s) => sum + s.totalPrice, 0);

        let growthPercentage = 0;
        if (totalRevenuePrevious > 0) {
            growthPercentage = ((totalRevenueCurrent - totalRevenuePrevious) / totalRevenuePrevious) * 100;
        } else if (totalRevenueCurrent > 0) {
            growthPercentage = 100; // 100% growth if started from 0
        }

        const stats = {
            days: chartData,
            topProducts,
            metrics: [{
                title: "Ventas Totales (30d)",
                value: totalRevenueCurrent,
                growth: growthPercentage,
                previousValue: totalRevenuePrevious
            }]
        };

        res.json(stats);

    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).json({ message: "Error fetching stats" });
    }
});


// SALES ANALYTICS
router.get("/analytics/items", requirePermission("sales.read"), async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate as string) : new Date(0);
        const end = endDate ? new Date(endDate as string) : new Date();

        const salesInPeriod = await db.query.sales.findMany({
            where: and(
                eq(sales.organizationId, orgId),
                sql`${sales.date} >= ${start}`,
                sql`${sales.date} <= ${end}`
            ),
            with: { product: true }
        });

        const productStats: Record<string, { name: string, quantity: number, revenue: number }> = {};
        salesInPeriod.forEach(s => {
            const id = s.productId;
            if (!productStats[id]) {
                productStats[id] = { name: s.product?.name || 'Unknown', quantity: 0, revenue: 0 };
            }
            productStats[id].quantity += s.quantity;
            productStats[id].revenue += s.totalPrice;
        });

        res.json(Object.values(productStats).sort((a, b) => b.revenue - a.revenue));
    } catch (error) {
        console.error("Analytics Items Error:", error);
        res.status(500).json({ message: "Error fetching item analytics" });
    }
});

router.get("/analytics/payment-methods", requirePermission("sales.read"), async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate as string) : new Date(0);
        const end = endDate ? new Date(endDate as string) : new Date();

        const salesInPeriod = await db.select({
            method: sales.paymentMethod,
            total: sql<number>`sum(${sales.totalPrice})`
        })
            .from(sales)
            .where(
                and(
                    eq(sales.organizationId, orgId),
                    sql`${sales.date} >= ${start}`,
                    sql`${sales.date} <= ${end}`
                )
            )
            .groupBy(sales.paymentMethod);

        res.json(salesInPeriod);
    } catch (error) {
        console.error("Analytics Payment Error:", error);
        res.status(500).json({ message: "Error fetching payment analytics" });
    }
});

router.get("/by-employee", requirePermission("sales.read"), async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate as string) : new Date(0);
        const end = endDate ? new Date(endDate as string) : new Date();

        // Join with employees table
        const result = await db.select({
            employeeId: sales.sellerId,
            employeeName: employees.name,
            totalSales: sql<number>`count(${sales.id})`,
            totalRevenue: sql<number>`sum(${sales.totalPrice})`
        })
            .from(sales)
            .leftJoin(employees, eq(sales.sellerId, employees.id))
            .where(
                and(
                    eq(sales.organizationId, orgId),
                    sql`${sales.date} >= ${start}`,
                    sql`${sales.date} <= ${end}`
                )
            )
            .groupBy(sales.sellerId, employees.name);

        res.json(result);
    } catch (error) {
        console.error("Employee Sales Error:", error);
        res.status(500).json({ message: "Error fetching employee sales" });
    }
});

// KITCHEN DISPLAY SYSTEM (KDS) ENDPOINTS

router.get("/kitchen", requirePermission("sales.read"), async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        // Fetch sales that are NOT "served" (archived from kitchen)
        // We filter by orderType to only show relevant orders (e.g. dine-in/takeout) if needed, 
        // but generally kitchen sees everything pending.
        const activeOrders = await db.query.sales.findMany({
            where: and(
                eq(sales.organizationId, orgId),
                // We want statuses: pending, preparing, ready. NOT served.
                // Using sql for "IN" or "NOT EQUAL" if needed, or simple ne
                sql`${sales.kitchenStatus} != 'served'`
            ),
            with: { product: true },
            orderBy: [desc(sales.date)],
            limit: 100
        });

        // KDS APPROACH V1: Item-View (Flat List)
        // To ensure atomic status updates, we will return individual items.
        // Grouping can be done in Frontend if needed, or added later.

        const kdsItems = activeOrders.map(record => ({
            id: record.id,
            tableNumber: record.tableNumber,
            orderType: record.orderType,
            date: record.date,
            kitchenStatus: record.kitchenStatus,
            items: [{
                id: record.id,
                product: record.product,
                quantity: record.quantity,
                modifiers: record.modifiers
            }],
            notes: ""
        }));

        res.json(kdsItems);
    } catch (error) {
        console.error("KDS Fetch Error:", error);
        res.status(500).json({ message: "Error fetching kitchen orders" });
    }
});

router.patch("/:id/kitchen-status", requirePermission("sales.pos"), async (req, res) => {
    try {
        // If ID matches a single record, update it. 
        // If we grouped them in the frontend using the "Logical Order ID" (which might be the first record's ID),
        // we might need to handle updating MULTIPLE records.
        // For simplicity now: The Frontend passes the ID of the Group Leader.
        // But wait, the frontend just calls mutate({ id }) which is the ID from the object we sent.

        // We should really update based on the GROUPING logic, i.e., "Update all items for Table X at Time Y".
        // OR: Frontend sends a list of IDs?

        // Let's stick to the simple solution: The "id" param acts as a proxy, 
        // but we find related items (Same Table/Time) and update them too?
        // NO, that's risky.

        // BETTER: Frontend sends individual updates? 
        // OR: Backend finds the group again.

        // REVISED APPROACH: We will update usage of `db.update` to target the specific ID provided.
        // IF the frontend grouped them, it needs to send the IDs.
        // Let's look at KitchenDisplay.tsx... it sends `order.id`.
        // In my grouping logic above, `order.id` is the ID of the FIRST record.
        // This means only the first item updates. 

        // FIX: I will change the logic below to update records with the same `tableNumber` and `date` (minute) 
        // and `organizationId` IF `orderType` is dine-in.
        // Or if I can pass an array of IDs? No, standard REST is /:id/...

        // Let's simplify: Only update the specific ID passed. 
        // AND I will modify KitchenDisplay.tsx to treat each line as a card OR pass all IDs.
        // Actually, for a KDS, grouping is essential.
        // I will make this endpoint accept a `groupUpdate` flag or similar?

        // Let's revert to: The endpoint updates ONE record.
        // BUT I will modify the `GET` to just return individual records for now to ensure robustness.
        // The KDS will show 1 Card per Item. This is safe.
        // Grouping can be a V2 enhancement when we add a proper `orders` table.

        // Wait, I already wrote the grouping logic in the GET above.
        // If I use that, I MUST update all items in the group.

        // HACK for V1: The GET returns `ids` array in the group.
        // The Frontend should call an endpoint to update MULTIPLE IDs.
        // But I don't want to change the frontend usage logic I just wrote (mutate {id, status}).

        // OK, I will make this endpoint smart:
        // Find the record by ID.
        // Find "Siblings" (same table, same time minute, org).
        // Update all of them.

        const orgId = await getOrgIdFromRequest(req);
        const { status } = req.body;
        const rootId = req.params.id;

        const [rootRecord] = await db.select().from(sales).where(and(eq(sales.id, rootId), eq(sales.organizationId, orgId)));

        if (!rootRecord) return res.status(404).json({ message: "Order not found" });

        // Update the root record
        // AND any siblings that look like they belong to the same "Order" (same second timestamp? same minute?)
        // Let's be conservative: Same Table/Type and created within +/- 2 seconds.

        const timeWindowStart = new Date(rootRecord.date.getTime() - 20000); // 20 seconds window
        const timeWindowEnd = new Date(rootRecord.date.getTime() + 20000);

        await db.update(sales)
            .set({ kitchenStatus: status })
            .where(and(
                eq(sales.organizationId, orgId),
                eq(sales.orderType, rootRecord.orderType),
                eq(sales.tableNumber, rootRecord.tableNumber ?? ''), // careful with nulls
                // sql`date BETWEEN ${timeWindowStart} AND ${timeWindowEnd}` // approximate match
                // Just matching the exact minute string logic from GET? 
                // Let's just update the single record for safety in V1, unless table matches.
                // If Table matches, update all pending for that table? No, might be multiple orders.

                // FINAL DECISION V1: Update ONLY the specific record. 
                // In GET /kitchen, we will NOT group. We will show items individually.
                // This guarantees state consistency.
                eq(sales.id, rootId)
            ));

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Status update failed" });
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

router.get("/export", requirePermission("sales.read"), async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate as string) : new Date(0); // Default to beginning of time
        const end = endDate ? new Date(endDate as string) : new Date(); // Default to now

        // Fetch all sales within range
        const salesData = await db.query.sales.findMany({
            where: and(
                eq(sales.organizationId, orgId),
                sql`${sales.date} >= ${start}`,
                sql`${sales.date} <= ${end}`
            ),
            with: {
                product: true,
                customer: true,
                driver: true
            },
            orderBy: [desc(sales.date)]
        });

        // Generate CSV
        const headers = ["ID", "Fecha", "Producto", "Cantidad", "Precio Unitario", "Total", "Cliente", "Metodo Pago", "Estado Pago", "Entrega", "Chofer", "Notas"];
        const rows = salesData.map(s => {
            const priceUnit = (s.totalPrice / s.quantity) / 100;
            const total = s.totalPrice / 100;
            return [
                s.id,
                s.date ? new Date(s.date).toISOString() : "",
                `"${s.product?.name || 'N/A'}"`,
                s.quantity,
                priceUnit.toFixed(2),
                total.toFixed(2),
                `"${s.customer?.name || 'Publico General'}"`,
                s.paymentMethod || "N/A",
                s.paymentStatus,
                s.deliveryStatus,
                s.driver?.name || "N/A",
                `"${(s.modifiers as any)?.map((m: any) => m.name).join(', ') || ''}"`
            ].join(",");
        });

        const csv = [headers.join(","), ...rows].join("\n");

        res.header("Content-Type", "text/csv");
        res.header("Content-Disposition", `attachment; filename="ventas_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);

    } catch (error) {
        console.error("Export Error:", error);
        res.status(500).json({ message: "Error exporting sales" });
    }
});

export default router;
