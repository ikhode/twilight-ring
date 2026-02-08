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

        // 2. Real Production Efficiency (All processes)
        // Ensure we only count instances belonging to this organization
        const instancesCountResult = await db.select({ count: sql<number>`count(*)` })
            .from(processInstances)
            .where(eq(processInstances.organizationId, organizationId));

        // Get average health score for this organization's instances
        const avgHealthResult = await db.select({ avg: sql<number>`avg(${processInstances.healthScore})` })
            .from(processInstances)
            .where(eq(processInstances.organizationId, organizationId));

        const avgHealth = avgHealthResult[0]?.avg ? Math.round(Number(avgHealthResult[0].avg)) : 100;

        // 3. Count Anomalies & Trust Events
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const anomaliesCount = await db.select({ count: sql<number>`count(*)` })
            .from(aiInsights)
            .where(and(
                eq(aiInsights.organizationId, organizationId),
                eq(aiInsights.type, 'anomaly'),
                sql`${aiInsights.createdAt} >= ${today.toISOString()}`
            ));

        // Calculate Trust Events from sales + employees as trust blocks
        const salesCount = await db.select({ count: sql<number>`count(*)` })
            .from(sales)
            .where(eq(sales.organizationId, organizationId));

        const employeesCount = await db.select({ count: sql<number>`count(*)` })
            .from(employees)
            .where(eq(employees.organizationId, organizationId));

        const totalTrustBlocks = (salesCount[0]?.count || 0) + (employeesCount[0]?.count || 0);


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
        const staffCount = employeesCount[0]?.count || 0;

        const countValues = {
            sales: allSales.length,
            processes: instancesCountResult[0]?.count || 0,
            staff: Number(staffCount)
        };

        // Data Maturity Score (0-100)
        const maturityPoints = Math.min(
            (countValues.sales * 5) + (countValues.processes * 10) + (countValues.staff * 5),
            100
        );

        const hasEnoughData = countValues.sales >= 1 || countValues.processes >= 1; // Lower threshold to show *something*

        const stats = {
            revenue: `$${(totalRevenue / 100).toLocaleString()}`,
            efficiency: `${avgHealth}%`,
            anomalies: Number(anomaliesCount[0]?.count || 0),
            workforce: String(countValues.staff),
            salesHistory: allSales.length > 0 ? salesHistory : [],
            industry: org?.industry,
            predictionConfidence: hasEnoughData ? Math.min(maturityPoints + 50, 99) : 0,
            hasEnoughData,
            dataMaturityScore: maturityPoints,
            trustScore: Math.min(totalTrustBlocks + 80, 100) // Mock base trust of 80% + activity
        };

        res.json(stats);
    } catch (error) {
        console.error("Dashboard stats error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
