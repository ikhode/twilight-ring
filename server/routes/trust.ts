import { Router } from "express";
import { getOrgIdFromRequest } from "../auth_util";
import { trustNet } from "../services/trust";
import { db } from "../storage";
import { trustParticipants, sharedInsights, organizations, users } from "@shared/schema";
import { eq, desc, and, ne } from "drizzle-orm";

const router = Router();

// Get current Trust Score & Status
router.get("/status", async (req, res) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    await trustNet.ensureParticipant(orgId);
    const [participant] = await db.select().from(trustParticipants).where(eq(trustParticipants.organizationId, orgId));

    res.json(participant);
});

// Get Network Visualization Data (Mocked Graph for specific Org)
router.get("/graph", async (req, res) => {
    const orgId = await getOrgIdFromRequest(req);

    // Provide some mocked nodes for the visualization
    // In a real system, these would be real other organizations (anonymized)
    const nodes = [
        { id: "me", label: "Tu Organización", type: "self", score: 0 }, // Score filled later
        { id: "n1", label: "Peer A", type: "peer", score: 750 },
        { id: "n2", label: "Peer B", type: "peer", score: 620 },
        { id: "n3", label: "Guardian Node", type: "guardian", score: 980 },
        { id: "n4", label: "Observer X", type: "observation", score: 150 },
        { id: "n5", label: "Observer Y", type: "observation", score: 200 }
    ];

    const links = [
        { source: "me", target: "n3", strength: 0.8 },
        { source: "n1", target: "n3", strength: 0.6 },
        { source: "n2", target: "n3", strength: 0.7 },
        { source: "n4", target: "n2", strength: 0.3 },
        { source: "n5", target: "n1", strength: 0.2 },
        { source: "me", target: "n1", strength: 0.4 }
    ];

    res.json({ nodes, links });
});

// Contribute Data (Mining Trust)
router.post("/contribute", async (req, res) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    // Mock contribution
    const result = await trustNet.submitInsight(orgId, {
        industry: "general", // activeOrg.industry
        metricKey: "efficiency_index",
        value: Math.floor(Math.random() * 100)
    });

    res.json(result);
});

export const trustRoutes = router;
