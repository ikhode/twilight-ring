import { Router } from "express";
import { db } from "../storage";
import {
    vehicles, fuelLogs, maintenanceLogs, routes, routeStops,
    insertVehicleSchema, insertRouteSchema, insertRouteStopSchema
} from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";

const router = Router();

/**
 * Obtiene el listado de todos los vehículos de la organización, ordenados por kilometraje.
 */
router.get("/fleet/vehicles", async (req, res): Promise<void> => {
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

/**
 * Registra un nuevo vehículo en la flotilla de la organización.
 */
router.post("/fleet/vehicles", async (req, res): Promise<void> => {
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

/**
 * Registra una bitácora de mantenimiento para un vehículo específico y actualiza su kilometraje.
 */
router.post("/fleet/vehicles/:id/maintenance", async (req, res): Promise<void> => {
    try {
        const { id: vehicleId } = req.params;
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const data = req.body;

        // Security: Verify vehicle belongs to org
        const [vehicle] = await db.select().from(vehicles).where(and(eq(vehicles.id, vehicleId), eq(vehicles.organizationId, orgId))).limit(1);
        if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

        // Update mileage if provided (and greater than current)
        if (data.mileageIn > vehicle.currentMileage) {
            await db.update(vehicles)
                .set({ currentMileage: data.mileageIn, updatedAt: new Date() })
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
            provider: data.provider,
            organizationId: orgId
        }).returning();

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
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const logs = await db.query.maintenanceLogs.findMany({
            where: eq(maintenanceLogs.organizationId, orgId),
            orderBy: [desc(maintenanceLogs.date)],
            with: {
                vehicle: true
            }
        });

        res.json(logs);
    } catch (error) {
        console.error("Fetch maintenance error:", error);
        res.status(500).json({ message: "Error fetching maintenance logs" });
    }
});

/**
 * Genera o recupera rutas activas.
 */
router.get("/fleet/routes/active", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        // Mock return for now as per previous implementation logic
        res.json([]);
    } catch (error) {
        res.status(500).json({ message: "Error fetching routes" });
    }
});

/**
 * Genera una nueva ruta optimizada (Simulación).
 */
router.post("/fleet/routes/generate", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        // Logic would go here. For now returning success mock.
        res.json({ success: true, message: "Route generated" });
    } catch (error) {
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
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const route = await db.query.routes.findFirst({
            where: and(eq(routes.driverId, driverId), eq(routes.status, "active")),
            with: {
                stops: true,
                vehicle: true
            }
        });

        if (!route) {
            return res.status(404).json({ message: "No active route found" });
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
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

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

        if (!stop) return res.status(404).json({ message: "Stop not found" });

        res.json(stop);
    } catch (error) {
        console.error("Complete stop error:", error);
        res.status(500).json({ message: "Error completing stop" });
    }
});

export default router;
