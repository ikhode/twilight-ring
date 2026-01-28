import { Router } from "express";
import { db } from "../storage";
import { sales, products, customers, purchases, suppliers } from "../../shared/schema";
import { eq, and, inArray, sql, or } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";

const router = Router();

/**
 * GET /api/logistics/driver-route/:employeeId
 * Get driver's assigned deliveries for the day
 */
router.get("/driver-route/:employeeId", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { employeeId } = req.params;

        // Get today's deliveries assigned to this driver
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [deliveries, pickups] = await Promise.all([
            db
                .select({
                    saleId: sales.id,
                    productId: sales.productId,
                    customerId: sales.customerId,
                    quantity: sales.quantity,
                    totalPrice: sales.totalPrice,
                    paymentStatus: sales.paymentStatus,
                    paymentMethod: sales.paymentMethod,
                    deliveryStatus: sales.deliveryStatus,
                    vehicleId: sales.vehicleId,
                    date: sales.date,
                })
                .from(sales)
                .where(and(
                    eq(sales.organizationId, orgId),
                    eq(sales.driverId, employeeId),
                    inArray(sales.deliveryStatus, ['pending', 'shipped']),
                    sql`DATE(${sales.date}) = CURRENT_DATE`
                )),
            db
                .select({
                    purchaseId: purchases.id,
                    productId: purchases.productId,
                    supplierId: purchases.supplierId,
                    quantity: purchases.quantity,
                    totalAmount: purchases.totalAmount,
                    paymentStatus: purchases.paymentStatus,
                    deliveryStatus: purchases.deliveryStatus,
                    logisticsMethod: purchases.logisticsMethod,
                    vehicleId: purchases.vehicleId,
                    date: purchases.date,
                })
                .from(purchases)
                .where(and(
                    eq(purchases.organizationId, orgId),
                    eq(purchases.driverId, employeeId),
                    inArray(purchases.deliveryStatus, ['pending', 'shipped']),
                    sql`DATE(${purchases.date}) = CURRENT_DATE`
                ))
        ]);

        // Process Deliveries (Sales)
        const deliveryStops = await Promise.all(
            deliveries.map(async (delivery) => {
                const [customer, product] = await Promise.all([
                    delivery.customerId
                        ? db.query.customers.findFirst({
                            where: eq(customers.id, delivery.customerId),
                            columns: { name: true, phone: true, email: true, address: true }
                        })
                        : null,
                    db.query.products.findFirst({
                        where: eq(products.id, delivery.productId),
                        columns: { name: true, unit: true }
                    })
                ]);

                return {
                    id: delivery.saleId,
                    entityType: 'sale' as const,
                    type: 'delivery' as const,
                    customerName: customer?.name || `Cliente ${delivery.customerId?.slice(0, 8)}`,
                    address: customer?.address || customer?.email || "Dirección no especificada",
                    phone: customer?.phone || '',
                    products: [
                        {
                            name: product?.name || 'Producto',
                            quantity: delivery.quantity,
                            unit: product?.unit || 'pza'
                        }
                    ],
                    expectedAmount: delivery.totalPrice,
                    status: 'pending',
                    paymentStatus: delivery.paymentStatus,
                    paymentMethod: delivery.paymentMethod,
                    locationLat: customer?.address ? 19.4143 : undefined, // Placeholder Lat for geofencing demo if not in DB
                    locationLng: customer?.address ? -99.1663 : undefined, // Placeholder Lng
                };
            })
        );

        // Process Pickups (Purchases)
        const pickupStops = await Promise.all(
            pickups.map(async (pickup) => {
                const [supplier, product] = await Promise.all([
                    pickup.supplierId
                        ? db.query.suppliers.findFirst({
                            where: eq(suppliers.id, pickup.supplierId),
                            columns: { name: true, contactInfo: true, address: true }
                        })
                        : null,
                    db.query.products.findFirst({
                        where: eq(products.id, pickup.productId as string),
                        columns: { name: true, unit: true }
                    })
                ]);

                // Handle contact info safely
                const contact = (supplier?.contactInfo as any) || {};

                return {
                    id: pickup.purchaseId,
                    entityType: 'purchase' as const,
                    type: 'pickup' as const,
                    customerName: supplier?.name || `Proveedor ${pickup.supplierId?.slice(0, 8)}`,
                    address: supplier?.address || "Dirección no especificada",
                    phone: contact.phone || '',
                    products: [
                        {
                            name: product?.name || 'Insumo',
                            quantity: pickup.quantity,
                            unit: product?.unit || 'pza'
                        }
                    ],
                    expectedAmount: pickup.totalAmount,
                    status: 'pending',
                    paymentStatus: pickup.paymentStatus,
                    paymentMethod: pickup.paymentMethod || 'N/A',
                    locationLat: supplier?.address ? 19.4285 : undefined, // Placeholder Lat
                    locationLng: supplier?.address ? -99.1415 : undefined, // Placeholder Lng
                };
            })
        );

        const stops = [...deliveryStops, ...pickupStops];

        // Build route response
        const route = {
            id: `RUTA-${new Date().toISOString().split('T')[0]}`,
            driverName: employeeId, // Will be replaced by actual name in frontend
            vehiclePlate: [...deliveries, ...pickups][0]?.vehicleId || 'N/A',
            stops: stops.filter(Boolean),
            startedAt: new Date().toISOString(),
            completedAt: null
        };

        res.json(route);
    } catch (error) {
        console.error("Get driver route error:", error);
        res.status(500).json({ message: "Failed to fetch driver route" });
    }
});

/**
 * POST /api/logistics/complete-stop
 * Mark a delivery stop as completed with signature and payment info
 */
router.post("/complete-stop", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const {
            saleId,
            stopId,
            entityType, // 'sale' or 'purchase'
            signature,
            photo,
            amountCollected,
            notes,
            paymentMethod
        } = req.body;

        const effectiveId = saleId || stopId;

        if (!effectiveId) {
            res.status(400).json({ message: "ID is required" });
            return;
        }

        if (entityType === 'purchase') {
            // Update purchase record
            await db
                .update(purchases)
                .set({
                    deliveryStatus: 'received',
                    receivedAt: new Date(),
                    notes: notes || undefined,
                    // Store signature and photo URLs in JSONB if needed
                })
                .where(and(
                    eq(purchases.id, effectiveId),
                    eq(purchases.organizationId, orgId)
                ));
        } else {
            // Default to sale for backward compatibility
            await db
                .update(sales)
                .set({
                    deliveryStatus: 'delivered',
                    paymentStatus: amountCollected ? 'paid' : sql`payment_status`,
                    paymentMethod: paymentMethod || sql`payment_method`,
                })
                .where(and(
                    eq(sales.id, effectiveId),
                    eq(sales.organizationId, orgId)
                ));
        }

        console.log(`Stop completed: ${effectiveId} (${entityType || 'sale'})`, {
            hasSignature: !!signature,
            hasPhoto: !!photo,
            amountCollected,
            notes
        });

        res.json({
            success: true,
            message: "Action completed successfully",
            id: effectiveId
        });
    } catch (error) {
        console.error("Complete stop error:", error);
        res.status(500).json({ message: "Failed to complete stop" });
    }
});

/**
 * GET /api/logistics/driver-stats/:employeeId
 * Get driver's daily statistics
 */
router.get("/driver-stats/:employeeId", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { employeeId } = req.params;

        const stats = await db
            .select({
                total: sql<number>`count(*)`,
                delivered: sql<number>`count(*) filter (where ${sales.deliveryStatus} = 'delivered')`,
                pending: sql<number>`count(*) filter (where ${sales.deliveryStatus} in ('pending', 'shipped'))`,
                totalAmount: sql<number>`sum(${sales.totalPrice})`,
                collectedAmount: sql<number>`sum(${sales.totalPrice}) filter (where ${sales.paymentStatus} = 'paid')`
            })
            .from(sales)
            .where(and(
                eq(sales.organizationId, orgId),
                eq(sales.driverId, employeeId),
                sql`DATE(${sales.date}) = CURRENT_DATE`
            ));

        res.json(stats[0] || {
            total: 0,
            delivered: 0,
            pending: 0,
            totalAmount: 0,
            collectedAmount: 0
        });
    } catch (error) {
        console.error("Get driver stats error:", error);
        res.status(500).json({ message: "Failed to fetch driver stats" });
    }
});

export default router;
