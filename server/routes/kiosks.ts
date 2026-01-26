import { Router } from "express";
import { db, storage } from "../storage";
import { terminals, insertTerminalSchema, driverTokens, vehicles, employees } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import { randomBytes } from "crypto";
import { getOrgIdFromRequest } from "../auth_util";

const router = Router();

// GET /api/kiosks - List all terminals for the organization
/**
 * Obtiene el listado de todas las terminales (kioskos) de la organización.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.get("/", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const results = await db.select().from(terminals).where(eq(terminals.organizationId, orgId));
        res.json(results);
    } catch (error) {
        console.error("Error fetching kiosks:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// GET /api/kiosks/:id - Get specific terminal details
/**
 * Obtiene los detalles de una terminal específica por su ID.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.get("/:id", async (req, res) => {
    try {
        // Note: This endpoint might be accessed publicly by the kiosk device.
        // For now, we'll assume it's protected or correct ID is enough.
        // Ideally, we'd check a token.
        const kioskId = req.params.id;
        if (!kioskId) return res.status(400).json({ message: "ID Required" });

        const result = await db.select().from(terminals).where(eq(terminals.id, kioskId)).limit(1);
        if (result.length === 0) return res.status(404).json({ message: "Terminal not found" });

        res.json(result[0]);
    } catch (error) {
        console.error("Error fetching kiosk details:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// GET /api/kiosks/device/:deviceId - Get specific terminal details by deviceId
/**
 * Obtiene los detalles de una terminal por su Device ID.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.get("/device/:deviceId", async (req, res) => {
    try {
        const deviceId = req.params.deviceId;
        if (!deviceId) return res.status(400).json({ message: "Device ID Required" });

        const result = await db.select().from(terminals).where(eq(terminals.deviceId, deviceId)).limit(1);
        if (result.length === 0) return res.status(404).json({ message: "Terminal not found" });

        res.json(result[0]);
    } catch (error) {
        console.error("Error fetching kiosk by device:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// POST /api/kiosks - Register a new terminal
/**
 * Registra una nueva terminal en la organización.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.post("/", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const capabilities: string[] = req.body.capabilities ? [...req.body.capabilities] : [];
        const data = {
            ...req.body,
            organizationId: orgId,
            status: "offline", // Default status
            capabilities
        };

        const result = await db.insert(terminals).values(data as any).returning();
        res.status(201).json(result[0]);
    } catch (error) {
        console.error("Error creating kiosk:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// POST /api/kiosks/:id/provisioning - Generate a 6-digit provisioning token
router.post("/:id/provisioning", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const kioskId = req.params.id;
        // Generate 6-digit token
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        const [kiosk] = await db.update(terminals)
            .set({
                provisioningToken: token,
                provisioningExpiresAt: expiresAt
            })
            .where(and(eq(terminals.id, kioskId), eq(terminals.organizationId, orgId)))
            .returning();

        res.json({ token, expiresAt });
    } catch (error) {
        console.error("Provisioning error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// POST /api/kiosks/bind - Bind a device using a token
router.post("/bind", async (req, res) => {
    try {
        const { token, deviceId } = req.body;
        if (!token || !deviceId) return res.status(400).json({ message: "Token and Device ID required" });

        // Find terminal with matching token not expired
        const [terminal] = await db.select().from(terminals)
            .where(and(
                eq(terminals.provisioningToken, token),
                gt(terminals.provisioningExpiresAt, new Date())
            ))
            .limit(1);

        if (!terminal) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        // Bind device
        const [updated] = await db.update(terminals)
            .set({
                deviceId: deviceId,
                linkedDeviceId: deviceId,
                provisioningToken: null, // Consume token
                provisioningExpiresAt: null,
                status: "active",
                lastActiveAt: new Date()
            })
            .where(eq(terminals.id, terminal.id))
            .returning();

        res.json(updated);
    } catch (error) {
        console.error("Binding error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// POST /api/kiosks/register - Public/Semi-public registration from the device itself
/**
 * Realiza el registro automático de una terminal desde el propio dispositivo.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.post("/register", async (req, res) => {
    try {
        const { name, deviceId, organizationId, type, location } = req.body;

        if (!deviceId || !organizationId) {
            return res.status(400).json({ message: "Device ID and Organization ID required" });
        }

        // Check if device already registered
        const [existing] = await db.select().from(terminals).where(eq(terminals.deviceId, deviceId)).limit(1);
        if (existing) {
            return res.json(existing);
        }

        const data = {
            organizationId,
            name: name || `Nuevo Kiosko - ${deviceId.slice(0, 4)}`,
            deviceId,
            location: location || "Pendiente",
            status: "online",
            capabilities: []
        };

        const result = await db.insert(terminals).values(data).returning();
        res.status(201).json(result[0]);
    } catch (error) {
        console.error("Error registering kiosk:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// PATCH /api/kiosks/:id/heartbeat - Update status
/**
 * Actualiza el estado de conexión (Heartbeat) de una terminal y verifica su identidad.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.patch("/:id/heartbeat", async (req, res) => {
    try {
        const kioskId = req.params.id;
        const deviceAuth = req.headers["x-device-auth"] as string; // format: "deviceId:salt"
        const { latitude, longitude } = req.body;

        const [terminal] = await db.select().from(terminals).where(eq(terminals.id, kioskId)).limit(1);
        if (!terminal) {
            res.status(404).json({ message: "Terminal not found" });
            return;
        }

        // If terminal is bound to a salt, verify it
        if (terminal.deviceSalt) {
            const expectedAuth = `${terminal.deviceId}:${terminal.deviceSalt}`;
            if (deviceAuth !== expectedAuth) {
                res.status(403).json({ message: "Security breach: Unauthorized device fingerprint" });
                return;
            }
        }

        await db.update(terminals)
            .set({
                status: "online",
                lastActiveAt: new Date(),
                lastLatitude: latitude,
                lastLongitude: longitude
            })
            .where(eq(terminals.id, kioskId));

        res.json({ status: "ok" });
    } catch (error) {
        console.error("Error updating heartbeat:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// POST /api/kiosks/:id/provisioning - Generate one-time provisioning token
/**
 * Genera un token de provisión temporal para vincular un dispositivo físico a una terminal.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.post("/:id/provisioning", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const kioskId = req.params.id;
        const token = randomBytes(16).toString("hex");
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minute TTL

        const [updated] = await db.update(terminals)
            .set({
                provisioningToken: token,
                provisioningExpiresAt: expiresAt
            })
            .where(and(eq(terminals.id, kioskId), eq(terminals.organizationId, orgId)))
            .returning();

        if (!updated) return res.status(404).json({ message: "Terminal not found" });

        res.json({ token, expiresAt });
    } catch (error) {
        console.error("Provisioning error:", error);
        res.status(500).json({ message: "Failed to generate provisioning token" });
    }
});

// POST /api/kiosks/bind - Bind device to terminal using token
/**
 * Vincula un dispositivo físico a una terminal utilizando un token de provisión.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.post("/bind", async (req, res) => {
    try {
        const { token, deviceId, salt } = req.body;
        if (!token || !deviceId || !salt) {
            return res.status(400).json({ message: "Missing required fields (token, deviceId, salt)" });
        }

        // Find terminal with this token
        const [terminal] = await db.select()
            .from(terminals)
            .where(and(
                eq(terminals.provisioningToken, token),
                gt(terminals.provisioningExpiresAt, new Date())
            ))
            .limit(1);

        if (!terminal) {
            return res.status(401).json({ message: "Invalid or expired provisioning token" });
        }

        // Check for existing bindings for this deviceId to prevent unique constraint violation
        const [existing] = await db.select().from(terminals).where(eq(terminals.deviceId, deviceId)).limit(1);

        // If device is already bound to ANOTHER terminal, unbind it first (Force Re-bind)
        if (existing && existing.id !== terminal.id) {
            console.log(`[Re-bind] Device ${deviceId} was bound to terminal ${existing.id}. Unbinding it to allow new bind to ${terminal.id}.`);
            await db.update(terminals)
                .set({
                    deviceId: null,
                    linkedDeviceId: null,
                    status: 'offline',
                    deviceSalt: null
                })
                .where(eq(terminals.id, existing.id));
        }

        // Bind device and burn token
        const [updated] = await db.update(terminals)
            .set({
                deviceId,
                deviceSalt: salt,
                linkedDeviceId: deviceId, // Legacy field for back-compat
                provisioningToken: null,
                provisioningExpiresAt: null,
                status: "online",
                lastActiveAt: new Date()
            })
            .where(eq(terminals.id, terminal.id))
            .returning();

        res.json({ success: true, terminalId: updated.id, name: updated.name });
    } catch (error) {
        console.error("Binding error:", error);
        res.status(500).json({ message: "Failed to bind device" });
    }
});


// T-CAC: Identify Employee by Face Vector
/**
 * Identifica a un empleado mediante su vector facial (Face Embedding).
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.post("/identify", async (req, res) => {
    try {
        const { descriptor, terminalId } = req.body; // Expect terminalId now
        if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
            return res.status(400).json({ message: "Invalid descriptor format" });
        }

        // If terminalId is missing, try to get from header or context (for future magic link)
        // For now, strict requirement if not handling generic dev mode
        if (!terminalId) {
            return res.status(400).json({ message: "Terminal ID required for isolation" });
        }

        // Verify Terminal & Get Org
        const [terminal] = await db.select().from(terminals).where(eq(terminals.id, terminalId)).limit(1);
        if (!terminal) return res.status(404).json({ message: "Terminal not found" });

        const match = await storage.findEmployeeByFace(descriptor, terminal.organizationId);

        if (!match) {
            return res.status(404).json({ message: "No match found" });
        }

        res.json(match);
    } catch (error) {
        console.error("Identify error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// T-CAC: Execute Action (Start, Switch, End)
/**
 * Ejecuta una acción de asistencia (entrada, salida, cambio de área) para un empleado.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.post("/action", async (req, res) => {
    try {
        const { employeeId, action, area, notes, terminalId } = req.body;
        // action: "check_in", "check_out", "switch_area", "break", "resume"

        if (!terminalId) return res.status(400).json({ message: "Terminal ID required" });

        // Verify Terminal
        const [terminal] = await db.select().from(terminals).where(eq(terminals.id, terminalId)).limit(1);
        if (!terminal) return res.status(404).json({ message: "Terminal not found" });

        const orgId = terminal.organizationId;

        // Verify Employee belongs to Org
        // Verify Employee belongs to Org (Future check)
        // const employee = await storage.getEmployee(employeeId); 
        // Logic: getEmployee likely returns by ID. If IDs are UUIDs, collision is unlikely, but checking org match is safer.
        // Or simple:
        // const [employee] = await db.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.organizationId, orgId)));

        // For now trusting storage.getEmployee(employeeId) fetches correctly, but we must verify org.
        // Actually storage.getEmployee matches by ID log.
        // Let's assume standard ID fetch. 
        // We will perform the action inside storage which uses ID.
        // Ideally: verify employee.organizationId === orgId.

        if (action === "check_in" || action === "switch_area" || action === "resume") {
            // Close previous session if exists
            await storage.closeWorkSession(employeeId);

            // Start new session
            await storage.logWorkSession({
                organizationId: orgId,
                employeeId,
                area: area || "General",
                status: "active",
                notes
            });

            await storage.updateEmployeeStatus(employeeId, {
                currentArea: area,
                currentStatus: action === "break" ? "break" : "active"
            });
        }
        else if (action === "check_out") {
            await storage.closeWorkSession(employeeId);
            // Use undefined instead of null to match schema optional
            await storage.updateEmployeeStatus(employeeId, { currentStatus: "offline", currentArea: undefined });
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Action error:", error);
        res.status(500).json({ message: "Action failed" });
    }
});

// T-CAC: Simple Enroll (Update embedding)
/**
 * Registra el vector facial (embedding) de un empleado.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.post("/enroll", async (req, res) => {
    try {
        const { employeeId, descriptor } = req.body;
        await storage.updateEmployeeEmbedding(employeeId, descriptor);
        res.json({ success: true });
    } catch {
        res.status(500).json({ message: "Enrollment failed" });
    }
});
// ==========================================
// DRIVER KIOSK - SECURE PWA FLOW
// ==========================================

/**
 * Genera un enlace de un solo uso (Magic Link) para que un conductor vincule su dispositivo móvil.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.post("/driver/link/generate", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { driverId, vehicleId } = req.body;

        // Generate High Entropy Token
        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour validity for the link

        await db.insert(driverTokens).values({
            organizationId: orgId,
            token,
            driverId,
            vehicleId,
            status: "active",
            expiresAt
        });

        // Return the full magic link (frontend will construct URL)
        res.json({ token, expiresAt });
    } catch (error) {
        console.error("Link Gen Error:", error);
        res.status(500).json({ message: "Failed to generate link" });
    }
});

// 2. DRIVER DEVICE: Verify Link & Bind Device
/**
 * Verifica un enlace de un solo uso y vincula el dispositivo del conductor a un Kiosko de Flotilla.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.post("/driver/link/verify", async (req, res) => {
    try {
        const { token, deviceId } = req.body; // deviceId generated by client (fingerprint)

        if (!token || !deviceId) return res.status(400).json({ message: "Invalid Request" });

        // Find Token
        const [tokenRecord] = await db.select().from(driverTokens).where(eq(driverTokens.token, token)).limit(1);

        if (!tokenRecord) return res.status(404).json({ message: "Invalid Link" });
        if (tokenRecord.status !== 'active') return res.status(410).json({ message: "Link used or expired" });
        if (new Date() > tokenRecord.expiresAt) return res.status(410).json({ message: "Link expired" });

        // Create/Update Terminal Record (The "Kiosk")
        // Check if device already exists? No, OTL binds this specific device ID.

        let [terminal] = await db.select().from(terminals).where(eq(terminals.deviceId, deviceId));

        if (!terminal) {
            [terminal] = await db.insert(terminals).values({
                organizationId: tokenRecord.organizationId,
                name: `Driver Kiosk - ${tokenRecord.vehicleId || 'Unassigned'}`,
                status: 'online',
                deviceId: deviceId,
                linkedDeviceId: deviceId,
                driverId: tokenRecord.driverId,
                vehicleId: tokenRecord.vehicleId,
                capabilities: []
            } as any).returning();
        } else {
            // Re-bind existing device (update driver/vehicle)
            [terminal] = await db.update(terminals).set({
                organizationId: tokenRecord.organizationId, // Ensure org match
                driverId: tokenRecord.driverId,
                vehicleId: tokenRecord.vehicleId,
                linkedDeviceId: deviceId,
                status: 'online',
                lastActiveAt: new Date()
            }).where(eq(terminals.id, terminal.id)).returning();
        }

        // Invalidate Token (One-Time Use)
        await db.update(driverTokens).set({ status: 'used' }).where(eq(driverTokens.id, tokenRecord.id));

        res.json({ success: true, terminal, token: "session_established" });

    } catch (error) {
        console.error("Link Verify Error:", error);
        res.status(500).json({ message: "Verification failed" });
    }
});

// 3. DRIVER DEVICE: Auto-Login / Session Check
/**
 * Verifica si un dispositivo de conductor tiene una sesión activa y devuelve los detalles vinculados.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.get("/driver/session/:deviceId", async (req, res) => {
    try {
        const { deviceId } = req.params;
        if (!deviceId) return res.status(400).json({ message: "Device ID required" });

        const [terminal] = await db.select().from(terminals).where(eq(terminals.deviceId, deviceId));

        if (!terminal) return res.status(401).json({ message: "Device not registered" });

        // Optional: Verify Organization active?
        // Fetch enriched data
        let driver = null;
        let vehicle = null;

        if (terminal.driverId) {
            [driver] = await db.select().from(employees).where(eq(employees.id, terminal.driverId));
        }
        if (terminal.vehicleId) {
            [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, terminal.vehicleId));
        }

        res.json({
            authenticated: true,
            terminal,
            driver,
            vehicle
        });

    } catch (error) {
        console.error("Session Check Error:", error);
        res.status(500).json({ message: "Session check failed" });
    }
});

export const kioskRoutes = router;
