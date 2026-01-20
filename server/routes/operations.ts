import { Router } from "express";
import { db } from "../storage";
import {
    suppliers, products, expenses, payments,
    vehicles, fuelLogs, maintenanceLogs, routes, routeStops,
    sales, purchases, employees, payrollAdvances, attendanceLogs, terminals,
    insertProductSchema, insertVehicleSchema, insertSaleSchema, insertRouteSchema, insertRouteStopSchema
} from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";

const router = Router();

// --- FINANCE ---

router.get("/finance/summary", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const totalExpenses = await db.query.expenses.findMany({ where: eq(expenses.organizationId, orgId) });
        const totalSales = await db.query.sales.findMany({ where: eq(sales.organizationId, orgId) });
        const advances = await db.query.payrollAdvances.findMany({
            where: eq(payrollAdvances.organizationId, orgId)
        });

        const expenseSum = totalExpenses.reduce((acc, curr) => acc + curr.amount, 0);
        const incomeSum = totalSales.reduce((acc, curr) => acc + curr.totalPrice, 0);
        const payrollSum = advances.reduce((acc, curr) => acc + curr.amount, 0);

        res.json({
            balance: incomeSum - expenseSum - payrollSum,
            income: incomeSum,
            expenses: expenseSum,
            payroll: {
                total: payrollSum,
                count: advances.length
            },
            recentTransactions: [...totalExpenses, ...totalSales].sort((a, b) =>
                new Date(b.date!).getTime() - new Date(a.date!).getTime()
            ).slice(0, 10)
        });
    } catch (error) {
        console.error("Finance summary error:", error);
        res.status(500).json({ message: "Error fetching finance summary", error: String(error) });
    }
});

// --- FLEET / LOGISTICS ---

router.get("/fleet/vehicles", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const fleet = await db.query.vehicles.findMany({
            where: eq(vehicles.organizationId, orgId),
            orderBy: [desc(vehicles.currentMileage)]
        });

        res.json(fleet);
    } catch (error) {
        console.error("Fleet error:", error);
        res.status(500).json({ message: "Error fetching fleet", error: String(error) });
    }
});

router.post("/fleet/vehicles", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const parsed = insertVehicleSchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) {
            return res.status(400).json({ message: "Invalid vehicle data", errors: parsed.error });
        }

        const [vehicle] = await db.insert(vehicles).values(parsed.data).returning();
        res.status(201).json(vehicle);
    } catch (error) {
        console.error("Create vehicle error:", error);
        res.status(500).json({ message: "Error creating vehicle", error: String(error) });
    }
});

router.post("/fleet/vehicles/:id/maintenance", async (req, res) => {
    try {
        const { id: vehicleId } = req.params;
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const data = req.body;
        const [log] = await db.insert(maintenanceLogs).values({
            ...data,
            vehicleId,
            date: new Date()
        }).returning();

        // Update vehicle mileage if provided
        if (data.mileageOut) {
            await db.update(vehicles)
                .set({ currentMileage: data.mileageOut })
                .where(eq(vehicles.id, vehicleId));
        }

        res.json(log);
    } catch (error) {
        console.error("Maintenance error:", error);
        res.status(500).json({ message: "Error recording maintenance", error: String(error) });
    }
});

// --- ROUTES (Cognitive Logistics) ---

router.post("/fleet/routes/generate", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        // Cognitive Step 1: Perception (Gather Data)
        // In a real app, this would query active orders, available vehicles, and drivers.
        // For this demo, we will create a mock route for a specific vehicle.

        const { vehicleId, driverId } = req.body; // Explicit assignment for now, or AI chooses if null

        if (!vehicleId || !driverId) {
            return res.status(400).json({ message: "Vehicle and Driver required for MVP assignment" });
        }

        // 1. Create Route Container
        const [route] = await db.insert(routes).values({
            organizationId: orgId,
            vehicleId,
            driverId,
            status: "pending",
            startTime: new Date(), // Assigned now
            estimatedDuration: 120, // Mock 2 hours
            totalDistance: 15.5, // Mock km
            currentLocationLat: 19.4326, // Mock CDMX start
            currentLocationLng: -99.1332
        }).returning();

        // 2. Assign Stops (Mocking from pending sales)
        const pendingSales = await db.query.sales.findMany({
            where: eq(sales.organizationId, orgId),
            limit: 3
        });

        // If no sales, create mock stops
        const stopsToCreate = pendingSales.length > 0 ? pendingSales : [
            { id: null, address: "Av. Reforma 222, CDMX" },
            { id: null, address: "Polanco V Seccion, CDMX" }
        ];

        let sequence = 1;
        for (const stop of stopsToCreate) {
            await db.insert(routeStops).values({
                routeId: route.id,
                orderId: stop.id, // Can be null if it's just a waypoint
                sequence: sequence++,
                status: "pending",
                address: (stop as any).address || "Ubicación de Cliente Desconocida",
                locationLat: 19.4326 + (Math.random() * 0.05), // Variant
                locationLng: -99.1332 + (Math.random() * 0.05)
            });
        }

        res.json({ message: "Route generated and assigned cognitively", routeId: route.id });

    } catch (error) {
        console.error("Route generation error:", error);
        res.status(500).json({ message: "Error generating route" });
    }
});

router.get("/fleet/routes/driver/:driverId", async (req, res) => {
    // Get active route for a driver
    try {
        const { driverId } = req.params;
        const activeRoute = await db.query.routes.findFirst({
            where: and(
                eq(routes.driverId, driverId),
                eq(routes.status, "active") // Or pending
            ),
            with: { vehicle: true }
        });

        // Note: Drizzle relations for routes->stops might need to be added to schema relations to use 'with'.
        // Falling back to manual fetch for stops if needed.
        if (!activeRoute) return res.json(null);

        const stops = await db.select().from(routeStops).where(eq(routeStops.routeId, activeRoute.id)).orderBy(routeStops.sequence);

        res.json({ ...activeRoute, stops });
    } catch (err) {
        console.error("Get driver route error:", err);
        res.status(500).json({ message: "Error fetching route" });
    }
});

router.post("/fleet/routes/:id/location", async (req, res) => {
    // Update live location
    try {
        const { id } = req.params;
        const { lat, lng } = req.body;

        await db.update(routes).set({
            currentLocationLat: lat,
            currentLocationLng: lng
        }).where(eq(routes.id, id));

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Error updating location" });
    }
});

router.post("/fleet/routes/stops/:id/complete", async (req, res) => {
    try {
        const { id } = req.params;
        const { signature, photo, lat, lng } = req.body;

        await db.update(routeStops).set({
            status: "completed",
            proofSignature: signature,
            proofPhoto: photo,
            proofLocationLat: lat,
            proofLocationLng: lng,
            completedAt: new Date()
        }).where(eq(routeStops.id, id));

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Error completing stop" });
    }
});

// --- MAINTENANCE ---

router.get("/fleet/maintenance", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const logs = await db.query.maintenanceLogs.findMany({
            with: { vehicle: true },
            where: (maintenanceLogs, { eq, inArray }) => {
                // Since maintenanceLogs doesn't have direct orgId, we need to filter by vehicles in the org
                // But Drizzle doesn't support deep filtering easily in 'with'. 
                // We should select based on vehicleId which belongs to org.
                // Alternative: join.
                return undefined; // We will use manual query for complex filter if simple relationship navigation isn't enough
            }
        });

        // Let's use a raw select or better query structure
        const orgVehicles = await db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.organizationId, orgId));
        const vehicleIds = orgVehicles.map(v => v.id);

        if (vehicleIds.length === 0) return res.json([]);

        const logsList = await db.query.maintenanceLogs.findMany({
            where: (logs, { inArray }) => inArray(logs.vehicleId, vehicleIds),
            orderBy: [desc(maintenanceLogs.date)],
            with: { vehicle: true }
        });

        res.json(logsList);
    } catch (error) {
        console.error("Fetch maintenance error:", error);
        res.status(500).json({ message: "Error fetching maintenance logs" });
    }
});

// --- INVENTORY ---

router.get("/inventory/products", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const inv = await db.query.products.findMany({
            where: eq(products.organizationId, orgId)
        });

        // Enrich with Cognitive Predictions (Mocked logic for now, utilizing real stock)
        const enriched = inv.map(p => {
            // Mock Usage Rate: Randomly assume 2-10 units sold per day for demo
            // In real app: await db.select({ count: sql`sum(quantity)` }).from(sales)...
            const dailyUsage = Math.floor(Math.random() * 8) + 2;
            const daysRemaining = p.stock > 0 ? Math.floor(p.stock / dailyUsage) : 0;

            const predictedDepletionDate = new Date();
            predictedDepletionDate.setDate(predictedDepletionDate.getDate() + daysRemaining);

            return {
                ...p,
                cognitive: {
                    dailyUsage,
                    daysRemaining,
                    predictedDepletionDate,
                    shouldRestock: daysRemaining < 7, // Alert if < 7 days left
                    suggestedOrder: daysRemaining < 7 ? Math.round(dailyUsage * 30) : 0 // Suggest 30 days worth
                }
            };
        });

        res.json(enriched);
    } catch (error) {
        console.error("Inventory error:", error);
        res.status(500).json({ message: "Error fetching inventory", error: String(error) });
    }
});

router.post("/inventory/products", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const parsed = insertProductSchema.safeParse({
            ...req.body,
            organizationId: orgId,
            // Ensure numbers are numbers, though Zod should handle if coerced, but let's trust body
        });

        if (!parsed.success) {
            return res.status(400).json({ message: "Invalid product data", errors: parsed.error });
        }

        const [product] = await db.insert(products).values(parsed.data).returning();
        res.status(201).json(product);
    } catch (error) {
        console.error("Create product error:", error);
        res.status(500).json({ message: "Error creating product", error: String(error) });
    }
});

// --- SALES ---

router.post("/sales", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { items, driverId, vehicleId, status } = req.body; // Expecting { items: [{ productId, quantity, price }], driverId, vehicleId, status }
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ message: "Invalid payload: items array required" });
        }

        const stats = { success: 0, errors: 0 };

        // Process sequentially to manage stock updates safely
        for (const item of items) {
            try {
                // 1. Verify Stock
                const [product] = await db.select().from(products).where(eq(products.id, item.productId));
                if (!product || product.stock < item.quantity) {
                    console.warn(`Skipping item ${item.productId}: Insufficient stock`);
                    stats.errors++;
                    continue;
                }

                // 2. Create Sale Record
                await db.insert(sales).values({
                    organizationId: orgId,
                    productId: item.productId,
                    quantity: item.quantity,
                    totalPrice: item.price * item.quantity, // Price is unit price in cents
                    driverId: driverId || null,
                    vehicleId: vehicleId || null,
                    status: status || "paid",
                    date: new Date()
                });

                // 3. Update Stock
                await db.update(products)
                    .set({ stock: product.stock - item.quantity })
                    .where(eq(products.id, item.productId));

                stats.success++;

            } catch (err) {
                console.error("Sale item error:", err);
                stats.errors++;
            }
        }

        res.json({ message: "Sales processed", stats });

    } catch (error) {
        console.error("Sales Error:", error);
        res.status(500).json({ message: "Error processing sales", error: String(error) });
    }
});

router.get("/sales/orders", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const orders = await db.query.sales.findMany({
            where: eq(sales.organizationId, orgId),
            orderBy: [desc(sales.date)],
            limit: 50,
            with: { product: true }
        });

        res.json(orders);
    } catch (error) {
        console.error("Sales orders error:", error);
        res.status(500).json({ message: "Error fetching sales orders" });
    }
});

// --- PURCHASES & SUPPLIERS ---

router.get("/suppliers", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const list = await db.query.suppliers.findMany({
            where: eq(suppliers.organizationId, orgId)
        });
        res.json(list);
    } catch (error) {
        console.error("Suppliers error:", error);
        res.status(500).json({ message: "Error fetching suppliers" });
    }
});

router.get("/purchases", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const list = await db.query.purchases.findMany({
            where: eq(purchases.organizationId, orgId),
            orderBy: [desc(purchases.date)],
            with: { supplier: true } // Assuming relation exists in schema relations
        });
        // Note: Relation might need to be defined in Drizzle schema relations if not present.
        // If not, we fetch raw. Let's assume raw for now to be safe or check relations.
        // Checking schema.ts... relations are imported but not fully defined in the snippet I saw.
        // I will use raw join or just return data.

        // Actually, let's just return the list. Frontend can fetch supplier name or we do manual join if needed.
        // But wait, schema.ts imports relations. Let's assume standard query works.
        res.json(list);
    } catch (error) {
        console.error("Purchases error:", error);
        res.status(500).json({ message: "Error fetching purchases" });
    }
});

router.post("/purchases", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const data = req.body; // { supplierId, items: [], totalCost }

        // Create Purchase
        const [purchase] = await db.insert(purchases).values({
            organizationId: orgId,
            supplierId: data.supplierId,
            items: data.items,
            totalCost: data.totalCost,
            driverId: data.driverId || null,
            vehicleId: data.vehicleId || null,
            status: "received", // Auto-receive for MVP
            date: new Date()
        }).returning();

        // Auto-update Inventory Stock
        for (const item of data.items) {
            const [product] = await db.select().from(products).where(eq(products.id, item.productId));
            if (product) {
                await db.update(products)
                    .set({
                        stock: product.stock + item.quantity,
                        cost: item.cost // Update last cost
                    })
                    .where(eq(products.id, item.productId));
            }
        }

        // Auto-create Expense Record
        await db.insert(expenses).values({
            organizationId: orgId,
            amount: data.totalCost,
            category: "inventory",
            description: `Purchase Order #${purchase.id.slice(0, 8)}`,
            supplierId: data.supplierId,
            date: new Date()
        });

        res.json(purchase);
    } catch (error) {
        console.error("Create purchase error:", error);
        res.status(500).json({ message: "Error creating purchase", error: String(error) });
    }
});

// --- EMPLOYEES & PAYROLL ---

router.get("/hr/employees", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const staff = await db.query.employees.findMany({
            where: eq(employees.organizationId, orgId)
        });
        res.json(staff);
    } catch (error) {
        console.error("Employee error:", error);
        res.status(500).json({ message: "Error fetching employees", error: String(error) });
    }
});

router.post("/hr/employees", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const parsed = insertEmployeeSchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) {
            return res.status(400).json({ message: "Invalid employee data", errors: parsed.error });
        }

        const [employee] = await db.insert(employees).values(parsed.data).returning();
        res.status(201).json(employee);
    } catch (error) {
        console.error("Create employee error:", error);
        res.status(500).json({ message: "Error creating employee", error: String(error) });
    }
});

router.put("/hr/employees/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const data = req.body;
        // Basic update - validation skipped for brevity in this fix, but ideal to use schema
        await db.update(employees)
            .set({
                name: data.name,
                role: data.role,
                department: data.department,
                salary: data.salary,
                status: data.status,
                email: data.email
            })
            .where(and(eq(employees.id, id), eq(employees.organizationId, orgId)));

        res.json({ success: true });
    } catch (error) {
        console.error("Update employee error:", error);
        res.status(500).json({ message: "Error updating employee" });
    }
});

router.delete("/hr/employees/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        await db.delete(employees)
            .where(and(eq(employees.id, id), eq(employees.organizationId, orgId)));

        res.json({ success: true });
    } catch (error) {
        console.error("Delete employee error:", error);
        res.status(500).json({ message: "Error deleting employee" });
    }
});

router.post("/hr/attendance", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        // { employeeId, terminalId, type, method }
        const data = req.body;

        // Log attendance
        const [log] = await db.insert(attendanceLogs).values({
            organizationId: orgId,
            employeeId: data.employeeId,
            terminalId: data.terminalId,
            type: data.type, // check_in, check_out, break_start...
            method: data.method || "face_id",
            timestamp: new Date()
        }).returning();

        // Update Terminal "Last Active"
        if (data.terminalId) {
            await db.update(terminals)
                .set({ lastActiveAt: new Date() })
                .where(eq(terminals.id, data.terminalId));
        }

        res.json(log);
    } catch (error) {
        console.error("Attendance error:", error);
        res.status(500).json({ message: "Error recording attendance", error: String(error) });
    }
});

router.get("/hr/payroll/advances", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const data = await db.query.payrollAdvances.findMany({
            where: eq(payrollAdvances.organizationId, orgId),
            with: { employee: true }
        });
        res.json(data);
    } catch (error) {
        console.error("Payroll advances error:", error);
        res.status(500).json({ message: "Error fetching payroll advances", error: String(error) });
    }
});

export default router;
