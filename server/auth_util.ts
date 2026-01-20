import { Request } from "express";
import { db } from "./storage";
import { userOrganizations } from "../shared/schema";
import { eq } from "drizzle-orm";
import { supabaseAdmin } from "./supabase";

export async function getOrgIdFromRequest(req: Request): Promise<string | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    const token = authHeader.replace("Bearer ", "");

    // Validate token with Supabase
    try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            // Quietly handle invalid token errors (common during dev/resets)
            return null;
        }

        // Get user's organization
        const userOrg = await db.query.userOrganizations.findFirst({
            where: eq(userOrganizations.userId, user.id),
        });

        return userOrg ? userOrg.organizationId : null;
    } catch (e) {
        // Return null for malformed tokens instead of throwing
        return null;
    }
}
