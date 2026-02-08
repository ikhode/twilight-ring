import { Router } from "express";
import { getOrgIdFromRequest, getUserIdFromRequest } from "../auth_util";
import { trustNet } from "../services/trust";
import { trustScoreEngine } from "../services/trust-score-engine";
import { consentManager } from "../services/consent-manager";
import { db } from "../storage";
import { trustParticipants, trustAppeals, trustScoreHistory, organizations } from "@shared/schema";
import { eq, desc, and, ne, isNull } from "drizzle-orm";
import type { ConsentType } from "../../shared/modules/trustnet/schema";

const router = Router();

// ==========================================
// Trust Score Endpoints
// ==========================================

// Get current Trust Score & Status with breakdown
router.get("/status", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        // Ensure participant exists
        await trustNet.ensureParticipant(orgId);

        // Get participant data
        const [participant] = await db.select()
            .from(trustParticipants)
            .where(eq(trustParticipants.organizationId, orgId));

        // Get consent status
        const consents = await consentManager.getConsentStatus(orgId);

        res.json({
            trustScore: participant?.trustScore ?? 0,
            status: participant?.status ?? "observation",
            contributionCount: participant?.contributionCount ?? 0,
            multiplier: (participant?.multiplier ?? 100) / 100,
            lastActiveAt: participant?.lastActiveAt,
            consents
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

        const breakdown = await trustScoreEngine.getScoreBreakdown(orgId);
        res.json(breakdown);
    } catch (error) {
        console.error("Error fetching score breakdown:", error);
        res.status(500).json({ error: "Failed to fetch score breakdown" });
    }
});

// Trigger score recalculation
router.post("/score/calculate", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        // Check if metrics sharing is consented
        const hasConsent = await consentManager.checkConsent(orgId, 'share_metrics');
        if (!hasConsent) {
            return res.status(403).json({
                error: "Consent required",
                message: "You must grant consent to share metrics before calculating your Trust Score"
            });
        }

        const result = await trustScoreEngine.calculateTrustScore(orgId);
        res.json(result);
    } catch (error) {
        console.error("Error calculating trust score:", error);
        res.status(500).json({ error: "Failed to calculate trust score" });
    }
});

// Get score history
router.get("/score/history", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const history = await db.select()
            .from(trustScoreHistory)
            .where(eq(trustScoreHistory.organizationId, orgId))
            .orderBy(desc(trustScoreHistory.calculatedAt))
            .limit(30);

        res.json(history);
    } catch (error) {
        console.error("Error fetching score history:", error);
        res.status(500).json({ error: "Failed to fetch score history" });
    }
});

// ==========================================
// Consent Management Endpoints
// ==========================================

// Get consent status
router.get("/consent", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const status = await consentManager.getConsentStatus(orgId);
        const history = await consentManager.getConsentHistory(orgId);

        res.json({ status, history });
    } catch (error) {
        console.error("Error fetching consent status:", error);
        res.status(500).json({ error: "Failed to fetch consent status" });
    }
});

// Grant consent
router.post("/consent/grant", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        const userId = await getUserIdFromRequest(req);
        if (!orgId || !userId) return res.status(401).json({ error: "Unauthorized" });

        const { consentType } = req.body as { consentType: ConsentType };
        if (!consentType) {
            return res.status(400).json({ error: "consentType is required" });
        }

        const result = await consentManager.grantConsent(orgId, consentType, userId, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json(result);
    } catch (error) {
        console.error("Error granting consent:", error);
        res.status(500).json({ error: "Failed to grant consent" });
    }
});

// Revoke consent
router.post("/consent/revoke", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        const userId = await getUserIdFromRequest(req);
        if (!orgId || !userId) return res.status(401).json({ error: "Unauthorized" });

        const { consentType } = req.body as { consentType: ConsentType };
        if (!consentType) {
            return res.status(400).json({ error: "consentType is required" });
        }

        const result = await consentManager.revokeConsent(orgId, consentType, userId);

        // Apply anti-freeloader penalty if revoking share_metrics
        if (consentType === 'share_metrics') {
            await trustNet.penalizeExit(orgId);
        }

        res.json(result);
    } catch (error) {
        console.error("Error revoking consent:", error);
        res.status(500).json({ error: "Failed to revoke consent" });
    }
});

// Grant all marketplace consents at once
router.post("/consent/marketplace", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        const userId = await getUserIdFromRequest(req);
        if (!orgId || !userId) return res.status(401).json({ error: "Unauthorized" });

        const result = await consentManager.grantMarketplaceConsents(orgId, userId, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json(result);
    } catch (error) {
        console.error("Error granting marketplace consents:", error);
        res.status(500).json({ error: "Failed to grant marketplace consents" });
    }
});

// ==========================================
// Network Visualization
// ==========================================

// Get Network Visualization Data
router.get("/graph", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        // Get participant data for self
        const [selfParticipant] = await db.select()
            .from(trustParticipants)
            .where(eq(trustParticipants.organizationId, orgId));

        // Get other participants with public profiles
        const otherOrgs = await db.select({
            id: organizations.id,
            name: organizations.name,
            trustScore: trustParticipants.trustScore,
            status: trustParticipants.status,
        })
            .from(trustParticipants)
            .innerJoin(organizations, eq(organizations.id, trustParticipants.organizationId))
            .where(and(
                ne(trustParticipants.organizationId, orgId),
                // Only show orgs with public profile consent (simplified for demo)
            ))
            .limit(15);

        // Build nodes
        const nodes = [
            {
                id: "me",
                label: "Tu Organización",
                type: "self",
                score: selfParticipant?.trustScore ?? 0
            },
            ...otherOrgs.map((org, i) => ({
                id: `n${i}`,
                label: org.name || `Org ${i}`,
                type: org.status || 'peer',
                score: org.trustScore ?? 0
            }))
        ];

        // Generate links based on score similarity
        const links = otherOrgs.map((org, i) => ({
            source: "me",
            target: `n${i}`,
            strength: Math.min(1, (org.trustScore ?? 0) / 1000)
        }));

        res.json({ nodes, links });
    } catch (error) {
        console.error("Error fetching graph data:", error);
        res.status(500).json({ error: "Failed to fetch graph data" });
    }
});

// ==========================================
// Contribution (Legacy - Mining Trust)
// ==========================================

router.post("/contribute", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        // Check consent
        const hasConsent = await consentManager.checkConsent(orgId, 'share_metrics');
        if (!hasConsent) {
            return res.status(403).json({
                error: "Consent required",
                message: "You must grant consent to share metrics before contributing"
            });
        }

        const result = await trustNet.submitInsight(orgId, {
            industry: req.body.industry || "general",
            metricKey: req.body.metricKey || "efficiency_index",
            value: req.body.value ?? Math.floor(Math.random() * 100)
        });

        res.json(result);
    } catch (error) {
        console.error("Error contributing data:", error);
        res.status(500).json({ error: "Failed to contribute data" });
    }
});

// ==========================================
// Appeals System
// ==========================================

// Submit an appeal
router.post("/appeals", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const { appealType, description, evidence } = req.body;
        if (!appealType) {
            return res.status(400).json({ error: "appealType is required" });
        }

        // Get current score
        const [participant] = await db.select()
            .from(trustParticipants)
            .where(eq(trustParticipants.organizationId, orgId));

        await db.insert(trustAppeals).values({
            organizationId: orgId,
            appealType,
            currentScore: participant?.trustScore ?? 0,
            description,
            evidence: evidence || {},
            status: 'pending'
        });

        res.json({ success: true, message: "Appeal submitted successfully" });
    } catch (error) {
        console.error("Error submitting appeal:", error);
        res.status(500).json({ error: "Failed to submit appeal" });
    }
});

// Get appeals for organization
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

