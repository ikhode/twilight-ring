import { db } from "./storage";
import { processes, processSteps, processInstances, processEvents, rcaReports, organizations } from "../shared/schema";

export async function seedCPE() {
    try {
        // 1. Get or create an organization
        let [org] = await db.select().from(organizations).limit(1);
        if (!org) {
            [org] = await db.insert(organizations).values({
                name: "Nexus Enterprise",
                industry: "retail", // Default changed to generic, will be updated by valid config if exists
            }).returning();
        }

        // Detect Industry to seed correct process
        const industry = org.industry || "manufacturing";
        let processName = "Línea de Producción Genérica";
        let stepsData = [];

        if (industry === 'retail') {
            processName = "Flujo de Reposición de Tienda";
            stepsData = [
                { name: "Recepción de Pedido", type: "task", metrics: { efficiency: 95, waste: 0 } },
                { name: "Validación de Inventario", type: "check", metrics: { efficiency: 88, waste: 2 } },
                { name: "Preparation (Picking)", type: "task", metrics: { efficiency: 75, waste: 8 } }, // High waste here
                { name: "Despacho a Piso", type: "task", metrics: { efficiency: 92, waste: 1 } }
            ];
        } else if (industry === 'logistics') {
            processName = "Optimización de Ruta G-4";
            stepsData = [
                { name: "Carga de Unidad", type: "task", metrics: { efficiency: 90, waste: 2 } },
                { name: "Ruta Troncal", type: "task", metrics: { efficiency: 65, waste: 15 } }, // High waste (fuel/time)
                { name: "Distribución Capilar", type: "task", metrics: { efficiency: 85, waste: 4 } },
                { name: "Entrega Final", type: "milestone", metrics: { efficiency: 98, waste: 0 } }
            ];
        } else {
            // Manufacturing / Default (Textile as per user request context or Electronics)
            processName = "Línea de Confección Textil";
            stepsData = [
                { name: "Corte de Patrones", type: "task", metrics: { efficiency: 92, waste: 2.5 } },
                { name: "Costura", type: "task", metrics: { efficiency: 78, waste: 7.2 } },
                { name: "Planchado", type: "task", metrics: { efficiency: 88, waste: 1.1 } },
                { name: "Empaque Final", type: "task", metrics: { efficiency: 65, waste: 12.4 } }
            ];
        }

        // 2. Create Process Template
        const [process] = await db.insert(processes).values({
            organizationId: org.id,
            name: processName,
            description: `Proceso principal para ${industry}`,
            type: "production",
        }).returning();

        // 3. Create Process Steps
        const steps = await db.insert(processSteps).values(
            stepsData.map((s, i) => ({
                processId: process.id,
                name: s.name,
                type: s.type,
                order: i + 1,
                metrics: s.metrics
            }))
        ).returning();

        // 4. Create an Instance
        const [instance] = await db.insert(processInstances).values({
            processId: process.id,
            status: "active",
            healthScore: 82,
        }).returning();

        // 5. Create Events (Generate dynamic events based on steps)
        for (let i = 0; i < steps.length; i++) {
            // ... logic to add events
            const step = steps[i];
            // Add a completed event for previous steps
            if (i < 2) {
                await db.insert(processEvents).values({
                    instanceId: instance.id,
                    stepId: step.id,
                    eventType: "complete",
                    data: { output: "Batch OK" },
                    timestamp: new Date(Date.now() - 1000 * 60 * 60 * (steps.length - i)),
                });
            }
            // Add an anomaly to the "Waste" step
            if (stepsData[i].metrics.waste > 10) {
                const [anomaly] = await db.insert(processEvents).values({
                    instanceId: instance.id,
                    stepId: step.id,
                    eventType: "anomaly",
                    data: { waste: `${stepsData[i].metrics.waste}%` },
                    timestamp: new Date(),
                }).returning();

                await db.insert(rcaReports).values({
                    instanceId: instance.id,
                    targetEventId: anomaly.id,
                    rootCauseEventId: anomaly.id, // simplified
                    confidence: 89,
                    analysis: `Alta ineficiencia detectada en ${step.name}. Correlación con lote de materia prima anterior.`,
                    recommendation: "Revisar calibración y calidad de entrada.",
                    status: "draft"
                });
            }
        }

        console.log(`✅ CPE seeded for industry: ${industry}`);
        return instance.id;



        console.log("✅ CPE demo data seeded successfully");
        return instance.id;
    } catch (error) {
        console.error("❌ Error seeding CPE:", error);
    }
}
