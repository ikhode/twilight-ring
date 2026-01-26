import { Router } from "express";
import { db } from "../storage";
import { getOrgIdFromRequest } from "../auth_util";
import { processEvents, sales, products, employees } from "../../shared/schema";
import { eq, and, desc, sql, gte, lt } from "drizzle-orm";

const router = Router();

/**
 * Notifications Endpoint
 * Returns real-time system notifications from various sources
 */
router.get("/", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const now = new Date();
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Gather notifications from multiple sources
        const [
            anomalies,
            lowStockItems,
            pendingOrders,
            newEmployees
        ] = await Promise.all([
            // Critical process anomalies
            db.query.processEvents.findMany({
                where: and(
                    eq(processEvents.eventType, 'anomaly'),
                    gte(processEvents.timestamp, last24Hours)
                ),
                orderBy: desc(processEvents.timestamp),
                limit: 5
            }),

            // Low stock alerts - Get all products and filter in memory to avoid SQL parsing issues
            db.select()
                .from(products)
                .where(eq(products.organizationId, orgId))
                .limit(100), // Get more and filter in-memory

            // Pending payment orders
            db.query.sales.findMany({
                where: and(
                    eq(sales.organizationId, orgId),
                    eq(sales.paymentStatus, 'pending'),
                    gte(sales.date, last24Hours)
                ),
                limit: 5
            }),

            // Recently added employees (last 7 days)
            db.query.employees.findMany({
                where: and(
                    eq(employees.organizationId, orgId),
                    gte(employees.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
                ),
                limit: 3
            })
        ]);

        // Format notifications
        const notifications: any[] = [];

        // Anomalies (Critical)
        anomalies.forEach(anomaly => {
            notifications.push({
                id: `anomaly-${anomaly.id}`,
                type: 'critical',
                title: 'Anomalía Detectada',
                message: (anomaly.data as any)?.message || 'Desviación en proceso operativo',
                createdAt: anomaly.timestamp,
                source: 'guardian',
                action: `/operations?highlight=${anomaly.processInstanceId}`
            });
        });

        // Low Stock (Warning) - Filter in memory
        const actualLowStock = lowStockItems.filter(item => item.currentStock < item.minimumStock).slice(0, 5);
        actualLowStock.forEach(item => {
            notifications.push({
                id: `stock-${item.id}`,
                type: 'warning',
                title: 'Stock Bajo',
                message: `${item.name} tiene solo ${item.currentStock} ${item.unit} (mínimo: ${item.minimumStock})`,
                createdAt: item.updatedAt || new Date(),
                source: 'inventory',
                action: `/inventory?product=${item.id}`
            });
        });

        // Pending Payments (Info)
        if (pendingOrders.length > 0) {
            const totalPending = pendingOrders.reduce((sum, order) => sum + order.totalPrice, 0);
            notifications.push({
                id: 'pending-payments',
                type: 'info',
                title: 'Pagos Pendientes',
                message: `${pendingOrders.length} órdenes pendientes de pago (Total: $${(totalPending / 100).toFixed(2)})`,
                createdAt: pendingOrders[0].date,
                source: 'sales',
                action: '/sales?filter=pending'
            });
        }

        // New Employees (Success)
        if (newEmployees.length > 0) {
            notifications.push({
                id: 'new-employees',
                type: 'success',
                title: 'Nuevos Colaboradores',
                message: `${newEmployees.map(e => e.name).join(', ')} se unieron al equipo`,
                createdAt: newEmployees[0].createdAt,
                source: 'hr',
                action: '/employees'
            });
        }

        // Sort by date (newest first)
        notifications.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        res.json(notifications.slice(0, 10)); // Return top 10
    } catch (error) {
        console.error("Notifications error:", error);
        res.status(500).json({ message: "Failed to fetch notifications" });
    }
});

/**
 * Mark notification as read
 */
router.patch("/:id/read", async (req, res): Promise<void> => {
    try {
        // In a real system, we'd have a notifications table with read status
        // For now, just acknowledge
        res.json({ message: "Notification marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Failed to update notification" });
    }
});

/**
 * Mark all as read
 */
router.post("/read-all", async (req, res): Promise<void> => {
    try {
        res.json({ message: "All notifications marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Failed to update notifications" });
    }
});

export default router;
