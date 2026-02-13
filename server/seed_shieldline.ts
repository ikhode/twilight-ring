import { db } from "./storage";
import {
    shieldlineLines,
    shieldlineExtensions,
    shieldlineFirewallRules,
    shieldlineCalls,
    organizations
} from "../shared/schema";
import { eq } from "drizzle-orm";

export async function seedShieldLine() {
    try {
        const org = await db.query.organizations.findFirst();
        if (!org) return;

        const orgId = org.id;

        // Seed Lines
        const [line] = await db.insert(shieldlineLines).values({
            organization_id: orgId,
            phoneNumber: "+52 55 1234 5678",
            type: "mexico_did",
            status: "active"
        }).onConflictDoNothing().returning();

        if (line) {
            // Seed Extensions
            await db.insert(shieldlineExtensions).values([
                {
                    organization_id: orgId,
                    lineId: line.id,
                    extensionNumber: "1001",
                    displayName: "Recepción Principal",
                    deviceType: "webrtc",
                    status: "online"
                },
                {
                    organization_id: orgId,
                    lineId: line.id,
                    extensionNumber: "1002",
                    displayName: "Ventas México",
                    deviceType: "webrtc",
                    status: "offline"
                }
            ]).onConflictDoNothing();

            // Seed Firewall Rules
            await db.insert(shieldlineFirewallRules).values([
                {
                    organization_id: orgId,
                    name: "Bloqueo Extorsión Conocida",
                    type: "blacklist",
                    pattern: "+52 33 9999*",
                    action: "block",
                    priority: 100
                },
                {
                    organization_id: orgId,
                    name: "VIP Whitelist",
                    type: "whitelist",
                    pattern: "+1*",
                    action: "allow",
                    priority: 200
                }
            ]).onConflictDoNothing();

            // Seed some calls
            await db.insert(shieldlineCalls).values([
                {
                    organization_id: orgId,
                    lineId: line.id,
                    fromNumber: "+52 81 2233 4455",
                    toNumber: "1001",
                    direction: "inbound",
                    status: "completed",
                    duration: 145,
                    startedAt: new Date(Date.now() - 3600000)
                },
                {
                    organization_id: orgId,
                    lineId: line.id,
                    fromNumber: "+52 33 9999 1234",
                    toNumber: "1001",
                    direction: "inbound",
                    status: "blocked",
                    duration: 0,
                    startedAt: new Date(Date.now() - 1800000)
                }
            ]).onConflictDoNothing();
        }

        console.log("✅ ShieldLine data seeded successfully");
    } catch (error) {
        console.error("❌ Error seeding ShieldLine:", error);
    }
}
