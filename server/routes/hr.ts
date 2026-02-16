import { Router } from "express";
import { storage, db } from "../storage";
import { getOrgIdFromRequest } from "../auth_util";
import { supabaseAdmin } from "../supabase";
import {
    insertEmployeeSchema,
    users,
    userOrganizations,
    employees,
    employeeDocs,
    performanceReviews,
    workHistory
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { logAudit } from "../lib/audit";
import { requirePermission } from "../middleware/permission_check";
import { AuthenticatedRequest } from "../types";

const router = Router();

/**
 * Obtiene el listado de empleados de la organización.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.get("/employees", requirePermission("hr.read"), async (req, res) => {
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
router.post("/employees", requirePermission("hr.write"), async (req, res) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = insertEmployeeSchema.safeParse({ ...req.body, organizationId: orgId });
    if (!parsed.success) return res.status(400).json({ error: parsed.error });

    const employee = await storage.createEmployee(parsed.data);

    // Log action
    await logAudit(
        req,
        orgId,
        (req.user as any)?.id || "system",
        "CREATE_EMPLOYEE",
        employee.id,
        { name: employee.name }
    );

    res.status(201).json(employee);
});

/**
 * Obtiene un empleado individual por ID.
 */
router.get("/employees/:id", requirePermission("hr.read"), async (req, res) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const id = req.params.id;
    const employee = await storage.getEmployee(id);

    if (!employee || employee.organizationId !== orgId) {
        return res.status(404).json({ error: "Employee not found" });
    }

    res.json(employee);
});

/**
 * Actualiza la información de un empleado.
 */
router.patch("/employees/:id", requirePermission("hr.write"), async (req, res) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const id = req.params.id;
    const employee = await storage.getEmployee(id);
    if (!employee || employee.organizationId !== orgId) {
        return res.status(404).json({ error: "Employee not found or unauthorized" });
    }

    const updated = await storage.updateEmployee(id, req.body);

    // Log action
    await logAudit(
        req,
        orgId,
        (req.user as any)?.id || "system",
        "UPDATE_EMPLOYEE",
        id,
        { changes: req.body }
    );

    res.json(updated);
});

/**
 * Elimina un empleado.
 */
router.delete("/employees/:id", requirePermission('employees.write'), async (req, res) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const id = req.params.id;
    const employee = await storage.getEmployee(id);
    if (!employee || employee.organizationId !== orgId) {
        return res.status(404).json({ error: "Employee not found or unauthorized" });
    }

    await storage.deleteEmployee(id);

    // Log action
    await logAudit(
        req,
        orgId,
        (req.user as any)?.id || "system",
        "DELETE_EMPLOYEE",
        id,
        { name: employee.name }
    );

    res.status(204).end();
});

/**
 * Obtiene las solicitudes de adelanto de nómina de la organización.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.get("/payroll/advances", async (req, res) => {
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
router.post("/invite", requirePermission('employees.write'), async (req, res) => {
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
            role: (role === "owner" ? "admin" : (role === "member" ? "user" : role)) as "admin" | "manager" | "user" | "viewer" | "cashier",
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
        const err = error as Error;
        console.error("Invite error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * --- NEW FEATURES (Enforced) ---
 */

// Documents
router.post("/employees/:id/documents", requirePermission('employees.write'), async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });
        const { id: employeeId } = req.params;
        const { name, type, fileUrl, expiresAt } = req.body;

        // In a real app, 'fileUrl' comes from storage upload (S3/Supabase Storage) pre-step
        const [doc] = await db.insert(employeeDocs).values({
            organizationId: orgId,
            employeeId,
            name,
            type,
            fileUrl,
            expiresAt: expiresAt ? new Date(expiresAt) : null
        }).returning();

        res.status(201).json(doc);
    } catch (error) {
        res.status(500).json({ message: "Failed to add document" });
    }
});

router.get("/employees/:id/documents", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });
        const { id: employeeId } = req.params;

        const docs = await db.select().from(employeeDocs)
            .where(and(eq(employeeDocs.employeeId, employeeId), eq(employeeDocs.organizationId, orgId)));

        res.json(docs);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch documents" });
    }
});

// Performance Reviews
router.post("/employees/:id/reviews", requirePermission('employees.write'), async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });
        const { id: employeeId } = req.params;
        const { score, feedback, period } = req.body;

        const [review] = await db.insert(performanceReviews).values({
            organizationId: orgId,
            employeeId,
            score,
            feedback,
            period,
            status: "completed"
        }).returning();

        res.status(201).json(review);
    } catch (error) {
        res.status(500).json({ message: "Failed to create review" });
    }
});

// Work History
router.get("/employees/:id/history", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });
        const { id: employeeId } = req.params;

        const history = await db.select().from(workHistory)
            .where(and(eq(workHistory.employeeId, employeeId), eq(workHistory.organizationId, orgId)))
            .orderBy(desc(workHistory.date));

        res.json(history);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch history" });
    }
});

// Org Chart
router.get("/org-chart", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const allEmployees = await storage.getEmployees(orgId);

        // Simple heuristic for Org Chart: Group by Department
        // In a real app with 'reports_to', we would build a tree.
        const tree = allEmployees.reduce((acc: any, emp: any) => {
            const dept = emp.department || "General";
            if (!acc[dept]) acc[dept] = [];
            acc[dept].push({
                id: emp.id,
                name: emp.name,
                role: emp.role,
                avatar: emp.avatar // if exists
            });
            return acc;
        }, {});

        res.json(tree);
    } catch (error) {
        res.status(500).json({ message: "Failed to generate org chart" });
    }
});

export const hrRoutes = router;
