import { Router } from "express";
import { db } from "../storage";
import { systemEvents } from "../../shared/schema";
import { getOrgIdFromRequest, getAuthenticatedUser } from "../auth_util";

const router = Router();

// Emit System Event (Callable from client)
router.post("/", async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const orgId = await getOrgIdFromRequest(req);

        // Parse body
        const { type, message, severity, metadata } = req.body;

        // Basic Validation
        if (!type || !message) {
            res.status(400).json({ message: "Missing type or message" });
            return;
        }

        const [event] = await db.insert(systemEvents).values({
            organizationId: orgId!,
            type,
            message,
            severity: severity || 'info', // default
            metadata: { ...metadata, userId: user.id }, // Attach user context
            relatedEntityId: user.id,
            relatedEntityType: 'user',
        }).returning();

        res.json(event);
    } catch (error) {
        res.status(500).json({ message: "Error emitting event", error });
    }
});

export default router;

