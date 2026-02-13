import { db } from "../storage";
import { loanCases, repaymentSchedules, loans } from "../../shared/schema";
import { eq, and, lte, sql } from "drizzle-orm";

/**
 * CollectionService - Handles collection cases, aging buckets, and agent assignments.
 */
export class CollectionService {
    /**
     * Scans for overdue payments and creates/updates collection cases.
     */
    static async syncOverdueCases(organizationId: string) {
        // 1. Fetch overdue schedules with no paid status
        const overdueSchedules = await db.query.repaymentSchedules.findMany({
            where: and(
                eq(repaymentSchedules.organizationId, organizationId),
                eq(repaymentSchedules.status, 'pending'),
                lte(repaymentSchedules.dueDate, new Date())
            ),
            with: {
                loan: true
            }
        });

        for (const schedule of overdueSchedules) {
            const daysOverdue = Math.floor((new Date().getTime() - new Date(schedule.dueDate).getTime()) / (1000 * 3600 * 24));

            let bucket: '0-30' | '31-60' | '61-90' | '90+' = '0-30';
            if (daysOverdue > 90) bucket = '90+';
            else if (daysOverdue > 60) bucket = '61-90';
            else if (daysOverdue > 30) bucket = '31-60';

            // Check if case exists
            const existingCase = await db.query.loanCases.findFirst({
                where: and(
                    eq(loanCases.loanId, schedule.loanId),
                    eq(loanCases.organizationId, organizationId)
                )
            });

            if (existingCase) {
                // Update aging bucket if active
                if (existingCase.status !== 'recovered') {
                    await db.update(loanCases)
                        .set({ agingBucket: bucket, updatedAt: new Date() })
                        .where(eq(loanCases.id, existingCase.id));
                }
            } else {
                // Create new collection case
                await db.insert(loanCases).values({
                    organizationId,
                    loanId: schedule.loanId,
                    status: 'active',
                    agingBucket: bucket
                });
            }

            // Update schedule status to overdue
            await db.update(repaymentSchedules)
                .set({ status: 'overdue' })
                .where(eq(repaymentSchedules.id, schedule.id));
        }
    }

    /**
     * Assigns an agent to a collection case.
     */
    static async assignAgent(caseId: string, agentId: string) {
        await db.update(loanCases)
            .set({ agentId, updatedAt: new Date() })
            .where(eq(loanCases.id, caseId));
    }

    /**
     * Transition case status.
     */
    static async updateCaseStatus(caseId: string, status: 'pending' | 'active' | 'recovered' | 'escalated') {
        await db.update(loanCases)
            .set({ status, updatedAt: new Date() })
            .where(eq(loanCases.id, caseId));
    }
}
