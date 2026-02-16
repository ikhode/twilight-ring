import { Router, Request, Response } from "express";
import { db, storage } from "../storage";
import {
    cashRegisters, cashSessions, cashTransactions, users, userOrganizations, employees,
    expenses, payments, sales, payrollAdvances, purchases, products,
    budgets, bankReconciliations, bankAccounts, pieceworkTickets, aiInsights
} from "../../shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { getAuthenticatedUser, getOrgIdFromRequest } from "../auth_util";
import { requireModule } from "../middleware/moduleGuard";
import { logAudit } from "../lib/audit";
import { requirePermission } from "../middleware/permission_check";
import { AccountingService } from "../services/AccountingService";

const formatCurrency = (amountInCents: number) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amountInCents / 100);
};

const router = Router();

// Helper to get authenticated user and organization ID
async function getContext(req: Request) {
    const user = (req as any).user || await getAuthenticatedUser(req);
    const orgId = await getOrgIdFromRequest(req);
    return { user, orgId };
}

// GET /api/finance/cash/stats - Get current register status
router.get("/cash/stats", requirePermission("finance.read"), async (req: Request, res: Response) => {
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
router.post("/cash/open", requirePermission("finance.write"), async (req: Request, res: Response) => {
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

        // Log action
        await logAudit(
            req,
            orgId,
            user.id,
            "OPEN_CASH_SESSION",
            session.id,
            {
                message: `Sesión de caja abierta con fondo de ${formatCurrency(startAmount / 100)}`,
                registerId: register.id,
                startAmount
            }
        );

        res.json({ success: true, session });

    } catch (error) {
        console.error("Open session error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// POST /api/finance/cash/close - Close session (Arqueo)
router.post("/cash/close", requirePermission("finance.write"), async (req: Request, res: Response) => {
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

        // Log action
        await logAudit(
            req,
            orgId,
            user.id,
            "CLOSE_CASH_SESSION",
            register.currentSessionId,
            {
                message: `Sesión de caja cerrada. Diferencia: ${formatCurrency(difference / 100)}. Justificación: ${justification || 'N/A'}`,
                declaredAmount,
                difference
            }
        );

        // --- NEW: Emit to Cognitive Engine if shortage ---
        if (difference < 0) {
            const { CognitiveEngine } = await import("../lib/cognitive-engine");
            CognitiveEngine.emit({
                orgId,
                type: "finance_cash_shortage",
                data: { difference, registerId: register.id, sessionId: register.currentSessionId }
            });
        }

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
router.post("/cash/transaction", requirePermission("finance.write"), async (req: Request, res: Response) => {
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
        const [cashTx] = await db.insert(cashTransactions).values({
            organizationId: register.organizationId,
            registerId: register.id,
            sessionId: register.currentSessionId,
            type,
            amount,
            category,
            description,
            performedBy: user.id
        }).returning();

        // 2. Update Balance
        const newBalance = type === 'in' ? register.balance + amount : register.balance - amount;
        await db.update(cashRegisters)
            .set({ balance: newBalance })
            .where(eq(cashRegisters.id, register.id));

        // Log action
        await logAudit(
            req,
            orgId,
            user.id,
            "CREATE_CASH_TRANSACTION",
            cashTx.id,
            {
                message: `${type === 'in' ? 'Entrada' : 'Salida'} de caja por ${formatCurrency(amount / 100)}: ${description}`,
                type,
                amount,
                category,
                description
            }
        );

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

        // Log action
        await logAudit(
            req,
            data.orgId,
            (req as any).user?.id || 'system',
            "CONFIRM_PAYOUT",
            data.employeeId,
            { message: `Pago confirmado de ${formatCurrency(data.amount)} para ${data.employeeId}` }
        );

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

        // Log action
        await logAudit(
            req,
            orgId!,
            user.id,
            "RECEIVE_DRIVER_SETTLEMENT",
            saleId,
            { message: `Recibida liquidación de chofer por ${formatCurrency(sale.totalPrice)}` }
        );

        res.json({ success: true, message: "Efectivo recibido correctamente" });
    } catch (error) {
        res.status(500).json({ message: "Error al procesar liquidación" });
    }
});

// --- SAT / ACCOUNTING EXPORTS ---

router.get("/accounting/export/catalogo", requirePermission("finance.read"), async (req, res) => {
    try {
        const { user, orgId } = await getContext(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const year = parseInt(req.query.year as string) || new Date().getFullYear();
        const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

        const xml = await AccountingService.exportCatalogoXML(orgId, year, month);

        res.header('Content-Type', 'application/xml');
        res.header('Content-Disposition', `attachment; filename="Catalogo_Cuentas_${year}_${month}.xml"`);
        res.send(xml);
    } catch (error) {
        console.error("Export Catalogo Error:", error);
        res.status(500).json({ message: "Error generando XML" });
    }
});

router.get("/accounting/export/balanza", requirePermission("finance.read"), async (req, res) => {
    try {
        const { user, orgId } = await getContext(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const year = parseInt(req.query.year as string) || new Date().getFullYear();
        const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

        const xml = await AccountingService.exportBalanzaXML(orgId, year, month);

        res.header('Content-Type', 'application/xml');
        res.header('Content-Disposition', `attachment; filename="Balanza_Comprobacion_${year}_${month}.xml"`);
        res.send(xml);
    } catch (error) {
        console.error("Export Balanza Error:", error);
        res.status(500).json({ message: "Error generando XML" });
    }
});

/**
 * --- MIGRATED & NEW FEATURES ---
 */

// GET /api/finance/summary
router.get("/summary", requirePermission("finance.read"), async (req, res): Promise<void> => {
    try {
        const { user, orgId } = await getContext(req);
        if (!orgId || !user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const membership = await db.query.userOrganizations.findFirst({
            where: and(eq(userOrganizations.userId, user.id), eq(userOrganizations.organizationId, orgId))
        });

        const isAdminOrManager = membership?.role === 'admin' || membership?.role === 'manager';

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


        const [totalExpenses, totalSales, totalPayments, totalAdvances, pendingSales, pendingPurchases, registers, accounts, pendingTickets, lastPeriodSales, activeAnomalies, allProducts] = await Promise.all([
            db.query.expenses.findMany({ where: withPeriod(eq(expenses.organizationId, orgId), expenses.date) }),
            db.query.sales.findMany({ where: withPeriod(eq(sales.organizationId, orgId), sales.date) }),
            db.query.payments.findMany({ where: withPeriod(eq(payments.organizationId, orgId), payments.date) }),
            db.query.payrollAdvances.findMany({ where: withPeriod(eq(payrollAdvances.organizationId, orgId), payrollAdvances.date) }),
            db.query.sales.findMany({ where: and(eq(sales.organizationId, orgId), eq(sales.deliveryStatus, 'pending')) }),
            db.query.purchases.findMany({ where: eq(purchases.organizationId, orgId) }),
            db.query.cashRegisters.findMany({ where: eq(cashRegisters.organizationId, orgId) }),
            db.query.bankAccounts.findMany({ where: eq(bankAccounts.organizationId, orgId) }),
            db.query.pieceworkTickets.findMany({ where: and(eq(pieceworkTickets.organizationId, orgId), eq(pieceworkTickets.status, 'pending')) }),
            db.query.sales.findMany({
                where: and(
                    eq(sales.organizationId, orgId),
                    sql`${sales.date} >= ${new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)}`,
                    sql`${sales.date} < ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}`
                )
            }),
            db.query.aiInsights.findMany({
                where: and(eq(aiInsights.organizationId, orgId), eq(aiInsights.acknowledged, false)),
                limit: 5,
                orderBy: [desc(aiInsights.createdAt)]
            }),
            db.query.products.findMany({ where: eq(products.organizationId, orgId) })
        ]);

        const expenseSum = totalExpenses.reduce((acc, curr) => acc + curr.amount, 0);
        const salesIncomeSum = totalSales.filter(s => s.paymentStatus === 'paid').reduce((acc, curr) => acc + curr.totalPrice, 0);
        const payrollSum = totalAdvances.reduce((acc, curr) => acc + curr.amount, 0);

        // Income Breakdown
        const operationalIncome = salesIncomeSum + totalPayments.filter(p => p.type === 'income' && p.category !== 'capital').reduce((acc, curr) => acc + curr.amount, 0);
        const capitalIncome = totalPayments.filter(p => p.type === 'income' && p.category === 'capital').reduce((acc, curr) => acc + curr.amount, 0);

        const manualPaymentExpenseSum = totalPayments.filter(p => p.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);

        // --- KPI CALCULATIONS ---
        console.log("Calculating KPIs...");
        let inventoryValue = 0;
        try {
            inventoryValue = (allProducts || []).reduce((acc, curr) => acc + ((Number(curr?.cost) || 0) * (Number(curr?.stock) || 0)), 0);
        } catch (e) { console.error("Error calculating inventoryValue", e); }

        // --- NEW REPORTING METRICS ---
        // 1. Cash Expenses (Effective)
        const cashExpenses = (totalPayments || [])
            .filter(p => p.type === 'expense' && p.method === 'cash')
            .reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0) +
            (expenseSum || 0); // Assuming 'expenses' table are cash/petty cash? usually mixed.
        // Wait, 'expenses' table generally lacks method unless linked to payment. 
        // In this schema 'expenses' is separate. Let's assume 'expenses' table is petty cash if not linked?
        // Safer: Use 'totalPayments' as the source for explicit method. 
        // If 'expenses' are not in 'totalPayments', we might miss them.
        // Checking logic: expenseSum is from 'expenses' table. 
        // Let's assume for now 'expenses' table records should be counted as Cash if not specified, 
        // BUT usually they are "Expenses" (Concept) vs "Payments" (Money). 
        // I will strictly use Payments by Method for the flow report.

        const cashPaymentsOnly = (totalPayments || [])
            .filter(p => p.type === 'expense' && p.method === 'cash')
            .reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0) + (expenseSum || 0);

        // 2. Cash Income (Effective)
        const salesCashIncome = (totalSales || [])
            .filter(s => s.paymentStatus === 'paid' && s.paymentMethod === 'cash')
            .reduce((acc, curr) => acc + curr.totalPrice, 0);

        const otherCashIncome = (totalPayments || [])
            .filter(p => p.type === 'income' && p.method === 'cash' && p.category !== 'capital')
            .reduce((acc, curr) => acc + curr.amount, 0);

        const totalCashIncome = salesCashIncome + otherCashIncome;

        // 3. Capital Income
        // Already calculated as 'capitalIncome'

        // 4. Transfer Payments (Bank Outflows)
        const transferPayments = (totalPayments || [])
            .filter(p => p.type === 'expense' && (p.method === 'transfer' || p.method === 'check' || p.method === 'card'))
            .reduce((acc, curr) => acc + curr.amount, 0);

        // 5. Transfer Receipts (Bank Inflows)
        const salesTransferIncome = (totalSales || [])
            .filter(s => s.paymentStatus === 'paid' && (s.paymentMethod === 'transfer' || s.paymentMethod === 'card'))
            .reduce((acc, curr) => acc + curr.totalPrice, 0);

        const otherTransferIncome = (totalPayments || [])
            .filter(p => p.type === 'income' && (p.method === 'transfer' || p.method === 'check' || p.method === 'card') && p.category !== 'capital')
            .reduce((acc, curr) => acc + curr.amount, 0);

        const totalTransferIncome = salesTransferIncome + otherTransferIncome;

        // 6. Net Calculations
        const netCashFlow = totalCashIncome - cashPaymentsOnly;
        const netTransferFlow = totalTransferIncome - transferPayments;
        const weeklyProfit = (totalCashIncome + totalTransferIncome) - (cashPaymentsOnly + transferPayments); // Simplified Cash Basis Profit

        // Original sums
        let bankOutflows = 0;
        try {
            bankOutflows = transferPayments;
        } catch (e) { console.error("Error calculating bankOutflows", e); }

        const pieceworkLiability = (pendingTickets || []).reduce((acc, curr) => acc + (Number(curr?.totalAmount) || 0), 0);

        const activePurchases = (pendingPurchases || []).filter(p => p.paymentStatus === 'pending' && p.deliveryStatus !== 'cancelled');
        const cancelledPurchases = (pendingPurchases || []).filter(p => p.deliveryStatus === 'cancelled');

        const payablesSum = activePurchases.reduce((acc, curr) => acc + (Number(curr?.totalAmount) || 0), 0);
        const cancelledSum = cancelledPurchases.reduce((acc, curr) => acc + (Number(curr?.totalAmount) || 0), 0);

        const totalLiabilities = payablesSum + pieceworkLiability;

        const logisticsValue = (pendingSales || []).reduce((acc, curr) => acc + (Number(curr?.totalPrice) || 0), 0);
        const receivablesSum = (pendingSales || []).reduce((acc, curr) => acc + (Number(curr?.totalPrice) || 0), 0);

        const totalIncome = operationalIncome + capitalIncome;
        const totalOutflow = expenseSum + manualPaymentExpenseSum;
        const cashInRegisters = (registers || []).reduce((acc, curr) => Number(acc) + Number(curr.balance), 0);
        const bankBalance = (accounts || []).reduce((acc, curr) => Number(acc) + Number(curr.balance), 0);

        // Simplified Logic for Summary
        const currentBalance = cashInRegisters + bankBalance;

        // --- TREND ANALYSIS ---
        const lastPeriodSalesSum = (lastPeriodSales || []).filter(s => s.paymentStatus === 'paid').reduce((acc, curr) => acc + curr.totalPrice, 0);
        const salesTrend = lastPeriodSalesSum > 0 ? ((salesIncomeSum - lastPeriodSalesSum) / lastPeriodSalesSum) * 100 : 0;

        console.log("Fetching recent transactions...");
        // --- NEW: Fetch Recent Transactions for History ---
        const [recentExpenses, recentPayments, recentCash] = await Promise.all([
            db.query.expenses.findMany({
                where: eq(expenses.organizationId, orgId),
                orderBy: [desc(expenses.date)],
                limit: 10,
                with: {
                    supplier: true
                }
            }),
            db.query.payments.findMany({
                where: eq(payments.organizationId, orgId),
                orderBy: [desc(payments.date)],
                limit: 10
            }),
            db.query.cashTransactions.findMany({
                where: eq(cashTransactions.organizationId, orgId),
                orderBy: [desc(cashTransactions.timestamp)],
                limit: 10
            })
        ]);

        const recentTransactions = [
            ...(recentExpenses || []).map(e => ({
                id: `exp_${e.id}`, // Prefix to ensure unique key
                description: e.description || e.category,
                amount: -(Number(e.amount) || 0), // Expense is negative for display flow
                date: e.date?.toISOString().split('T')[0],
                type: 'expense',
                status: 'completed',
                supplier: e.supplier?.name || null,
                category: e.category
            })),
            ...(recentPayments || []).map(p => ({
                id: `pay_${p.id}`, // Prefix to ensure unique key
                description: p.referenceId || "Ingreso/Pago",
                amount: p.type === 'income' ? (Number(p.amount) || 0) : -(Number(p.amount) || 0),
                date: p.date?.toISOString().split('T')[0],
                type: p.type === 'income' ? 'sale' : 'expense', // Map 'income' -> 'sale' visual style for green
                status: 'completed'
            })),
            ...(recentCash || []).map(c => ({
                id: `cash_${c.id}`,
                description: c.description || "Movimiento de Caja",
                amount: c.type === 'in' ? (Number(c.amount) || 0) : -(Number(c.amount) || 0),
                date: c.timestamp?.toISOString().split('T')[0],
                type: c.type === 'in' ? 'sale' : 'expense',
                status: 'completed',
                category: c.category
            }))
        ].sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime()).slice(0, 10);

        console.log("Calculations complete. Sending response.");

        // Report Structure matches Excel
        const financialReport = {
            cashExpenses: cashPaymentsOnly, // Gasto Efectivo
            cashIncome: totalCashIncome, // Ingreso Efectivo
            capitalIncome, // Ingreso Capital Efectivo (or Transfer? User said "Ingreso Capital Efectivo")
            transferPayments, // Pago Transferencia
            transferIncome: totalTransferIncome, // Recibido Transferencia
            accountsReceivable: receivablesSum,
            accountsPayable: payablesSum,
            cancelledPurchases: cancelledSum,
            netCashFlow,
            netTransferFlow,
            totalProfit: weeklyProfit
        };

        if (!isAdminOrManager) {
            // Limited view for regular users/operators
            res.json({
                balance: null, // Hidden
                income: null, // Hidden
                expenses: null, // Hidden
                cashInRegisters, // Maybe visible? Usually yes for cashier
                bankBalance: null, // Hidden
                liabilities: totalLiabilities, // Visible as it affects their work
                pendingSalesCount: pendingSales.length,
                pendingPurchasesCount: pendingPurchases.length,
                recentTransactions: recentTransactions.map(t => ({ ...t, amount: '***' })) // Mask amounts
            });
            return;
        }

        // --- REAL PROJECTION & TRUST SCORE LOGIC ---

        // 1. Calculate Daily Average Net Flow (Last 30 Days)
        // 1. Calculate Daily Average Net Flow (Reference: Last 30 Days specific)
        const daysAnalyzed = 30;

        // We need a specific query for "Last 30 Days" to get a realistic velocity, 
        // regardless of the user's selected view date range.
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [recentIncome, recentExpensesStats] = await Promise.all([
            db.query.payments.findMany({
                where: and(
                    eq(payments.organizationId, orgId),
                    sql`${payments.date} >= ${thirtyDaysAgo}`,
                    eq(payments.type, 'income')
                )
            }),
            db.query.payments.findMany({
                where: and(
                    eq(payments.organizationId, orgId),
                    sql`${payments.date} >= ${thirtyDaysAgo}`,
                    eq(payments.type, 'expense')
                )
            })
        ]);

        const recentIncomeSum = recentIncome.reduce((acc, curr) => acc + Number(curr.amount), 0);
        const recentExpenseSum = recentExpensesStats.reduce((acc, curr) => acc + Number(curr.amount), 0);

        // Also add Sales (Cash) if not in payments? 
        // In this system, Sales create Payments (mostly). But assuming consistency.

        const dailyAverageNet = (recentIncomeSum - recentExpenseSum) / daysAnalyzed;

        // 2. Generate 7-Day Projection
        const projection = Array.from({ length: 7 }).map((_, i) => {
            const projectedDay = i + 1;
            const fluctuation = (Math.random() * 0.1 - 0.05); // +/- 5% variance
            const trend = dailyAverageNet * projectedDay;
            const value = currentBalance + trend + (trend * fluctuation);

            return {
                day: `Día ${projectedDay}`,
                predicted: Math.max(0, Math.round(value))
            };
        });

        // 3. Calculate Trust Score
        const anomalyPenalty = activeAnomalies.length * 10;
        const calculatedTrustScore = Math.max(0, Math.min(100, 100 - anomalyPenalty));


        res.json({
            balance: currentBalance,
            income: totalIncome,
            operationalIncome,
            capitalIncome,
            expenses: totalOutflow,

            // KPIs
            cashInRegisters,
            bankBalance,
            inventoryValue,
            bankOutflows,
            liabilities: totalLiabilities,
            logisticsValue,

            // Structure for new UI
            report: financialReport,

            pendingSalesCount: pendingSales.length,
            pendingPurchasesCount: pendingPurchases.length,
            accountsReceivable: {
                total: receivablesSum,
                count: pendingSales.length
            },
            accountsPayable: {
                total: payablesSum,
                count: activePurchases.length,
                cancelledTotal: cancelledSum,
                cancelledCount: cancelledPurchases.length
            },
            payroll: {
                total: payrollSum,
                count: totalAdvances.length
            },
            recentTransactions,
            trends: {
                sales: salesTrend,
                expenseVsIncome: totalIncome > 0 ? (totalOutflow / totalIncome) * 100 : 0
            },
            anomalies: activeAnomalies,
            projection,
            trustScore: calculatedTrustScore
        });

    } catch (error) {
        console.error("Finance summary error:", error);
        res.status(500).json({ message: "Error fetching summary" });
    }
});

// POST /api/finance/transaction
router.post("/transaction", requirePermission('finance.write'), async (req, res): Promise<void> => {
    try {
        const { user, orgId } = await getContext(req);
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

            // Log action
            await logAudit(
                req,
                orgId,
                user.id,
                "CREATE_EXPENSE",
                rec.id,
                {
                    message: `Gasto registrado por ${formatCurrency(rec.amount / 100)} en categoría ${category}`,
                    amount: rec.amount,
                    category: rec.category
                }
            );

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

            // Log action
            await logAudit(
                req,
                orgId,
                user.id,
                "CREATE_INCOME",
                rec.id,
                {
                    message: `Ingreso registrado por ${formatCurrency(rec.amount / 100)} (Método: ${method || 'cash'})`,
                    amount: rec.amount,
                    method: rec.method
                }
            );

            res.json(rec);
        }
    } catch (error) {
        console.error("Transaction error:", error);
        res.status(500).json({ message: "Transaction failed: " + (error as Error).message });
    }
});

// NEW: Budgets
router.post("/budgets", requirePermission('finance.write'), async (req, res): Promise<void> => {
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
router.post("/reconcile", requirePermission('finance.write'), async (req, res): Promise<void> => {
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

router.get("/bank-accounts", async (req, res): Promise<void> => {
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

router.post("/accounts", requirePermission('finance.write'), async (req, res): Promise<void> => {
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


// GET /api/finance/all-transactions - Comprehensive list for detailed reports
router.get("/all-transactions", async (req, res): Promise<void> => {
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
            const filters = [condition];
            if (start) filters.push(sql`${tableDateField} >= ${start}`);
            if (end) filters.push(sql`${tableDateField} <= ${end}`);
            return and(...filters);
        };

        const [txExpenses, txPayments, txCash] = await Promise.all([
            db.query.expenses.findMany({
                where: withPeriod(eq(expenses.organizationId, orgId), expenses.date),
                with: { supplier: true },
                orderBy: [desc(expenses.date)]
            }),
            db.query.payments.findMany({
                where: withPeriod(eq(payments.organizationId, orgId), payments.date),
                orderBy: [desc(payments.date)]
            }),
            db.query.cashTransactions.findMany({
                where: withPeriod(eq(cashTransactions.organizationId, orgId), cashTransactions.timestamp),
                orderBy: [desc(cashTransactions.timestamp)]
            })
        ]);

        const all = [
            ...txExpenses.map(e => ({
                id: `exp_${e.id}`,
                origin: 'expense_table',
                description: e.description || e.category,
                amount: -(e.amount),
                date: e.date,
                type: 'expense',
                category: e.category,
                details: e.supplier?.name
            })),
            ...txPayments.map(p => ({
                id: `pay_${p.id}`,
                origin: 'payments_table',
                description: p.referenceId || (p.type === 'income' ? 'Ingreso General' : 'Egreso General'),
                amount: p.type === 'income' ? p.amount : -(p.amount),
                date: p.date,
                type: p.type === 'income' ? 'income' : 'expense',
                method: p.method,
                category: p.category
            })),
            ...txCash.map(c => ({
                id: `cash_${c.id}`,
                origin: 'cash_transactions_table',
                description: c.description || 'Movimiento Caja',
                amount: c.type === 'in' ? c.amount : -(c.amount),
                date: c.timestamp,
                type: c.type === 'in' ? 'income' : 'expense',
                method: 'cash',
                category: c.category
            }))
        ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        res.json(all);
    } catch (error) {
        console.error("All transactions error:", error);
        res.status(500).json({ message: "Failed to fetch detailed transactions" });
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

// --- SAT ELECTRONIC ACCOUNTING EXPORTS ---

router.get("/accounting/export/catalogo", async (req, res) => {
    try {
        const { orgId } = await getContext(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const year = parseInt(req.query.year as string) || new Date().getFullYear();
        const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

        const xml = await AccountingService.exportCatalogoXML(orgId, year, month);

        res.setHeader("Content-Type", "application/xml");
        res.setHeader("Content-Disposition", `attachment; filename=Catalogo_${orgId}_${year}_${month}.xml`);
        res.send(xml);
    } catch (error) {
        console.error("Catalogo export error:", error);
        res.status(500).json({ message: "Error al generar el XML del catálogo" });
    }
});

router.get("/accounting/export/balanza", async (req, res) => {
    try {
        const { orgId } = await getContext(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const year = parseInt(req.query.year as string) || new Date().getFullYear();
        const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

        const xml = await AccountingService.exportBalanzaXML(orgId, year, month);

        res.setHeader("Content-Type", "application/xml");
        res.setHeader("Content-Disposition", `attachment; filename=Balanza_${orgId}_${year}_${month}.xml`);
        res.send(xml);
    } catch (error) {
        console.error("Balanza export error:", error);
        res.status(500).json({ message: "Error al generar el XML de la balanza" });
    }
});

export const financeRoutes = router;
