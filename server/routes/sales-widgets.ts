import { Router } from "express";
import { db } from "../storage";
import { getOrgIdFromRequest } from "../auth_util";
import { sales, customers, products } from "../../shared/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";

const router = Router();

/**
 * Sales Funnel Widget
 * Returns funnel data: leads -> prospects -> customers -> retention
 */
router.get("/funnel", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Count sales by payment status (proxy for funnel stages)
        const [
            completed,
            pending,
            failed,
            totalCustomers
        ] = await Promise.all([
            db.select({ count: sql<number>`count(*)`, total: sql<number>`sum(${sales.totalPrice})` })
                .from(sales)
                .where(and(
                    eq(sales.organizationId, orgId),
                    eq(sales.paymentStatus, 'completed'),
                    gte(sales.date, thirtyDaysAgo)
                )),
            db.select({ count: sql<number>`count(*)` })
                .from(sales)
                .where(and(
                    eq(sales.organizationId, orgId),
                    eq(sales.paymentStatus, 'pending'),
                    gte(sales.date, thirtyDaysAgo)
                )),
            db.select({ count: sql<number>`count(*)` })
                .from(sales)
                .where(and(
                    eq(sales.organizationId, orgId),
                    eq(sales.paymentStatus, 'failed'),
                    gte(sales.date, thirtyDaysAgo)
                )),
            db.select({ count: sql<number>`count(distinct ${sales.customerId})` })
                .from(sales)
                .where(eq(sales.organizationId, orgId))
        ]);

        const completedCount = completed[0]?.count || 0;
        const pendingCount = pending[0]?.count || 0;
        const failedCount = failed[0]?.count || 0;
        const totalLeads = completedCount + pendingCount + failedCount;

        res.json({
            stages: [
                {
                    name: 'Leads',
                    count: totalLeads,
                    value: completed[0]?.total || 0,
                    percentage: 100
                },
                {
                    name: 'En Proceso',
                    count: pendingCount,
                    percentage: totalLeads > 0 ? (pendingCount / totalLeads) * 100 : 0
                },
                {
                    name: 'Convertidos',
                    count: completedCount,
                    value: completed[0]?.total || 0,
                    percentage: totalLeads > 0 ? (completedCount / totalLeads) * 100 : 0
                },
                {
                    name: 'Clientes Activos',
                    count: totalCustomers[0]?.count || 0,
                    percentage: totalLeads > 0 ? ((totalCustomers[0]?.count || 0) / totalLeads) * 100 : 0
                }
            ],
            conversionRate: totalLeads > 0 ? ((completedCount / totalLeads) * 100).toFixed(1) : 0,
            totalValue: completed[0]?.total || 0
        });
    } catch (error) {
        console.error("Sales funnel error:", error);
        res.status(500).json({ message: "Failed to fetch sales funnel" });
    }
});

/**
 * Top Customers Widget
 * Returns top 10 customers by total purchase value
 */
router.get("/top-customers", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) { res.status(401).json({ message: "Unauthorized" }); return; }

        // Aggregate sales by customer
        const topCustomers = await db.select({
            customerId: sales.customerId,
            totalValue: sql<number>`sum(${sales.totalPrice})`,
            orderCount: sql<number>`count(*)`,
            avgOrderValue: sql<number>`avg(${sales.totalPrice})`,
            lastPurchase: sql<Date>`max(${sales.date})`
        })
            .from(sales)
            .where(eq(sales.organizationId, orgId))
            .groupBy(sales.customerId)
            .orderBy(desc(sql`sum(${sales.totalPrice})`))
            .limit(10);

        // Get customer details
        const customersWithDetails = await Promise.all(
            topCustomers.map(async (item) => {
                if (!item.customerId) return null;

                const customer = await db.query.customers.findFirst({
                    where: eq(customers.id, item.customerId)
                });

                return {
                    id: item.customerId,
                    name: customer?.name || `Cliente #${item.customerId.slice(0, 8)}`,
                    email: customer?.email || null,
                    phone: customer?.phone || null,
                    totalValue: item.totalValue,
                    orderCount: item.orderCount,
                    avgOrderValue: Math.round(item.avgOrderValue),
                    lastPurchase: item.lastPurchase,
                    tier: item.totalValue > 100000 ? 'platinum' : item.totalValue > 50000 ? 'gold' : 'silver'
                };
            })
        );

        res.json(customersWithDetails.filter(c => c !== null));
    } catch (error) {
        console.error("Top customers error:", error);
        res.status(500).json({ message: "Failed to fetch top customers" });
    }
});

/**
 * Market Trends Widget
 * Returns weekly sales trend for last 12 weeks
 */
router.get("/trends", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const twelveWeeksAgo = new Date();
        twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

        // Get sales grouped by week
        const weeklyTrends = await db.select({
            week: sql<string>`TO_CHAR(${sales.date}, 'IYYY-IW')`,
            revenue: sql<number>`sum(${sales.totalPrice})`,
            orders: sql<number>`count(*)`,
            avgOrder: sql<number>`avg(${sales.totalPrice})`
        })
            .from(sales)
            .where(and(
                eq(sales.organizationId, orgId),
                gte(sales.date, twelveWeeksAgo)
            ))
            .groupBy(sql`TO_CHAR(${sales.date}, 'IYYY-IW')`)
            .orderBy(sql`TO_CHAR(${sales.date}, 'IYYY-IW')`);

        res.json({
            trends: weeklyTrends.map(t => ({
                period: t.week,
                revenue: t.revenue,
                orders: t.orders,
                avgOrderValue: Math.round(t.avgOrder)
            })),
            growth: weeklyTrends.length >= 2
                ? ((weeklyTrends[weeklyTrends.length - 1].revenue - weeklyTrends[0].revenue) / weeklyTrends[0].revenue * 100).toFixed(1)
                : 0
        });
    } catch (error) {
        console.error("Market trends error:", error);
        res.status(500).json({ message: "Failed to fetch market trends" });
    }
});

export default router;
