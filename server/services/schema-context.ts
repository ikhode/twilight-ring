import { db } from "../storage";
import * as schema from "@shared/schema";

/**
 * Schema context builder for natural language queries
 * Provides table and column information to the LLM based on user role
 */

interface TableInfo {
    name: string;
    description: string;
    columns: Array<{
        name: string;
        type: string;
        description?: string;
    }>;
    relations?: Array<{
        column: string;
        references: string;
    }>;
}

// Define accessible tables per role
const ROLE_TABLE_ACCESS: Record<string, string[]> = {
    admin: [
        "organizations", "users", "user_organizations", "modules", "organization_modules",
        "ai_configurations", "usage_patterns", "ai_insights", "processes", "process_steps",
        "process_instances", "process_events", "rca_reports", "suppliers", "customers",
        "products", "expenses", "payments", "vehicles", "fuel_logs", "maintenance_logs",
        "sales", "purchases", "employees", "payroll_advances", "attendance_logs",
        "analytics_metrics", "trust_participants", "shared_insights", "metric_models",
        "piecework_tickets", "terminals", "knowledge_base", "ai_chat_agents",
        "chat_conversations", "chat_messages"
    ],
    manager: [
        "products", "sales", "purchases", "customers", "suppliers", "employees",
        "attendance_logs", "analytics_metrics", "processes", "process_instances",
        "process_events", "vehicles", "fuel_logs", "maintenance_logs", "expenses",
        "payments", "ai_insights"
    ],
    user: [
        "products", "sales", "customers", "suppliers", "employees", "attendance_logs",
        "piecework_tickets", "vehicles", "fuel_logs"
    ],
    viewer: [
        "products", "customers", "suppliers"
    ]
};

// Table descriptions for context
const TABLE_DESCRIPTIONS: Record<string, string> = {
    products: "Productos del inventario con SKU, precio, costo y stock",
    sales: "Registro de ventas realizadas",
    customers: "Clientes del negocio",
    suppliers: "Proveedores",
    employees: "Empleados de la organización",
    attendance_logs: "Registros de asistencia de empleados",
    vehicles: "Vehículos de la flota",
    fuel_logs: "Registros de combustible",
    maintenance_logs: "Registros de mantenimiento de vehículos",
    purchases: "Compras realizadas a proveedores",
    expenses: "Gastos de la organización",
    payments: "Pagos realizados o recibidos",
    piecework_tickets: "Tickets de trabajo a destajo",
    analytics_metrics: "Métricas de analytics del negocio",
    processes: "Definiciones de procesos de negocio",
    process_instances: "Instancias de ejecución de procesos",
    process_events: "Eventos de trazabilidad de procesos",
    ai_insights: "Insights y predicciones de IA",
    chat_conversations: "Conversaciones de chat con IA",
    chat_messages: "Mensajes de chat",
    knowledge_base: "Base de conocimiento y documentación"
};

// Common query examples per role
const QUERY_EXAMPLES: Record<string, string[]> = {
    admin: [
        "Usuarios activos en los últimos 7 días",
        "Total de conversaciones de chat",
        "Documentos más consultados",
        "Procesos con anomalías"
    ],
    manager: [
        "Ventas del mes actual",
        "Top 10 productos más vendidos",
        "Empleados con más horas trabajadas",
        "Gastos por categoría"
    ],
    user: [
        "Productos con stock bajo",
        "Mis ventas de hoy",
        "Clientes activos",
        "Vehículos disponibles"
    ],
    viewer: [
        "Lista de productos",
        "Información de clientes",
        "Catálogo de servicios"
    ]
};

export class SchemaContextBuilder {

    /**
     * Get schema context for a specific role
     */
    getSchemaContext(role: string): string {
        const accessibleTables = ROLE_TABLE_ACCESS[role] || ROLE_TABLE_ACCESS.viewer;

        let context = `# Base de Datos del ERP\n\n`;
        context += `Rol del usuario: ${role}\n\n`;
        context += `## Tablas Disponibles\n\n`;

        for (const tableName of accessibleTables) {
            const description = TABLE_DESCRIPTIONS[tableName] || "Tabla del sistema";
            context += `### ${tableName}\n`;
            context += `${description}\n\n`;

            // Get columns from schema
            const columns = this.getTableColumns(tableName);
            if (columns.length > 0) {
                context += `Columnas:\n`;
                for (const col of columns) {
                    context += `- ${col.name} (${col.type})${col.description ? ': ' + col.description : ''}\n`;
                }
                context += `\n`;
            }
        }

        // Add common query examples
        context += `## Ejemplos de Consultas Comunes\n\n`;
        const examples = QUERY_EXAMPLES[role] || [];
        for (const example of examples) {
            context += `- "${example}"\n`;
        }

        // Add important notes
        context += `\n## Notas Importantes\n\n`;
        context += `- SIEMPRE incluir filtro WHERE organization_id = ? en todas las queries\n`;
        context += `- Solo generar queries SELECT (no INSERT, UPDATE, DELETE)\n`;
        context += `- Limitar resultados con LIMIT (máximo 100)\n`;
        context += `- Usar nombres de columnas exactos como aparecen en el schema\n`;
        context += `- Las fechas están en formato timestamp\n`;
        context += `- Los precios y montos están en centavos (dividir por 100 para mostrar)\n`;

        return context;
    }

    /**
     * Get columns for a specific table
     */
    private getTableColumns(tableName: string): Array<{ name: string; type: string; description?: string }> {
        // Map common columns based on schema
        const columnMaps: Record<string, Array<{ name: string; type: string; description?: string }>> = {
            products: [
                { name: "id", type: "varchar", description: "ID único" },
                { name: "organization_id", type: "varchar", description: "ID de la organización" },
                { name: "name", type: "text", description: "Nombre del producto" },
                { name: "sku", type: "text", description: "Código SKU único" },
                { name: "category", type: "text", description: "Categoría del producto" },
                { name: "price", type: "integer", description: "Precio en centavos" },
                { name: "cost", type: "integer", description: "Costo en centavos" },
                { name: "stock", type: "integer", description: "Cantidad en inventario" },
                { name: "created_at", type: "timestamp", description: "Fecha de creación" }
            ],
            sales: [
                { name: "id", type: "varchar" },
                { name: "organization_id", type: "varchar" },
                { name: "product_id", type: "varchar", description: "Referencia al producto" },
                { name: "quantity", type: "integer", description: "Cantidad vendida" },
                { name: "total_price", type: "integer", description: "Precio total en centavos" },
                { name: "date", type: "timestamp", description: "Fecha de la venta" }
            ],
            customers: [
                { name: "id", type: "varchar" },
                { name: "organization_id", type: "varchar" },
                { name: "name", type: "text", description: "Nombre del cliente" },
                { name: "email", type: "text" },
                { name: "phone", type: "text" },
                { name: "status", type: "text", description: "active, inactive, lead" },
                { name: "balance", type: "integer", description: "Balance en centavos" },
                { name: "created_at", type: "timestamp" }
            ],
            employees: [
                { name: "id", type: "varchar" },
                { name: "organization_id", type: "varchar" },
                { name: "name", type: "text" },
                { name: "email", type: "text" },
                { name: "role", type: "text", description: "Rol del empleado" },
                { name: "department", type: "text" },
                { name: "status", type: "text", description: "active, inactive, on_leave" },
                { name: "salary", type: "integer", description: "Salario en centavos" },
                { name: "join_date", type: "timestamp" }
            ],
            attendance_logs: [
                { name: "id", type: "varchar" },
                { name: "organization_id", type: "varchar" },
                { name: "employee_id", type: "varchar" },
                { name: "type", type: "text", description: "check_in, check_out, break_start, break_end" },
                { name: "timestamp", type: "timestamp" }
            ],
            vehicles: [
                { name: "id", type: "varchar" },
                { name: "organization_id", type: "varchar" },
                { name: "plate", type: "text", description: "Placa del vehículo" },
                { name: "model", type: "text" },
                { name: "status", type: "text", description: "active, maintenance, inactive" },
                { name: "current_mileage", type: "integer", description: "Kilometraje actual" }
            ],
            analytics_metrics: [
                { name: "id", type: "varchar" },
                { name: "organization_id", type: "varchar" },
                { name: "metric_key", type: "text", description: "Clave de la métrica" },
                { name: "value", type: "integer", description: "Valor de la métrica" },
                { name: "date", type: "timestamp" }
            ]
        };

        return columnMaps[tableName] || [
            { name: "id", type: "varchar" },
            { name: "organization_id", type: "varchar" },
            { name: "created_at", type: "timestamp" }
        ];
    }

    /**
     * Get accessible tables for a role
     */
    getAccessibleTables(role: string): string[] {
        return ROLE_TABLE_ACCESS[role] || ROLE_TABLE_ACCESS.viewer;
    }

    /**
     * Check if a table is accessible for a role
     */
    isTableAccessible(tableName: string, role: string): boolean {
        const accessibleTables = this.getAccessibleTables(role);
        return accessibleTables.includes(tableName);
    }
}

export const schemaContextBuilder = new SchemaContextBuilder();
