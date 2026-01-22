import { Node, Edge } from 'reactflow';

/**
 * Cognitive Workflow Template Generator
 * 
 * Este módulo contiene templates avanzados que usan:
 * - Triggers: Nodos que inician el workflow
 * - Conditions: Nodos de decisión con múltiples salidas
 * - Actions: Nodos que ejecutan operaciones
 * 
 * Cada template representa un workflow cognitivo completo
 * con lógica de negocio, validaciones y acciones automatizadas.
 */

export interface CognitiveNode extends Node {
    type: 'trigger' | 'condition' | 'action';
    data: {
        name: string;
        description?: string;
        icon?: string;
        id?: string;
        config?: Record<string, any>;
    };
}

export interface CognitiveWorkflowTemplate {
    id: string;
    name: string;
    description: string;
    industry: string;
    icon: any;
    nodes: CognitiveNode[];
    edges: Edge[];
    mlModels?: string[]; // Modelos ML sugeridos
    kpis?: string[]; // KPIs relevantes
}

// Helper para crear nodos cognitivos
const createCognitiveNode = (
    id: string,
    type: 'trigger' | 'condition' | 'action',
    name: string,
    x: number,
    y: number,
    config?: Record<string, any>
): CognitiveNode => ({
    id,
    type,
    data: {
        name,
        description: config?.description,
        icon: config?.icon,
        id: config?.actionId,
        config
    },
    position: { x, y }
});

const createEdge = (source: string, target: string, sourceHandle?: string): Edge => ({
    id: `e${source}-${target}${sourceHandle ? `-${sourceHandle}` : ''}`,
    source,
    target,
    sourceHandle,
    animated: true,
    style: { stroke: sourceHandle === 'yes' ? '#22c55e' : sourceHandle === 'no' ? '#64748b' : '#3b82f6' }
});

/**
 * TEMPLATE AVANZADO: PELADERO (Procesamiento de Coco)
 * 
 * Workflow cognitivo completo con:
 * - Triggers para eventos de negocio
 * - Conditions para validaciones
 * - Actions para operaciones
 * - Flujos paralelos para cuentas y finanzas
 */
export const peladeroCognitiveTemplate: CognitiveWorkflowTemplate = {
    id: 'peladero_cognitive',
    name: 'Peladero Cognitivo',
    description: 'Procesamiento de coco con IA: compra, producción, QC, venta y finanzas',
    industry: 'Peladero',
    icon: null, // Se asigna en runtime
    nodes: [
        // TRIGGER: Nueva Compra de Coco
        createCognitiveNode('t1', 'trigger', 'Nueva Compra de Coco', 400, 50, {
            description: 'Se registra una nueva compra de materia prima',
            icon: 'package'
        }),

        // CONDITION: Validar Precio en Rango
        createCognitiveNode('c1', 'condition', '¿Precio en Rango?', 400, 200, {
            description: 'Valida que el precio esté entre mínimo y máximo configurado'
        }),

        // ACTION: Solicitar Aprobación (si precio fuera de rango)
        createCognitiveNode('a1', 'action', 'Solicitar Aprobación', 200, 350, {
            description: 'Envía notificación al administrador para aprobar compra',
            actionId: 'send_notification'
        }),

        // ACTION: Registrar Compra
        createCognitiveNode('a2', 'action', 'Registrar Compra', 600, 350, {
            description: 'Registra la compra en el sistema',
            actionId: 'create_purchase'
        }),

        // ACTION: Actualizar Inventario MP
        createCognitiveNode('a3', 'action', 'Actualizar Inventario MP', 400, 500, {
            description: 'Incrementa inventario de materia prima',
            actionId: 'update_inventory'
        }),

        // TRIGGER: Iniciar Producción
        createCognitiveNode('t2', 'trigger', 'Iniciar Producción', 400, 650, {
            description: 'Operador inicia proceso de destopado/pelado',
            icon: 'zap'
        }),

        // ACTION: Registrar Ticket Mano de Obra
        createCognitiveNode('a4', 'action', 'Registrar Ticket MO', 400, 800, {
            description: 'Crea ticket de mano de obra con operador y kilos',
            actionId: 'create_labor_ticket'
        }),

        // ACTION: Procesar (Destopado/Pelado)
        createCognitiveNode('a5', 'action', 'Procesar Coco', 400, 950, {
            description: 'Ejecuta proceso de transformación',
            actionId: 'process_coconut'
        }),

        // CONDITION: Control de Calidad
        createCognitiveNode('c2', 'condition', '¿Calidad Aprobada?', 400, 1100, {
            description: 'Valida que el producto cumpla estándares de calidad'
        }),

        // ACTION: Rechazar/Reprocesar
        createCognitiveNode('a6', 'action', 'Rechazar Producto', 200, 1250, {
            description: 'Marca producto como rechazado y registra merma',
            actionId: 'reject_product'
        }),

        // ACTION: Actualizar Inventario PT
        createCognitiveNode('a7', 'action', 'Actualizar Inventario PT', 600, 1250, {
            description: 'Incrementa inventario de producto terminado',
            actionId: 'update_finished_goods'
        }),

        // TRIGGER: Solicitud de Cotización
        createCognitiveNode('t3', 'trigger', 'Solicitud Cotización', 400, 1400, {
            description: 'Cliente solicita cotización',
            icon: 'users'
        }),

        // CONDITION: Verificar Stock
        createCognitiveNode('c3', 'condition', '¿Stock Disponible?', 400, 1550, {
            description: 'Verifica que haya inventario suficiente'
        }),

        // ACTION: Notificar Sin Stock
        createCognitiveNode('a8', 'action', 'Notificar Sin Stock', 200, 1700, {
            description: 'Informa al cliente que no hay disponibilidad',
            actionId: 'send_email'
        }),

        // ACTION: Generar Cotización
        createCognitiveNode('a9', 'action', 'Generar Cotización', 600, 1700, {
            description: 'Crea cotización con precios actuales',
            actionId: 'create_quote'
        }),

        // TRIGGER: Cotización Aprobada
        createCognitiveNode('t4', 'trigger', 'Cotización Aprobada', 400, 1850, {
            description: 'Cliente acepta la cotización',
            icon: 'check-circle'
        }),

        // CONDITION: Forma de Pago
        createCognitiveNode('c4', 'condition', '¿Pago en Efectivo?', 400, 2000, {
            description: 'Determina si es pago de contado o crédito'
        }),

        // CONDITION: Validar Crédito (si es crédito)
        createCognitiveNode('c5', 'condition', '¿Crédito Disponible?', 200, 2150, {
            description: 'Verifica límite de crédito del cliente'
        }),

        // ACTION: Rechazar Venta
        createCognitiveNode('a10', 'action', 'Rechazar Venta', 50, 2300, {
            description: 'Informa que no hay crédito disponible',
            actionId: 'send_notification'
        }),

        // ACTION: Registrar Venta
        createCognitiveNode('a11', 'action', 'Registrar Venta', 400, 2300, {
            description: 'Crea registro de venta en el sistema',
            actionId: 'create_sale'
        }),

        // ACTION: Generar Factura
        createCognitiveNode('a12', 'action', 'Generar Factura', 400, 2450, {
            description: 'Crea factura (API SAT)',
            actionId: 'create_invoice'
        }),

        // TRIGGER: Pago Recibido
        createCognitiveNode('t5', 'trigger', 'Pago Recibido', 400, 2600, {
            description: 'Se registra un pago del cliente',
            icon: 'banknote'
        }),

        // ACTION: Registrar Cobranza
        createCognitiveNode('a13', 'action', 'Registrar Cobranza', 400, 2750, {
            description: 'Actualiza cuentas por cobrar',
            actionId: 'record_payment'
        }),

        // ACTION: Actualizar Flujo de Caja
        createCognitiveNode('a14', 'action', 'Actualizar Caja', 400, 2900, {
            description: 'Registra movimiento en flujo de caja',
            actionId: 'update_cash_flow'
        }),
    ],
    edges: [
        // Flujo principal
        createEdge('t1', 'c1'),
        createEdge('c1', 'a1', 'no'),
        createEdge('c1', 'a2', 'yes'),
        createEdge('a1', 'a3'),
        createEdge('a2', 'a3'),
        createEdge('a3', 't2'),
        createEdge('t2', 'a4'),
        createEdge('a4', 'a5'),
        createEdge('a5', 'c2'),
        createEdge('c2', 'a6', 'no'),
        createEdge('c2', 'a7', 'yes'),
        createEdge('a7', 't3'),
        createEdge('t3', 'c3'),
        createEdge('c3', 'a8', 'no'),
        createEdge('c3', 'a9', 'yes'),
        createEdge('a9', 't4'),
        createEdge('t4', 'c4'),
        createEdge('c4', 'c5', 'no'),
        createEdge('c4', 'a11', 'yes'),
        createEdge('c5', 'a10', 'no'),
        createEdge('c5', 'a11', 'yes'),
        createEdge('a11', 'a12'),
        createEdge('a12', 't5'),
        createEdge('t5', 'a13'),
        createEdge('a13', 'a14'),
    ],
    mlModels: [
        'Predicción de Demanda',
        'Optimización de Precios',
        'Predicción de Merma',
        'Detección de Anomalías en Producción'
    ],
    kpis: [
        'Kilos Procesados/Día',
        '% Merma',
        'Costo por Kilo',
        'Margen Bruto',
        'Rotación de Inventario',
        'Días Promedio de Cobro'
    ]
};

/**
 * Generador de Templates Basado en IA
 * 
 * Este generador analiza la descripción del negocio y crea
 * un workflow cognitivo personalizado.
 */
export interface BusinessDescription {
    industry: string;
    description: string;
    processes: string[];
    painPoints?: string[];
}

export class CognitiveTemplateGenerator {
    /**
     * Genera un template cognitivo basado en descripción del negocio
     */
    static async generateTemplate(business: BusinessDescription): Promise<CognitiveWorkflowTemplate> {
        // TODO: Integrar con LLM (OpenAI/Anthropic) para generación real
        // Por ahora, retorna template basado en keywords

        const industry = business.industry.toLowerCase();

        // Mapeo simple de industrias a templates
        if (industry.includes('coco') || industry.includes('peladero')) {
            return peladeroCognitiveTemplate;
        }

        // Template genérico si no hay match
        return this.generateGenericTemplate(business);
    }

    /**
     * Genera template genérico basado en procesos identificados
     */
    private static generateGenericTemplate(business: BusinessDescription): CognitiveWorkflowTemplate {
        const nodes: CognitiveNode[] = [];
        const edges: Edge[] = [];
        let yPosition = 50;

        // Crear trigger inicial
        nodes.push(createCognitiveNode(
            't1',
            'trigger',
            `Iniciar ${business.processes[0] || 'Proceso'}`,
            400,
            yPosition,
            { icon: 'zap' }
        ));

        yPosition += 150;

        // Crear nodos para cada proceso
        business.processes.forEach((process, index) => {
            const nodeId = `a${index + 1}`;
            nodes.push(createCognitiveNode(
                nodeId,
                'action',
                process,
                400,
                yPosition,
                { actionId: 'generic_action' }
            ));

            // Conectar con nodo anterior
            if (index === 0) {
                edges.push(createEdge('t1', nodeId));
            } else {
                edges.push(createEdge(`a${index}`, nodeId));
            }

            yPosition += 150;
        });

        return {
            id: 'generated_template',
            name: `${business.industry} - Generado`,
            description: business.description,
            industry: business.industry,
            icon: null,
            nodes,
            edges,
            mlModels: ['Predicción de Demanda', 'Detección de Anomalías'],
            kpis: ['Eficiencia Operativa', 'Tiempo de Ciclo']
        };
    }

    /**
     * Analiza texto libre y extrae procesos de negocio
     */
    static async analyzeBusinessDescription(text: string): Promise<BusinessDescription> {
        // TODO: Integrar con LLM para análisis real
        // Por ahora, extracción simple con keywords

        const processes: string[] = [];
        const keywords = ['compra', 'venta', 'producción', 'inventario', 'facturación'];

        keywords.forEach(keyword => {
            if (text.toLowerCase().includes(keyword)) {
                processes.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
            }
        });

        return {
            industry: 'Genérico',
            description: text,
            processes: processes.length > 0 ? processes : ['Proceso Principal']
        };
    }
}

export default {
    peladeroCognitiveTemplate,
    CognitiveTemplateGenerator
};
