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
        const terms = query.toLowerCase().split(/\s+/);
        const scores = new Map<string, number>();

        allModules.forEach(module => {
            let score = 0;
            const text = `${module.name} ${module.description} ${module.tags.join(' ')}`.toLowerCase();

            terms.forEach(term => {
                if (text.includes(term)) score += 1;
                // Boost exact tag matches
                if (module.tags.some((t: string) => t.toLowerCase() === term)) score += 2;
                // Boost name matches
                if (module.name.toLowerCase().includes(term)) score += 3;
            });

            if (score > 0) {
                scores.set(module.id, score);
            }
        });

        // Sort by score desc
        return Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([id]) => id);
    }
}

export const moduleRecommender = new ModuleRecommender();
