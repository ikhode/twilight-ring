import { Node, Edge } from 'reactflow';
import { ShoppingBag, Wrench, Factory, Truck, Utensils, Laptop, Heart, Sparkles, Building2, Palmtree } from 'lucide-react';

export interface FlowTemplate {
    id: string;
    name: string;
    description: string;
    icon: any; // Lucide icon component
    industry: string; // Keyword for legacy compatibility
    nodes: Node[];
    edges: Edge[];
}

const createNode = (id: string, label: string, x: number, y: number, type: 'input' | 'default' | 'output' = 'default'): Node => ({
    id,
    type,
    data: { label },
    position: { x, y }
});

const createEdge = (source: string, target: string): Edge => ({
    id: `e${source}-${target}`,
    source,
    target,
    animated: true,
    style: { stroke: '#3b82f6' }
});

export const flowTemplates: FlowTemplate[] = [
    {
        id: 'retail',
        name: 'Retail / Comercio',
        description: 'Flujo estándar para tiendas y venta minorista.',
        icon: ShoppingBag,
        industry: 'Retail',
        nodes: [
            createNode('r1', 'Recepción de Mercancía', 250, 50, 'input'),
            createNode('r2', 'Inventariado & Etiquetado', 250, 150),
            createNode('r3', 'Exhibición en Tienda / Web', 250, 250),
            createNode('r4', 'Venta (POS / Checkout)', 250, 350),
            createNode('r5', 'Entrega / Despacho', 250, 450, 'output')
        ],
        edges: [
            createEdge('r1', 'r2'),
            createEdge('r2', 'r3'),
            createEdge('r3', 'r4'),
            createEdge('r4', 'r5')
        ]
    },
    {
        id: 'services',
        name: 'Servicios Profesionales',
        description: 'Ideal para agencias, consultoras y despachos.',
        icon: Laptop,
        industry: 'Servicios',
        nodes: [
            createNode('s1', 'Captación de Lead', 250, 50, 'input'),
            createNode('s2', 'Reunión Inicial / Diagnóstico', 250, 150),
            createNode('s3', 'Envío de Propuesta', 250, 250),
            createNode('s4', 'Firma de Contrato', 250, 350),
            createNode('s5', 'Ejecución del Servicio', 250, 450),
            createNode('s6', 'Facturación y Cierre', 250, 550, 'output')
        ],
        edges: [
            createEdge('s1', 's2'),
            createEdge('s2', 's3'),
            createEdge('s3', 's4'),
            createEdge('s4', 's5'),
            createEdge('s5', 's6')
        ]
    },
    {
        id: 'manufacturing',
        name: 'Manufactura / Fábrica',
        description: 'Control de producción y cadena de suministro.',
        icon: Factory,
        industry: 'Manufactura',
        nodes: [
            createNode('m1', 'Recepción Materia Prima', 250, 50, 'input'),
            createNode('m2', 'Control de Calidad (Entrada)', 250, 150),
            createNode('m3', 'Planificación de Producción', 250, 250),
            createNode('m4', 'Línea de Ensamblaje', 250, 350),
            createNode('m5', 'Control de Calidad (Salida)', 250, 450),
            createNode('m6', 'Almacenamiento PT', 250, 550, 'output')
        ],
        edges: [
            createEdge('m1', 'm2'),
            createEdge('m2', 'm3'),
            createEdge('m3', 'm4'),
            createEdge('m4', 'm5'),
            createEdge('m5', 'm6')
        ]
    },
    {
        id: 'logistics',
        name: 'Logística y Transporte',
        description: 'Gestión de flotas, envíos y almacenes.',
        icon: Truck,
        industry: 'Logística',
        nodes: [
            createNode('l1', 'Orden de Recolección', 250, 50, 'input'),
            createNode('l2', 'Asignación de Unidad', 250, 150),
            createNode('l3', 'Carga y Manifiesto', 250, 250),
            createNode('l4', 'Tránsito / Ruta', 250, 350),
            createNode('l5', 'Prueba de Entrega (POD)', 250, 450, 'output')
        ],
        edges: [
            createEdge('l1', 'l2'),
            createEdge('l2', 'l3'),
            createEdge('l3', 'l4'),
            createEdge('l4', 'l5')
        ]
    },
    {
        id: 'hospitality',
        name: 'Hospitalidad / F&B',
        description: 'Flujo para restaurantes, hoteles y servicios de hospitalidad.',
        icon: Utensils,
        industry: 'Hospitalidad',
        nodes: [
            createNode('h1', 'Recepción de Insumos', 250, 50, 'input'),
            createNode('h2', 'Mise en Place / Prep', 250, 150),
            createNode('h3', 'Reserva / Comanda', 250, 250),
            createNode('h4', 'Preparación / Servicio', 250, 350),
            createNode('h5', 'Entrega al Cliente', 250, 450),
            createNode('h6', 'Cobro y Cierre', 250, 550, 'output')
        ],
        edges: [
            createEdge('h1', 'h2'),
            createEdge('h2', 'h3'),
            createEdge('h3', 'h4'),
            createEdge('h4', 'h5'),
            createEdge('h5', 'h6')
        ]
    },
    {
        id: 'healthcare',
        name: 'Salud / Healthcare',
        description: 'Gestión de pacientes, consultas y procedimientos médicos.',
        icon: Heart,
        industry: 'Salud',
        nodes: [
            createNode('hc1', 'Registro de Paciente', 250, 50, 'input'),
            createNode('hc2', 'Triage / Valoración', 250, 150),
            createNode('hc3', 'Consulta Médica', 250, 250),
            createNode('hc4', 'Tratamiento / Procedimiento', 250, 350),
            createNode('hc5', 'Facturación y Alta', 250, 450),
            createNode('hc6', 'Seguimiento', 250, 550, 'output')
        ],
        edges: [
            createEdge('hc1', 'hc2'),
            createEdge('hc2', 'hc3'),
            createEdge('hc3', 'hc4'),
            createEdge('hc4', 'hc5'),
            createEdge('hc5', 'hc6')
        ]
    },
    {
        id: 'technology',
        name: 'Tecnología / SaaS',
        description: 'Flujo para empresas de software, SaaS y tecnología.',
        icon: Laptop,
        industry: 'Tecnología',
        nodes: [
            createNode('t1', 'Lead / Prospecto', 250, 50, 'input'),
            createNode('t2', 'Demo / Trial', 250, 150),
            createNode('t3', 'Onboarding / Setup', 250, 250),
            createNode('t4', 'Activación / Go-Live', 250, 350),
            createNode('t5', 'Soporte / Success', 250, 450),
            createNode('t6', 'Renovación / Upsell', 250, 550, 'output')
        ],
        edges: [
            createEdge('t1', 't2'),
            createEdge('t2', 't3'),
            createEdge('t3', 't4'),
            createEdge('t4', 't5'),
            createEdge('t5', 't6')
        ]
    },
    {
        id: 'other',
        name: 'Genérico / Otro',
        description: 'Plantilla flexible para cualquier tipo de negocio.',
        icon: Sparkles,
        industry: 'Otro',
        nodes: [
            createNode('o1', 'Solicitud / Intake', 250, 50, 'input'),
            createNode('o2', 'Procesamiento', 250, 150),
            createNode('o3', 'Revisión de Calidad', 250, 250),
            createNode('o4', 'Entrega / Output', 250, 350),
            createNode('o5', 'Cierre y Feedback', 250, 450, 'output')
        ],
        edges: [
            createEdge('o1', 'o2'),
            createEdge('o2', 'o3'),
            createEdge('o3', 'o4'),
            createEdge('o4', 'o5')
        ]
    },
    {
        id: 'peladero',
        name: 'Peladero / Coco',
        description: 'Procesamiento de coco: compra, producción, inventario y venta.',
        icon: Palmtree,
        industry: 'Peladero',
        nodes: [
            createNode('p1', 'Compra de Coco', 250, 50, 'input'),
            createNode('p2', 'Recepción e Inventario MP', 250, 150),
            createNode('p3', 'Producción (Destopado/Pelado)', 250, 250),
            createNode('p4', 'Control de Calidad', 250, 350),
            createNode('p5', 'Inventario PT', 250, 450),
            createNode('p6', 'Cotización', 250, 550),
            createNode('p7', 'Venta', 250, 650),
            createNode('p8', 'Facturación y Cobranza', 250, 750, 'output')
        ],
        edges: [
            createEdge('p1', 'p2'),
            createEdge('p2', 'p3'),
            createEdge('p3', 'p4'),
            createEdge('p4', 'p5'),
            createEdge('p5', 'p6'),
            createEdge('p6', 'p7'),
            createEdge('p7', 'p8')
        ]
    }
];
