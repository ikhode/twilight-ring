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
        "operations",
        "cpe",
        "admin",
        "finance",
        "employees",
        "inventory",
        "sales",
        "crm",
        "analytics"
    ],
    manufacturing: [
        "operations",
        "cpe",
        "admin",
        "finance",
        "employees",
        "production",
        "inventory",
        "logistics",
        "analytics"
    ],
    services: [
        "operations",
        "cpe",
        "admin",
        "finance",
        "employees",
        "crm",
        "sales",
        "inventory",
        "analytics"
    ],
    healthcare: [
        "operations",
        "cpe",
        "admin",
        "finance",
        "employees",
        "crm",
        "inventory",
        "analytics"
    ],
    logistics: [
        "operations",
        "cpe",
        "admin",
        "finance",
        "employees",
        "inventory",
        "logistics",
        "analytics"
    ],
    hospitality: [
        "operations",
        "cpe",
        "admin",
        "finance",
        "employees",
        "crm",
        "inventory",
        "sales",
        "analytics"
    ],
    restaurant: [
        "operations",
        "cpe",
        "admin",
        "finance",
        "employees",
        "crm",
        "inventory",
        "sales",
        "analytics"
    ],
    construction: [
        "operations",
        "cpe",
        "admin",
        "finance",
        "employees",
        "inventory",
        "logistics",
        "piecework",
        "analytics"
    ],
    technology: [
        "operations",
        "cpe",
        "admin",
        "finance",
        "employees",
        "sales",
        "crm",
        "inventory",
        "analytics"
    ],
    education: [
        "operations",
        "cpe",
        "admin",
        "finance",
        "employees",
        "crm",
        "analytics"
    ],
    peladero: [
        "operations",
        "cpe",
        "admin",
        "finance",
        "employees",
        "production",
        "inventory",
        "sales",
        "piecework",
        "analytics"
    ],
    other: [
        "operations",
        "cpe",
        "admin",
        "finance",
        "employees",
        "analytics"
    ]
};
