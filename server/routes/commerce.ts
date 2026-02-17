import { Router } from "express";
import { db } from "../storage";
import { modifiers, discounts } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";
import { requirePermission } from "../middleware/permission_check";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const router = Router();

// --- MODIFIERS ---

router.get("/modifiers", requirePermission("inventory.read"), async (req, res) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const results = await db.select().from(modifiers).where(eq(modifiers.organizationId, orgId));
    res.json(results);
});

router.post("/modifiers", requirePermission("inventory.write"), async (req, res) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { name, options, allowMultiple, isRequired } = req.body;

    // Basic validation
    if (!name || !options || !Array.isArray(options)) {
        return res.status(400).json({ error: "Invalid payload" });
    }

    const [modifier] = await db.insert(modifiers).values({
        organizationId: orgId,
        name,
        options,
        allowMultiple: allowMultiple ?? true,
        isRequired: isRequired ?? false
    }).returning();

    res.status(201).json(modifier);
});

router.patch("/modifiers/:id", requirePermission("inventory.write"), async (req, res) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const id = req.params.id;
    const [modifier] = await db.update(modifiers)
        .set(req.body)
        .where(and(eq(modifiers.id, id), eq(modifiers.organizationId, orgId)))
        .returning();

    if (!modifier) return res.status(404).json({ error: "Modifier not found" });
    res.json(modifier);
});

router.delete("/modifiers/:id", requirePermission("inventory.write"), async (req, res) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    await db.delete(modifiers).where(and(eq(modifiers.id, req.params.id), eq(modifiers.organizationId, orgId)));
    res.status(204).end();
});

// --- DISCOUNTS ---

router.get("/discounts", requirePermission("sales.read"), async (req, res) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const results = await db.select().from(discounts).where(eq(discounts.organizationId, orgId));
    res.json(results);
});

router.post("/discounts", requirePermission("sales.write"), async (req, res) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { name, type, value } = req.body; // type: percentage | fixed

    if (!name || !type || value === undefined) {
        return res.status(400).json({ error: "Invalid payload" });
    }

    const [discount] = await db.insert(discounts).values({
        organizationId: orgId,
        name,
        type,
        value,
        isActive: true
    }).returning();

    res.status(201).json(discount);
});

router.patch("/discounts/:id", requirePermission("sales.write"), async (req, res) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const [discount] = await db.update(discounts)
        .set(req.body)
        .where(and(eq(discounts.id, req.params.id), eq(discounts.organizationId, orgId)))
        .returning();

    if (!discount) return res.status(404).json({ error: "Discount not found" });
    res.json(discount);
});

router.delete("/discounts/:id", requirePermission("sales.write"), async (req, res) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    await db.delete(discounts).where(and(eq(discounts.id, req.params.id), eq(discounts.organizationId, orgId)));
    res.status(204).end();
});

export const commerceRoutes = router;
