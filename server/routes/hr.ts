import { Router } from "express";
import { storage, db } from "../storage";
import { getOrgIdFromRequest } from "../auth_util";
import { supabaseAdmin } from "../supabase";
import { insertEmployeeSchema, users, userOrganizations, employees } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

/**
 * Obtiene el listado de empleados de la organización.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.get("/employees", async (req, res): Promise<void> => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const employees = await storage.getEmployees(orgId);
    res.json(employees);
});

/**
 * Registra un nuevo empleado en la organización.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.post("/employees", async (req, res): Promise<void> => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = insertEmployeeSchema.safeParse({ ...req.body, organizationId: orgId });
    if (!parsed.success) return res.status(400).json({ error: parsed.error });

    const employee = await storage.createEmployee(parsed.data);
    res.status(201).json(employee);
});

/**
 * Actualiza la información de un empleado.
 */
router.patch("/employees/:id", async (req, res): Promise<void> => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const id = req.params.id;
    const employee = await storage.getEmployee(id);
    if (!employee || employee.organizationId !== orgId) {
        return res.status(404).json({ error: "Employee not found or unauthorized" });
    }

    const updated = await storage.updateEmployee(id, req.body);
    res.json(updated);
});

/**
 * Elimina un empleado.
 */
router.delete("/employees/:id", async (req, res): Promise<void> => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const id = req.params.id;
    const employee = await storage.getEmployee(id);
    if (!employee || employee.organizationId !== orgId) {
        return res.status(404).json({ error: "Employee not found or unauthorized" });
    }

    await storage.deleteEmployee(id);
    res.status(204).end();
});

/**
 * Obtiene las solicitudes de adelanto de nómina de la organización.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.get("/payroll/advances", async (req, res): Promise<void> => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const advances = await storage.getPayrollAdvances(orgId);
    res.json(advances);
});

/**
 * Invita a un nuevo usuario a la organización vía Supabase Auth y crea su registro de empleado.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.post("/invite", async (req, res): Promise<void> => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { email, role, name } = req.body;
    if (!email || !role || !name) return res.status(400).json({ error: "Missing fields" });

    try {
        // 1. Invite via Supabase Admin
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
                organization_id: orgId,
                role: role,
                name: name
            }
        });

        if (authError) throw authError;

        // 2. Create Public User Record if strictly needed (Supabase might not create it until they accept, 
        // but we need it for userOrganizations). 
        // Actually, inviteUserByEmail creates a User with "invited" state.
        const userId = authData.user.id;

        // Check if user exists in public table
        const existingUser = await db.query.users.findFirst({ where: eq(users.id, userId) });
        if (!existingUser) {
            await db.insert(users).values({
                id: userId,
                email: email,
                name: name
            });
        }

        // 3. Link to Organization
        await db.insert(userOrganizations).values({
            userId: userId,
            organizationId: orgId,
            role: role as "admin" | "member" | "owner", // Fixed 'any'
            xp: 0,
            level: 1
        });

        // 4. Also add to Employees table for HR visibility
        // Check if exists first
        const [existingEmployee] = await db.select().from(employees).where(and(eq(employees.email, email), eq(employees.organizationId, orgId)));

        if (!existingEmployee) {
            await storage.createEmployee({
                organizationId: orgId,
                name: name,
                email: email,
                role: role,
                department: "general", // Default
                status: "active"
            });
        }

        res.json({ message: "Invitation sent", userId });

    } catch (error) {
        const err = error as Error; // Fixed 'any'
        console.error("Invite error:", err);
        res.status(500).json({ error: err.message });
    }
});

export const hrRoutes = router;
