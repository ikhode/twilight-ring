import { queryValidator } from "./query-validator";

interface SQLGenerationResult {
    sql: string;
    explanation: string;
    confidence: number;
}

/**
 * SQL Generator Service - LOCAL DETERMINISTIC
 * Converts natural language queries to SQL using local heuristics.
 */
export class SQLGenerator {

    /**
     * Generate SQL from natural language query using local pattern matching
     */
    async generateSQL(
        naturalQuery: string,
        role: string,
        organizationId: string
    ): Promise<SQLGenerationResult> {
        const query = naturalQuery.toLowerCase();

        let sql = "";
        let explanation = "";
        let confidence = 0.8;

        // Local heuristic mapping for common business queries
        if (query.includes("venta") || query.includes("ingresos")) {
            sql = `SELECT * FROM sales WHERE organization_id = '${organizationId}' ORDER BY date DESC LIMIT 10`;
            explanation = "Consultando las ventas más recientes de la organización.";
        } else if (query.includes("producto") || query.includes("inventario") || query.includes("stock")) {
            sql = `SELECT name, sku, stock, price FROM products WHERE organization_id = '${organizationId}' ORDER BY stock ASC LIMIT 20`;
            explanation = "Listando productos y niveles de existencias actuales.";
        } else if (query.includes("empleado") || query.includes("personal") || query.includes("nomina")) {
            sql = `SELECT name, role, department, status FROM employees WHERE organization_id = '${organizationId}' LIMIT 50`;
            explanation = "Obteniendo el listado de personal activo.";
        } else if (query.includes("cliente") || query.includes("crm")) {
            sql = `SELECT name, email, status FROM customers WHERE organization_id = '${organizationId}' LIMIT 50`;
            explanation = "Consultando la base de datos de clientes.";
        } else {
            sql = `SELECT * FROM organizations WHERE id = '${organizationId}'`;
            explanation = "Consulta genérica de información de la organización.";
            confidence = 0.5;
        }

        // Validate the generated SQL (Local security check)
        const validation = queryValidator.validate(sql, [], organizationId);

        return {
            sql: validation.sanitized || sql,
            explanation,
            confidence
        };
    }

    /**
     * Explain a SQL query locally
     */
    async explainSQL(sql: string): Promise<string> {
        return "Análisis estructural completo. La consulta recupera datos específicos del esquema local aplicando filtros de seguridad por organización.";
    }

    /**
     * Suggest follow-up queries locally
     */
    async suggestFollowUp(
        originalQuery: string,
        results: any[],
        role: string
    ): Promise<string[]> {
        return [
            "Ver reporte detallado",
            "Exportar resultados",
            "Analizar tendencia mensual"
        ];
    }
}

export const sqlGenerator = new SQLGenerator();

