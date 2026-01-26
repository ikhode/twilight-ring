import { Router } from "express";
import { db } from "../storage";
import { sales, products, customers } from "../../shared/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
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

        const deliveries = await db
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
            ));

        // Get customer and product details
        const stops = await Promise.all(
            deliveries.map(async (delivery) => {
                const [customer, product] = await Promise.all([
                    delivery.customerId
                        ? db.query.customers.findFirst({
                            where: eq(customers.id, delivery.customerId),
                            columns: { name: true, phone: true, email: true }
                        })
                        : null,
                    db.query.products.findFirst({
                        where: eq(products.id, delivery.productId),
                        columns: { name: true, unit: true }
                    })
                ]);

                // Determine address from customer or use placeholder
                const address = customer?.email || "Dirección no especificada";

                return {
                    id: delivery.saleId,
                    type: 'delivery' as const,
                    customerName: customer?.name || `Cliente ${delivery.customerId?.slice(0, 8)}`,
                    address,
                    phone: customer?.phone || '',
                    products: [
                        {
                            name: product?.name || 'Producto',
                            quantity: delivery.quantity,
                            unit: product?.unit || 'pza'
                        }
                    ],
                    expectedAmount: delivery.totalPrice,
                    status: delivery.deliveryStatus === 'shipped' ? 'pending' : 'pending',
                    paymentStatus: delivery.paymentStatus,
                    paymentMethod: delivery.paymentMethod,
                };
            })
        );

        // Build route response
        const route = {
            id: `RUTA-${new Date().toISOString().split('T')[0]}`,
            driverName: employeeId, // Will be replaced by actual name in frontend
            vehiclePlate: deliveries[0]?.vehicleId || 'N/A',
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
            signature,
            photo,
            amountCollected,
            notes,
            paymentMethod
        } = req.body;

        if (!saleId) {
            res.status(400).json({ message: "Sale ID required" });
            return;
        }

        // Update sale record
        await db
            .update(sales)
            .set({
                deliveryStatus: 'delivered',
                paymentStatus: amountCollected ? 'paid' : sales.paymentStatus,
                paymentMethod: paymentMethod || sales.paymentMethod,
                // In production, store signature and photo in file storage (S3, Supabase)
                // and save URLs here in a JSONB field
            })
            .where(and(
                eq(sales.id, saleId),
                eq(sales.organizationId, orgId)
            ));

        // TODO: Store signature and photo in file storage
        // For now, just acknowledge receipt
        console.log(`Stop completed: ${saleId}`, {
            hasSignature: !!signature,
            hasPhoto: !!photo,
            amountCollected,
            notes
        });

        res.json({
            success: true,
            message: "Delivery completed successfully",
            saleId
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
