import { Router } from "express";
import { db } from "../storage";
import { organizations, processInstances, processEvents, aiInsights, users, sales, employees } from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";

const router = Router();

router.get("/stats", async (req, res) => {
    try {
        const organizationId = await getOrgIdFromRequest(req);
        if (!organizationId) return res.status(401).json({ message: "Unauthorized" });

        // 1. Get Organization Data (for base metrics)
        const org = await db.query.organizations.findFirst({
            where: eq(organizations.id, organizationId),
        });

        // 2. Calculate Efficiency (Health Score from recent instances)
        const recentInstances = await db.query.processInstances.findMany({
            where: eq(processInstances.processId, sql`(SELECT id FROM processes WHERE "organization_id" = ${organizationId} LIMIT 1)`),
            orderBy: [desc(processInstances.startedAt)],
            limit: 5,
        });

        const avgHealth = recentInstances.length > 0
            ? Math.round(recentInstances.reduce((acc, curr) => acc + (curr.healthScore || 0), 0) / recentInstances.length)
            : 100;

        // 3. Count Anomalies (today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const anomaliesToday = await db.select({ count: sql<number>`count(*)` })
            .from(aiInsights)
            .where(and(
                eq(aiInsights.organizationId, organizationId),
                eq(aiInsights.type, 'anomaly'),
                sql`${aiInsights.createdAt} >= ${today.toISOString()}`
            ));

        // 4. Real Sales History & Revenue
        const allSales = await db.query.sales.findMany({
            where: eq(sales.organizationId, organizationId),
            orderBy: [desc(sales.date)],
        });

        const totalRevenue = allSales.reduce((acc, curr) => acc + curr.totalPrice, 0);

        // Group by day for history (last 10 days)
        const historyMap: Record<string, number> = {};
        allSales.forEach(s => {
            const dateStr = new Date(s.date!).toISOString().split('T')[0];
            historyMap[dateStr] = (historyMap[dateStr] || 0) + s.totalPrice;
        });
        const salesHistory = Object.values(historyMap).slice(0, 10).reverse();

        // 5. Real Workforce
        const staffCount = await db.select({ count: sql<number>`count(*)` })
            .from(employees)
            .where(eq(employees.organizationId, organizationId));

        const stats = {
            revenue: `$${(totalRevenue / 100).toLocaleString()}`,
            efficiency: `${avgHealth}%`,
            anomalies: Number(anomaliesToday[0]?.count || 0),
            workforce: String(staffCount[0]?.count || 0),
            salesHistory: salesHistory.length > 0 ? salesHistory : [0],
            industry: org?.industry,
            predictionConfidence: 98.4
        };

        res.json(stats);
    } catch (error) {
        console.error("Dashboard stats error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
