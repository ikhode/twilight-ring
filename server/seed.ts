import { db } from "./storage";
import { modules } from "../shared/schema";
import { MODULE_REGISTRY } from "./data/module-registry";

/**
 * Seed the database with default modules
 */
export async function seedModules() {
    try {
        console.log(`📦 Seeding ${MODULE_REGISTRY.length} modules...`);

        for (const module of MODULE_REGISTRY) {
            await db.insert(modules).values({
                id: module.id,
                name: module.name,
                description: module.description,
                icon: module.icon,
                category: module.category,
                route: module.route,
                // store dependencies as json
                dependencies: module.dependencies
            }).onConflictDoUpdate({
                target: modules.id,
                set: {
                    name: module.name,
                    description: module.description,
                    icon: module.icon,
                    category: module.category,
                    route: module.route,
                    dependencies: module.dependencies
                }
            });
        }
        console.log("✅ Modules seeded successfully");
    } catch (error) {
        console.error("❌ Error seeding modules:", error);
    }
}

/**
 * Industry templates - pre-configured module sets
 * Only includes modules that exist in module-registry.ts
 */
export const industryTemplates = {
    retail: [
        "inventory",
        "sales",
        "crm",
        "finance",
        "employees",
        "piecework",
        "analytics",
    ],
    manufacturing: [
        "production",
        "inventory",
        "logistics",
        "finance",
        "employees",
        "piecework",
        "analytics",
    ],
    services: [
        "crm",
        "sales",
        "finance",
        "employees",
        "analytics",
    ],
    healthcare: [
        "crm",
        "employees",
        "analytics",
    ],
    logistics: [
        "inventory",
        "logistics",
        "finance",
        "employees",
        "analytics",
    ],
    hospitality: [
        "crm",
        "inventory",
        "employees",
        "sales",
        "analytics",
    ],
    construction: [
        "inventory",
        "logistics",
        "finance",
        "employees",
        "piecework",
        "analytics",
    ],
    technology: [
        "sales",
        "crm",
        "finance",
        "employees",
        "analytics",
    ],
    education: [
        "crm",
        "employees",
        "analytics",
    ],
    other: [
        "finance",
        "employees",
        "analytics",
    ],
};
