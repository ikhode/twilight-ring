import OpenAI from "openai";
import { db } from "../storage";
import { modules } from "../../shared/schema";
import { eq } from "drizzle-orm";

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

export class ModuleRecommender {

    /**
     * Recommend modules based on user description
     */
    async recommendModules(description: string, allModules: any[]): Promise<string[]> {

        // 1. Try LLM if available
        if (openai) {
            try {
                const modulesList = allModules.map(m => ({ id: m.id, name: m.name, description: m.description, tags: m.tags }));

                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: `You are an ERP configuration assistant. Match the user's need to the available modules.
                            
Available Modules:
${JSON.stringify(modulesList, null, 2)}

Return a JSON array of specific module IDs that best solve the user's problem. 
Example response: ["finance", "crm"]
Only return IDs that exist in the list.
Rank by relevance.`
                        },
                        {
                            role: "user",
                            content: `User description: "${description}"`
                        }
                    ],
                    response_format: { type: "json_object" }
                });

                const content = completion.choices[0]?.message?.content;
                if (content) {
                    const parsed = JSON.parse(content);
                    // Handle both direct array or wrapped object
                    const ids = Array.isArray(parsed) ? parsed : (parsed.modules || parsed.ids || []);
                    if (ids.length > 0) return ids;
                }
            } catch (error) {
                console.error("LLM recommendation failed, falling back to keywords:", error);
            }
        }

        // 2. Fallback: Weighted Keyword Matching
        return this.keywordMatching(description, allModules);
    }

    private keywordMatching(query: string, allModules: any[]): string[] {
        // Simple "tensor-like" weighing
        const stopWords = ['de', 'el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'para', 'en', 'con', 'necesito', 'quiero', 'sistema', 'modulo', 'software'];
        const cleanQuery = query.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => !stopWords.includes(w) && w.length > 2);

        // Semantic Map ("Lightweight Embedding")
        const semanticMap: Record<string, string[]> = {
            'dinero': ['finance', 'purchases'],
            'plata': ['finance', 'sales'],
            'pagos': ['finance', 'payroll'],
            'cobrar': ['sales', 'finance'],
            'vender': ['sales', 'pos', 'kiosk'],
            'cliente': ['crm', 'sales'],
            'empleado': ['hr', 'employees', 'payroll'],
            'personal': ['hr', 'employees'],
            'bodega': ['inventory', 'logistics'],
            'almacen': ['inventory'],
            'envio': ['logistics'],
            'camion': ['logistics'],
            'ruta': ['logistics'],
            'maquina': ['production', 'maintenance'],
            'fabrica': ['production'],
            'turno': ['production', 'hr'],
            'calidad': ['qa', 'production'],
            'nomina': ['payroll', 'hr'],
            'sueldo': ['payroll'],
            'asistencia': ['time_tracking', 'hr'],
            'documento': ['documents'],
            'archivo': ['documents'],
            'firma': ['documents'],
            'ticket': ['tickets', 'crm'],
            'soporte': ['tickets'],
            'ayuda': ['tickets']
        };

        const scores = new Map<string, number>();

        allModules.forEach(module => {
            let score = 0;
            const text = `${module.name} ${module.description} ${module.longDescription || ''} ${(module.tags || []).join(' ')}`.toLowerCase();

            cleanQuery.forEach(term => {
                // Direct Match
                if (text.includes(term)) score += 3;

                // Semantic Match
                if (semanticMap[term] && semanticMap[term].includes(module.id)) score += 5;

                // Fuzzy / Partial
                if (module.id.includes(term)) score += 4;
            });

            if (score > 0) {
                scores.set(module.id, score);
            }
        });

        // Debug fallback
        if (scores.size === 0) {
            console.log("[Recommender] No matches found for:", cleanQuery);
        }

        // Sort by score desc
        return Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([id]) => id);
    }
}

export const moduleRecommender = new ModuleRecommender();
