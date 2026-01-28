import { Router } from "express";
import { db, storage } from "../storage";
import { employees, workSessions } from "../../shared/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";

const router = Router();

// Get recent attendance logs for an organization
router.get("/recent", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const sessions = await db.query.workSessions.findMany({
            where: eq(workSessions.organizationId, orgId),
            with: {
                employee: true
            },
            orderBy: [desc(workSessions.startedAt)],
            limit: 10
        });

        res.json(sessions);
    } catch (error) {
        console.error("Fetch recent attendance error:", error);
        res.status(500).json({ error: (error as Error).message });
    }
});

// Main attendance action endpoint
router.post("/log", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const { employeeId, action, area, notes } = req.body;

        if (!employeeId || !action) {
            return res.status(400).json({ error: "employeeId and action are required" });
        }

        // Verify employee belongs to org
        const employee = await storage.getEmployee(employeeId);
        if (!employee || employee.organizationId !== orgId) {
            return res.status(404).json({ error: "Employee not found" });
        }

        const now = new Date();

        // 1. Update Employee Status
        let newStatus = "active";
        switch (action) {
            case "entry": newStatus = "active"; break;
            case "exit": newStatus = "offline"; break;
            case "break_start": newStatus = "break"; break;
            case "break_end": newStatus = "active"; break;
            case "lunch_start": newStatus = "lunch"; break;
            case "lunch_end": newStatus = "active"; break;
            case "restroom_start": newStatus = "restroom"; break;
            case "restroom_end": newStatus = "active"; break;
            case "activity_start": newStatus = "active"; break;
            case "activity_end": newStatus = "active"; break;
        }

        await db.update(employees)
            .set({
                currentStatus: newStatus,
                currentArea: area || employee.currentArea,
                updatedAt: now
            } as any)
            .where(eq(employees.id, employeeId));

        // 2. Manage Work Sessions
        if (action === "entry" || action === "activity_start") {
            // Start new session
            await db.insert(workSessions).values({
                organizationId: orgId,
                employeeId,
                area: area || "General",
                status: "active",
                startedAt: now,
                notes: notes || `Auto-logged via ${action}`
            });
        } else if (action === "exit" || action === "activity_end") {
            // Close open sessions for this employee
            const openSessions = await db.select().from(workSessions).where(
                and(
                    eq(workSessions.employeeId, employeeId),
                    eq(workSessions.status, "active"),
                    isNull(workSessions.endedAt)
                )
            );

            for (const sess of openSessions) {
                const duration = Math.floor((now.getTime() - new Date(sess.startedAt!).getTime()) / 1000);
                await db.update(workSessions)
                    .set({
                        status: "completed",
                        endedAt: now,
                        duration
                    })
                    .where(eq(workSessions.id, sess.id));
            }
        }

        // --- NEW: Emit to Cognitive Engine for Presence Analysis ---
        const { CognitiveEngine } = await import("../lib/cognitive-engine");
        CognitiveEngine.emit({
            orgId,
            type: "employee_action",
            data: {
                employeeId,
                action,
                status: newStatus,
                area: area || "General"
            }
        });

        res.json({ success: true, status: newStatus });
    } catch (error) {
        console.error("Log attendance error:", error);
        res.status(500).json({ error: (error as Error).message });
    }
});

export const attendanceRoutes = router;
