import { Router } from "express";
import { db } from "../storage";
import { apiKeys, webhooks } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { AuthenticatedRequest } from "../types";
import crypto from "crypto";

const router = Router();

// --- API KEYS ---

router.get("/keys", async (req, res) => {
    const orgId = (req as any).organizationId;
    const keys = await db.query.apiKeys.findMany({
        where: eq(apiKeys.organizationId, orgId),
        orderBy: (apiKeys, { desc }) => [desc(apiKeys.createdAt)]
    });
    res.json(keys);
});

router.post("/keys", async (req, res) => {
    const orgId = (req as any).organizationId;
    const { name, role } = req.body;

    if (!name) return res.status(400).json({ message: "Nombre es requerido" });

    const keyToken = crypto.randomBytes(32).toString("hex");
    const prefix = "nexus_live";
    const fullKey = `${prefix}.${keyToken}`;
    const keyHash = crypto.createHash("sha256").update(fullKey).digest("hex");

    const [newKey] = await db.insert(apiKeys).values({
        organizationId: orgId,
        name,
        keyPrefix: prefix,
        keyHash,
        role: role || "viewer",
    }).returning();

    // Only return the plain key once!
    res.status(201).json({ ...newKey, plainKey: fullKey });
});

router.delete("/keys/:id", async (req, res) => {
    const orgId = (req as any).organizationId;
    await db.update(apiKeys)
        .set({ revokedAt: new Date() })
        .where(and(eq(apiKeys.id, req.params.id), eq(apiKeys.organizationId, orgId)));
    res.sendStatus(204);
});

// --- WEBHOOKS ---

router.get("/webhooks", async (req, res) => {
    const orgId = (req as any).organizationId;
    const hooks = await db.query.webhooks.findMany({
        where: eq(webhooks.organizationId, orgId),
        orderBy: (webhooks, { desc }) => [desc(webhooks.createdAt)]
    });
    res.json(hooks);
});

router.post("/webhooks", async (req, res) => {
    const orgId = (req as any).organizationId;
    const { name, url, events } = req.body;

    if (!name || !url) return res.status(400).json({ message: "Nombre y URL son requeridos" });

    const secret = crypto.randomBytes(32).toString("hex");

    const [newHook] = await db.insert(webhooks).values({
        organizationId: orgId,
        name,
        url,
        secret,
        events: events || []
    }).returning();

    res.status(201).json(newHook);
});

router.patch("/webhooks/:id", async (req, res) => {
    const orgId = (req as any).organizationId;
    const updates = req.body;

    const [updated] = await db.update(webhooks)
        .set(updates)
        .where(and(eq(webhooks.id, req.params.id), eq(webhooks.organizationId, orgId)))
        .returning();

    res.json(updated);
});

router.delete("/webhooks/:id", async (req, res) => {
    const orgId = (req as any).organizationId;
    await db.delete(webhooks)
        .where(and(eq(webhooks.id, req.params.id), eq(webhooks.organizationId, orgId)));
    res.sendStatus(204);
});

export default router;
