import { db } from "./storage";
import {
    sales, purchases, organizations,
    employees, payrollAdvances, suppliers,
    products, vehicles, maintenanceLogs, expenses
} from "../shared/schema";
import { eq } from "drizzle-orm";

export async function seedOperations() {
    try {
        // Get first organization to seed data into
        const org = await db.query.organizations.findFirst();
        if (!org) {
            console.log("⚠️ No organization found, skipping operational seed.");
            return;
        }

        const orgId = org.id;

        // Seed Suppliers
        const [supplier] = await db.insert(suppliers).values({
            organizationId: orgId,
            name: "Coco Distribuidora S.A.",
            contactInfo: {
                contactName: "Juan Perez",
                email: "juan@cocodist.com",
                phone: "555-0101"
            },
            category: "Materia Prima"
        }).onConflictDoNothing().returning();

        // Seed Products
        let [product] = await db.insert(products).values({
            organizationId: orgId,
            sku: "COCO-V-001",
            name: "Coco Verde Grande",
            category: "Materia Prima",
            stock: 1200,
            price: 1500, // $15.00
            cost: 800 // $8.00
        }).onConflictDoNothing().returning();

        if (!product) {
            const foundProduct = await db.query.products.findFirst({
                where: eq(products.sku, "COCO-V-001")
            });
            if (foundProduct) product = foundProduct;
        }

        // Seed Vehicles
        const [vehicle] = await db.insert(vehicles).values({
            organizationId: orgId,
            plate: "ABC-1234",
            model: "Kenworth T680",
            year: 2022,
            currentMileage: 45000,
            status: "active"
        }).onConflictDoNothing().returning();

        // Seed Maintenance
        if (vehicle) {
            await db.insert(maintenanceLogs).values({
                organizationId: orgId,
                vehicleId: vehicle.id,
                type: "preventive",
                description: "Cambio de aceite y filtros preventivo",
                mileageIn: 44500,
                mileageOut: 44550,
                cost: 2500,
                partsUsed: [{ name: "Aceite Sintético", quantity: 1, cost: 1800 }]
            });
        }

        // Seed Sales/Expenses
        if (product) {
            await db.insert(sales).values({
                organizationId: orgId,
                productId: product.id,
                quantity: 100,
                totalPrice: 150000, // $1,500
            });
        }

        await db.insert(expenses).values({
            organizationId: orgId,
            amount: 50000, // $500
            category: "Combustible",
            description: "Carga diésel unidad ABC-1234",
        });

        // Seed Employees
        const [emp1] = await db.insert(employees).values({
            organizationId: orgId,
            name: "Carlos Sanchez",
            role: "Driver",
            status: "active"
        }).returning();

        const [emp2] = await db.insert(employees).values({
            organizationId: orgId,
            name: "Maria Lopez",
            role: "Operator",
            status: "active"
        }).returning();

        // Seed Payroll Advances
        if (emp1) {
            await db.insert(payrollAdvances).values({
                organizationId: orgId,
                employeeId: emp1.id,
                amount: 250000, // $2,500
                status: "paid",
                date: new Date()
            });
        }

        if (emp2) {
            await db.insert(payrollAdvances).values({
                organizationId: orgId,
                employeeId: emp2.id,
                amount: 150000, // $1,500
                status: "pending",
                date: new Date()
            });
        }

        console.log("✅ Operational data seeded successfully");
    } catch (error) {
        console.error("❌ Error seeding operations:", error);
    }
}
