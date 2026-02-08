import { db } from "../storage";
import { eq, and, isNull } from "drizzle-orm";
import {
    marketplaceConsents,
    trustAuditLogs,
    type ConsentType,
    CONSENT_TYPES
} from "../../shared/modules/trustnet/schema";

/**
 * Consent Manager Service
 * 
 * LFPDPPP/GDPR-compliant consent management for TrustNet data sharing.
 * Handles explicit opt-in, revocation, and audit logging.
 */
export class ConsentManager {

    /**
     * Grant consent for a specific type
     * Records IP, user agent, and user who granted for legal compliance
     */
    async grantConsent(
        orgId: string,
        consentType: ConsentType,
        userId: string,
        metadata?: { ipAddress?: string; userAgent?: string }
    ): Promise<{ success: boolean; message: string }> {
        // Validate consent type
        if (!CONSENT_TYPES.includes(consentType)) {
            return { success: false, message: `Invalid consent type: ${consentType}` };
        }

        // Check if consent already exists and is active
        const existing = await this.checkConsent(orgId, consentType);
        if (existing) {
            return { success: true, message: 'Consent already granted' };
        }

        // Check if there's a revoked consent we can update
        const [revokedConsent] = await db.select()
            .from(marketplaceConsents)
            .where(and(
                eq(marketplaceConsents.organizationId, orgId),
                eq(marketplaceConsents.consentType, consentType)
            ));

        if (revokedConsent) {
            // Re-grant by clearing revoked_at
            await db.update(marketplaceConsents)
                .set({
                    grantedAt: new Date(),
                    revokedAt: null,
                    grantedBy: userId,
                    ipAddress: metadata?.ipAddress,
                    userAgent: metadata?.userAgent,
                    consentVersion: '1.0',
                })
                .where(eq(marketplaceConsents.id, revokedConsent.id));
        } else {
            // Create new consent record
            await db.insert(marketplaceConsents).values({
                organizationId: orgId,
                consentType,
                grantedBy: userId,
                ipAddress: metadata?.ipAddress,
                userAgent: metadata?.userAgent,
                consentVersion: '1.0',
            });
        }

        // Log audit event
        await this.logAudit(orgId, userId, 'consent_granted', consentType);

        return { success: true, message: `Consent granted: ${consentType}` };
    }

    /**
     * Revoke consent for a specific type
     */
    async revokeConsent(
        orgId: string,
        consentType: ConsentType,
        userId: string
    ): Promise<{ success: boolean; message: string }> {
        // Validate consent type
        if (!CONSENT_TYPES.includes(consentType)) {
            return { success: false, message: `Invalid consent type: ${consentType}` };
        }

        // Find active consent
        const [activeConsent] = await db.select()
            .from(marketplaceConsents)
            .where(and(
                eq(marketplaceConsents.organizationId, orgId),
                eq(marketplaceConsents.consentType, consentType),
                isNull(marketplaceConsents.revokedAt)
            ));

        if (!activeConsent) {
            return { success: false, message: 'No active consent found' };
        }

        // Mark as revoked
        await db.update(marketplaceConsents)
            .set({ revokedAt: new Date() })
            .where(eq(marketplaceConsents.id, activeConsent.id));

        // Log audit event
        await this.logAudit(orgId, userId, 'consent_revoked', consentType);

        return { success: true, message: `Consent revoked: ${consentType}` };
    }

    /**
     * Check if a specific consent is currently active
     */
    async checkConsent(orgId: string, consentType: ConsentType): Promise<boolean> {
        const [consent] = await db.select()
            .from(marketplaceConsents)
            .where(and(
                eq(marketplaceConsents.organizationId, orgId),
                eq(marketplaceConsents.consentType, consentType),
                isNull(marketplaceConsents.revokedAt)
            ));

        return !!consent;
    }

    /**
     * Check multiple consents at once
     */
    async checkConsents(orgId: string, consentTypes: ConsentType[]): Promise<Record<ConsentType, boolean>> {
        const result: Partial<Record<ConsentType, boolean>> = {};

        for (const type of consentTypes) {
            result[type] = await this.checkConsent(orgId, type);
        }

        return result as Record<ConsentType, boolean>;
    }

    /**
     * Get all consents for an organization (active and revoked)
     */
    async getConsentHistory(orgId: string): Promise<{
        active: Array<{ type: ConsentType; grantedAt: Date; version: string }>;
        revoked: Array<{ type: ConsentType; grantedAt: Date; revokedAt: Date }>;
    }> {
        const consents = await db.select()
            .from(marketplaceConsents)
            .where(eq(marketplaceConsents.organizationId, orgId));

        const active: Array<{ type: ConsentType; grantedAt: Date; version: string }> = [];
        const revoked: Array<{ type: ConsentType; grantedAt: Date; revokedAt: Date }> = [];

        for (const consent of consents) {
            if (consent.revokedAt) {
                revoked.push({
                    type: consent.consentType as ConsentType,
                    grantedAt: consent.grantedAt!,
                    revokedAt: consent.revokedAt,
                });
            } else {
                active.push({
                    type: consent.consentType as ConsentType,
                    grantedAt: consent.grantedAt!,
                    version: consent.consentVersion,
                });
            }
        }

        return { active, revoked };
    }

    /**
     * Get the current consent status for all types
     */
    async getConsentStatus(orgId: string): Promise<{
        shareMetrics: boolean;
        publicProfile: boolean;
        marketplaceParticipation: boolean;
        industryBenchmarks: boolean;
    }> {
        const statuses = await this.checkConsents(orgId, [...CONSENT_TYPES]);

        return {
            shareMetrics: statuses.share_metrics ?? false,
            publicProfile: statuses.public_profile ?? false,
            marketplaceParticipation: statuses.marketplace_participation ?? false,
            industryBenchmarks: statuses.industry_benchmarks ?? false,
        };
    }

    /**
     * Grant all required consents for marketplace participation
     */
    async grantMarketplaceConsents(
        orgId: string,
        userId: string,
        metadata?: { ipAddress?: string; userAgent?: string }
    ): Promise<{ success: boolean; granted: ConsentType[] }> {
        const requiredConsents: ConsentType[] = ['share_metrics', 'public_profile', 'marketplace_participation'];
        const granted: ConsentType[] = [];

        for (const type of requiredConsents) {
            const result = await this.grantConsent(orgId, type, userId, metadata);
            if (result.success) {
                granted.push(type);
            }
        }

        return { success: granted.length === requiredConsents.length, granted };
    }

    /**
     * Revoke all consents (for account deletion or opt-out)
     */
    async revokeAllConsents(orgId: string, userId: string): Promise<{ revoked: ConsentType[] }> {
        const revoked: ConsentType[] = [];

        for (const type of CONSENT_TYPES) {
            const result = await this.revokeConsent(orgId, type, userId);
            if (result.success) {
                revoked.push(type);
            }
        }

        return { revoked };
    }

    /**
     * Log consent-related audit events
     */
    private async logAudit(
        orgId: string,
        userId: string,
        action: string,
        consentType: string
    ): Promise<void> {
        await db.insert(trustAuditLogs).values({
            organizationId: orgId,
            userId,
            action,
            entityType: 'consent',
            entityId: consentType,
            newValue: { consentType, timestamp: new Date().toISOString() },
        });
    }
}

export const consentManager = new ConsentManager();
