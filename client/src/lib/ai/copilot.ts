export interface CopilotMessage {
    id: string;
    role: 'assistant' | 'user';
    content: string;
    timestamp: Date;
    suggestions?: string[];
    data?: any;
}

/**
 * Decision Copilot: Asistente de IA para toma de decisiones
 */
export class DecisionCopilot {
    private static instance: DecisionCopilot;
    private history: CopilotMessage[] = [];

    private constructor() { }

    public static getInstance(): DecisionCopilot {
        if (!DecisionCopilot.instance) {
            DecisionCopilot.instance = new DecisionCopilot();
        }
        return DecisionCopilot.instance;
    }

    /**
     * Procesa una consulta del usuario
     */
    public async ask(query: string, context?: any): Promise<CopilotMessage> {
        // Simulación de respuesta de IA basada en contexto
        // En producción esto llamaría a un LLM
        const responseContent = await this.generateResponse(query, context);

        const userMsg: CopilotMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: query,
            timestamp: new Date()
        };

        const assistantMsg: CopilotMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: responseContent,
            timestamp: new Date(),
            suggestions: this.getSuggestions(query)
        };

        this.history.push(userMsg, assistantMsg);
        return assistantMsg;
    }

    private async generateResponse(query: string, context?: any): Promise<string> {
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.includes('venta') || lowerQuery.includes('pronóstico')) {
            return "Basado en los patrones de los últimos 30 días, prevemos un incremento del 12% en las ventas durante la próxima semana. Te sugiero revisar los niveles de stock en el módulo de Inventario.";
        }

        if (lowerQuery.includes('stock') || lowerQuery.includes('inventario')) {
            return "He detectado que el producto 'Materia Prima A' llegará a su nivel crítico en 48 horas si mantiene el ritmo actual de producción. ¿Quieres que genere una orden de compra sugerida?";
        }

        if (lowerQuery.includes('hola') || lowerQuery.includes('quién eres')) {
            return "Hola, soy tu Decision Copilot. Puedo ayudarte a analizar datos de producción, predecir ventas, detectar anomalías financieras y optimizar tu logística. ¿En qué puedo apoyarte hoy?";
        }

        return "Entiendo tu consulta. He analizado los datos actuales del sistema y no detecto anomalías críticas relacionadas con ese tema. ¿Deseas que profundice en algún módulo específico?";
    }

    private getSuggestions(query: string): string[] {
        const lowerQuery = query.toLowerCase();
        if (lowerQuery.includes('venta')) return ["Ver reporte detallado", "Analizar proyecciones", "Contactar equipo ventas"];
        if (lowerQuery.includes('stock')) return ["Crear orden de compra", "Ver proveedores", "Ajustar stock"];
        return ["Analizar ventas", "Estado de producción", "Alertas de seguridad"];
    }

    public getHistory(): CopilotMessage[] {
        return this.history;
    }
}

export const copilot = DecisionCopilot.getInstance();
