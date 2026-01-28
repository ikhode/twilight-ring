import { Router } from "express";
import { db } from "../storage";
import {
    vehicles, fuelLogs, maintenanceLogs, routes, routeStops, sales, purchases,
    insertVehicleSchema, insertRouteSchema, insertRouteStopSchema, expenses,
    cashRegisters, cashTransactions, userOrganizations
} from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getOrgIdFromRequest, getAuthenticatedUser } from "../auth_util";

const router = Router();

// Helper to get performer ID safe for Cashier/Kiosk
async function getPerformerId(req: any, orgId: string): Promise<string> {
    const user = await getAuthenticatedUser(req);
    if (user) return user.id;

    // If no user (Kiosk mode), find a fallback admin user
    const admin = await db.query.userOrganizations.findFirst({
        where: and(
            eq(userOrganizations.organizationId, orgId),
            eq(userOrganizations.role, 'admin')
        )
    });
    return admin?.userId || '00000000-0000-0000-0000-000000000000';
}

/**
 * Obtiene el listado de todos los vehículos de la organización, ordenados por kilometraje.
 */
router.get("/fleet/vehicles", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

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

/**
 * Registra un nuevo vehículo en la flotilla de la organización.
 */
router.post("/fleet/vehicles", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const parsed = insertVehicleSchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) {
            res.status(400).json({ message: "Invalid vehicle data", errors: parsed.error });
            return;
        }

        const [vehicle] = await db.insert(vehicles).values(parsed.data).returning();
        res.status(201).json(vehicle);
    } catch (error) {
        console.error("Create vehicle error:", error);
        res.status(500).json({ message: "Error creating vehicle", error: String(error) });
    }
});

/**
 * Registra una bitácora de mantenimiento para un vehículo específico y actualiza su kilometraje.
 */
router.post("/fleet/vehicles/:id/maintenance", async (req, res): Promise<void> => {
    try {
        const { id: vehicleId } = req.params;
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const data = req.body;

        // Security: Verify vehicle belongs to org
        const [vehicle] = await db.select().from(vehicles).where(and(eq(vehicles.id, vehicleId), eq(vehicles.organizationId, orgId))).limit(1);
        if (!vehicle) {
            res.status(404).json({ message: "Vehicle not found" });
            return;
        }

        // DUPLICATE CHECK: Prevent double submission
        // Check for same vehicle, same type, same date (approx), same description within the last minute or same day
        const existing = await db.select().from(maintenanceLogs).where(and(
            eq(maintenanceLogs.vehicleId, vehicleId),
            eq(maintenanceLogs.type, data.type),
            eq(maintenanceLogs.description, data.description || ""), // Check description matches
            eq(maintenanceLogs.cost, data.cost) // Check cost matches
        )).limit(1);

        // If an identical record exists created recently (e.g. same day), we can assume it's a duplicate or re-submission
        // For simplicity, strict duplicate check on the provided fields
        const isDuplicate = existing.some(log => {
            const logDate = new Date(log.date || "");
            const newDate = new Date(data.date);
            return logDate.toDateString() === newDate.toDateString();
        });

        if (isDuplicate) {
            res.status(200).json(existing[0]); // Return existing to be idempotent
            return;
        }

        // Update mileage if provided (and greater than current)
        if (data.mileageIn > (vehicle.currentMileage || 0)) {
            await db.update(vehicles)
                .set({ currentMileage: data.mileageIn })
                .where(eq(vehicles.id, vehicleId));
        }

        // Log maintenance
        const [log] = await db.insert(maintenanceLogs).values({
            vehicleId,
            description: data.description,
            cost: data.cost,
            type: data.type,
            date: new Date(data.date),
            mileageIn: data.mileageIn,
            // provider: data.provider, // Removed as not in schema
            organizationId: orgId
        }).returning();

        // INTEGRATION: Finance
        if (data.cost > 0) {
            await db.insert(expenses).values({
                organizationId: orgId,
                amount: data.cost,
                category: "Mantenimiento",
                description: `Mantenimiento ${vehicle.plate}: ${data.description || data.type}`,
                date: new Date(data.date)
            });
        }

        res.status(201).json(log);
    } catch (error) {
        console.error("Maintenance log error:", error);
        res.status(500).json({ message: "Error logging maintenance", error: String(error) });
    }
});

/**
 * Obtiene el historial de mantenimiento de la flota.
 */
router.get("/fleet/maintenance", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const result = await db.select().from(maintenanceLogs)
            .innerJoin(vehicles, eq(maintenanceLogs.vehicleId, vehicles.id))
            .where(eq(maintenanceLogs.organizationId, orgId))
            .orderBy(desc(maintenanceLogs.date));

        const logs = result.map((r: any) => ({
            ...r.maintenance_logs,
            vehicle: r.vehicles
        }));

        res.json(logs);
    } catch (error) {
        console.error("Fetch maintenance error:", error);
        res.status(500).json({ message: "Error fetching maintenance logs" });
    }
});

router.get("/fleet/fuel", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const result = await db.select().from(fuelLogs)
            .innerJoin(vehicles, eq(fuelLogs.vehicleId, vehicles.id))
            .where(eq(vehicles.organizationId, orgId))
            .orderBy(desc(fuelLogs.date));

        res.json(result.map((r: any) => ({
            ...r.fuel_logs,
            vehicle: r.vehicles
        })));
    } catch (error) {
        console.error("Fetch fuel error:", error);
        res.status(500).json({ message: "Error fetching fuel logs" });
    }
});

router.post("/fleet/vehicles/:id/fuel", async (req, res): Promise<void> => {
    try {
        const { id: vehicleId } = req.params;
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const data = req.body;

        const [vehicle] = await db.select().from(vehicles).where(and(eq(vehicles.id, vehicleId), eq(vehicles.organizationId, orgId))).limit(1);
        if (!vehicle) {
            res.status(404).json({ message: "Vehicle not found" });
            return;
        }

        // DUPLICATE CHECK
        const existing = await db.select().from(fuelLogs).where(and(
            eq(fuelLogs.vehicleId, vehicleId),
            eq(fuelLogs.liters, data.liters),
            eq(fuelLogs.cost, data.cost)
        )).limit(1);

        const isDuplicate = existing.some(log => {
            const logDate = new Date(log.date || "");
            const newDate = new Date(data.date || new Date());
            return logDate.toDateString() === newDate.toDateString();
        });

        if (isDuplicate) {
            res.status(200).json(existing[0]);
            return;
        }

        if (data.mileage > (vehicle.currentMileage || 0)) {
            await db.update(vehicles).set({ currentMileage: data.mileage }).where(eq(vehicles.id, vehicleId));
        }

        const [log] = await db.insert(fuelLogs).values({
            vehicleId,
            date: new Date(data.date || new Date()),
            liters: data.liters,
            cost: data.cost,
            mileage: data.mileage
        }).returning();

        // INTEGRATION: Finance
        if (data.cost > 0) {
            await db.insert(expenses).values({
                organizationId: orgId,
                amount: data.cost,
                category: "Combustible",
                description: `Combustible ${vehicle.plate}: ${data.liters}L`,
                date: new Date(data.date || new Date())
            });
        }

        res.status(201).json(log);
    } catch (error) {
        console.error("Fuel log error:", error);
        res.status(500).json({ message: "Error logging fuel" });
    }
});

/**
 * Genera o recupera rutas activas.
 */
router.get("/fleet/routes/active", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const activeRoutes = await db.query.routes.findMany({
            where: and(eq(routes.organizationId, orgId), eq(routes.status, "active")),
            with: {
                stops: {
                    with: {
                        order: { with: { customer: true, product: true } },
                        purchase: { with: { supplier: true, product: true } }
                    }
                },
                vehicle: true,
                driver: true
            }
        });
        res.json(activeRoutes);
    } catch (error) {
        console.error("Fetch active routes error:", error);
        res.status(500).json({ message: "Error fetching routes" });
    }
});

/**
 * Genera una nueva ruta optimizada.
 */
router.post("/fleet/routes/generate", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { vehicleId, driverId } = req.body;

        // 1. Find pending deliveries (sales)
        const pendingSales = await db.query.sales.findMany({
            where: and(eq(sales.organizationId, orgId), eq(sales.deliveryStatus, "pending"))
        });

        // 2. Find pending collections (purchases - pickup)
        const pendingCollections = await db.query.purchases.findMany({
            where: and(
                eq(purchases.organizationId, orgId),
                eq(purchases.deliveryStatus, "pending"),
                eq(purchases.logisticsMethod, "pickup")
            )
        });

        if (pendingSales.length === 0 && pendingCollections.length === 0) {
            res.status(400).json({ message: "No tasks found for new route" });
            return;
        }

        // 3. Create Route
        const [newRoute] = await db.insert(routes).values({
            organizationId: orgId,
            vehicleId,
            driverId,
            status: "active",
            startTime: new Date()
        }).returning();

        // 4. Create Stops
        let sequence = 1;

        // Add deliveries
        for (const sale of pendingSales) {
            await db.insert(routeStops).values({
                routeId: newRoute.id,
                orderId: sale.id,
                stopType: "delivery",
                sequence: sequence++,
                status: "pending"
            });
            // Mark sale as 'shipped'
            await db.update(sales).set({ deliveryStatus: "shipped" }).where(eq(sales.id, sale.id));
        }

        // Add collections
        for (const purchase of pendingCollections) {
            await db.insert(routeStops).values({
                routeId: newRoute.id,
                purchaseId: purchase.id,
                stopType: "collection",
                sequence: sequence++,
                status: "pending"
            });
        }

        res.status(201).json(newRoute);
    } catch (error) {
        console.error("Generate route error:", error);
        res.status(500).json({ message: "Error generating route" });
    }
});

/**
 * Obtiene la ruta activa para un conductor específico.
 */
router.get("/fleet/routes/driver/:driverId", async (req, res): Promise<void> => {
    try {
        const { driverId } = req.params;
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const route = await db.query.routes.findFirst({
            where: and(eq(routes.driverId, driverId), eq(routes.status, "active")),
            with: {
                stops: true,
                vehicle: true
            }
        });

        if (!route) {
            res.status(404).json({ message: "No active route found" });
            return;
        }

        res.json(route);
    } catch (error) {
        console.error("Fetch driver route error:", error);
        res.status(500).json({ message: "Error fetching driver route" });
    }
});

/**
 * Marca una parada como completada y registra la prueba de entrega.
 */
router.post("/fleet/routes/stops/:id/complete", async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const { signature, lat, lng, isPaid, paymentAmount, paymentMethod } = req.body;
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const [stop] = await db.update(routeStops)
            .set({
                status: "completed",
                proofSignature: signature,
                proofLocationLat: lat,
                proofLocationLng: lng,
                isPaid: isPaid || false,
                paymentAmount: paymentAmount,
                paymentMethod: paymentMethod,
                completedAt: new Date()
            })
            .where(eq(routeStops.id, id))
            .returning();

        if (!stop) {
            res.status(404).json({ message: "Stop not found" });
            return;
        }

        // INTEGRATION: Finance (Cash Collection on Delivery)
        if (stop.isPaid && (stop.paymentAmount || 0) > 0) {
            // Find an open cash register for the org
            const register = await db.query.cashRegisters.findFirst({
                where: and(
                    eq(cashRegisters.organizationId, orgId),
                    eq(cashRegisters.status, 'open')
                )
            });

            if (register && register.currentSessionId) {
                const performerId = await getPerformerId(req, orgId);

                // Record the transaction
                await db.insert(cashTransactions).values({
                    organizationId: orgId,
                    registerId: register.id,
                    sessionId: register.currentSessionId,
                    type: "in",
                    category: "sales",
                    amount: stop.paymentAmount || 0,
                    description: `Cobro Entrega Ruta: ${stop.address || stop.id.slice(0, 8)}`,
                    performedBy: performerId,
                    referenceId: stop.id,
                    timestamp: new Date()
                });

                // Update register balance
                await db.update(cashRegisters)
                    .set({ balance: sql`${cashRegisters.balance} + ${stop.paymentAmount || 0}` })
                    .where(eq(cashRegisters.id, register.id));

                console.log(`[FINANCE] Recorded ${stop.paymentAmount} cents from delivery stop ${stop.id}`);
            }
        }

        res.json(stop);
    } catch (error) {
        console.error("Complete stop error:", error);
        res.status(500).json({ message: "Error completing stop" });
    }
});

export default router;
