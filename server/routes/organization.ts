import { Router } from "express";
import { db } from "../storage";
import { organizations } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";

const router = Router();

// PATCH /api/organization - Update Organization Details
router.patch("/", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { name } = req.body;
        if (!name) return res.status(400).json({ message: "Name is required" });

        await db.update(organizations)
            .set({ name })
            .where(eq(organizations.id, orgId));

        res.json({ message: "Organization updated successfully" });
    } catch (error) {
        console.error("Update Organization Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export const organizationRoutes = router;
