/**
 * Adaptive UI Engine: Aprende de los patrones de uso del usuario para optimizar la interfaz.
 */
export class AdaptiveUIEngine {
    private static instance: AdaptiveUIEngine;
    private usageStats: Record<string, number> = {};

    private constructor() {
        // Cargar stats de localStorage si existen
        const saved = localStorage.getItem('ecm_usage_stats');
        if (saved) {
            try {
                this.usageStats = JSON.parse(saved);
            } catch (e) {
                this.usageStats = {};
            }
        }
    }

    public static getInstance(): AdaptiveUIEngine {
        if (!AdaptiveUIEngine.instance) {
            AdaptiveUIEngine.instance = new AdaptiveUIEngine();
        }
        return AdaptiveUIEngine.instance;
    }

    /**
     * Registra una interacción con un módulo o página
     */
    public trackInteraction(id: string): void {
        this.usageStats[id] = (this.usageStats[id] || 0) + 1;
        this.save();
        console.log(`[AI] Interacción registrada con: ${id}. Total: ${this.usageStats[id]}`);
    }

    /**
     * Obtiene los módulos más utilizados
     */
    public getTopModules(limit: number = 5): string[] {
        return Object.entries(this.usageStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([id]) => id);
    }

    /**
     * Sugiere cambios en la UI basados en el uso
     */
    public getUISuggestions(): string[] {
        const top = this.getTopModules(3);
        if (top.length === 0) return [];

        const suggestions = [];
        if (top.includes('sales')) suggestions.push("Priorizar KPIs de Ventas en el Dashboard");
        if (top.includes('production')) suggestions.push("Fijar monitor de producción al Sidebar");
        if (top.includes('inventory')) suggestions.push("Activar alertas automáticas de stock bajo");

        return suggestions;
    }

    private save(): void {
        localStorage.setItem('ecm_usage_stats', JSON.stringify(this.usageStats));
    }
}

export const adaptiveUI = AdaptiveUIEngine.getInstance();
