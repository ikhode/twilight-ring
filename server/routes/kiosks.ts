import { Router } from "express";
import { db, storage } from "../storage";
import { terminals, insertTerminalSchema, driverTokens, vehicles, employees, productionActivityLogs, productionTasks, processInstances, organizations } from "@shared/schema";
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

        const result = await db.select({
            terminal: terminals,
            organization: organizations
        })
            .from(terminals)
            .leftJoin(organizations, eq(terminals.organizationId, organizations.id))
            .where(eq(terminals.deviceId, deviceId))
            .limit(1);

        if (result.length === 0) return res.status(404).json({ message: "Terminal not found" });

        const { terminal, organization } = result[0];

        // Merge necessary org settings into the response for the frontend
        const response = {
            ...terminal,
            organizationName: organization?.name,
            organizationSettings: organization?.settings
        };

        res.json(response);
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
/**
 * Genera un token de provisión de 6 dígitos para vincular un dispositivo.
 */
router.post("/:id/provisioning", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "No autorizado" });

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

        if (!kiosk) return res.status(404).json({ message: "Terminal no encontrada" });

        res.json({ token, expiresAt });
    } catch (error) {
        console.error("Provisioning error:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

// POST /api/kiosks/bind - Bind a device using a token
/**
 * Vincula un dispositivo físico a una terminal utilizando un token de provisión.
 */
router.post("/bind", async (req, res) => {
    try {
        const { token, deviceId, salt } = req.body;
        if (!token || !deviceId) {
            return res.status(400).json({ message: "Token y Device ID requeridos" });
        }

        // Find terminal with matching token not expired
        const [terminal] = await db.select().from(terminals)
            .where(and(
                eq(terminals.provisioningToken, token),
                gt(terminals.provisioningExpiresAt, new Date())
            ))
            .limit(1);

        if (!terminal) {
            return res.status(401).json({ message: "Token inválido o expirado" });
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
                deviceId: deviceId,
                linkedDeviceId: deviceId,
                deviceSalt: salt || null,
                provisioningToken: null, // Consume token
                provisioningExpiresAt: null,
                status: "active",
                lastActiveAt: new Date()
            })
            .where(eq(terminals.id, terminal.id))
            .returning();

        res.json({ success: true, terminalId: updated.id, name: updated.name });
    } catch (error) {
        console.error("Binding error:", error);
        res.status(500).json({ message: "Error al vincular dispositivo" });
    }
});


// POST /api/kiosks/register - Public/Semi-public registration from the device itself
router.post("/register", async (req, res) => {
    try {
        const { name, deviceId, organizationId, location } = req.body;
        if (!deviceId || !organizationId) {
            return res.status(400).json({ message: "Device ID and Organization ID required" });
        }
        const [existing] = await db.select().from(terminals).where(eq(terminals.deviceId, deviceId)).limit(1);
        if (existing) return res.json(existing);

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
router.patch("/:id/heartbeat", async (req, res) => {
    try {
        const kioskId = req.params.id;
        const deviceAuth = req.headers["x-device-auth"] as string;
        const { latitude, longitude } = req.body;

        const [terminal] = await db.select().from(terminals).where(eq(terminals.id, kioskId)).limit(1);
        if (!terminal) return res.status(404).json({ message: "Terminal not found" });

        if (terminal.deviceSalt) {
            const expectedAuth = `${terminal.deviceId}:${terminal.deviceSalt}`;
            if (deviceAuth !== expectedAuth) {
                return res.status(403).json({ message: "Security breach: Unauthorized device fingerprint" });
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

        // SYNC: Update Driver Status if assigned
        if (terminal.driverId) {
            await db.update(employees)
                .set({
                    currentStatus: 'active',
                    currentArea: 'En Ruta', // Contextual info
                    latitude: latitude?.toString(),
                    longitude: longitude?.toString(),
                    // lastSeenAt: new Date() // If schema had this
                } as any)
                .where(eq(employees.id, terminal.driverId));
        }

        // SYNC: Update Driver Status if assigned
        if (terminal.driverId) {
            await db.update(employees)
                .set({
                    currentStatus: 'active',
                    currentArea: 'En Ruta', // Contextual info
                    latitude: latitude?.toString(),
                    longitude: longitude?.toString(),
                    // lastSeenAt: new Date() // If schema had this
                } as any)
                .where(eq(employees.id, terminal.driverId));
        }

        res.json({ status: "ok" });
    } catch (error) {
        console.error("Error updating heartbeat:", error);
        res.status(500).json({ message: "Internal Server Error" });
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

        // Fetch Active Production Log
        const [activeLog] = await db.select().from(productionActivityLogs)
            .where(and(
                eq(productionActivityLogs.employeeId, match.id),
                eq(productionActivityLogs.status, 'active')
            ))
            .limit(1);

        res.json({ ...match, activeLog });
    } catch (error) {
        console.error("Identify error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get Production Options (Tasks & Batches) for Kiosk Selection
router.get("/:id/production-options", async (req, res) => {
    try {
        const terminalId = req.params.id;
        const [terminal] = await db.select().from(terminals).where(eq(terminals.id, terminalId)).limit(1);
        if (!terminal) return res.status(404).json({ message: "Terminal not found" });

        const orgId = terminal.organizationId;

        // Fetch Tasks
        // We need to import productionTasks from schema if not already imported? 
        // We imported it in schema.ts
        // Wait, I need to check imports in kiosks.ts. I added productionActivityLogs, verify productionTasks.

        // Fetch Active Batches
        // We need processInstances

        // Dynamic Import or using db.query if relations set up, or just importing specific tables active in this file.
        // I need to add imports at top of file.

        // Let's assume I will add imports in next step or use what's available.
        // `import { productionTasks, processInstances, processes } from "@shared/schema";`

        const tasks = await db.query.productionTasks.findMany({
            where: (t, { eq, and }) => and(eq(t.organizationId, orgId), eq(t.active, true))
        });

        // Add Defined Processes (CPE)
        const processesList = await db.query.processes.findMany({
            where: (p, { eq, and }) => and(eq(p.organizationId, orgId))
        });

        const activeBatches = await db.query.processInstances.findMany({
            where: (pi, { eq, and }) => and(eq(pi.organizationId, orgId), eq(pi.status, 'active')),
            with: {
                // process: true // If relation exists
            },
            limit: 20
        });

        res.json({ tasks, processes: processesList, batches: activeBatches });
    } catch (error) {
        console.error("Error fetching options:", error);
        res.status(500).json({ message: "Internal Error" });
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
        const { employeeId, action, area, notes, terminalId, taskId, batchId, activityType } = req.body;
        // action: "check_in", "check_out", "switch_area", "break", "resume", "start_activity", "end_activity"

        if (!terminalId) return res.status(400).json({ message: "Terminal ID required" });

        // Verify Terminal
        const [terminal] = await db.select().from(terminals).where(eq(terminals.id, terminalId)).limit(1);
        if (!terminal) return res.status(404).json({ message: "Terminal not found" });

        const orgId = terminal.organizationId;

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
            // Close any active production logs as abandoned
            await db.update(productionActivityLogs)
                .set({ status: 'abandoned', endedAt: new Date() })
                .where(and(
                    eq(productionActivityLogs.employeeId, employeeId),
                    eq(productionActivityLogs.status, 'active')
                ));

            // Use undefined instead of null to match schema optional
            await storage.updateEmployeeStatus(employeeId, { currentStatus: "offline", currentArea: undefined });
        }
        else if (action === "start_activity") {
            // End any current active log for this employee
            await db.update(productionActivityLogs)
                .set({ status: 'completed', endedAt: new Date() })
                .where(and(
                    eq(productionActivityLogs.employeeId, employeeId),
                    eq(productionActivityLogs.status, 'active')
                ));

            // Create new log
            await db.insert(productionActivityLogs).values({
                organizationId: orgId,
                employeeId,
                activityType: activityType || 'production',
                taskId: taskId || null,
                batchId: batchId || null,
                status: 'active',
                notes: notes,
                metadata: { terminalId }
            });

            await storage.updateEmployeeStatus(employeeId, {
                currentStatus: activityType === 'production' ? 'working' : (activityType || 'busy')
            });
        }
        else if (action === "end_activity") {
            // End specific active log
            await db.update(productionActivityLogs)
                .set({
                    // If it was production, it needs verification. If personal (break), it's completed.
                    status: (activityType === 'production' || !activityType) ? 'pending_verification' : 'completed',
                    endedAt: new Date()
                })
                .where(and(
                    eq(productionActivityLogs.employeeId, employeeId),
                    eq(productionActivityLogs.status, 'active')
                ));

            await storage.updateEmployeeStatus(employeeId, {
                currentStatus: 'active' // Back to general active
            });
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

// PATCH /api/kiosks/:id - Update terminal configuration
router.patch("/:id", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const kioskId = req.params.id;
        const { name, location, capabilities, status } = req.body;

        // Verify ownership
        const [existing] = await db.select().from(terminals)
            .where(and(eq(terminals.id, kioskId), eq(terminals.organizationId, orgId)))
            .limit(1);

        if (!existing) return res.status(404).json({ message: "Terminal not found" });

        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (location !== undefined) updates.location = location;
        if (capabilities !== undefined) updates.capabilities = capabilities;
        if (name !== undefined) updates.name = name;
        if (location !== undefined) updates.location = location;
        if (capabilities !== undefined) updates.capabilities = capabilities;
        if (status !== undefined) updates.status = status;
        if (req.body.sessionPersistence !== undefined) updates.sessionPersistence = req.body.sessionPersistence;

        const [updated] = await db.update(terminals)
            .set(updates)
            .where(eq(terminals.id, kioskId))
            .returning();

        res.json(updated);
    } catch (error) {
        console.error("Error updating kiosk:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// DELETE /api/kiosks/:id/binding - Revoke device binding (Soft Reset)
router.delete("/:id/binding", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const kioskId = req.params.id;

        const [updated] = await db.update(terminals)
            .set({
                deviceId: null,
                linkedDeviceId: null,
                deviceSalt: null,
                status: 'offline',
                lastActiveAt: null
            })
            .where(and(eq(terminals.id, kioskId), eq(terminals.organizationId, orgId)))
            .returning();

        if (!updated) return res.status(404).json({ message: "Terminal not found" });

        res.json({ success: true, message: "Device unbound successfully" });
    } catch (error) {
        console.error("Error revoking binding:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// POST /api/kiosks/action - Register employee action (Check-in/out, Break, Activity)
router.post("/action", async (req, res) => {
    try {
        const { employeeId, terminalId, action, activityType, notes } = req.body;
        // const orgId = await getOrgIdFromRequest(req); // Not reliable from Kiosk device requests, use terminal logic

        if (!employeeId || !terminalId || !action) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // 1. Verify Terminal & Org
        const [terminal] = await db.select().from(terminals).where(eq(terminals.id, terminalId)).limit(1);
        if (!terminal) return res.status(404).json({ message: "Terminal not found" });
        const orgId = terminal.organizationId;

        // 2. Determine new status based on action
        let newStatus = "active";
        let logActivityType = "other";

        switch (action) {
            case "check_in":
                newStatus = "active";
                logActivityType = "check_in";
                break;
            case "check_out":
                newStatus = "offline";
                logActivityType = "check_out";
                break;
            case "break":
                newStatus = "break";
                logActivityType = req.body.breakType || "break";
                break;
            case "resume":
                newStatus = "active";
                logActivityType = "resume";
                break;
            case "start_activity":
                newStatus = "working"; // Or specific activity status
                logActivityType = activityType || "production";
                break;
            case "end_activity":
                newStatus = "active";
                logActivityType = "end_activity";
                break;
        }

        // 3. Update Employee Status
        await db.update(employees)
            .set({
                currentStatus: newStatus,
                // If it's a check-in, we might want to update location or last seen, but currentStatus is key
            } as any)
            .where(eq(employees.id, employeeId));

        // 4. Log Activity for Traceability
        const [log] = await db.insert(productionActivityLogs).values({
            organizationId: orgId,
            employeeId: employeeId,
            activityType: logActivityType,
            status: "completed", // The event itself is completed
            metadata: {
                terminalId,
                action,
                notes,
                timestamp: new Date().toISOString()
            }
        }).returning();

        res.json({ success: true, status: newStatus, logId: log.id });

    } catch (error: any) {
        console.error("Error processing kiosk action:", error);
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/kiosks/:id - Permanently delete terminal
router.delete("/:id", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const kioskId = req.params.id;

        const result = await db.delete(terminals)
            .where(and(eq(terminals.id, kioskId), eq(terminals.organizationId, orgId)))
            .returning();

        if (result.length === 0) return res.status(404).json({ message: "Terminal not found" });

        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting kiosk:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export const kioskRoutes = router;
