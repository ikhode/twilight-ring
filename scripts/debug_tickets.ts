
import { db } from "../server/storage";
import { pieceworkTickets, employees, terminals } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function main() {
    console.log("--- DEBUG TICKETS START ---");

    // 1. Check Approved Tickets
    const approvedTickets = await db.query.pieceworkTickets.findMany({
        where: eq(pieceworkTickets.status, "approved"),
        with: {
            employee: true
        }
    });

    console.log(`Found ${approvedTickets.length} APPROVED tickets globally.`);
    approvedTickets.forEach(t => {
        console.log(`[Ticket ${t.id.slice(0, 8)}] Emp: ${t.employee.name} (${t.employeeId}) | Org: ${t.organizationId} | Status: ${t.status}`);
    });

    // 2. Check Luis Fonseca specifically if possible
    // (Optional, just listing all covers it)

    console.log("--- DEBUG TICKETS END ---");
    process.exit(0);
}

main().catch(console.error);
