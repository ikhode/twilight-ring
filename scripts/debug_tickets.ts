import 'dotenv/config';
import { db } from "../server/storage";
import { pieceworkTickets, employees, terminals, expenses, cashRegisters, cashTransactions } from "../shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";

async function main() {
    console.log("--- DEBUG TICKETS START ---");

    // 1. Check Specific Missing Tickets
    const missingIds = ['64b0c494', '2fceefe9', '0470bf23'];

    for (const idPrefix of missingIds) {
        const tickets = await db.query.pieceworkTickets.findMany({
            where: sql`${pieceworkTickets.id} LIKE ${idPrefix + '%'}`,
            with: { employee: true }
        });
        if (tickets.length > 0) {
            console.log(`[FOUND ${idPrefix}] Status: ${tickets[0].status} | Org: ${tickets[0].organizationId}`);
        } else {
            console.log(`[MISSING ${idPrefix}] Not found in DB.`);
        }
    }

    // console.log(`Found ${approvedTickets.length} APPROVED tickets globally.`);

    // 2. Check Luis Fonseca specifically if possible
    // (Optional, just listing all covers it)

    console.log("--- DEBUG TICKETS END ---");
    // 3. Check for recent Expenses
    const recentExpenses = await db.query.expenses.findMany({
        orderBy: [desc(sql`date`)],
        limit: 5
    });
    console.log("--- RECENT EXPENSES ---");
    recentExpenses.forEach(e => {
        console.log(`[Expense ${e.id.slice(0, 8)}] Amount: $${e.amount / 100} | Category: ${e.category} | Desc: ${e.description}`);
    });

    // 4. Check Cash Registers and Transactions
    const registers = await db.query.cashRegisters.findMany();
    console.log("--- CASH REGISTERS ---");
    registers.forEach(r => {
        console.log(`[Register ${r.name}] Status: ${r.status} | Balance: $${r.balance / 100} | Session: ${r.currentSessionId || 'None'}`);
    });

    const recentTx = await db.query.cashTransactions.findMany({
        orderBy: [desc(sql`timestamp`)],
        limit: 5
    });
    console.log("--- RECENT TRANSACTIONS ---");
    recentTx.forEach(t => {
        console.log(`[Tx ${t.type.toUpperCase()}] Amount: $${t.amount / 100} | Cat: ${t.category} | Desc: ${t.description}`);
    });

    console.log("--- END ---");
    process.exit(0);
}

main().catch(console.error);
