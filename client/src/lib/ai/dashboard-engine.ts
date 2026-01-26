
export type UserRoleType = 'admin' | 'production' | 'logistics' | 'sales';
export type IndustryType = "manufacturing" | "retail" | "logistics" | "services" | "generic" | string;


export interface WidgetConfig {
    id: string;
    type: 'chart' | 'stat' | 'alert' | 'action' | 'table';
    title: string;
    width: 'small' | 'medium' | 'large' | 'full';
    priority: number;
    moduleId?: string; // Link to ERP_MODULES
}

export interface DashboardConfig {
    role: UserRoleType;
    layout: WidgetConfig[];
    featuredKPIs: string[];
}

class DashboardEngine {
    private configs: Record<UserRoleType, DashboardConfig> = {
        admin: {
            role: 'admin',
            featuredKPIs: ['revenue', 'active_users', 'system_health', 'critical_alerts'],
            layout: [
                { id: 'revenue_forecast', type: 'chart', title: 'Proyección de Ingresos', width: 'large', priority: 1, moduleId: 'finance' },
                { id: 'guardian_alerts', type: 'alert', title: 'Seguridad Guardian', width: 'medium', priority: 2 }, // Core (no specific module)
                { id: 'module_stats', type: 'stat', title: 'Uso de Módulos', width: 'small', priority: 3, moduleId: 'analytics' },
                { id: 'user_activity', type: 'chart', title: 'Actividad de Usuarios', width: 'medium', priority: 4, moduleId: 'employees' }
            ]
        },
        production: {
            role: 'production',
            featuredKPIs: ['production_efficiency', 'active_lots', 'equipment_status', 'waste_levels'],
            layout: [
                { id: 'production_line', type: 'chart', title: 'Línea de Producción', width: 'full', priority: 1, moduleId: 'production' },
                { id: 'waste_anomaly', type: 'alert', title: 'Alertas de Merma', width: 'medium', priority: 2, moduleId: 'production' },
                { id: 'lot_tracking', type: 'table', title: 'Seguimiento de Lotes', width: 'large', priority: 3, moduleId: 'inventory' },
                { id: 'maintenance_needs', type: 'action', title: 'Mantenimiento Sugerido', width: 'small', priority: 4, moduleId: 'tickets' }
            ]
        },
        logistics: {
            role: 'logistics',
            featuredKPIs: ['fleet_utilization', 'pending_deliveries', 'fuel_efficiency', 'route_optimization'],
            layout: [
                { id: 'delivery_forecast', type: 'chart', title: 'Entregas Programadas', width: 'large', priority: 1, moduleId: 'logistics' },
                { id: 'fleet_status', type: 'stat', title: 'Estado de Flota', width: 'medium', priority: 2, moduleId: 'logistics' },
                { id: 'route_alerts', type: 'alert', title: 'Alertas de Ruta', width: 'medium', priority: 3, moduleId: 'logistics' },
                { id: 'inventory_snapshot', type: 'table', title: 'Stock en Tránsito', width: 'full', priority: 4, moduleId: 'inventory' }
            ]
        },
        sales: {
            role: 'sales',
            featuredKPIs: ['total_sales', 'conversion_rate', 'customer_retention', 'average_ticket'],
            layout: [
                { id: 'sales_funnel', type: 'chart', title: 'Embudo de Ventas', width: 'large', priority: 1, moduleId: 'sales' },
                { id: 'top_customers', type: 'table', title: 'Clientes VIP', width: 'medium', priority: 2, moduleId: 'crm' },
                { id: 'sales_opportunities', type: 'action', title: 'Oportunidades IA', width: 'medium', priority: 3, moduleId: 'sales' },
                { id: 'market_trends', type: 'chart', title: 'Tendencias del Mercado', width: 'small', priority: 4, moduleId: 'analytics' }
            ]
        }
    };



    getDashboardConfig(role: UserRoleType, industry: IndustryType = 'generic'): DashboardConfig {

        const baseConfig = this.configs[role] || this.configs.admin;

        // Custom overrides based on Industry
        let customizedLayout = [...baseConfig.layout];
        let customizedKPIs = [...baseConfig.featuredKPIs];

        if (industry === 'retail') {
            // Retail cares more about daily sales and top products
            if (role === 'admin') {
                customizedLayout = [
                    { id: 'revenue_forecast', type: 'chart', title: 'Ventas por Tienda', width: 'large', priority: 1 },
                    { id: 'top_products', type: 'table', title: 'Productos Top', width: 'medium', priority: 2 },
                    ...customizedLayout.filter(w => w.id !== 'revenue_forecast')
                ] as WidgetConfig[];
                customizedLayout = customizedLayout.slice(0, 4);
            }
        } else if (industry === 'manufacturing') {
            // Manufacturing context is default for this app actually, but let's reinforce
            if (role === 'production') {
                // No change, default is good
            }
        }

        return {
            ...baseConfig,
            layout: customizedLayout,
            featuredKPIs: customizedKPIs
        };
    }

    // Sugiere un reordenamiento si detecta que el usuario ignora ciertos widgets
    suggestWidgetRearrangement(usagePattern: any): string | null {
        // Lógica simplificada: si un widget tiene muy pocos clicks pero alta prioridad
        return "Notamos que usas más los reportes de inventario. ¿Quieres moverlo al inicio?";
    }
}

export const dashboardEngine = new DashboardEngine();
