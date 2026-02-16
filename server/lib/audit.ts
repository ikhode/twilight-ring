import { Request } from "express";
import { db } from "../storage";
import { auditLogs } from "../../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Records an audit log entry for a critical system action.
 * @param req The Express request object to extract client metadata
 * @param orgId The organization ID
 * @param userId The user performing the action
 * @param action The action code (e.g., 'UPDATE_PRICE', 'APPROVE_TICKET')
 * @param resourceId The ID of the affected resource
 * @param details JSON object with additional context (old values, new values, etc.)
 */
export async function logAudit(
    req: Request | null,
    orgId: string,
    userId: string,
    action: string,
    resourceId: string,
    details: any = {}
) {
    try {
        const clientIp = req?.ip || req?.headers?.['x-forwarded-for']?.toString() || null;
        const userAgent = req?.headers?.['user-agent'] || null;

        // Validate userId: must be a UUID or null. 
        const validUserId = (userId && userId.length > 20) ? userId : null;

        await db.insert(auditLogs).values({
            organizationId: orgId,
            userId: validUserId,
            action: action,
            resourceId: resourceId?.toString(),
            details: details,
            clientIp,
            userAgent
        });
    } catch (error) {
        console.error("Failed to write audit log:", error);
    }
}
