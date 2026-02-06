import { db } from "../storage";
// import { trustParticipants, sharedInsights, organizations } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export class TrustNetService {

    // Initialize a participant if they don't exist
    async ensureParticipant(orgId: string) {
        const existing = await db.select().from(trustParticipants).where(eq(trustParticipants.organizationId, orgId)).limit(1);
        if (existing.length === 0) {
            await db.insert(trustParticipants).values({
                organizationId: orgId,
                trustScore: 100, // Starting score
                status: "observation"
            });
        }
    }

    // Calculate and update Trust Score
    // Formula: Base (100) + (Contributions * 5) * (Multiplier / 100)
    async updateTrustScore(orgId: string) {
        await this.ensureParticipant(orgId);

        const [participant] = await db.select().from(trustParticipants).where(eq(trustParticipants.organizationId, orgId));
        if (!participant) return;

        const baseScore = 100;
        const contributionPoints = (participant.contributionCount || 0) * 5;
        const multiplier = (participant.multiplier || 100) / 100;

        let newScore = Math.floor((baseScore + contributionPoints) * multiplier);

        // Cap at 1000
        if (newScore > 1000) newScore = 1000;

        let newStatus = participant.status;
        if (newScore > 800) newStatus = "guardian";
        else if (newScore > 500) newStatus = "peer";
        else if (newScore > 300) newStatus = "verified";

        await db.update(trustParticipants).set({
            trustScore: newScore,
            status: newStatus,
            lastActiveAt: new Date()
        }).where(eq(trustParticipants.organizationId, orgId));

        return { newScore, newStatus };
    }

    // Register a shared insight (Contribution)
    async submitInsight(orgId: string, insight: { metricKey: string, value: number, industry: string }) {
        await this.ensureParticipant(orgId);

        // 1. Store the insight
        await db.insert(sharedInsights).values({
            sourceOrgId: orgId,
            industry: insight.industry,
            metricKey: insight.metricKey,
            value: insight.value,
            verificationScore: 100 // Assume auto-verified for now
        });

        // 2. Increment contribution count
        await db.execute(sql`
        UPDATE trust_participants 
        SET contribution_count = contribution_count + 1 
        WHERE organization_id = ${orgId}
    `);

        // 3. Recalculate score
        return await this.updateTrustScore(orgId);
    }

    // "Anti-Freeloader" Penalty
    // If a user disables sharing or leaves, they lose their multiplier
    async penalizeExit(orgId: string) {
        await db.update(trustParticipants).set({
            multiplier: 0, // Reset multiplier
            status: "observation"
        }).where(eq(trustParticipants.organizationId, orgId));
    }
}

export const trustNet = new TrustNetService();
