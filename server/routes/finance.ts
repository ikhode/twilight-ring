import { Router, Request, Response } from "express";
import { db } from "../storage";
import { cashRegisters, cashSessions, cashTransactions, users, employees } from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getAuthenticatedUser, getOrgIdFromRequest } from "../auth_util";

const router = Router();

// Helper to get authenticated user and organization ID
async function getContext(req: Request) {
    const user = await getAuthenticatedUser(req);
    const orgId = await getOrgIdFromRequest(req);
    return { user, orgId };
}

// GET /api/finance/cash/stats - Get current register status
router.get("/cash/stats", async (req: Request, res: Response) => {
    try {
        const { user, orgId } = await getContext(req);
        if (!user || !orgId) return res.status(401).json({ message: "Unauthorized" });

        // Get the main register for the org
        const register = await db.query.cashRegisters.findFirst({
            where: eq(cashRegisters.organizationId, orgId),
            with: {
                currentSession: true
            }
        });

        if (!register) {
            // Auto-create if not exists for this org
            // Note: In real app, this should be filtered by Org ID
            return res.json({ status: "setup_required" });
        }

        // Get recent transactions
        const transactions = await db.query.cashTransactions.findMany({
            where: and(
                eq(cashTransactions.organizationId, orgId),
                eq(cashTransactions.registerId, register.id)
            ),
            orderBy: [desc(cashTransactions.timestamp)],
            limit: 10,
            with: {
                performer: true
            }
        });

        res.json({
            register,
            transactions
        });

    } catch (error) {
        console.error("Cash stats error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// POST /api/finance/cash/open - Open a new session
router.post("/cash/open", async (req: Request, res: Response) => {
    try {
        const { user, orgId } = await getContext(req);
        if (!user || !orgId) return res.status(401).json({ message: "Unauthorized" });

        const { startAmount, notes } = req.body;

        // 1. Get Register
        let register = await db.query.cashRegisters.findFirst({
            where: eq(cashRegisters.organizationId, orgId)
        });

        // MVP: Create if missing
        if (!register) {
            const [newRegister] = await db.insert(cashRegisters).values({
                organizationId: orgId,
                name: "Caja Principal",
                status: "closed",
                balance: 0
            }).returning();
            register = newRegister;
        }

        if (register.status === 'open') {
            return res.status(400).json({ message: "Register is already open" });
        }

        // 2. Create Session
        const [session] = await db.insert(cashSessions).values({
            registerId: register.id,
            organizationId: register.organizationId,
            openedBy: user.id,
            startAmount: startAmount || 0,
            status: "open",
            notes
        }).returning();

        // 3. Update Register
        await db.update(cashRegisters)
            .set({
                status: "open",
                currentSessionId: session.id,
                balance: startAmount || 0 // Set balance to starting amount (if funding) or just keep it? 
                // Usually startAmount is what is physically there.
            })
            .where(eq(cashRegisters.id, register.id));

        res.json({ success: true, session });

    } catch (error) {
        console.error("Open session error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// POST /api/finance/cash/close - Close session
router.post("/cash/close", async (req: Request, res: Response) => {
    try {
        const { user, orgId } = await getContext(req);
        if (!user || !orgId) return res.status(401).json({ message: "Unauthorized" });

        const { declaredAmount, notes } = req.body;

        const register = await db.query.cashRegisters.findFirst({
            where: eq(cashRegisters.organizationId, orgId)
        });
        if (!register || register.status !== 'open' || !register.currentSessionId) {
            return res.status(400).json({ message: "Register is not open" });
        }

        const expectedAmount = register.balance;
        const difference = declaredAmount - expectedAmount;

        // 1. Close Session
        await db.update(cashSessions)
            .set({
                endTime: new Date(),
                closedBy: user.id,
                actualEndAmount: declaredAmount,
                expectedEndAmount: expectedAmount,
                difference,
                status: "closed",
                notes
            })
            .where(eq(cashSessions.id, register.currentSessionId));

        // 2. Close Register
        await db.update(cashRegisters)
            .set({
                status: "closed",
                currentSessionId: null
            })
            .where(eq(cashRegisters.id, register.id));

        res.json({ success: true, difference });

    } catch (error) {
        console.error("Close session error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// POST /api/finance/cash/transaction - Record movement
router.post("/cash/transaction", async (req: Request, res: Response) => {
    try {
        const { user, orgId } = await getContext(req);
        if (!user || !orgId) return res.status(401).json({ message: "Unauthorized" });

        const { type, amount, category, description } = req.body;

        const register = await db.query.cashRegisters.findFirst({
            where: eq(cashRegisters.organizationId, orgId)
        });
        if (!register || register.status !== 'open' || !register.currentSessionId) {
            return res.status(400).json({ message: "Register is closed. Open a session first." });
        }

        // Validate funds for withdrawal
        if (type === 'out' && register.balance < amount) {
            return res.status(400).json({ message: "Insufficient funds in register" });
        }

        // 1. Record Transaction
        await db.insert(cashTransactions).values({
            organizationId: register.organizationId,
            registerId: register.id,
            sessionId: register.currentSessionId,
            type,
            amount,
            category,
            description,
            performedBy: user.id
        });

        // 2. Update Balance
        const newBalance = type === 'in' ? register.balance + amount : register.balance - amount;
        await db.update(cashRegisters)
            .set({ balance: newBalance })
            .where(eq(cashRegisters.id, register.id));

        res.json({ success: true, newBalance });

    } catch (error) {
        console.error("Transaction error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// POST /api/finance/payout - Pay employee balance
router.post("/payout", async (req: Request, res: Response) => {
    try {
        const { user, orgId } = await getContext(req);
        if (!user || !orgId) return res.status(401).json({ message: "Unauthorized" });

        const { employeeId, amount, notes } = req.body;

        if (!employeeId || !amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid payment details" });
        }

        // 1. Check Register
        const register = await db.query.cashRegisters.findFirst({
            where: eq(cashRegisters.organizationId, orgId)
        });

        if (!register || register.status !== 'open' || !register.currentSessionId) {
            return res.status(400).json({ message: "Register is closed. Cannot pay." });
        }

        if (register.balance < amount) {
            return res.status(400).json({ message: "Insufficient funds in register" });
        }

        // 2. Decrement Register Balance (Money Out)
        await db.update(cashRegisters)
            .set({ balance: sql`${cashRegisters.balance} - ${amount}` })
            .where(eq(cashRegisters.id, register.id));

        // 3. Decrement Employee Balance (Liability Reduced)
        await db.update(employees)
            .set({ balance: sql`${employees.balance} - ${amount}` })
            .where(eq(employees.id, employeeId));

        // 4. Record Transaction
        await db.insert(cashTransactions).values({
            organizationId: orgId,
            registerId: register.id,
            sessionId: register.currentSessionId,
            type: "out",
            category: "payroll",
            amount,
            description: notes || "Pago de Nómina / Destajo",
            performedBy: user.id
        });

        res.json({ success: true, message: "Payout successful" });

    } catch (error) {
        console.error("Payout error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export const financeRoutes = router;
