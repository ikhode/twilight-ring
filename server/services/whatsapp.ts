import { db } from "../storage";
import { whatsappConversations, whatsappMessages, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { VectorStore } from "./vector-store";

export class WhatsAppService {
    private vectorStore: VectorStore;

    constructor() {
        this.vectorStore = new VectorStore();
    }

    async verifyWebhook(mode: string, token: string, challenge: string): Promise<string | null> {
        const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "nexus_cognitive_token";
        if (mode === "subscribe" && token === verifyToken) {
            return challenge;
        }
        return null;
    }

    async handleWebhook(body: any) {
        if (body.object === "whatsapp_business_account") {
            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    if (change.value.messages) {
                        for (const message of change.value.messages) {
                            await this.processMessage(message, change.value.metadata?.display_phone_number);
                        }
                    }
                }
            }
        }
    }

    private async processMessage(message: any, businessPhone: string) {
        const from = message.from; // User's phone number
        const textBody = message.text?.body;

        if (!textBody) return; // Only handling text for now

        console.log(`[WhatsApp] Received from ${from}: ${textBody}`);

        // 1. Find or Create Conversation
        let conversation = await db.query.whatsappConversations.findFirst({
            where: eq(whatsappConversations.phoneNumber, from),
        });

        if (!conversation) {
            [conversation] = await db.insert(whatsappConversations).values({
                phoneNumber: from,
                status: "active",
                metadata: { businessPhone },
            }).returning();
        }

        // 2. Store User Message
        await db.insert(whatsappMessages).values({
            conversationId: conversation.id,
            role: "user",
            content: textBody,
            rawMetadata: message,
        });

        // 3. Determine Intent (Cognitive Neural I/O)
        const intent = await this.classifyIntent(textBody);
        console.log(`[Neural I/O] Detected intent: ${intent}`);

        // 4. Generate Response
        const responseText = await this.executeAction(intent, textBody);

        // 5. Store Assistant Message
        await db.insert(whatsappMessages).values({
            conversationId: conversation.id,
            role: "assistant",
            content: responseText,
            intent: intent,
        });

        // 6. Send Reply (Mock)
        await this.sendReply(from, responseText);
    }

    private async classifyIntent(text: string): Promise<string> {
        const lower = text.toLowerCase();
        if (lower.includes("inventario") || lower.includes("stock") || lower.includes("productos")) return "check_inventory";
        if (lower.includes("ventas") || lower.includes("ingresos")) return "check_sales";
        if (lower.includes("ayuda") || lower.includes("hola")) return "greeting";
        return "unknown";
    }

    private async executeAction(intent: string, text: string): Promise<string> {
        switch (intent) {
            case "check_inventory":
                // In a real system, this would query the DB
                return "🔍 *Inventario Actual*: \n- Materia Prima: 12.5 ton\n- Producto Terminado: 840 cajas\n- Stock Bajo: Empaques (Critico)";
            case "check_sales":
                return "📈 *Ventas de Hoy*: $45,200 MXN (12 pedidos). Tienes 3 pedidos pendientes de aprobar.";
            case "greeting":
                return "👋 Hola, soy tu *Nexus Cognitive OS*. ¿En qué puedo ayudarte hoy?\n- Consultar inventario\n- Ver ventas\n- Registrar incidencia";
            default:
                return "🧠 Estoy aprendiendo. Aún no entiendo esa solicitud, pero he registrado tu intención para mejorar.";
        }
    }

    private async sendReply(to: string, text: string) {
        // START_MOCK_WHATSAPP
        console.log(`\n=== 📤 WHATSAPP OUTGOING ===\nTo: ${to}\nMessage: ${text}\n============================\n`);
        // END_MOCK_WHATSAPP
        // Here we would call axios.post to Meta Graph API
    }
}

export const whatsAppService = new WhatsAppService();
