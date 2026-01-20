import { Node, Edge } from 'reactflow';
import { ShoppingBag, Wrench, Factory, Truck, Utensils, Laptop } from 'lucide-react';

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
        id: 'restaurant',
        name: 'Restaurante / F&B',
        description: 'Flujo para negocios de comida y hospitalidad.',
        icon: Utensils,
        industry: 'Restaurante',
        nodes: [
            createNode('f1', 'Recepción de Insumos', 250, 50, 'input'),
            createNode('f2', 'Mise en Place / Prep', 250, 150),
            createNode('f3', 'Comanda de Cliente', 250, 250),
            createNode('f4', 'Cocina / Bar', 250, 350),
            createNode('f5', 'Servicio a Mesa', 250, 450),
            createNode('f6', 'Cobro y Cierre', 250, 550, 'output')
        ],
        edges: [
            createEdge('f1', 'f2'),
            createEdge('f2', 'f3'),
            createEdge('f3', 'f4'),
            createEdge('f4', 'f5'),
            createEdge('f5', 'f6')
        ]
    }
];
