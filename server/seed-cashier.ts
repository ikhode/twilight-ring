import { db } from "./storage";
import { sales, pieceworkTickets, employees, products, customers, organizations } from "../shared/schema";
import { eq } from "drizzle-orm";

export async function seedCashierData() {
    try {
        console.log("🪙 Seeding Cashier & Payout test data...");

        // 1. Get an organization
        const org = await db.query.organizations.findFirst();
        if (!org) {
            console.log("❌ No organization found. Run main seed first.");
            return;
        }

        // 2. Get/Create a driver
        let driver = await db.query.employees.findFirst({
            where: (e, { eq, and }) => and(eq(e.organizationId, org.id), eq(e.role, 'driver'))
        });
        if (!driver) {
            [driver] = await db.insert(employees).values({
                organizationId: org.id,
                name: "Driver Test",
                role: 'driver',
                currentArea: 'Logistics',
                currentStatus: 'active'
            }).returning();
        }

        // 3. Get/Create an operator (for piecework)
        let operator = await db.query.employees.findFirst({
            where: (e, { eq, and }) => and(eq(e.organizationId, org.id), eq(e.role, 'operator'))
        });
        if (!operator) {
            [operator] = await db.insert(employees).values({
                organizationId: org.id,
                name: "Operator Test",
                role: 'operator',
                currentArea: 'Production',
                currentStatus: 'active'
            }).returning();
        }

        // 4. Get a product
        const product = await db.query.products.findFirst({
            where: eq(products.organizationId, org.id)
        });
        if (!product) return;

        // 5. Get a customer
        const customer = await db.query.customers.findFirst({
            where: eq(customers.organizationId, org.id)
        });
        if (!customer) return;

        // 6. Create Pending Driver Settlements (Sales in Cash, Paid, but not in Register)
        console.log("🚚 Creating driver settlements...");
        await db.insert(sales).values([
            {
                organizationId: org.id,
                productId: product.id,
                customerId: customer.id,
                quantity: 10,
                totalPrice: 50000, // $500.00
                paymentStatus: 'paid',
                paymentMethod: 'cash',
                driverId: driver.id,
                date: new Date()
            },
            {
                organizationId: org.id,
                productId: product.id,
                customerId: customer.id,
                quantity: 5,
                totalPrice: 25000, // $250.00
                paymentStatus: 'paid',
                paymentMethod: 'cash',
                driverId: driver.id,
                date: new Date()
            }
        ]);

        // 7. Create Pending Piecework Tickets (Approved, but not Paid)
        console.log("🎟️ Creating approved piecework tickets...");
        await db.insert(pieceworkTickets).values([
            {
                organizationId: org.id,
                employeeId: operator.id,
                taskName: "Corte de Pantalón",
                quantity: 100,
                unitPrice: 500, // $5.00
                totalAmount: 50000, // $500.00
                status: 'approved',
                createdAt: new Date()
            },
            {
                organizationId: org.id,
                employeeId: operator.id,
                taskName: "Pegado de Bolsas",
                quantity: 200,
                unitPrice: 200, // $2.00
                totalAmount: 40000, // $400.00
                status: 'approved',
                createdAt: new Date()
            }
        ]);

        console.log("✅ Cashier & Payout data seeded successfully.");
    } catch (error) {
        console.error("❌ Error seeding cashier data:", error);
    }
}
