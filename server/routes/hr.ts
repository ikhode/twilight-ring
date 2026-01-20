import { Router } from "express";
import { storage, db } from "../storage";
import { getOrgIdFromRequest } from "../auth_util";
import { supabaseAdmin } from "../supabase";
import { insertEmployeeSchema, insertPayrollAdvanceSchema, attendanceLogs, users, userOrganizations, employees } from "@shared/schema";
import { eq, gte, desc, and } from "drizzle-orm";

const router = Router();

// EMPLOYEES
router.get("/employees", async (req, res) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const employees = await storage.getEmployees(orgId);
    res.json(employees);
});

router.post("/employees", async (req, res) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = insertEmployeeSchema.safeParse({ ...req.body, organizationId: orgId });
    if (!parsed.success) return res.status(400).json({ error: parsed.error });

    const employee = await storage.createEmployee(parsed.data);
    res.status(201).json(employee);
});

// PAYROLL ADVANCES
router.get("/payroll/advances", async (req, res) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const advances = await storage.getPayrollAdvances(orgId);
    res.json(advances);
});

// ATTENDANCE
router.post("/attendance", async (req, res) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { employeeId, terminalId, type, method, pin } = req.body;

    // Verify Employee Exists & belong to Org
    const employee = await storage.getEmployee(employeeId);
    if (!employee || employee.organizationId !== orgId) {
        return res.status(404).json({ error: "Employee not found" });
    }

    // PIN Verification (Simple mock for now, or check against employee.pin if we bad field)
    // Assuming for now PIN verification happens on frontend or we trust the chaos
    // Real implementation: Verify PINHash

    const log = await db.insert(attendanceLogs).values({
        organizationId: orgId,
        employeeId,
        terminalId: terminalId || null,
        type, // "check_in" | "check_out"
        method: method || "manual",
        location: { x: 0, y: 0 }, // Placeholder for point
        timestamp: new Date()
    }).returning();

    res.status(201).json(log[0]);
});

router.get("/attendance/today", async (req, res) => {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    // Fetch logs for today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const logs = await db.query.attendanceLogs.findMany({
        where: and(
            eq(attendanceLogs.organizationId, orgId),
            gte(attendanceLogs.timestamp, startOfDay)
        ),
        with: {
            employee: true
        },
        orderBy: [desc(attendanceLogs.timestamp)]
    });

    res.json(logs);
});

// INVITE USER
router.post("/invite", async (req, res) => {
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
            role: role as any,
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

    } catch (error: any) {
        console.error("Invite error:", error);
        res.status(500).json({ error: error.message });
    }
});

export const hrRoutes = router;
