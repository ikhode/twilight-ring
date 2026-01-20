import { aiEngine } from './tensorflow';

export interface AnomalyAlert {
    id: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    moduleId: string;
    status: 'active' | 'investigating' | 'resolved' | 'dismissed';
}

/**
 * Guardian Layer: Sistema de detección de anomalías y seguridad proactiva
 */
export class GuardianLayer {
    private static instance: GuardianLayer;
    private alerts: AnomalyAlert[] = [];

    private constructor() { }

    public static getInstance(): GuardianLayer {
        if (!GuardianLayer.instance) {
            GuardianLayer.instance = new GuardianLayer();
        }
        return GuardianLayer.instance;
    }

    /**
     * Monitorea un conjunto de datos en busca de anomalías
     */
    public async monitorData(moduleId: string, data: number[], title: string): Promise<AnomalyAlert[]> {
        const anomalyIndices = await aiEngine.detectAnomalies(data);

        if (anomalyIndices.length > 0) {
            const newAlert: AnomalyAlert = {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: new Date(),
                severity: this.calculateSeverity(data, anomalyIndices),
                title: `Anomalía detectada en ${title}`,
                description: `Se detectó un comportamiento inusual en los datos de ${moduleId.toLowerCase()}. El sistema recomienda revisión inmediata.`,
                moduleId,
                status: 'active'
            };

            this.alerts.unshift(newAlert);
            return [newAlert];
        }

        return [];
    }

    private calculateSeverity(data: number[], indices: number[]): 'low' | 'medium' | 'high' | 'critical' {
        const count = indices.length;
        if (count > 5) return 'critical';
        if (count > 3) return 'high';
        if (count > 1) return 'medium';
        return 'low';
    }

    public getActiveAlerts(): AnomalyAlert[] {
        return this.alerts.filter(a => a.status === 'active' || a.status === 'investigating');
    }

    public dismissAlert(id: string): void {
        const alert = this.alerts.find(a => a.id === id);
        if (alert) alert.status = 'dismissed';
    }
}

export const guardian = GuardianLayer.getInstance();
