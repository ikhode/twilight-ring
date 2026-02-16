import {
    Factory,
    Box,
    Truck,
    ShoppingCart,
    DollarSign,
    Briefcase,
    Users,
    Ticket,
    BarChart,
    Clock,
    Monitor,
    Shield,
    FileText,
    CheckCircle,
    ShoppingBag,
    Search,
    Zap,
    Store,
    ShieldCheck,
    Smartphone,
    ScanFace,
    Landmark,
    Coins,
    Warehouse
} from "lucide-react";

export interface SystemModule {
    id: string;
    name: string;
    description: string;
    tooltip?: string;
    icon: any;
    href: string;
    category: 'operations' | 'finance' | 'hr' | 'commercial' | 'support' | 'analytics';
    status?: 'ready' | 'beta' | 'coming_soon';
}

export const ERP_MODULES: SystemModule[] = [
    {
        id: 'production',
        name: 'Producción',
        description: 'Control de procesos, destope, deshuace y secado',
        tooltip: 'Seguimiento de lotes productivos, eficiencia de maquinaria, control de mermas en tiempo real y trazabilidad completa desde materia prima hasta producto terminado.',
        icon: Factory,
        href: '/production',
        category: 'operations',
        status: 'ready'
    },
    {
        id: 'inventory',
        name: 'Inventario Inteligente',
        description: 'Gestión predictiva de materia prima',
        tooltip: 'Análisis de stock crítico con alertas automáticas, valoración de inventario por método PEPS, predicción de demanda y optimización de puntos de reorden.',
        icon: Box,
        href: '/inventory',
        category: 'operations',
        status: 'ready'
    },

    {
        id: 'logistics',
        name: 'Logística',
        description: 'Rutas, flotilla y entregas',
        tooltip: 'Optimización de rutas con IA, seguimiento GPS en tiempo real, gestión de flotilla vehicular, control de combustible y análisis de eficiencia de entregas.',
        icon: Truck,
        href: '/logistics',
        category: 'operations',
        status: 'ready'
    },
    {
        id: 'sales',
        name: 'Ventas',
        description: 'Punto de venta y pedidos',
        tooltip: 'Terminal POS completa, gestión de preventa, análisis de rentabilidad por producto/cliente, control de crédito y cobranza, y reportes de desempeño comercial.',
        icon: ShoppingCart,
        href: '/sales',
        category: 'commercial',
        status: 'ready'
    },
    {
        id: 'crm',
        name: 'CRM',
        description: 'Gestión de clientes y proveedores',
        tooltip: 'Expedientes digitales completos, análisis de riesgo crediticio, historial de transacciones, scoring de clientes/proveedores y CRM predictivo con IA.',
        icon: Briefcase,
        href: '/crm',
        category: 'commercial',
        status: 'ready'
    },
    {
        id: 'finance',
        name: 'Finanzas',
        description: 'Facturación, cuentas por cobrar y pagar',
        tooltip: 'Gestión de cuentas por cobrar/pagar, conciliación bancaria, flujo de efectivo proyectado, análisis de rentabilidad y reportes financieros automatizados.',
        icon: DollarSign,
        href: '/finance',
        category: 'finance',
        status: 'ready'
    },
    {
        id: 'lending',
        name: 'Préstamos y Crédito',
        description: 'Gestión de cartera y cobranza',
        tooltip: 'Sistema completo de préstamos para prestamistas: solicitudes, análisis de riesgo con IA, calendarios de pago automatizados y seguimiento de garantías.',
        icon: Landmark,
        href: '/lending',
        category: 'finance',
        status: 'beta'
    },
    {
        id: 'employees',
        name: 'Recursos Humanos',
        description: 'Expedientes, nómina y estructura',
        tooltip: 'Expedientes digitales de empleados, control de asistencia biométrico, cálculo de nómina, gestión de permisos/vacaciones y análisis de productividad.',
        icon: Users,
        href: '/employees',
        category: 'hr',
        status: 'ready'
    },
    {
        id: 'kiosks',
        name: 'Kioscos',
        description: 'Gestión de terminales y puntos de acceso',
        tooltip: 'Control de terminales T-CAC distribuidas, autenticación biométrica, monitoreo de heartbeat, configuración remota y gestión de sesiones de usuario.',
        icon: Smartphone,
        href: '/kiosks',
        category: 'operations',
        status: 'ready'
    },
    {
        id: 'analytics',
        name: 'Analítica IA',
        description: 'Insights predictivos y reportes',
        tooltip: 'Dashboards ejecutivos en tiempo real, análisis predictivo con machine learning, detección de anomalías, KPIs personalizados y reportes automatizados.',
        icon: BarChart,
        href: '/analytics',
        category: 'analytics',
        status: 'ready'
    },
    {
        id: 'documents',
        name: 'Documentos',
        description: 'Gestión documental centralizada',
        tooltip: 'Repositorio centralizado de documentos, control de versiones, firma electrónica, alertas de vencimiento y búsqueda inteligente con OCR.',
        icon: FileText,
        href: '/documents',
        category: 'operations',
        status: 'ready'
    },
    {
        id: 'purchases',
        name: 'Compras',
        description: 'Gestión de abastecimiento y proveedores',
        tooltip: 'Órdenes de compra automatizadas, comparación de cotizaciones, evaluación de proveedores, control de recepciones y análisis de costos de adquisición.',
        icon: ShoppingBag,
        href: '/purchases',
        category: 'finance',
        status: 'ready'
    },
    {
        id: 'vision',
        name: 'Smart Vision',
        description: 'Conteo y medición por cámara',
        tooltip: 'Detección de objetos con IA, conteo automático de inventario, reconocimiento facial para control de acceso y análisis de comportamiento en tiempo real.',
        icon: ScanFace,
        href: '/vision',
        category: 'operations',
        status: 'coming_soon'
    },
    {
        id: 'nl-query',
        name: 'Consultas IA',
        description: 'Consultas en lenguaje natural',
        tooltip: 'Consulta tu base de datos en español natural, genera reportes con comandos de voz, análisis ad-hoc sin SQL y respuestas instantáneas con contexto empresarial.',
        icon: Search,
        href: '/query',
        category: 'analytics',
        status: 'coming_soon'
    },
    {
        id: 'cpe',
        name: 'Flujos Cognitivos',
        description: 'Automatización y orquestación',
        tooltip: 'Motor de procesos dinámicos, automatización de flujos de trabajo, orquestación de tareas complejas, triggers basados en eventos y workflows adaptativos con IA.',
        icon: Zap,
        href: '/workflows',
        category: 'operations',
        status: 'beta'
    },
    {
        id: 'trustnet',
        name: 'TrustNet',
        description: 'Sistema de Reputación Empresarial',
        tooltip: 'Red de confianza B2B con Trust Score calculado en tiempo real, marketplace empresarial verificado, gestión de contrapartes externas y sistema de apelaciones transparente.',
        icon: ShieldCheck,
        href: '/trust',
        category: 'finance',
        status: 'ready'
    },
    {
        id: 'marketplace',
        name: 'Marketplace B2B',
        description: 'Comercio entre empresas verificadas',
        tooltip: 'Marketplace B2B auto-organizado con sincronización automática de inventario, sistema de ratings, chat integrado, negociación de precios y órdenes recurrentes. Solo para organizaciones con Trust Score verificado.',
        icon: Store,
        href: '/marketplace',
        category: 'commercial',
        status: 'ready'
    },
    {
        id: 'shieldline',
        name: 'ShieldLine Cloud',
        description: 'Identidad telefónica blindada',
        tooltip: 'Infraestructura de comunicación empresarial blindada con números DID públicos, red privada WebRTC cifrada y firewall inteligente impulsado por IA.',
        icon: Smartphone,
        href: '/shieldline',
        category: 'commercial',
        status: 'beta'
    },
    {
        id: 'admin',
        name: 'Administración',
        description: 'Gestión global del sistema',
        tooltip: 'Panel de control maestro, configuración para usuarios, logs de sistema y métricas globales.',
        icon: Shield,
        href: '/admin',
        category: 'support',
        status: 'ready'
    }
];

