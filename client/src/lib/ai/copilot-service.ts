import { UserRoleType, IndustryType } from "./dashboard-engine";

export interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: Date;
    isTyping?: boolean;
}

export interface CopilotAction {
    type: 'navigate' | 'toggle' | 'simulate' | 'none';
    payload?: any;
}

export interface CopilotResponse {
    text: string;
    action?: CopilotAction;
}


export interface CopilotContext {
    currentPath: string;
    userRole: UserRoleType;
    industry: IndustryType;
    activeModule?: string;
}

class CopilotService {
    private synthesis: SpeechSynthesis;
    private recognition: any; // SpeechRecognition type is not standard in all TS envs yet

    constructor() {
        this.synthesis = window.speechSynthesis;

        // Initialize Speech Recognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.lang = 'es-ES'; // Default to Spanish as per user preference
            this.recognition.interimResults = false;
        }
    }

    async speak(text: string) {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Try to select a better voice
        const voices = this.synthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.includes('es') && v.name.includes('Google')) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;

        this.synthesis.speak(utterance);
    }

    startListening(onResult: (text: string) => void, onError: (err: any) => void) {
        if (!this.recognition) {
            onError("Speech recognition not supported in this browser.");
            return;
        }

        this.recognition.onresult = (event: any) => {
            const text = event.results[0][0].transcript;
            onResult(text);
        };

        this.recognition.onerror = (event: any) => {
            onError(event.error);
        };

        this.recognition.start();
    }

    stopListening() {
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    async processQuery(query: string, context: CopilotContext): Promise<CopilotResponse> {
        // In a real app, this calls the backend API with context
        // For now, we simulate the "Brain" processing

        // Mock latency
        await new Promise(resolve => setTimeout(resolve, 800));

        const lowerQuery = query.toLowerCase();

        // Intent Navigation
        if (lowerQuery.includes("ir a") || lowerQuery.includes("ve a") || lowerQuery.includes("llévame a")) {
            if (lowerQuery.includes("finanzas") || lowerQuery.includes("dinero") || lowerQuery.includes("pagos")) {
                return {
                    text: "Entendido. Abriendo el módulo de Finanzas...",
                    action: { type: 'navigate', payload: '/finance' }
                };
            }
            if (lowerQuery.includes("inventario") || lowerQuery.includes("productos") || lowerQuery.includes("patio")) {
                return {
                    text: "Cambiando a Inventario y Patios...",
                    action: { type: 'navigate', payload: '/inventory' }
                };
            }
            if (lowerQuery.includes("logística") || lowerQuery.includes("transporte") || lowerQuery.includes("camiones")) {
                return {
                    text: "Abriendo el centro de control logístico...",
                    action: { type: 'navigate', payload: '/logistics' }
                };
            }
            if (lowerQuery.includes("configuración") || lowerQuery.includes("ajustes")) {
                return {
                    text: "Accediendo a la configuración del sistema...",
                    action: { type: 'navigate', payload: '/settings' }
                };
            }
        }

        if (lowerQuery.includes("hola") || lowerQuery.includes("inicio")) {
            return { text: `¡Hola! Soy tu Copiloto Cognitivo. Veo que estás en ${context.currentPath}. ¿En qué puedo ayudarte hoy?` };
        }

        if (lowerQuery.includes("analiza") || lowerQuery.includes("revisa")) {
            if (context.currentPath.includes("dashboard")) {
                if (context.industry === 'retail') {
                    return { text: "Analizando ventas retail... Las tiendas del norte muestran un repunte del 15%. ¿Quieres ver el detalle por sucursal?" };
                }
                return { text: "Analizando el tablero... Detecto que la predicción de ventas es positiva, pero hay una anomalía en logística. ¿Quieres ver detalles?" };
            }
            return { text: `Analizando el contexto de ${context.industry}. Todo parece en orden.` };
        }

        if (lowerQuery.includes("alerta") || lowerQuery.includes("error")) {
            return { text: "No veo alertas críticas activas en este momento, pero el monitor Guardian muestra una desviación leve en el consumo de recursos." };
        }

        // Default fallback to API
        try {
            const res = await fetch("/api/ai/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query })
            });
            const data = await res.json();
            return { text: data.response || "Lo siento, no pude procesar eso." };
        } catch (e) {
            return { text: "Tuve un problema conectando con el Núcleo Cognitivo." };
        }
    }
}

export const copilotService = new CopilotService();
