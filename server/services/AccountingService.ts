import { db } from "../storage";
import {
    accountingAccounts,
    journalEntries,
    journalItems,
    AccountingAccount,
    InsertJournalEntry,
    InsertJournalItem
} from "@shared/modules/finance/schema";
import { eq, and, sql } from "drizzle-orm";
import { Transaction } from "drizzle-orm/pg-core";
import { organizations } from "@shared/schema";

export class AccountingService {
    /**
     * Creates a balanced journal entry with its items.
     * Throws an error if debits and credits do not match.
     */
    static async createBalancedEntry(
        entry: InsertJournalEntry,
        items: Omit<InsertJournalItem, "entryId" | "organizationId">[]
    ) {
        // Validate balance
        const totalDebit = items.reduce((sum, item) => sum + (item.debit || 0), 0);
        const totalCredit = items.reduce((sum, item) => sum + (item.credit || 0), 0);

        if (totalDebit !== totalCredit) {
            throw new Error(`Unbalanced journal entry: Debits (${totalDebit / 100}) do not equal Credits (${totalCredit / 100})`);
        }

        return await db.transaction(async (tx: any) => {
            // 1. Create entry header
            const [newEntry] = await tx
                .insert(journalEntries)
                .values(entry)
                .returning();

            // 2. Create entry items
            const itemsToInsert = items.map(item => ({
                ...item,
                entryId: newEntry.id,
                organizationId: entry.organizationId
            }));

            await tx.insert(journalItems).values(itemsToInsert as any);

            // 3. Update account balances (Atomically)
            for (const item of items) {
                const balanceChange = (item.debit || 0) - (item.credit || 0);
                await tx
                    .update(accountingAccounts)
                    .set({
                        balance: sql`${accountingAccounts.balance} + ${balanceChange}`,
                        updatedAt: new Date()
                    })
                    .where(eq(accountingAccounts.id, item.accountId));
            }

            return newEntry;
        });
    }

    /**
     * Logic for automatic accounting based on a sale.
     * Typical: Debit Cash/Bank (Asset), Credit Sales Revenue (Income).
     */
    static async autoRecordSale(params: {
        organizationId: string;
        amount: number;
        reference: string;
        paymentMethod: string;
        // In a real app, these would be looked up from organization settings
        cashAccountId: string;
        salesAccountId: string;
    }) {
        const { organizationId, amount, reference, cashAccountId, salesAccountId } = params;

        return await this.createBalancedEntry(
            {
                organizationId,
                reference,
                description: `Automatic entry for sale ${reference}`,
                type: "sale",
                status: "posted"
            },
            [
                {
                    accountId: cashAccountId,
                    debit: amount,
                    credit: 0,
                    description: "Cash/Bank Receipt"
                },
                {
                    accountId: salesAccountId,
                    debit: 0,
                    credit: amount,
                    description: "Sales Revenue"
                }
            ]
        );
    }

    /**
     * Calculate financial ratios for an organization.
     */
    static async getFinancialRatios(organizationId: string) {
        const accounts = await db
            .select()
            .from(accountingAccounts)
            .where(eq(accountingAccounts.organizationId, organizationId));

        const getBalance = (types: string[]) =>
            accounts
                .filter((a: any) => types.includes(a.type))
                .reduce((sum: number, a: any) => sum + a.balance, 0);

        const currentAssets = getBalance(["asset"]); // Simplified for MVP
        const currentLiabilities = Math.abs(getBalance(["liability"]));
        const equity = Math.abs(getBalance(["equity"]));
        const revenue = Math.abs(getBalance(["revenue"]));
        const expenses = getBalance(["expense"]);

        const netIncome = revenue - expenses;

        return {
            liquidityRatio: currentLiabilities !== 0 ? currentAssets / currentLiabilities : 0,
            returnOnEquity: equity !== 0 ? (netIncome / equity) * 100 : 0,
            profitMargin: revenue !== 0 ? (netIncome / revenue) * 100 : 0
        };
    }

    /**
     * Generates Catálogo de Cuentas XML for SAT (Mexico).
     */
    static async exportCatalogoXML(organizationId: string, year: number, month: number) {
        const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
        const accounts = await db.query.accountingAccounts.findMany({
            where: and(
                eq(accountingAccounts.organizationId, organizationId),
                sql`${accountingAccounts.satGroupingCode} IS NOT NULL`
            )
        });

        const monthStr = month.toString().padStart(2, '0');
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<catalogocuentas:Catalogo xmlns:catalogocuentas="http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/CatalogoCuentas" \n`;
        xml += `  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" \n`;
        xml += `  xsi:schemaLocation="http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/CatalogoCuentas http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/CatalogoCuentas/CatalogoCuentas_1_3.xsd" \n`;
        xml += `  Version="1.3" RFC="${org.taxId || 'XAXX010101000'}" Mes="${monthStr}" Anio="${year}">\n`;

        for (const acc of accounts) {
            xml += `  <catalogocuentas:Ctas CodAgrup="${acc.satGroupingCode}" NumCtas="${acc.code}" Desc="${acc.name}" Nivel="${acc.level}" Naturaleza="${acc.type === 'asset' || acc.type === 'expense' ? 'A' : 'D'}"/>\n`;
        }

        xml += `</catalogocuentas:Catalogo>`;
        return xml;
    }

    /**
     * Generates Balanza de Comprobación XML for SAT (Mexico).
     */
    static async exportBalanzaXML(organizationId: string, year: number, month: number) {
        const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
        const accounts = await db.query.accountingAccounts.findMany({
            where: eq(accountingAccounts.organizationId, organizationId)
        });

        const monthStr = month.toString().padStart(2, '0');
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<Balanza xmlns="http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/BalanzaComprobacion" \n`;
        xml += `  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" \n`;
        xml += `  xsi:schemaLocation="http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/BalanzaComprobacion http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/BalanzaComprobacion/BalanzaComprobacion_1_3.xsd" \n`;
        xml += `  Version="1.3" RFC="${org.taxId || 'XAXX010101000'}" Mes="${monthStr}" Anio="${year}" TipoEnvio="N">\n`;

        for (const acc of accounts) {
            const balance = Number(acc.balance) / 100;
            xml += `  <Ctas NumCta="${acc.code}" SaldoIni="0.00" Debe="${balance > 0 ? balance.toFixed(2) : '0.00'}" Haber="${balance < 0 ? Math.abs(balance).toFixed(2) : '0.00'}" SaldoFin="${balance.toFixed(2)}"/>\n`;
        }

        xml += `</Balanza>`;
        return xml;
    }
}
