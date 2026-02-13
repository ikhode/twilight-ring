import { Router, type Request, type Response } from "express";
import { db } from "../storage";
import {
    shieldlineLines,
    shieldlineExtensions,
    shieldlineFirewallRules,
    shieldlineCalls
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// Get all lines for organization
router.get("/lines", async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).organizationId;
        const lines = await db.query.shieldlineLines.findMany({
            where: eq(shieldlineLines.organizationId, orgId),
            orderBy: [desc(shieldlineLines.createdAt)]
        });
        res.json(lines);
    } catch (error) {
        console.error("Error fetching lines:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Register a new line (Mock)
router.post("/lines", async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).organizationId;
        const { phoneNumber, type } = req.body;

        const [newLine] = await db.insert(shieldlineLines).values({
            organizationId: orgId,
            phoneNumber,
            type: type || "mexico_did",
            status: "active"
        }).returning();

        res.status(201).json(newLine);
    } catch (error) {
        console.error("Error registering line:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get organization extensions
router.get("/extensions", async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).organizationId;
        const extensions = await db.query.shieldlineExtensions.findMany({
            where: eq(shieldlineExtensions.organizationId, orgId),
            orderBy: [desc(shieldlineExtensions.createdAt)]
        });
        res.json(extensions);
    } catch (error) {
        console.error("Error fetching extensions:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Create a new extension
router.post("/extensions", async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).organizationId;
        const { extensionNumber, displayName, lineId } = req.body;

        const [newExt] = await db.insert(shieldlineExtensions).values({
            organizationId: orgId,
            lineId,
            extensionNumber,
            displayName,
            status: "offline"
        }).returning();

        res.status(201).json(newExt);
    } catch (error) {
        console.error("Error creating extension:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get firewall rules
router.get("/firewall", async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).organizationId;
        const rules = await db.query.shieldlineFirewallRules.findMany({
            where: eq(shieldlineFirewallRules.organizationId, orgId),
            orderBy: [desc(shieldlineFirewallRules.priority)]
        });
        res.json(rules);
    } catch (error) {
        console.error("Error fetching firewall rules:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Create firewall rule
router.post("/firewall", async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).organizationId;
        const { name, type, pattern, action, priority } = req.body;

        const [newRule] = await db.insert(shieldlineFirewallRules).values({
            organizationId: orgId,
            name,
            type,
            pattern,
            action: action || "block",
            priority: priority || 0
        }).returning();

        res.status(201).json(newRule);
    } catch (error) {
        console.error("Error creating firewall rule:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get call logs
router.get("/calls", async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).organizationId;
        const { limit = 50 } = req.query;

        const logs = await db.query.shieldlineCalls.findMany({
            where: eq(shieldlineCalls.organizationId, orgId),
            orderBy: [desc(shieldlineCalls.startedAt)],
            limit: Number(limit)
        });
        res.json(logs);
    } catch (error) {
        console.error("Error fetching call logs:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
