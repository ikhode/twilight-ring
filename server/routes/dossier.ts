import { Router } from "express";
import { db } from "../storage";
import { getOrgIdFromRequest } from "../auth_util";
import {
    auditLogs, businessDocuments, users,
    pieceworkTickets, payrollAdvances, sales, purchases,
    employees, products, suppliers, customers,
    payments, expenses, cashTransactions,
    inventoryMovements, processInstances
} from "@shared/schema";
import { eq, and, desc, or } from "drizzle-orm";

const router = Router();

/**
 * Obtiene el expediente completo (historial de auditoría, documentos y RELACIONES) de cualquier entidad.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.get("/:entityType/:entityId", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { entityType, entityId } = req.params;

        // 1. Fetch Audit Logs (Core Traceability)
        const history = await db.select({
            id: auditLogs.id,
            action: auditLogs.action,
            details: auditLogs.details,
            createdAt: auditLogs.createdAt,
            userName: users.name
        })
            .from(auditLogs)
            .leftJoin(users, eq(auditLogs.userId, users.id))
            .where(and(
                eq(auditLogs.organizationId, orgId),
                eq(auditLogs.resourceId, entityId)
            ))
            .orderBy(desc(auditLogs.createdAt));

        // 2. Fetch Business Documents (Digital Dossier)
        const documents = await db.select()
            .from(businessDocuments)
            .where(and(
                eq(businessDocuments.organizationId, orgId),
                eq(businessDocuments.relatedEntityId, entityId),
                eq(businessDocuments.relatedEntityType, entityType)
            ))
            .orderBy(desc(businessDocuments.createdAt));

        // 3. Fetch Relations (Graph / Linked Data)
        const relationsData: any[] = [];

        if (entityType === 'employee') {
            // Piecework Tickets
            const tickets = await db.select().from(pieceworkTickets)
                .where(and(eq(pieceworkTickets.employeeId, entityId), eq(pieceworkTickets.organizationId, orgId)))
                .orderBy(desc(pieceworkTickets.createdAt));
            tickets.forEach(t => relationsData.push({
                id: t.id, type: 'ticket', label: `Ticket #${t.ticketNumber || t.id.slice(0, 6)}`,
                date: t.createdAt, amount: t.totalAmount, status: t.status
            }));

            // Payroll Advances
            const advances = await db.select().from(payrollAdvances)
                .where(and(eq(payrollAdvances.employeeId, entityId), eq(payrollAdvances.organizationId, orgId)))
                .orderBy(desc(payrollAdvances.date));
            advances.forEach(a => relationsData.push({
                id: a.id, type: 'advance', label: `Adelanto Nómina`,
                date: a.date, amount: a.amount, status: a.status
            }));

            // Driver Sales
            const driverSales = await db.select().from(sales)
                .where(and(eq(sales.driverId, entityId), eq(sales.organizationId, orgId)))
                .orderBy(desc(sales.date));
            driverSales.forEach(s => relationsData.push({
                id: s.id, type: 'sale', label: `Venta (Chofer)`,
                date: s.date, amount: s.totalPrice, status: s.paymentStatus
            }));

            // Specific HR logic (already exists in original but merged here)
            const { employeeDocs, workHistory: employeeWorkHistory } = await import("@shared/schema");
            const hrDocs = await db.select().from(employeeDocs)
                .where(and(eq(employeeDocs.employeeId, entityId), eq(employeeDocs.organizationId, orgId)));
            hrDocs.forEach(d => documents.push({
                id: d.id, name: d.name, type: d.type, fileUrl: d.fileUrl,
                status: 'archived', createdAt: d.uploadedAt, organizationId: orgId
            } as any));

            const wh = await db.select().from(employeeWorkHistory)
                .where(and(eq(employeeWorkHistory.employeeId, entityId), eq(employeeWorkHistory.organizationId, orgId)));
            wh.forEach(w => history.push({
                id: w.id, action: w.eventType.toUpperCase(), userName: 'Recursos Humanos',
                createdAt: w.date, details: { message: w.description, previous: w.previousValue, current: w.newValue }
            }));
            history.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        if (entityType === 'supplier') {
            const supplierPurchases = await db.select().from(purchases)
                .where(and(eq(purchases.supplierId, entityId), eq(purchases.organizationId, orgId)))
                .orderBy(desc(purchases.date));
            supplierPurchases.forEach(p => relationsData.push({
                id: p.id, type: 'purchase', label: `Compra #${p.batchId || p.id.slice(0, 6)}`,
                date: p.date, amount: p.totalAmount, status: p.deliveryStatus
            }));

            const supplierExpenses = await db.select().from(expenses)
                .where(and(eq(expenses.supplierId, entityId), eq(expenses.organizationId, orgId)))
                .orderBy(desc(expenses.date));
            supplierExpenses.forEach(e => relationsData.push({
                id: e.id, type: 'expense', label: `Gasto: ${e.category}`,
                date: e.date, amount: e.amount
            }));
        }

        if (entityType === 'customer') {
            const customerSales = await db.select().from(sales)
                .where(and(eq(sales.customerId, entityId), eq(sales.organizationId, orgId)))
                .orderBy(desc(sales.date));
            customerSales.forEach(s => relationsData.push({
                id: s.id, type: 'sale', label: `Venta #${s.id.slice(0, 6)}`,
                date: s.date, amount: s.totalPrice, status: s.deliveryStatus
            }));
        }

        if (entityType === 'product') {
            const productSales = await db.select().from(sales)
                .where(and(eq(sales.productId, entityId), eq(sales.organizationId, orgId)))
                .orderBy(desc(sales.date))
                .limit(50);
            productSales.forEach(s => relationsData.push({
                id: s.id, type: 'sale', label: `Venta de Producto`,
                date: s.date, amount: s.totalPrice
            }));

            const productPurchases = await db.select().from(purchases)
                .where(and(eq(purchases.productId, entityId), eq(purchases.organizationId, orgId)))
                .orderBy(desc(purchases.date))
                .limit(50);
            productPurchases.forEach(p => relationsData.push({
                id: p.id, type: 'purchase', label: `Compra de Producto`,
                date: p.date, amount: p.totalAmount
            }));

            const movements = await db.select().from(inventoryMovements)
                .where(and(eq(inventoryMovements.productId, entityId), eq(inventoryMovements.organizationId, orgId)))
                .orderBy(desc(inventoryMovements.date))
                .limit(50);
            movements.forEach(m => relationsData.push({
                id: m.id, type: 'movement', label: `Movimiento: ${m.type}`,
                date: m.date, amount: m.quantity
            }));
        }

        if (entityType === 'sale' || entityType === 'purchase') {
            const linkedPayments = await db.select().from(payments)
                .where(and(eq(payments.referenceId, entityId), eq(payments.organizationId, orgId)))
                .orderBy(desc(payments.date));
            linkedPayments.forEach(p => relationsData.push({
                id: p.id, type: 'payment', label: `Pago Recibido (${p.method})`,
                date: p.date, amount: p.amount
            }));

            const linkedCash = await db.select().from(cashTransactions)
                .where(and(eq(cashTransactions.referenceId, entityId), eq(cashTransactions.organizationId, orgId)))
                .orderBy(desc(cashTransactions.timestamp));
            linkedCash.forEach(c => relationsData.push({
                id: c.id, type: 'cash', label: `Transacción de Caja: ${c.type}`,
                date: c.timestamp, amount: c.amount
            }));
        }

        res.json({ history, documents, relations: relationsData });
    } catch (error) {
        console.error("Dossier fetch error:", error);
        res.status(500).json({ message: "Failed to fetch dossier" });
    }
});

export default router;
