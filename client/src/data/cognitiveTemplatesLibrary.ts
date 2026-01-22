import { CognitiveWorkflowTemplate, CognitiveNode } from './cognitiveTemplates';
import { ShoppingBag, Users, Factory, Truck, Utensils, Heart, Laptop, Sparkles } from 'lucide-react';

/**
 * Biblioteca Completa de Templates Cognitivos
 * 
 * Cada template incluye:
 * - Triggers: Eventos que inician flujos
 * - Conditions: Decisiones de negocio
 * - Actions: Operaciones automatizadas
 * - ML Models: Modelos de IA sugeridos
 * - KPIs: Métricas clave del negocio
 */

const createNode = (id: string, type: 'trigger' | 'condition' | 'action', name: string, x: number, y: number, config?: any): CognitiveNode => ({
    id,
    type,
    data: { name, ...config },
    position: { x, y }
});

const createEdge = (source: string, target: string, sourceHandle?: string) => ({
    id: `e${source}-${target}${sourceHandle ? `-${sourceHandle}` : ''}`,
    source,
    target,
    sourceHandle,
    animated: true,
    style: { stroke: sourceHandle === 'yes' ? '#22c55e' : sourceHandle === 'no' ? '#64748b' : '#3b82f6' }
});

/**
 * RETAIL / COMERCIO
 */
export const retailCognitiveTemplate: CognitiveWorkflowTemplate = {
    id: 'retail_cognitive',
    name: 'Retail Cognitivo',
    description: 'Gestión inteligente de tienda con predicción de demanda y optimización de inventario',
    industry: 'Retail',
    icon: ShoppingBag,
    nodes: [
        createNode('t1', 'trigger', 'Recepción de Mercancía', 400, 50, { icon: 'package' }),
        createNode('c1', 'condition', '¿Coincide con Orden?', 400, 200),
        createNode('a1', 'action', 'Reportar Discrepancia', 200, 350),
        createNode('a2', 'action', 'Registrar Entrada', 600, 350),
        createNode('a3', 'action', 'Actualizar Inventario', 400, 500),
        createNode('a4', 'action', 'Etiquetar Productos', 400, 650),
        createNode('t2', 'trigger', 'Venta en POS', 400, 800, { icon: 'zap' }),
        createNode('c2', 'condition', '¿Stock Disponible?', 400, 950),
        createNode('a5', 'action', 'Sugerir Alternativa', 200, 1100),
        createNode('a6', 'action', 'Procesar Venta', 600, 1100),
        createNode('a7', 'action', 'Generar Ticket', 400, 1250),
        createNode('c3', 'condition', '¿Stock Mínimo?', 400, 1400),
        createNode('a8', 'action', 'Crear Orden de Compra', 600, 1550),
    ],
    edges: [
        createEdge('t1', 'c1'),
        createEdge('c1', 'a1', 'no'),
        createEdge('c1', 'a2', 'yes'),
        createEdge('a1', 'a3'),
        createEdge('a2', 'a3'),
        createEdge('a3', 'a4'),
        createEdge('a4', 't2'),
        createEdge('t2', 'c2'),
        createEdge('c2', 'a5', 'no'),
        createEdge('c2', 'a6', 'yes'),
        createEdge('a6', 'a7'),
        createEdge('a7', 'c3'),
        createEdge('c3', 'a8', 'yes'),
    ],
    mlModels: [
        'Predicción de Demanda por Producto',
        'Optimización de Stock Mínimo',
        'Detección de Productos de Lenta Rotación',
        'Predicción de Tendencias de Venta'
    ],
    kpis: [
        'Rotación de Inventario',
        'Ticket Promedio',
        'Margen Bruto',
        'Stock-out Rate',
        'Ventas por m²'
    ]
};

/**
 * SERVICIOS PROFESIONALES
 */
export const servicesCognitiveTemplate: CognitiveWorkflowTemplate = {
    id: 'services_cognitive',
    name: 'Servicios Cognitivos',
    description: 'Gestión de proyectos con predicción de rentabilidad y optimización de recursos',
    industry: 'Servicios',
    icon: Users,
    nodes: [
        createNode('t1', 'trigger', 'Nuevo Lead', 400, 50, { icon: 'users' }),
        createNode('a1', 'action', 'Calificar Lead (ML)', 400, 200),
        createNode('c1', 'condition', '¿Lead Calificado?', 400, 350),
        createNode('a2', 'action', 'Archivar', 200, 500),
        createNode('a3', 'action', 'Agendar Reunión', 600, 500),
        createNode('a4', 'action', 'Generar Propuesta', 400, 650),
        createNode('t2', 'trigger', 'Propuesta Aprobada', 400, 800, { icon: 'check-circle' }),
        createNode('a5', 'action', 'Crear Proyecto', 400, 950),
        createNode('a6', 'action', 'Asignar Equipo (ML)', 400, 1100),
        createNode('a7', 'action', 'Ejecutar Proyecto', 400, 1250),
        createNode('c2', 'condition', '¿Riesgo de Retraso?', 400, 1400),
        createNode('a8', 'action', 'Alertar PM', 600, 1550),
        createNode('a9', 'action', 'Entregar Proyecto', 400, 1700),
        createNode('a10', 'action', 'Facturar', 400, 1850),
    ],
    edges: [
        createEdge('t1', 'a1'),
        createEdge('a1', 'c1'),
        createEdge('c1', 'a2', 'no'),
        createEdge('c1', 'a3', 'yes'),
        createEdge('a3', 'a4'),
        createEdge('a4', 't2'),
        createEdge('t2', 'a5'),
        createEdge('a5', 'a6'),
        createEdge('a6', 'a7'),
        createEdge('a7', 'c2'),
        createEdge('c2', 'a8', 'yes'),
        createEdge('c2', 'a9', 'no'),
        createEdge('a8', 'a9'),
        createEdge('a9', 'a10'),
    ],
    mlModels: [
        'Calificación de Leads',
        'Predicción de Cierre',
        'Optimización de Asignación de Equipo',
        'Predicción de Rentabilidad',
        'Detección de Riesgo de Retraso'
    ],
    kpis: [
        'Tasa de Conversión',
        'Margen por Proyecto',
        'Utilización de Recursos',
        'Tiempo Promedio de Entrega',
        'NPS (Net Promoter Score)'
    ]
};

/**
 * MANUFACTURA
 */
export const manufacturingCognitiveTemplate: CognitiveWorkflowTemplate = {
    id: 'manufacturing_cognitive',
    name: 'Manufactura Cognitiva',
    description: 'Producción inteligente con mantenimiento predictivo y optimización de línea',
    industry: 'Manufactura',
    icon: Factory,
    nodes: [
        createNode('t1', 'trigger', 'Orden de Producción', 400, 50, { icon: 'package' }),
        createNode('a1', 'action', 'Verificar Materia Prima', 400, 200),
        createNode('c1', 'condition', '¿MP Disponible?', 400, 350),
        createNode('a2', 'action', 'Solicitar MP', 200, 500),
        createNode('a3', 'action', 'Planificar Producción (ML)', 600, 500),
        createNode('a4', 'action', 'Asignar Línea', 400, 650),
        createNode('c2', 'condition', '¿Mantenimiento Requerido?', 400, 800),
        createNode('a5', 'action', 'Programar Mantenimiento', 200, 950),
        createNode('a6', 'action', 'Iniciar Producción', 600, 950),
        createNode('a7', 'action', 'Monitorear Calidad (ML)', 400, 1100),
        createNode('c3', 'condition', '¿Defecto Detectado?', 400, 1250),
        createNode('a8', 'action', 'Detener Línea', 200, 1400),
        createNode('a9', 'action', 'Continuar Producción', 600, 1400),
        createNode('a10', 'action', 'QC Final', 400, 1550),
        createNode('a11', 'action', 'Almacenar PT', 400, 1700),
    ],
    edges: [
        createEdge('t1', 'a1'),
        createEdge('a1', 'c1'),
        createEdge('c1', 'a2', 'no'),
        createEdge('c1', 'a3', 'yes'),
        createEdge('a2', 'a3'),
        createEdge('a3', 'a4'),
        createEdge('a4', 'c2'),
        createEdge('c2', 'a5', 'yes'),
        createEdge('c2', 'a6', 'no'),
        createEdge('a5', 'a6'),
        createEdge('a6', 'a7'),
        createEdge('a7', 'c3'),
        createEdge('c3', 'a8', 'yes'),
        createEdge('c3', 'a9', 'no'),
        createEdge('a8', 'a7'),
        createEdge('a9', 'a10'),
        createEdge('a10', 'a11'),
    ],
    mlModels: [
        'Mantenimiento Predictivo',
        'Detección de Defectos en Tiempo Real',
        'Optimización de Línea de Producción',
        'Predicción de Demanda de Mantenimiento',
        'Predicción de Fallas en Maquinaria'
    ],
    kpis: [
        'OEE (Overall Equipment Effectiveness)',
        'Tasa de Defectos',
        'Tiempo de Ciclo',
        'Utilización de Capacidad',
        'MTBF (Mean Time Between Failures)'
    ]
};

/**
 * HEALTHCARE / SALUD
 */
export const healthcareCognitiveTemplate: CognitiveWorkflowTemplate = {
    id: 'healthcare_cognitive',
    name: 'Salud Cognitiva',
    description: 'Gestión de pacientes con predicción de ocupación y optimización de recursos',
    industry: 'Salud',
    icon: Heart,
    nodes: [
        createNode('t1', 'trigger', 'Registro de Paciente', 400, 50, { icon: 'users' }),
        createNode('a1', 'action', 'Verificar Seguro', 400, 200),
        createNode('a2', 'action', 'Triage (ML)', 400, 350),
        createNode('c1', 'condition', '¿Urgencia Alta?', 400, 500),
        createNode('a3', 'action', 'Atención Inmediata', 200, 650),
        createNode('a4', 'action', 'Agendar Consulta', 600, 650),
        createNode('a5', 'action', 'Consulta Médica', 400, 800),
        createNode('a6', 'action', 'Diagnóstico (ML Assist)', 400, 950),
        createNode('c2', 'condition', '¿Requiere Estudios?', 400, 1100),
        createNode('a7', 'action', 'Ordenar Estudios', 600, 1250),
        createNode('a8', 'action', 'Prescribir Tratamiento', 400, 1400),
        createNode('a9', 'action', 'Facturar', 400, 1550),
        createNode('a10', 'action', 'Agendar Seguimiento', 400, 1700),
    ],
    edges: [
        createEdge('t1', 'a1'),
        createEdge('a1', 'a2'),
        createEdge('a2', 'c1'),
        createEdge('c1', 'a3', 'yes'),
        createEdge('c1', 'a4', 'no'),
        createEdge('a3', 'a5'),
        createEdge('a4', 'a5'),
        createEdge('a5', 'a6'),
        createEdge('a6', 'c2'),
        createEdge('c2', 'a7', 'yes'),
        createEdge('c2', 'a8', 'no'),
        createEdge('a7', 'a8'),
        createEdge('a8', 'a9'),
        createEdge('a9', 'a10'),
    ],
    mlModels: [
        'Predicción de No-Shows',
        'Asistente de Diagnóstico',
        'Predicción de Ocupación de Camas',
        'Optimización de Agenda',
        'Detección de Complicaciones Tempranas'
    ],
    kpis: [
        'Tiempo Promedio de Espera',
        'Tasa de Ocupación',
        'No-Show Rate',
        'Satisfacción del Paciente',
        'Tiempo Promedio de Consulta'
    ]
};

/**
 * LOGISTICS / TRANSPORTE
 */
export const logisticsCognitiveTemplate: CognitiveWorkflowTemplate = {
    id: 'logistics_cognitive',
    name: 'Logística Cognitiva',
    description: 'Optimización de rutas con predicción de ETAs y gestión de flotas',
    industry: 'Logística',
    icon: Truck,
    nodes: [
        createNode('t1', 'trigger', 'Nueva Orden de Envío', 400, 50, { icon: 'package' }),
        createNode('a1', 'action', 'Optimizar Ruta (ML)', 400, 200),
        createNode('a2', 'action', 'Asignar Vehículo', 400, 350),
        createNode('c1', 'condition', '¿Capacidad Disponible?', 400, 500),
        createNode('a3', 'action', 'Consolidar Envíos', 200, 650),
        createNode('a4', 'action', 'Programar Recolección', 600, 650),
        createNode('a5', 'action', 'Cargar Mercancía', 400, 800),
        createNode('a6', 'action', 'Iniciar Tránsito', 400, 950),
        createNode('a7', 'action', 'Rastreo GPS en Tiempo Real', 400, 1100),
        createNode('c2', 'condition', '¿Retraso Detectado?', 400, 1250),
        createNode('a8', 'action', 'Notificar Cliente', 600, 1400),
        createNode('a9', 'action', 'Recalcular ETA (ML)', 600, 1550),
        createNode('a10', 'action', 'Entregar Mercancía', 400, 1700),
        createNode('a11', 'action', 'Capturar POD', 400, 1850),
        createNode('a12', 'action', 'Actualizar Estado', 400, 2000),
    ],
    edges: [
        createEdge('t1', 'a1'),
        createEdge('a1', 'a2'),
        createEdge('a2', 'c1'),
        createEdge('c1', 'a3', 'no'),
        createEdge('c1', 'a4', 'yes'),
        createEdge('a3', 'a4'),
        createEdge('a4', 'a5'),
        createEdge('a5', 'a6'),
        createEdge('a6', 'a7'),
        createEdge('a7', 'c2'),
        createEdge('c2', 'a8', 'yes'),
        createEdge('c2', 'a10', 'no'),
        createEdge('a8', 'a9'),
        createEdge('a9', 'a10'),
        createEdge('a10', 'a11'),
        createEdge('a11', 'a12'),
    ],
    mlModels: [
        'Optimización de Rutas Dinámicas',
        'Predicción de Tiempos de Entrega (ETA)',
        'Detección de Retrasos',
        'Predicción de Consumo de Combustible',
        'Consolidación Inteligente de Envíos'
    ],
    kpis: [
        'On-Time Delivery Rate',
        'Costo por Km',
        'Utilización de Flota',
        'Tiempo Promedio de Entrega',
        'Satisfacción del Cliente'
    ]
};

/**
 * HOSPITALITY / F&B
 */
export const hospitalityCognitiveTemplate: CognitiveWorkflowTemplate = {
    id: 'hospitality_cognitive',
    name: 'Hospitalidad Cognitiva',
    description: 'Gestión de restaurante/hotel con predicción de demanda y optimización de inventario',
    industry: 'Hospitalidad',
    icon: Utensils,
    nodes: [
        createNode('t1', 'trigger', 'Compra de Insumos', 400, 50, { icon: 'package' }),
        createNode('a1', 'action', 'Verificar Calidad', 400, 200),
        createNode('a2', 'action', 'Almacenar Insumos', 400, 350),
        createNode('t2', 'trigger', 'Inicio de Turno', 400, 500, { icon: 'zap' }),
        createNode('a3', 'action', 'Calcular Mise en Place (ML)', 400, 650),
        createNode('a4', 'action', 'Preparar Ingredientes', 400, 800),
        createNode('t3', 'trigger', 'Nueva Orden', 400, 950, { icon: 'users' }),
        createNode('c1', 'condition', '¿Ingredientes Disponibles?', 400, 1100),
        createNode('a5', 'action', 'Sugerir Alternativa', 200, 1250),
        createNode('a6', 'action', 'Preparar Platillo', 600, 1250),
        createNode('a7', 'action', 'Control de Calidad', 400, 1400),
        createNode('a8', 'action', 'Servir al Cliente', 400, 1550),
        createNode('a9', 'action', 'Generar Cuenta', 400, 1700),
        createNode('t4', 'trigger', 'Cierre de Turno', 400, 1850, { icon: 'banknote' }),
        createNode('a10', 'action', 'Calcular Merma', 400, 2000),
        createNode('a11', 'action', 'Cerrar Caja', 400, 2150),
        createNode('c2', 'condition', '¿Stock Mínimo?', 400, 2300),
        createNode('a12', 'action', 'Generar Orden de Compra', 600, 2450),
    ],
    edges: [
        createEdge('t1', 'a1'),
        createEdge('a1', 'a2'),
        createEdge('a2', 't2'),
        createEdge('t2', 'a3'),
        createEdge('a3', 'a4'),
        createEdge('a4', 't3'),
        createEdge('t3', 'c1'),
        createEdge('c1', 'a5', 'no'),
        createEdge('c1', 'a6', 'yes'),
        createEdge('a5', 'a6'),
        createEdge('a6', 'a7'),
        createEdge('a7', 'a8'),
        createEdge('a8', 'a9'),
        createEdge('a9', 't4'),
        createEdge('t4', 'a10'),
        createEdge('a10', 'a11'),
        createEdge('a11', 'c2'),
        createEdge('c2', 'a12', 'yes'),
    ],
    mlModels: [
        'Predicción de Demanda por Horario',
        'Optimización de Mise en Place',
        'Detección de Merma Anormal',
        'Predicción de Ventas por Día/Clima',
        'Optimización de Menú'
    ],
    kpis: [
        'Ticket Promedio',
        '% Merma',
        'Rotación de Mesas',
        'Costo de Alimentos (%)',
        'Satisfacción del Cliente'
    ]
};

/**
 * TECHNOLOGY / SAAS
 */
export const technologyCognitiveTemplate: CognitiveWorkflowTemplate = {
    id: 'technology_cognitive',
    name: 'Technology Cognitiva',
    description: 'Gestión de SaaS con predicción de churn y optimización de onboarding',
    industry: 'Tecnología',
    icon: Laptop,
    nodes: [
        createNode('t1', 'trigger', 'Nuevo Lead', 400, 50, { icon: 'users' }),
        createNode('a1', 'action', 'Calificar Lead (ML)', 400, 200),
        createNode('c1', 'condition', '¿Lead Calificado?', 400, 350),
        createNode('a2', 'action', 'Nurturing Automático', 200, 500),
        createNode('a3', 'action', 'Agendar Demo', 600, 500),
        createNode('a4', 'action', 'Realizar Demo', 400, 650),
        createNode('t2', 'trigger', 'Trial Iniciado', 400, 800, { icon: 'zap' }),
        createNode('a5', 'action', 'Onboarding Personalizado (ML)', 400, 950),
        createNode('a6', 'action', 'Monitorear Uso', 400, 1100),
        createNode('c2', 'condition', '¿Riesgo de Churn?', 400, 1250),
        createNode('a7', 'action', 'Intervención Proactiva', 600, 1400),
        createNode('t3', 'trigger', 'Conversión a Pago', 400, 1550, { icon: 'check-circle' }),
        createNode('a8', 'action', 'Activar Cuenta', 400, 1700),
        createNode('a9', 'action', 'Asignar CSM', 400, 1850),
        createNode('a10', 'action', 'Monitoreo Continuo', 400, 2000),
        createNode('c3', 'condition', '¿Oportunidad de Upsell?', 400, 2150),
        createNode('a11', 'action', 'Sugerir Upgrade', 600, 2300),
    ],
    edges: [
        createEdge('t1', 'a1'),
        createEdge('a1', 'c1'),
        createEdge('c1', 'a2', 'no'),
        createEdge('c1', 'a3', 'yes'),
        createEdge('a2', 'a3'),
        createEdge('a3', 'a4'),
        createEdge('a4', 't2'),
        createEdge('t2', 'a5'),
        createEdge('a5', 'a6'),
        createEdge('a6', 'c2'),
        createEdge('c2', 'a7', 'yes'),
        createEdge('c2', 't3', 'no'),
        createEdge('a7', 't3'),
        createEdge('t3', 'a8'),
        createEdge('a8', 'a9'),
        createEdge('a9', 'a10'),
        createEdge('a10', 'c3'),
        createEdge('c3', 'a11', 'yes'),
    ],
    mlModels: [
        'Calificación de Leads',
        'Predicción de Conversión',
        'Detección de Riesgo de Churn',
        'Personalización de Onboarding',
        'Predicción de Oportunidades de Upsell'
    ],
    kpis: [
        'Tasa de Conversión Trial-to-Paid',
        'Churn Rate',
        'LTV (Lifetime Value)',
        'CAC (Customer Acquisition Cost)',
        'NPS (Net Promoter Score)'
    ]
};

// Exportar todos los templates
export const allCognitiveTemplates: CognitiveWorkflowTemplate[] = [
    retailCognitiveTemplate,
    servicesCognitiveTemplate,
    manufacturingCognitiveTemplate,
    healthcareCognitiveTemplate,
    logisticsCognitiveTemplate,
    hospitalityCognitiveTemplate,
    technologyCognitiveTemplate,
];

export default allCognitiveTemplates;
