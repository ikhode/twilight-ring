/**
 * Module Registry
 * Complete catalog of all available modules in the ERP system
 */

export interface ModuleMetadata {
    id: string;
    name: string;
    description: string;
    longDescription: string;
    icon: string; // Lucide icon name
    category: ModuleCategory;
    route: string;
    features: string[];
    screenshots?: string[];
    pricing: "included" | "premium";
    dependencies: string[]; // Module IDs that must be active first
    requiredRole: "viewer" | "user" | "manager" | "admin";
    tags: string[];
}

export type ModuleCategory =
    | "operations"
    | "sales"
    | "finance"
    | "hr"
    | "analytics"
    | "ai"
    | "communication";

export const MODULE_CATEGORIES: Record<ModuleCategory, { name: string; description: string }> = {
    operations: {
        name: "Operaciones",
        description: "Gestión de inventario, producción y logística"
    },
    sales: {
        name: "Ventas & CRM",
        description: "Ventas, clientes y relaciones comerciales"
    },
    finance: {
        name: "Finanzas",
        description: "Contabilidad, compras y pagos"
    },
    hr: {
        name: "Recursos Humanos",
        description: "Empleados, asistencia y nómina"
    },
    analytics: {
        name: "Analytics",
        description: "Reportes, métricas y análisis de datos"
    },
    ai: {
        name: "IA & Automatización",
        description: "Inteligencia artificial y procesos cognitivos"
    },
    communication: {
        name: "Comunicación",
        description: "Colaboración y mensajería"
    }
};

export const MODULE_REGISTRY: ModuleMetadata[] = [
    // OPERATIONS
    {
        id: "operations",
        name: "Operaciones",
        description: "Gestión Operativa Central",
        longDescription: "Núcleo de operaciones de la empresa. Habilita dashboard operativo, gestión básica de proveedores y configuración de sedes.",
        icon: "Briefcase",
        category: "operations",
        route: "/operations",
        features: [
            "Dashboard de operaciones",
            "Gestión de proveedores (Base)",
            "Configuración de sedes",
            "Reportes operativos generales"
        ],
        pricing: "included",
        dependencies: [],
        requiredRole: "user",
        tags: ["operaciones", "core", "administración"]
    },
    {
        id: "logistics",
        name: "Logística",
        description: "Control de flota y rutas",
        longDescription: "Gestión completa de vehículos, mantenimiento, combustible y optimización de rutas de entrega.",
        icon: "Truck",
        category: "operations",
        route: "/logistics",
        features: [
            "Gestión de flota vehicular",
            "Control de combustible",
            "Programación de mantenimiento",
            "Optimización de rutas",
            "Tracking de entregas"
        ],
        pricing: "included",
        dependencies: ["operations"],
        requiredRole: "user",
        tags: ["logística", "flota", "rutas"]
    },
    {
        id: "inventory",
        name: "Inventario",
        description: "Gestión completa de productos y stock",
        longDescription: "Control total de inventario con alertas de stock bajo, gestión de SKUs, categorías de productos y trazabilidad completa de movimientos.",
        icon: "Package",
        category: "operations",
        route: "/inventory",
        features: [
            "Control de stock en tiempo real",
            "Alertas de stock bajo automáticas",
            "Gestión de SKUs únicos",
            "Categorización de productos",
            "Historial de movimientos"
        ],
        pricing: "included",
        dependencies: ["operations"],
        requiredRole: "user",
        tags: ["inventario", "stock", "productos"]
    },
    {
        id: "production",
        name: "Producción",
        description: "Gestión de procesos productivos",
        longDescription: "Planificación y control de producción con trazabilidad de procesos, gestión de merma y optimización de recursos.",
        icon: "Factory",
        category: "operations",
        route: "/production",
        features: [
            "Planificación de producción",
            "Control de merma",
            "Trazabilidad de procesos",
            "Gestión de recursos",
            "Reportes de eficiencia"
        ],
        pricing: "included",
        dependencies: ["inventory", "operations"],
        requiredRole: "user",
        tags: ["producción", "manufactura", "procesos"]
    },


    // SALES & CRM
    {
        id: "sales",
        name: "Ventas",
        description: "Registro y análisis de ventas",
        longDescription: "Sistema completo de ventas con facturación, historial de transacciones y análisis de tendencias.",
        icon: "TrendingUp",
        category: "sales",
        route: "/sales",
        features: [
            "Registro rápido de ventas",
            "Facturación automática",
            "Historial de transacciones",
            "Análisis de tendencias",
            "Integración con inventario"
        ],
        pricing: "included",
        dependencies: ["operations", "finance"],
        requiredRole: "user",
        tags: ["ventas", "facturación", "ingresos"]
    },
    {
        id: "crm",
        name: "CRM",
        description: "Gestión de relaciones con clientes",
        longDescription: "CRM completo para gestionar clientes, leads, oportunidades y seguimiento de interacciones.",
        icon: "Users",
        category: "sales",
        route: "/crm",
        features: [
            "Base de datos de clientes",
            "Gestión de leads",
            "Seguimiento de oportunidades",
            "Historial de interacciones",
            "Segmentación de clientes"
        ],
        pricing: "included",
        dependencies: ["operations"],
        requiredRole: "user",
        tags: ["crm", "clientes", "leads"]
    },

    // FINANCE
    {
        id: "finance",
        name: "Finanzas",
        description: "Contabilidad y finanzas",
        longDescription: "Gestión financiera completa con control de gastos, ingresos, cuentas por cobrar y pagar.",
        icon: "DollarSign",
        category: "finance",
        route: "/finance",
        features: [
            "Control de gastos e ingresos",
            "Cuentas por cobrar/pagar",
            "Conciliación bancaria",
            "Reportes financieros",
            "Presupuestos"
        ],
        pricing: "included",
        dependencies: ["operations"],
        requiredRole: "manager",
        tags: ["finanzas", "dinero", "contabilidad"]
    },
    {
        id: "purchases",
        name: "Compras",
        description: "Gestión de compras y proveedores",
        longDescription: "Control de compras, órdenes de compra, gestión de proveedores y seguimiento de entregas.",
        icon: "ShoppingCart",
        category: "finance",
        route: "/purchases",
        features: [
            "Órdenes de compra",
            "Gestión de proveedores",
            "Seguimiento de entregas",
            "Control de costos",
            "Historial de compras"
        ],
        pricing: "included",
        dependencies: ["operations", "finance"],
        requiredRole: "user",
        tags: ["compras", "proveedores", "órdenes"]
    },

    // HR
    {
        id: "employees",
        name: "Empleados",
        description: "Gestión de recursos humanos",
        longDescription: "Administración completa de empleados con perfiles, documentos, evaluaciones y historial laboral.",
        icon: "UserCheck",
        category: "hr",
        route: "/employees",
        features: [
            "Perfiles de empleados",
            "Gestión de documentos",
            "Evaluaciones de desempeño",
            "Historial laboral",
            "Organigrama"
        ],
        pricing: "included",
        dependencies: [],
        requiredRole: "manager",
        tags: ["empleados", "rrhh", "personal"]
    },
    {
        id: "piecework",
        name: "Trabajo a Destajo",
        description: "Gestión de trabajo por pieza",
        longDescription: "Sistema de tickets para trabajo a destajo con cálculo automático de pagos por productividad.",
        icon: "Ticket",
        category: "hr",
        route: "/piecework",
        features: [
            "Tickets de trabajo",
            "Cálculo automático de pago",
            "Reportes de productividad",
            "Gestión de tarifas",
            "Historial de tickets"
        ],
        pricing: "included",
        dependencies: ["employees"],
        requiredRole: "user",
        tags: ["destajo", "productividad", "tickets"]
    },

    // ANALYTICS
    {
        id: "analytics",
        name: "Analytics",
        description: "Análisis y reportes avanzados",
        longDescription: "Dashboards interactivos, métricas clave y análisis predictivo para toma de decisiones basada en datos.",
        icon: "BarChart3",
        category: "analytics",
        route: "/analytics",
        features: [
            "Dashboards interactivos",
            "Métricas clave (KPIs)",
            "Análisis predictivo",
            "Reportes personalizables",
            "Exportación de datos"
        ],
        pricing: "included",
        dependencies: ["operations", "finance"],
        requiredRole: "manager",
        tags: ["analytics", "reportes", "métricas"]
    },

    // AI & AUTOMATION
    {
        id: "guardian",
        name: "Guardian AI",
        description: "Detección de anomalías con IA",
        longDescription: "Sistema de IA que monitorea constantemente tus operaciones y detecta desviaciones anormales en tiempo real.",
        icon: "Shield",
        category: "ai",
        route: "/settings",
        features: [
            "Detección de anomalías en tiempo real",
            "Alertas automáticas",
            "Análisis de patrones",
            "Sensibilidad ajustable",
            "Historial de anomalías"
        ],
        pricing: "premium",
        dependencies: ["cpe", "operations", "finance"],
        requiredRole: "manager",
        tags: ["ia", "anomalías", "seguridad"]
    },
    {
        id: "copilot",
        name: "Decision Copilot",
        description: "Asistente de decisiones con IA",
        longDescription: "Copiloto inteligente que te ayuda a tomar decisiones basadas en datos y predicciones de IA.",
        icon: "Brain",
        category: "ai",
        route: "/settings",
        features: [
            "Sugerencias inteligentes",
            "Análisis de escenarios",
            "Predicciones de negocio",
            "Insights contextuales",
            "Recomendaciones personalizadas"
        ],
        pricing: "premium",
        dependencies: ["cpe", "analytics"],
        requiredRole: "manager",
        tags: ["ia", "decisiones", "predicciones"]
    },
    {
        id: "cpe",
        name: "CPE - Process Engine",
        description: "Motor de procesos cognitivos",
        longDescription: "Corazón cognitivo del ERP. Ejecuta flujos de decisión, orquesta modelos TFJS y gestiona el aprendizaje continuo del sistema.",
        icon: "BrainCircuit",
        category: "ai",
        route: "/settings",
        features: [
            "Orquestación de modelos TFJS",
            "Aprendizaje de patrones",
            "Trazabilidad cognitiva",
            "Detección de cuellos de botella",
            "Optimización automática"
        ],
        pricing: "included", // Core logic requires this
        dependencies: ["operations", "finance"],
        requiredRole: "admin",
        tags: ["core", "ia", "motor", "tfjs"]
    },
    {
        id: "ai-chat",
        name: "Chat AI",
        description: "Asistente de documentación con IA",
        longDescription: "Chat inteligente con agentes especializados por rol para resolver dudas sobre el ERP.",
        icon: "MessageSquare",
        category: "ai",
        route: "/settings",
        features: [
            "Agentes por rol",
            "Respuestas contextuales",
            "Búsqueda semántica",
            "Historial de conversaciones",
            "Fuentes citadas"
        ],
        pricing: "premium",
        dependencies: ["admin", "cpe"],
        requiredRole: "user",
        tags: ["chat", "ia", "documentación"]
    },
    {
        id: "nl-query",
        name: "Consultas en Lenguaje Natural",
        description: "Consulta datos en español",
        longDescription: "Haz preguntas sobre tus datos en español y obtén resultados en tiempo real sin necesidad de SQL.",
        icon: "Database",
        category: "ai",
        route: "/query",
        features: [
            "Queries en español",
            "Generación automática de SQL",
            "Resultados en tiempo real",
            "Exportar a CSV",
            "Sugerencias inteligentes"
        ],
        pricing: "premium",
        dependencies: ["analytics", "cpe"],
        requiredRole: "user",
        tags: ["queries", "sql", "datos"]
    },

    // COMMUNICATION
    {
        id: "whatsapp",
        name: "WhatsApp Business",
        description: "Integración con WhatsApp",
        longDescription: "Conecta tu negocio con WhatsApp para comunicación directa con clientes y automatización de mensajes.",
        icon: "MessageCircle",
        category: "communication",
        route: "/settings",
        features: [
            "Mensajería con clientes",
            "Automatización de respuestas",
            "Plantillas de mensajes",
            "Historial de conversaciones",
            "Notificaciones automáticas"
        ],
        pricing: "premium",
        dependencies: ["crm"],
        requiredRole: "user",
        tags: ["whatsapp", "mensajería", "clientes"]
    },
    {
        id: "trust",
        name: "Trust Network",
        description: "Red de confianza empresarial",
        longDescription: "Colaboración y compartición de insights con otras empresas de confianza.",
        icon: "Network",
        category: "communication",
        route: "/trust",
        features: [
            "Red de empresas",
            "Compartir insights",
            "Colaboración segura",
            "Métricas compartidas",
            "Benchmarking"
        ],
        pricing: "premium",
        dependencies: [],
        requiredRole: "admin",
        tags: ["colaboración", "red", "confianza"]
    },
    {
        id: "documents",
        name: "Documentos",
        description: "Gestión documental",
        longDescription: "Almacenamiento y gestión de documentos con control de versiones y permisos.",
        icon: "FileText",
        category: "communication",
        route: "/documents",
        features: [
            "Almacenamiento seguro",
            "Control de versiones",
            "Permisos por documento",
            "Búsqueda avanzada",
            "Compartir documentos"
        ],
        pricing: "included",
        dependencies: [],
        requiredRole: "user",
        tags: ["documentos", "archivos", "gestión"]
    },
    {
        id: "kiosks",
        name: "Kioscos",
        description: "Gestión de terminales kiosko",
        longDescription: "Control de terminales kiosko para registro de asistencia, producción y operaciones de planta.",
        icon: "Monitor",
        category: "operations",
        route: "/kiosks",
        features: [
            "Gestión de terminales",
            "Registro de asistencia",
            "Control de producción",
            "Face ID biométrico",
            "Monitoreo en tiempo real"
        ],
        pricing: "included",
        dependencies: ["employees"],
        requiredRole: "manager",
        tags: ["kioscos", "terminales", "asistencia"]
    },
    {
        id: "tickets",
        name: "Tickets de Soporte",
        description: "Sistema de tickets y soporte",
        longDescription: "Gestión de tickets de soporte interno y seguimiento de incidencias operativas.",
        icon: "TicketIcon",
        category: "communication",
        route: "/tickets",
        features: [
            "Creación de tickets",
            "Seguimiento de estado",
            "Asignación de responsables",
            "Priorización",
            "Historial de resoluciones"
        ],
        pricing: "included",
        dependencies: [],
        requiredRole: "user",
        tags: ["tickets", "soporte", "incidencias"]
    },
    {
        id: "admin",
        name: "Administración",
        description: "Panel de administración del sistema",
        longDescription: "Panel administrativo para gestión de usuarios, organizaciones y configuración global del sistema.",
        icon: "Settings",
        category: "operations",
        route: "/admin",
        features: [
            "Gestión de usuarios",
            "Configuración de organización",
            "Roles y permisos",
            "Auditoría de sistema",
            "Configuración avanzada"
        ],
        pricing: "included",
        dependencies: [],
        requiredRole: "admin",
        tags: ["admin", "configuración", "usuarios"]
    }
];

/**
 * Get module by ID
 */
export function getModuleById(id: string): ModuleMetadata | undefined {
    return MODULE_REGISTRY.find(m => m.id === id);
}

/**
 * Get modules by category
 */
export function getModulesByCategory(category: ModuleCategory): ModuleMetadata[] {
    return MODULE_REGISTRY.filter(m => m.category === category);
}

/**
 * Get all categories with module counts
 */
export function getCategoriesWithCounts(): Array<{ category: ModuleCategory; name: string; count: number }> {
    const counts = new Map<ModuleCategory, number>();

    MODULE_REGISTRY.forEach(module => {
        counts.set(module.category, (counts.get(module.category) || 0) + 1);
    });

    return Object.entries(MODULE_CATEGORIES).map(([key, value]) => ({
        category: key as ModuleCategory,
        name: value.name,
        count: counts.get(key as ModuleCategory) || 0
    }));
}

/**
 * Search modules by query
 */
export function searchModules(query: string): ModuleMetadata[] {
    const lowerQuery = query.toLowerCase();
    return MODULE_REGISTRY.filter(module =>
        module.name.toLowerCase().includes(lowerQuery) ||
        module.description.toLowerCase().includes(lowerQuery) ||
        module.tags.some(tag => tag.includes(lowerQuery))
    );
}
