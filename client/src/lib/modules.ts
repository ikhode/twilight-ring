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
    ScanFace
} from "lucide-react";

export interface SystemModule {
    id: string;
    name: string;
    description: string;
    tooltip?: string;
    icon: any;
    href: string;
    category: 'operations' | 'finance' | 'hr' | 'commercial' | 'support' | 'analytics';
}

export const ERP_MODULES: SystemModule[] = [
    {
        id: 'production',
        name: 'Producción',
        description: 'Control de procesos, destope, deshuace y secado',
        tooltip: 'Habilita el seguimiento de lotes, eficiencia de maquinaria y control de mermas en tiempo real.',
        icon: Factory,
        href: '/production',
        category: 'operations'
    },
    {
        id: 'inventory',
        name: 'Inventario Inteligente',
        description: 'Gestión predictiva de materia prima',
        tooltip: 'Activa el análisis de stock crítico, valoración de inventario y alertas automáticas de abastecimiento.',
        icon: Box,
        href: '/inventory',
        category: 'operations'
    },
    {
        id: 'logistics',
        name: 'Logística',
        description: 'Rutas, flotilla y entregas',
        icon: Truck,
        href: '/logistics',
        category: 'operations'
    },
    {
        id: 'sales',
        name: 'Ventas',
        description: 'Punto de venta y pedidos',
        tooltip: 'Habilita la terminal de punto de venta (POS), gestión de preventa y reportes de rentabilidad por producto.',
        icon: ShoppingCart,
        href: '/sales',
        category: 'commercial'
    },
    {
        id: 'crm',
        name: 'CRM',
        description: 'Gestión de clientes y proveedores',
        tooltip: 'Centraliza expedientes de clientes/proveedores, análisis de riesgo crediticio y CRM predictivo.',
        icon: Briefcase,
        href: '/crm',
        category: 'commercial'
    },
    {
        id: 'finance',
        name: 'Finanzas',
        description: 'Facturación, cuentas por cobrar y pagar',
        icon: DollarSign,
        href: '/finance',
        category: 'finance'
    },
    {
        id: 'employees',
        name: 'Recursos Humanos',
        description: 'Expedientes, nómina y estructura',
        icon: Users,
        href: '/employees',
        category: 'hr'
    },
    {
        id: 'kiosks',
        name: 'Kioscos',
        description: 'Gestión de terminales y puntos de acceso',
        icon: Smartphone,
        href: '/kiosks',
        category: 'operations'
    },
    {
        id: 'analytics',
        name: 'Analítica IA',
        description: 'Insights predictivos y reportes',
        icon: BarChart,
        href: '/analytics',
        category: 'analytics'
    },
    {
        id: 'documents',
        name: 'Documentos',
        description: 'Gestión documental centralizada',
        icon: FileText,
        href: '/documents',
        category: 'operations'
    },
    {
        id: 'purchases',
        name: 'Compras',
        description: 'Gestión de abastecimiento y proveedores',
        icon: ShoppingBag,
        href: '/purchases',
        category: 'finance'
    },

    {
        id: 'vision',
        name: 'Smart Vision',
        description: 'Conteo y medición por cámara',
        icon: ScanFace,
        href: '/vision',
        category: 'operations'
    },
    {
        id: 'nl-query',
        name: 'Consultas IA',
        description: 'Consultas en lenguaje natural',
        icon: Search,
        href: '/query',
        category: 'analytics'
    },
    {
        id: 'cpe',
        name: 'Flujos Cognitivos',
        description: 'Automatización y orquestación',
        icon: Zap,
        href: '/workflows',
        category: 'operations'
    },
    {
        id: 'marketplace',
        name: 'Marketplace',
        description: 'Integraciones y extensiones',
        icon: Store,
        href: '/marketplace',
        category: 'commercial'
    },
    {
        id: 'trustnet',
        name: 'TrustNet',
        description: 'Red de confianza y validación',
        icon: ShieldCheck,
        href: '/trust',
        category: 'finance'
    }
];
