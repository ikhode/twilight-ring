import { Router, Request, Response } from "express";
import { db } from "../storage";
import {
    cashRegisters, cashSessions, cashTransactions, users, employees,
    expenses, payments, sales, payrollAdvances, purchases, products,
    budgets, bankReconciliations, bankAccounts
} from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getAuthenticatedUser, getOrgIdFromRequest } from "../auth_util";
import { requireModule } from "../middleware/moduleGuard";

const router = Router();

// Helper to get authenticated user and organization ID
async function getContext(req: Request) {
    const user = (req as any).user || await getAuthenticatedUser(req);
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

/**
 * --- MIGRATED & NEW FEATURES ---
 */

// GET /api/finance/summary
router.get("/summary", async (req, res): Promise<void> => {
    try {
        const { orgId } = await getContext(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate as string) : null;
        const end = endDate ? new Date(endDate as string) : null;

        const withPeriod = (condition: any, tableDateField: any) => {
            if (!start && !end) return condition;
            const filters = [condition];
            if (start) filters.push(sql`${tableDateField} >= ${start}`);
            if (end) filters.push(sql`${tableDateField} <= ${end}`);
            return and(...filters);
        };

        const [totalExpenses, totalSales, totalPayments, totalAdvances, pendingSales, pendingPurchases, registers, accounts] = await Promise.all([
            db.query.expenses.findMany({ where: withPeriod(eq(expenses.organizationId, orgId), expenses.date) }),
            db.query.sales.findMany({ where: withPeriod(eq(sales.organizationId, orgId), sales.date) }),
            db.query.payments.findMany({ where: withPeriod(eq(payments.organizationId, orgId), payments.date) }),
            db.query.payrollAdvances.findMany({ where: withPeriod(eq(payrollAdvances.organizationId, orgId), payrollAdvances.date) }),
            db.query.sales.findMany({ where: and(eq(sales.organizationId, orgId), eq(sales.deliveryStatus, 'pending')) }),
            db.query.purchases.findMany({ where: and(eq(purchases.organizationId, orgId), eq(purchases.paymentStatus, 'pending')) }),
            db.query.cashRegisters.findMany({ where: eq(cashRegisters.organizationId, orgId) }),
            db.query.bankAccounts.findMany({ where: eq(bankAccounts.organizationId, orgId) })
        ]);

        const expenseSum = totalExpenses.reduce((acc, curr) => acc + curr.amount, 0);
        const salesSum = totalSales.filter(s => s.paymentStatus === 'paid').reduce((acc, curr) => acc + curr.totalPrice, 0);
        const payrollSum = totalAdvances.reduce((acc, curr) => acc + curr.amount, 0);
        const manualIncomeSum = totalPayments.filter(p => p.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
        const manualPaymentExpenseSum = totalPayments.filter(p => p.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);

        const totalIncome = salesSum + manualIncomeSum;
        const totalOutflow = expenseSum + payrollSum + manualPaymentExpenseSum;
        const cashInRegisters = registers.reduce((acc, curr) => acc + curr.balance, 0);
        const bankBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);

        // Simplified Logic for Summary
        const currentBalance = totalIncome - totalOutflow + cashInRegisters + bankBalance;

        // --- NEW: Fetch Recent Transactions for History ---
        const [recentExpenses, recentPayments] = await Promise.all([
            db.query.expenses.findMany({
                where: eq(expenses.organizationId, orgId),
                orderBy: [desc(expenses.date)],
                limit: 10
            }),
            db.query.payments.findMany({
                where: eq(payments.organizationId, orgId),
                orderBy: [desc(payments.date)],
                limit: 10
            })
        ]);

        const recentTransactions = [
            ...recentExpenses.map(e => ({
                id: e.id,
                description: e.description || e.category,
                amount: -e.amount, // Expense is negative for display flow
                date: e.date?.toISOString().split('T')[0],
                type: 'expense',
                status: 'completed'
            })),
            ...recentPayments.map(p => ({
                id: p.id,
                description: p.referenceId || "Ingreso/Pago",
                amount: p.type === 'income' ? p.amount : -p.amount,
                date: p.date?.toISOString().split('T')[0],
                type: p.type === 'income' ? 'sale' : 'expense', // Map 'income' -> 'sale' visual style for green
                status: 'completed'
            }))
        ].sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime()).slice(0, 10);


        res.json({
            balance: currentBalance,
            income: totalIncome,
            expenses: totalOutflow,
            cashInRegisters,
            bankBalance,
            recentTransactions
        });

    } catch (error) {
        console.error("Finance summary error:", error);
        res.status(500).json({ message: "Error fetching summary" });
    }
});

// POST /api/finance/transaction
router.post("/transaction", async (req, res): Promise<void> => {
    try {
        const { orgId } = await getContext(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { type, amount, category, description, method } = req.body;

        if (!amount || isNaN(Number(amount))) {
            return res.status(400).json({ message: "Amount is required and must be a number" });
        }

        if (type === 'expense') {
            if (!category) return res.status(400).json({ message: "Category is required for expenses" });

            const [rec] = await db.insert(expenses).values({
                organizationId: orgId,
                amount: Number(amount),
                category,
                description: description || "Gasto Manual",
                date: new Date()
            }).returning();
            res.json(rec);
        } else {
            const [rec] = await db.insert(payments).values({
                organizationId: orgId,
                amount: Number(amount),
                type: 'income',
                method: method || 'cash',
                date: new Date(),
                referenceId: description
            }).returning();
            res.json(rec);
        }
    } catch (error) {
        console.error("Transaction error:", error);
        res.status(500).json({ message: "Transaction failed: " + (error as Error).message });
    }
});

// NEW: Budgets
router.post("/budgets", async (req, res): Promise<void> => {
    try {
        const { orgId } = await getContext(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { category, amountLimit, period } = req.body;
        const [budget] = await db.insert(budgets).values({
            organizationId: orgId,
            category,
            amountLimit,
            period
        }).returning();
        res.json(budget);
    } catch (error) {
        res.status(500).json({ message: "Failed to set budget" });
    }
});

router.get("/budgets", async (req, res): Promise<void> => {
    try {
        const { orgId } = await getContext(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const allBudgets = await db.query.budgets.findMany({
            where: eq(budgets.organizationId, orgId)
        });
        res.json(allBudgets);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch budgets" });
    }
});

// NEW: Reconciliation (Mock)
router.post("/reconcile", async (req, res): Promise<void> => {
    try {
        const { orgId } = await getContext(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        // In a real app, parse uploaded CSV/OFX statement
        // Here we just create a record
        const [rec] = await db.insert(bankReconciliations).values({
            organizationId: orgId,
            accountName: "Main Account", // Default
            statementDate: new Date(),
            statementBalance: 0,
            bookBalance: 0,
            status: "completed",
            notes: "Simulación de conciliación exitosa"
        }).returning();

        res.json(rec);
    } catch (error) {
        console.error("Reconciliation error:", error);
        res.status(500).json({ message: "Reconciliation failed" });
    }
});

/**
 * --- BANK ACCOUNTS CRUD ---
 */

router.get("/accounts", async (req, res): Promise<void> => {
    try {
        const { orgId } = await getContext(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const accs = await db.query.bankAccounts.findMany({
            where: eq(bankAccounts.organizationId, orgId),
            orderBy: [desc(bankAccounts.createdAt)]
        });
        res.json(accs);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch bank accounts" });
    }
});

router.post("/accounts", async (req, res): Promise<void> => {
    try {
        const { orgId } = await getContext(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const [acc] = await db.insert(bankAccounts).values({
            ...req.body,
            organizationId: orgId,
            balance: req.body.balance || 0
        }).returning();
        res.status(201).json(acc);
    } catch (error) {
        res.status(500).json({ message: "Failed to create bank account" });
    }
});

router.patch("/accounts/:id", async (req, res): Promise<void> => {
    try {
        const { orgId } = await getContext(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const [acc] = await db.update(bankAccounts)
            .set({ ...req.body, updatedAt: new Date() })
            .where(and(eq(bankAccounts.id, req.params.id), eq(bankAccounts.organizationId, orgId)))
            .returning();
        res.json(acc);
    } catch (error) {
        res.status(500).json({ message: "Failed to update bank account" });
    }
});

export const financeRoutes = router;
