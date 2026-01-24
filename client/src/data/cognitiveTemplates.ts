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
    description: 'Procesamiento integral de coco: Destopado (Estopa), Perforado (Agua), Deshuesado (Copra/Pulpa)',
    industry: 'Peladero',
    icon: null,
    nodes: [
        // 1. COMPRA
        createCognitiveNode('t1', 'trigger', 'Nueva Compra de Coco', 400, 50, {
            description: 'Compra de MP (Cualquier calidad)',
            icon: 'package'
        }),
        createCognitiveNode('a1', 'action', 'Registrar Compra', 400, 200, {
            description: 'Registro de entrada de materia prima',
            actionId: 'create_purchase'
        }),

        // 2. DESTOPADO (Obligatorio)
        createCognitiveNode('t2', 'trigger', 'Inicio Destopado', 400, 350, {
            description: 'Proceso obligatorio post-compra',
            icon: 'hammer'
        }),
        createCognitiveNode('a2', 'action', 'Registrar MO Destopado', 250, 500, {
            description: 'Pago por pieza destopada al operario',
            actionId: 'create_labor_ticket_piece'
        }),
        createCognitiveNode('a3', 'action', 'Generar Subproducto: Estopa', 550, 500, {
            description: 'Registro de Estopa (Venta por volumen/peso)',
            actionId: 'record_byproduct_estopa'
        }),
        createCognitiveNode('a4', 'action', 'Salida: Coco sin Estopa', 400, 650, {
            description: 'Producto intermedio para inventario temporal',
            actionId: 'update_inventory_wip'
        }),

        // 3. PERFORADO
        createCognitiveNode('t3', 'trigger', 'Inicio Perforado', 400, 800, {
            description: 'Transporte a banda de perforado',
            icon: 'droplet'
        }),
        createCognitiveNode('a5', 'action', 'Recolectar Agua de Coco', 250, 950, {
            description: 'Almacenamiento en bidones (Venta por Litro)',
            actionId: 'record_byproduct_water'
        }),
        createCognitiveNode('a6', 'action', 'Salida: Coco Perforado', 550, 950, {
            description: 'Coco listo para deshuesado',
            actionId: 'update_inventory_wip_2'
        }),

        // 4. DESHUESADO Y PELADO
        createCognitiveNode('t4', 'trigger', 'Inicio Desh/Pelado', 400, 1100, {
            description: 'Proceso manual final',
            icon: 'user-cog'
        }),
        createCognitiveNode('a7', 'action', 'Registrar MO Proceso', 250, 1250, {
            description: 'Pago por proceso (Deshuesado/Pelado)',
            actionId: 'create_labor_ticket_process'
        }),
        createCognitiveNode('a8', 'action', 'Generar Subproducto: Copra', 550, 1250, {
            description: 'Registro de Copra (Comercializable)',
            actionId: 'record_byproduct_copra'
        }),
        createCognitiveNode('a9', 'action', 'Generar Producto: Pulpa', 400, 1400, {
            description: 'Registro de Pulpa (Venta por Kg)',
            actionId: 'record_finished_goods'
        }),

        // 5. VENTA
        createCognitiveNode('t5', 'trigger', 'Venta/Despacho', 400, 1550, {
            description: 'Comercialización de Productos y Subproductos',
            icon: 'shopping-cart'
        }),
        createCognitiveNode('c1', 'condition', '¿Producto o Subproducto?', 400, 1700, {
            description: 'Selección de inventario a vender'
        }),
        createCognitiveNode('a10', 'action', 'Facturar y Despachar', 400, 1850, {
            description: 'Venta de Pulpa, Agua, Estopa o Copra',
            actionId: 'create_invoice'
        })
    ],
    edges: [
        // Flujo Compra
        createEdge('t1', 'a1'),
        createEdge('a1', 't2'),

        // Flujo Destopado
        createEdge('t2', 'a2'),
        createEdge('t2', 'a3'),
        createEdge('a2', 'a4'),
        createEdge('a3', 'a4'),
        createEdge('a4', 't3'),

        // Flujo Perforado
        createEdge('t3', 'a5'),
        createEdge('t3', 'a6'),
        createEdge('a5', 'ta4'), // Virtual link logic, represented by flow
        createEdge('a6', 't4'),

        // Flujo Deshuesado
        createEdge('t4', 'a7'),
        createEdge('t4', 'a8'),
        createEdge('a7', 'a9'),
        createEdge('a8', 'a9'),
        createEdge('a9', 't5'),

        // Flujo Venta
        createEdge('t5', 'c1'),
        createEdge('c1', 'a10', 'yes'),
        createEdge('c1', 'a10', 'no')
    ],
    mlModels: [
        'Predicción Litros Agua/Coco',
        'Rendimiento Pulpa vs Desecho',
        'Optimización MO Destopado'
    ],
    kpis: [
        'Litros Agua Recolectada',
        'Kilos Estopa Generada',
        'Eficiencia Destopado/Hora',
        'Rendimiento Copra'
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
