import { db } from "../storage";
import { auditLogs } from "../../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Records an audit log entry for a critical system action.
 * @param orgId The organization ID
 * @param userId The user performing the action
 * @param action The action code (e.g., 'UPDATE_PRICE', 'APPROVE_TICKET')
 * @param resourceId The ID of the affected resource
 * @param details JSON object with additional context (old values, new values, etc.)
 */
export async function logAudit(
    orgId: string,
    userId: string,
    action: string,
    resourceId: string,
    details: any = {}
) {
    try {
        await db.insert(auditLogs).values({
            organizationId: orgId,
            userId: userId,
            action: action,
            resourceId: resourceId,
            details: details
        });
    } catch (error) {
        console.error("Failed to write audit log:", error);
        // Non-blocking failure, we don't want to crash the main transaction log
    }
}
