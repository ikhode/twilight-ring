import { Router } from "express";
import { db } from "../storage";
import {
    suppliers, products, expenses, purchases,
    vehicles, maintenanceLogs, routes,
    insertProductSchema
} from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";
import { createRequire } from "module";

const require = createRequire(import.meta.url || "file://" + __filename);
const pdf = require("pdf-parse");

const router = Router();

// --- Core Operations Endpoints ---

/**
 * Obtiene métricas clave para el Dashboard de Operaciones.
 */
router.get("/dashboard", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // Metrics: Active Vehicles, Pending Maintenance, Critical Stock, Recent Expenses
        const activeVehiclesCount = await db.select({ count: sql<number>`count(*)` })
            .from(vehicles)
            .where(and(eq(vehicles.organizationId, orgId), eq(vehicles.status, "active")));

        const criticalStockCount = await db.select({ count: sql<number>`count(*)` })
            .from(products)
            .where(and(eq(products.organizationId, orgId), sql`${products.stock} < 10`)); // Mock threshold

        // Recent activity (mocked aggregation for speed, or actual query)
        const recentActivity = [
            { type: "alert", message: "3 Vehicles need maintenance", time: "2h ago" },
            { type: "info", message: "Inventory audit completed", time: "5h ago" }
        ];

        res.json({
            stats: {
                activeVehicles: activeVehiclesCount[0]?.count || 0,
                criticalStock: criticalStockCount[0]?.count || 0,
                fulfillmentRate: 98.5, // Mock
                efficiency: 92 // Mock
            },
            activity: recentActivity
        });

    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ message: "Error fetching dashboard" });
    }
});

/**
 * Obtiene la configuración operativa de la sede/organización.
 */
router.get("/config", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // In a real app, this might come from a 'settings' or 'organizations' table columns
        // For now, returning a mock config object structure
        res.json({
            workingHours: { start: "08:00", end: "18:00" },
            timezone: "America/Mexico_City",
            autoDispatch: true,
            notifications: {
                email: true,
                sms: false
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching config" });
    }
});

/**
 * Actualiza la configuración operativa.
 */
router.post("/config", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // Mock save
        res.json({ success: true, message: "Configuration saved" });
    } catch (error) {
        res.status(500).json({ message: "Error saving config" });
    }
});

// --- Existing / Legacy Endpoints (Maintained for compatibility but candidates for move) ---

/**
 * Analiza un documento PDF.
 */
router.post("/documents/parse", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { file } = req.body;
        if (!file) {
            res.status(400).json({ message: "No file provided" });
            return;
        }

        const base64Data = file.split(';base64,').pop();
        const dataBuffer = Buffer.from(base64Data, 'base64');
        const data = await pdf(dataBuffer);
        const text = data.text;

        const extracted = {
            rfc: text.match(/[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}/)?.[0] || null,
            name: text.match(/Nombre, denominación o razón social:\s*([\w\s.]+)/i)?.[1]?.trim() || null,
            zipCode: text.match(/C\.P\.\s*(\d{5})/i)?.[1] || text.match(/\b\d{5}\b/)?.[0] || null,
            regimen: text.match(/Régimen:\s*([\w\s]+)/i)?.[1]?.trim() || null,
            rawText: text.substring(0, 500)
        };

        if (!extracted.name) {
            const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 5);
            extracted.name = lines.find((l: string) => !l.includes("CONSTANCIA") && !l.includes("SAT") && l.length < 50) || null;
        }

        res.json({ success: true, extracted });
    } catch (error) {
        console.error("PDF Parse error:", error);
        res.status(500).json({ message: "Error parsing document", error: String(error) });
    }
});

/**
 * Obtiene el listado de proveedores.
 */
router.get("/suppliers", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const list = await db.query.suppliers.findMany({
            where: eq(suppliers.organizationId, orgId)
        });
        res.json(list);
    } catch (error) {
        console.error("Suppliers error:", error);
        res.status(500).json({ message: "Error fetching suppliers" });
    }
});

// NOTE: Inventory and Purchases routes below are likely deprecated here and moved to their own files.
// Keeping strictly "Operations" core features here.

export default router;
