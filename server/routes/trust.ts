import { Router } from "express";
import { getOrgIdFromRequest } from "../auth_util";
import { TrustEngine } from "../services/TrustEngine";
import { db } from "../storage";
import {
    trustProfiles,
    trustAppeals,
    trustScoreHistory,
    trustMetrics,
    trustPrivacySettings,
    benchmarkData
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

// ==========================================
// Trust Score Endpoints
// ==========================================

// Get current Trust Score & Status
router.get("/status", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const [profile] = await db.select()
            .from(trustProfiles)
            .where(eq(trustProfiles.organizationId, orgId));

        const settings = await db.select()
            .from(trustPrivacySettings)
            .where(eq(trustPrivacySettings.organizationId, orgId));

        res.json({
            trustScore: profile?.trustScore ?? 0,
            trustLevel: profile?.trustLevel ?? "bronze",
            verificationStatus: profile?.verificationStatus ?? "unverified",
            lastScoreUpdate: profile?.lastScoreUpdate,
            marketplaceActive: profile?.marketplaceActive ?? false,
            privacySettings: settings
        });
    } catch (error) {
        console.error("Error fetching trust status:", error);
        res.status(500).json({ error: "Failed to fetch trust status" });
    }
});

// Get detailed score breakdown
router.get("/score/breakdown", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const metrics = await db.select()
            .from(trustMetrics)
            .where(eq(trustMetrics.organizationId, orgId));

        // Format for frontend expectations if needed
        const components: any = {};
        metrics.forEach(m => {
            components[m.metricName] = m.metricValue;
        });

        res.json({
            totalScore: (await db.select().from(trustProfiles).where(eq(trustProfiles.organizationId, orgId)))[0]?.trustScore || 0,
            components,
            weights: TrustEngine.getWeights()
        });
    } catch (error) {
        console.error("Error fetching score breakdown:", error);
        res.status(500).json({ error: "Failed to fetch score breakdown" });
    }
});

router.post("/score/recalculate", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const score = await TrustEngine.calculateScore(orgId);
        res.json({ success: true, newScore: score });
    } catch (error) {
        console.error("Error calculating trust score:", error);
        res.status(500).json({ error: "Failed to calculate trust score" });
    }
});

router.get("/score/predict-risk", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const risk = await TrustEngine.predictDefaultRisk(orgId);
        res.json({ riskProbability: risk });
    } catch (error) {
        console.error("Error predicting default risk:", error);
        res.status(500).json({ error: "Failed to predict risk" });
    }
});

router.get("/score/history", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const history = await db.select()
            .from(trustScoreHistory)
            .where(eq(trustScoreHistory.organizationId, orgId))
            .orderBy(desc(trustScoreHistory.changedAt))
            .limit(30);

        res.json(history);
    } catch (error) {
        console.error("Error fetching score history:", error);
        res.status(500).json({ error: "Failed to fetch score history" });
    }
});

// ==========================================
// Consent & Privacy
// ==========================================

router.get("/consent", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const settings = await db.select()
            .from(trustPrivacySettings)
            .where(eq(trustPrivacySettings.organizationId, orgId));

        res.json({
            status: settings.map(s => ({
                consentType: s.permissionType,
                isActive: s.isActive,
                grantedAt: s.grantedAt,
                revokedAt: !s.isActive ? s.grantedAt : null
            })),
            history: { active: [], revoked: [] } // Placeholder for actual history log
        });
    } catch (error) {
        console.error("Error fetching consent:", error);
        res.status(500).json({ error: "Failed to fetch consent" });
    }
});

router.post("/consent/grant", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const { consentType } = req.body;

        await db.insert(trustPrivacySettings).values({
            organizationId: orgId,
            permissionType: consentType,
            isActive: true,
        }).onConflictDoUpdate({
            target: [trustPrivacySettings.organizationId, trustPrivacySettings.permissionType],
            set: { isActive: true, grantedAt: new Date() }
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Error granting consent:", error);
        res.status(500).json({ error: "Failed to grant consent" });
    }
});

router.post("/consent/revoke", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const { consentType } = req.body;

        await db.update(trustPrivacySettings)
            .set({ isActive: false })
            .where(and(
                eq(trustPrivacySettings.organizationId, orgId),
                eq(trustPrivacySettings.permissionType, consentType)
            ));

        res.json({ success: true });
    } catch (error) {
        console.error("Error revoking consent:", error);
        res.status(500).json({ error: "Failed to revoke consent" });
    }
});

// ==========================================
// Benchmarks
// ==========================================

router.get("/benchmarks", async (req, res) => {
    try {
        const benchmarks = await db.select()
            .from(benchmarkData)
            .orderBy(desc(benchmarkData.calculationDate));
        res.json(benchmarks);
    } catch (error) {
        console.error("Error fetching benchmarks:", error);
        res.status(500).json({ error: "Failed to fetch benchmarks" });
    }
});

// ==========================================
// Appeals
// ==========================================

router.post("/appeals", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const { appealType, reason, evidence } = req.body;

        await db.insert(trustAppeals).values({
            organizationId: orgId,
            appealType,
            reason: reason || evidence?.description || "No reason provided",
            status: 'submitted'
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Error submitting appeal:", error);
        res.status(500).json({ error: "Failed to submit appeal" });
    }
});

router.get("/appeals", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const appeals = await db.select()
            .from(trustAppeals)
            .where(eq(trustAppeals.organizationId, orgId))
            .orderBy(desc(trustAppeals.createdAt));

        res.json(appeals);
    } catch (error) {
        console.error("Error fetching appeals:", error);
        res.status(500).json({ error: "Failed to fetch appeals" });
    }
});

export const trustRoutes = router;

