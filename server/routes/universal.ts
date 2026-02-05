import { Router } from "express";
import { db } from "../storage";
import { eq } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";
import { employees } from "../../shared/modules/hr/schema";
import { products, customers, suppliers } from "../../shared/modules/commerce/schema";
import { pieceworkTickets } from "../../shared/modules/production/schema";
import { processes } from "../../shared/modules/production/schema"; // Actually processes is usually in production or core?
// Check where processes is defined. It was in production/schema.ts in previous checks.

const router = Router();

// Map entity types to Drizzle tables
const TABLE_MAP: Record<string, any> = {
    'employee': employees,
    'product': products,
    'customer': customers,
    'supplier': suppliers,
    'ticket': pieceworkTickets,
    'process': processes
};

// Generic Attribute Updater
router.post("/attributes", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { entityType, entityId, attributes } = req.body;

        if (!entityType || !entityId || !attributes) {
            res.status(400).json({ message: "Missing required fields" });
            return;
        }

        const table = TABLE_MAP[entityType];
        if (!table) {
            res.status(400).json({ message: "Invalid entity type" });
            return;
        }

        // Perform the update
        // We merge attributes? Or replace? 
        // For simple universal editor, replacing the whole object is safer to ensure deletions work.
        // But if we want concurrent edits, we need deep merge. 
        // Let's assume replace for now, as the UI will send the full new state.

        await db.update(table)
            .set({ attributes: attributes })
            .where(eq(table.id, entityId));

        res.json({ success: true, message: "Attributes updated" });
    } catch (error) {
        console.error("Universal Update Error:", error);
        res.status(500).json({ message: "Failed to update attributes" });
    }
});

export default router;
