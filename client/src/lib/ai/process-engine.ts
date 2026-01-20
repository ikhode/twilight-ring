
/**
 * @file process-engine.ts
 * Núcleo de inteligencia del Cognitive Process Engine (CPE).
 * Maneja la correlación de eventos, detección de mermas y análisis de causa raíz.
 */

export interface ProcessEvent {
    id: string;
    instanceId: string;
    stepId: string;
    eventType: 'start' | 'complete' | 'anomaly' | 'check';
    data: any;
    timestamp: Date;
}

export interface RCAInsight {
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    rootCauseStepId?: string;
    recommendation: string;
}

export class ProcessEngine {
    /**
     * Correlaciona eventos para encontrar la causa raíz de un incidente.
     * Si el paso 3 falla pero el paso 1 tuvo una desviación de temperatura,
     * el motor identifica el paso 1 como la causa probable.
     */
    static async analyzeRootCause(events: ProcessEvent[]): Promise<RCAInsight | null> {
        const anomalies = events.filter(e => e.eventType === 'anomaly' || (e.data && e.data.status === 'error'));

        if (anomalies.length === 0) return null;

        // Simulación de heurística de correlación
        // En un sistema real, esto usaría el historial o modelos entrenados
        const latestAnomaly = anomalies[anomalies.length - 1];
        const previousEvents = events.filter(e => e.timestamp < latestAnomaly.timestamp);

        // Buscar desviaciones previas que podrían haber causado el fallo actual
        const suspiciousEvent = previousEvents.find(e =>
            e.data && (e.data.deviation > 0.1 || e.data.warning === true)
        );

        if (suspiciousEvent) {
            return {
                title: "Detección de Interdependencia Crítica",
                description: `El incidente en "${latestAnomaly.stepId}" fue probablemente originado por una irregularidad previa en "${suspiciousEvent.stepId}".`,
                severity: 'high',
                rootCauseStepId: suspiciousEvent.stepId,
                recommendation: "Revisar calibración en el paso inicial para prevenir fallos en cadena."
            };
        }

        return {
            title: "Anomalía Aislada Detectada",
            description: `Se detectó un fallo en "${latestAnomaly.stepId}" sin correlación previa evidente.`,
            severity: 'medium',
            recommendation: "Monitorear este paso en el siguiente ciclo para descartar fallo mecánico único."
        };
    }

    /**
     * Calcula la merma (waste) acumulada en un proceso basándose en los datos de eventos.
     */
    static calculateWaste(events: ProcessEvent[]): { totalWaste: number; efficiency: number } {
        let totalWaste = 0;
        let successfulOutputs = 0;
        let totalInputs = 0;

        events.forEach(e => {
            if (e.data && e.data.merma) totalWaste += e.data.merma;
            if (e.data && e.data.output) successfulOutputs += e.data.output;
            if (e.data && e.data.input) totalInputs += e.data.input;
        });

        const efficiency = totalInputs > 0 ? (successfulOutputs / totalInputs) * 100 : 100;

        return {
            totalWaste,
            efficiency: Math.round(efficiency * 100) / 100
        };
    }

    /**
     * Genera sugerencias proactivas de optimización.
     */
    static getOptimizationSuggestions(efficiency: number, trend: 'up' | 'down'): string[] {
        const suggestions: string[] = [];

        if (efficiency < 85) {
            suggestions.push("Re-estructurar flujo de trabajo para reducir cuellos de botella.");
            suggestions.push("Implementar sensores de precisión en pasos críticos.");
        }

        if (trend === 'down') {
            suggestions.push("Alerta: La eficiencia del proceso está decayendo. Programar mantenimiento preventivo.");
        }

        return suggestions;
    }
}
