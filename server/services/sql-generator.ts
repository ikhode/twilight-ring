import OpenAI from "openai";
import { schemaContextBuilder } from "./schema-context";
import { queryValidator } from "./query-validator";

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

interface SQLGenerationResult {
    sql: string;
    explanation: string;
    confidence: number;
}

/**
 * SQL Generator Service
 * Converts natural language queries to SQL using OpenAI
 */
export class SQLGenerator {

    /**
     * Generate SQL from natural language query
     */
    async generateSQL(
        naturalQuery: string,
        role: string,
        organizationId: string
    ): Promise<SQLGenerationResult> {

        if (!openai) {
            throw new Error("OpenAI API key not configured");
        }

        // Get schema context for the user's role
        const schemaContext = schemaContextBuilder.getSchemaContext(role);
        const accessibleTables = schemaContextBuilder.getAccessibleTables(role);

        // Build the prompt
        const systemPrompt = `Eres un experto en SQL para PostgreSQL. Tu trabajo es convertir preguntas en lenguaje natural a queries SQL válidas.

${schemaContext}

REGLAS CRÍTICAS:
1. SIEMPRE incluir WHERE organization_id = '${organizationId}' en TODAS las queries
2. Solo generar queries SELECT (nunca INSERT, UPDATE, DELETE, DROP, etc.)
3. Incluir LIMIT al final (máximo 100)
4. Usar nombres exactos de tablas y columnas del schema
5. Para precios y montos, recordar que están en centavos (dividir por 100 si es necesario)
6. Para fechas, usar funciones de PostgreSQL (date_trunc, now(), etc.)
7. Si la pregunta no es clara, generar la query más simple y segura posible

FORMATO DE RESPUESTA:
Responde SOLO con un objeto JSON válido con esta estructura:
{
  "sql": "SELECT ... FROM ... WHERE organization_id = '${organizationId}' LIMIT 100",
  "explanation": "Explicación breve de qué hace la query",
  "confidence": 0.95
}

El campo confidence debe ser un número entre 0 y 1 indicando qué tan seguro estás de que la query es correcta.`;

        const userPrompt = `Pregunta del usuario: "${naturalQuery}"

Genera la query SQL correspondiente.`;

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.3, // Lower temperature for more consistent SQL generation
                response_format: { type: "json_object" }
            });

            const response = completion.choices[0]?.message?.content;
            if (!response) {
                throw new Error("No response from OpenAI");
            }

            const result = JSON.parse(response) as SQLGenerationResult;

            // Validate the generated SQL
            const validation = queryValidator.validate(
                result.sql,
                accessibleTables,
                organizationId
            );

            if (!validation.valid) {
                throw new Error(`Query validation failed: ${validation.error}`);
            }

            return {
                sql: validation.sanitized || result.sql,
                explanation: result.explanation,
                confidence: result.confidence
            };

        } catch (error: any) {
            console.error("SQL generation error:", error);

            // Fallback: try to generate a simple safe query
            if (error.message?.includes("validation failed")) {
                throw error; // Re-throw validation errors
            }

            throw new Error(`No se pudo generar la query SQL: ${error.message}`);
        }
    }

    /**
     * Explain a SQL query in natural language
     */
    async explainSQL(sql: string): Promise<string> {
        if (!openai) {
            return "Explicación no disponible (OpenAI no configurado)";
        }

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Eres un experto en SQL. Explica queries SQL en español de forma clara y concisa para usuarios no técnicos."
                    },
                    {
                        role: "user",
                        content: `Explica qué hace esta query SQL:\n\n${sql}`
                    }
                ],
                temperature: 0.5,
                max_tokens: 200
            });

            return completion.choices[0]?.message?.content || "No se pudo generar explicación";
        } catch (error) {
            console.error("SQL explanation error:", error);
            return "Error al generar explicación";
        }
    }

    /**
     * Suggest follow-up queries based on results
     */
    async suggestFollowUp(
        originalQuery: string,
        results: any[],
        role: string
    ): Promise<string[]> {
        if (!openai || results.length === 0) {
            return [];
        }

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Eres un asistente de análisis de datos. Sugiere 3 preguntas de seguimiento relevantes basadas en los resultados de una query."
                    },
                    {
                        role: "user",
                        content: `Query original: "${originalQuery}"\nNúmero de resultados: ${results.length}\n\nSugiere 3 preguntas de seguimiento útiles.`
                    }
                ],
                temperature: 0.7,
                max_tokens: 150
            });

            const suggestions = completion.choices[0]?.message?.content || "";
            return suggestions
                .split('\n')
                .filter(line => line.trim().length > 0)
                .slice(0, 3);
        } catch (error) {
            console.error("Follow-up suggestion error:", error);
            return [];
        }
    }
}

export const sqlGenerator = new SQLGenerator();
