import { Router } from "express";
import { db } from "../storage";
import { sql } from "drizzle-orm";

const router = Router();

// In-memory storage for driver locations (in production, use Redis or database)
const driverLocations = new Map<string, {
    employeeId: string;
    terminalId?: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    employeeName?: string;
}>();

/**
 * POST /api/logistics/driver-location
 * Receive and store driver's current GPS location
 */
router.post("/driver-location", async (req, res): Promise<void> => {
    try {
        const { employeeId, terminalId, latitude, longitude, timestamp } = req.body;

        if (!employeeId || !latitude || !longitude) {
            res.status(400).json({ message: "Missing required fields" });
            return;
        }

        // Get employee name for display
        const employee = await db.query.employees.findFirst({
            where: sql`id = ${employeeId}`,
            columns: { name: true }
        });

        // Store location
        driverLocations.set(employeeId, {
            employeeId,
            terminalId,
            latitude,
            longitude,
            timestamp: timestamp || new Date().toISOString(),
            employeeName: employee?.name || `Driver ${employeeId.slice(0, 8)}`
        });

        res.json({ success: true, message: "Location updated" });
    } catch (error) {
        console.error("Driver location error:", error);
        res.status(500).json({ message: "Failed to update location" });
    }
});

/**
 * GET /api/logistics/driver-locations
 * Get all active driver locations for map display
 */
router.get("/driver-locations", async (req, res): Promise<void> => {
    try {
        const locations = Array.from(driverLocations.values());

        // Filter out stale locations (older than 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const activeLocations = locations.filter(loc =>
            new Date(loc.timestamp) > fiveMinutesAgo
        );

        res.json(activeLocations);
    } catch (error) {
        console.error("Get driver locations error:", error);
        res.status(500).json({ message: "Failed to fetch locations" });
    }
});

/**
 * GET /api/logistics/driver-location/:employeeId
 * Get specific driver's current location
 */
router.get("/driver-location/:employeeId", async (req, res): Promise<void> => {
    try {
        const { employeeId } = req.params;
        const location = driverLocations.get(employeeId);

        if (!location) {
            res.status(404).json({ message: "Driver not found or not active" });
            return;
        }

        res.json(location);
    } catch (error) {
        console.error("Get driver location error:", error);
        res.status(500).json({ message: "Failed to fetch location" });
    }
});

export default router;
