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
        if (!user || !orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

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
        if (!user || !orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

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
            res.status(400).json({ message: "Register is already open" });
            return;
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

// POST /api/finance/cash/close - Close session (Arqueo)
router.post("/cash/close", async (req: Request, res: Response) => {
    try {
        const { user, orgId } = await getContext(req);
        if (!user || !orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { declaredAmount, notes, justification } = req.body;

        const register = await db.query.cashRegisters.findFirst({
            where: eq(cashRegisters.organizationId, orgId)
        });
        if (!register || register.status !== 'open' || !register.currentSessionId) {
            res.status(400).json({ message: "Register is not open" });
            return;
        }

        const expectedAmount = register.balance;
        const difference = declaredAmount - expectedAmount;

        // "nunca le decimos a el cajero cuanto dinero realmente debe dejar en caja..."
        // Rule: if difference < 0 and NO justification provided, block and request justification.
        if (difference < 0 && !justification) {
            res.status(400).json({
                message: "Faltante detectado. Es obligatorio escribir una justificación para el arqueo.",
                difference: difference, // Internal UI can use this to show warning
                blocking: true
            });
            return;
        }

        // 1. Close Session
        await db.update(cashSessions)
            .set({
                endTime: new Date(),
                closedBy: user.id,
                actualEndAmount: declaredAmount,
                expectedEndAmount: expectedAmount,
                difference,
                status: "closed",
                notes: justification ? `[JUSTIFICACIÓN]: ${justification}. ${notes || ""}` : notes
            })
            .where(eq(cashSessions.id, register.currentSessionId));

        // 2. Close Register
        await db.update(cashRegisters)
            .set({
                status: "closed",
                currentSessionId: null
            })
            .where(eq(cashRegisters.id, register.id));

        res.json({
            success: true,
            message: difference >= 0 ? "Arqueo correcto. Sesión finalizada." : "Sesión cerrada con reporte de faltante.",
            status: difference >= 0 ? "ok" : "shortage"
        });

    } catch (error) {
        console.error("Close session error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// POST /api/finance/cash/transaction - Record movement
router.post("/cash/transaction", async (req: Request, res: Response) => {
    try {
        const { user, orgId } = await getContext(req);
        if (!user || !orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { type, amount, category, description } = req.body;

        const register = await db.query.cashRegisters.findFirst({
            where: eq(cashRegisters.organizationId, orgId)
        });
        if (!register || register.status !== 'open' || !register.currentSessionId) {
            res.status(400).json({ message: "Register is closed. Open a session first." });
            return;
        }

        // Validate funds for withdrawal
        if (type === 'out' && register.balance < amount) {
            res.status(400).json({ message: "Insufficient funds in register" });
            return;
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

// --- PAYOUT WITH SIGNATURE FLOW ---

// 1. Prepare Payout (Generate Link/Token)
router.post("/payout/prepare", async (req, res) => {
    try {
        const { orgId } = await getContext(req);
        const { ticketIds, employeeId, amount } = req.body;

        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        const payoutData = {
            orgId,
            ticketIds,
            employeeId,
            amount,
            expires: Date.now() + (30 * 60 * 1000)
        };

        storage.createPendingPayout(token, payoutData);

        // Fetch employee name for UI
        const employee = await storage.getEmployee(employeeId);

        res.json({
            token,
            signUrl: `/sign/${token}`,
            amount,
            employeeName: employee?.name || "Empleado"
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to prepare payout" });
    }
});

// 2. Get Payout Info for Signature UI
router.get("/payout/token/:token", async (req, res) => {
    const data = storage.getPendingPayout(req.params.token);
    if (!data) return res.status(404).json({ message: "Enlace expirado o inválido" });

    const employee = await storage.getEmployee(data.employeeId);
    res.json({
        amount: data.amount,
        employeeName: employee?.name || "Empleado",
        orgId: data.orgId
    });
});

// 3. Confirm Payout (Registers transaction after signature)
router.post("/payout/confirm", async (req, res) => {
    try {
        const { token, signatureData } = req.body;
        const data = storage.consumePendingPayout(token);

        if (!data) return res.status(404).json({ message: "Sesión de firma terminada o expirada" });

        // Finance Logic Here (Transactional)
        const register = await db.query.cashRegisters.findFirst({
            where: and(eq(cashRegisters.organizationId, data.orgId), eq(cashRegisters.status, 'open'))
        });

        if (!register || register.balance < data.amount) {
            return res.status(400).json({ message: "Error en caja: fondos insuficientes o caja cerrada" });
        }

        // 1. Update Ticket Status
        if (data.ticketIds && data.ticketIds.length > 0) {
            await db.update(pieceworkTickets)
                .set({ status: 'paid', signatureUrl: signatureData, paidAt: new Date() })
                .where(inArray(pieceworkTickets.id, data.ticketIds));
        }

        // 2. Decrement Employee Balance
        await db.update(employees)
            .set({ balance: sql`${employees.balance} - ${data.amount}` })
            .where(eq(employees.id, data.employeeId));

        // 3. Record Cash Transaction
        await db.insert(cashTransactions).values({
            organizationId: data.orgId,
            registerId: register.id,
            sessionId: register.currentSessionId!,
            type: "out",
            category: "payroll",
            amount: data.amount,
            description: `Pago firmado: ${data.ticketIds?.length || 1} tickets`,
            performedBy: (req as any).user?.id || 'system'
        });

        // 4. Update Balance
        await db.update(cashRegisters)
            .set({ balance: sql`${cashRegisters.balance} - ${data.amount}` })
            .where(eq(cashRegisters.id, register.id));

        res.json({ success: true, message: "Desembolso registrado correctamente" });

    } catch (error) {
        console.error("Confirm payout error:", error);
        res.status(500).json({ message: "Error al procesar el pago" });
    }
});

// --- DRIVER SETTLEMENTS ---

router.get("/driver-settlements", async (req, res) => {
    try {
        const { orgId } = await getContext(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const pending = await storage.getPendingDriverSettlements(orgId);
        res.json(pending);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener liquidaciones" });
    }
});

router.post("/driver-settlements/:saleId/receive", async (req, res) => {
    try {
        const { user, orgId } = await getContext(req);
        const { saleId } = req.params;

        const register = await db.query.cashRegisters.findFirst({
            where: and(eq(cashRegisters.organizationId, orgId!), eq(cashRegisters.status, 'open'))
        });

        if (!register) return res.status(400).json({ message: "Caja cerrada" });

        const [sale] = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1);
        if (!sale) return res.status(404).json({ message: "Venta no encontrada" });

        // Record "In" Transaction
        await db.insert(cashTransactions).values({
            organizationId: orgId!,
            registerId: register.id,
            sessionId: register.currentSessionId!,
            type: "in",
            category: "sales",
            amount: sale.totalPrice,
            description: `Liquidación de Chofer - Venta ${saleId.slice(0, 6)}`,
            referenceId: saleId,
            performedBy: user.id
        });

        // Update Balance
        await db.update(cashRegisters)
            .set({ balance: sql`${cashRegisters.balance} + ${sale.totalPrice}` })
            .where(eq(cashRegisters.id, register.id));

        res.json({ success: true, message: "Efectivo recibido correctamente" });
    } catch (error) {
        res.status(500).json({ message: "Error al procesar liquidación" });
    }
});

/**
 * --- MIGRATED & NEW FEATURES ---
 */

// GET /api/finance/summary
router.get("/summary", async (req, res): Promise<void> => {
    try {
        const { orgId } = await getContext(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

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
        // Activos Líquidos (Real Balance)
        const currentBalance = cashInRegisters + bankBalance;

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
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { type, amount, category, description, method } = req.body;

        if (!amount || isNaN(Number(amount))) {
            res.status(400).json({ message: "Amount is required and must be a number" });
            return;
        }

        if (type === 'expense') {
            if (!category) {
                res.status(400).json({ message: "Category is required for expenses" });
                return;
            }

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
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { category, amountLimit, period } = req.body;
        const [budget] = await db.insert(budgets).values({
            organizationId: orgId,
            category,
            amount: amountLimit,
            period,
            year: new Date().getFullYear()
        }).returning();
        res.json(budget);
    } catch (error) {
        res.status(500).json({ message: "Failed to set budget" });
    }
});

router.get("/budgets", async (req, res): Promise<void> => {
    try {
        const { orgId } = await getContext(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

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
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

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
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

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
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

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
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

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
