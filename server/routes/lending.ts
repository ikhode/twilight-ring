import { Router, Request, Response } from "express";
import { db } from "../storage";
import {
    loans,
    loanApplications,
    repaymentSchedules,
    loanPayments,
    insertLoanApplicationSchema,
    customers,
    loanDocuments,
    loanCases
} from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";
import { AuthenticatedRequest } from "../types";
import { logAudit } from "../lib/audit";
import { AmortizationCalculator } from "../services/AmortizationCalculator";
import { CollectionService } from "../services/CollectionService";

const router = Router();

/**
 * Get all loans for the organization.
 * @route GET /api/lending/loans
 */
router.get("/loans", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const result = await db.query.loans.findMany({
            where: eq(loans.organizationId, orgId),
            with: {
                customer: true,
                application: true
            },
            orderBy: [desc(loans.createdAt)]
        });

        res.json(result);
    } catch (error) {
        console.error("Fetch loans error:", error);
        res.status(500).json({ message: "Error fetching loans" });
    }
});

/**
 * Get all loan applications for the organization.
 * @route GET /api/lending/applications
 */
router.get("/applications", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const result = await db.query.loanApplications.findMany({
            where: eq(loanApplications.organizationId, orgId),
            with: {
                customer: true
            },
            orderBy: [desc(loanApplications.createdAt)]
        });

        res.json(result);
    } catch (error) {
        console.error("Fetch applications error:", error);
        res.status(500).json({ message: "Error fetching applications" });
    }
});

/**
 * Submit a new loan application.
 * @route POST /api/lending/applications
 */
router.post("/applications", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const parsed = insertLoanApplicationSchema.safeParse({
            ...req.body,
            organizationId: orgId
        });

        if (!parsed.success) {
            res.status(400).json({ message: "Invalid application data", errors: parsed.error });
            return;
        }

        // AI Placeholder: Basic risk scoring based on customer balance (if available)
        const customer = await db.query.customers.findFirst({
            where: and(eq(customers.id, parsed.data.customerId), eq(customers.organizationId, orgId))
        });

        let riskScore = 50; // Initial neutral score
        if (customer) {
            // Very basic logic: if balance is high positive (receivable), maybe higher risk or lower?
            // Usually high balance means they owe money.
            if (customer.balance > 1000000) riskScore += 20; // High debt
            if (customer.status === 'active') riskScore -= 10; // Good sign
        }

        const [application] = await db.insert(loanApplications).values({
            ...parsed.data,
            riskScore: req.body.riskScore || riskScore,
            aiAssessment: req.body.aiAssessment || {
                logic: "Cognitive Basic Scoring v1",
                factors: [
                    { name: "Customer Status", impact: customer?.status === 'active' ? -10 : 0 },
                    { name: "Existing Debt", impact: (customer?.balance || 0) > 1000000 ? 20 : 0 }
                ],
                recommendation: riskScore < 60 ? "Approve" : "Manual Review Required"
            }
        }).returning();

        await logAudit(
            orgId,
            (req.user as any)?.id || "system",
            "CREATE_LOAN_APPLICATION",
            application.id,
            { message: `Nueva solicitud de préstamo creada por $${parsed.data.requestedAmount / 100}` }
        );

        res.status(201).json(application);
    } catch (error) {
        console.error("Create application error:", error);
        res.status(500).json({ message: "Error creating application" });
    }
});


/**
 * Approve or Reject a loan application with French Amortization.
 */
router.patch("/applications/:id", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const appId = req.params.id;
        const { status, interestRate } = req.body;

        if (!['active', 'rejected'].includes(status)) {
            res.status(400).json({ message: "Invalid status" });
            return;
        }

        const application = await db.query.loanApplications.findFirst({
            where: and(eq(loanApplications.id, appId), eq(loanApplications.organizationId, orgId))
        });

        if (!application) {
            res.status(404).json({ message: "Application not found" });
            return;
        }

        await db.update(loanApplications)
            .set({ status, interestRateOffered: interestRate?.toString() || application.interestRateOffered, updatedAt: new Date() })
            .where(eq(loanApplications.id, appId));

        if (status === 'active') {
            const finalRate = interestRate || 10;

            const [loan] = await db.insert(loans).values({
                organizationId: orgId,
                customerId: application.customerId,
                applicationId: application.id,
                amount: application.requestedAmount,
                interestRate: finalRate.toString(),
                termMonths: application.requestedTermMonths,
                status: 'active',
                startDate: new Date(),
            }).returning();

            // Using AmortizationCalculator (French Method)
            const scheduleData = AmortizationCalculator.generateSchedule(
                application.requestedAmount,
                finalRate,
                application.requestedTermMonths,
                new Date()
            );

            const schedules = scheduleData.map(s => ({
                loanId: loan.id,
                organizationId: orgId,
                dueDate: s.dueDate,
                amountDue: s.amountDue,
                principalDue: s.principalDue,
                interestDue: s.interestDue,
                status: 'pending'
            }));

            await db.insert(repaymentSchedules).values(schedules as any);

            await logAudit(orgId, (req.user as any)?.id || "system", "APPROVE_LOAN", loan.id, { message: `Loan approved with French Amortization.` });
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Patch application error:", error);
        res.status(500).json({ message: "Error updating application" });
    }
});

// --- Collections Endpoints ---

/**
 * Trigger manual sync of overdue cases.
 */
router.post("/collections/sync", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        await CollectionService.syncOverdueCases(orgId);
        res.json({ success: true, message: "Collections synced" });
    } catch (error) {
        res.status(500).json({ message: "Error syncing collections" });
    }
});

/**
 * Get all active collection cases.
 */
router.get("/collections/cases", async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req as AuthenticatedRequest);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const cases = await db.query.loanCases.findMany({
            where: eq(loanCases.organizationId, orgId),
            with: {
                loan: {
                    with: {
                        customer: true
                    }
                }
            }
        });

        res.json(cases);
    } catch (error) {
        res.status(500).json({ message: "Error fetching cases" });
    }
});

/**
 * Assign an agent to a case.
 */
router.patch("/collections/cases/:id/assign", async (req: Request, res: Response): Promise<void> => {
    try {
        const { agentId } = req.body;
        await CollectionService.assignAgent(req.params.id, agentId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Error assigning agent" });
    }
});

export default router;
