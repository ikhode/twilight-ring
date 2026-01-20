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
    Search
} from "lucide-react";

export interface SystemModule {
    id: string;
    name: string;
    description: string;
    icon: any;
    href: string;
    category: 'operations' | 'finance' | 'hr' | 'commercial' | 'support' | 'analytics';
}

export const ERP_MODULES: SystemModule[] = [
    {
        id: 'production',
        name: 'Producción',
        description: 'Control de procesos, destope, deshuace y secado',
        icon: Factory,
        href: '/production',
        category: 'operations'
    },
    {
        id: 'inventory',
        name: 'Inventario Inteligente',
        description: 'Gestión predictiva de materia prima',
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
        icon: ShoppingCart,
        href: '/sales',
        category: 'commercial'
    },
    {
        id: 'crm',
        name: 'CRM',
        description: 'Gestión de clientes y proveedores',
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
        id: 'timeclock',
        name: 'Reloj Checador',
        description: 'Asistencia biométrica y turnos',
        icon: Clock,
        href: '/attendance',
        category: 'hr'
    },
    {
        id: 'tickets',
        name: 'Mesa de Ayuda',
        description: 'Tickets de soporte y mantenimiento',
        icon: Ticket,
        href: '/tickets',
        category: 'support'
    },
    {
        id: 'piecework',
        name: 'Control de Destajo',
        description: 'Registro de tareas y pagos unitarios',
        icon: Ticket,
        href: '/piecework',
        category: 'hr'
    },
    {
        id: 'kiosks',
        name: 'Kioscos',
        description: 'Gestión de terminales y puntos de acceso',
        icon: Monitor, // Need to import Monitor
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
        id: 'admin',
        name: 'Administración',
        description: 'Configuración y control global',
        icon: Shield,
        href: '/admin',
        category: 'support'
    },
    {
        id: 'query',
        name: 'Consultas IA',
        description: 'Consultas en lenguaje natural',
        icon: Search,
        href: '/query',
        category: 'analytics'
    }
];
