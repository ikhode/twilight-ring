import { Node, Edge } from 'reactflow';
import { flowTemplates } from '@/data/flowTemplates';

export interface ProcessTemplate {
    nodes: Node[];
    edges: Edge[];
}

export const processGenerator = {
    /**
     * Generates a node graph based on industry keywords.
     * Checks predefined templates first, then falls back to heuristics.
     */
    generateFlow: (industry: string): ProcessTemplate => {
        const keywords = industry.toLowerCase();

        // 1. Try to find a matching template
        const matchedTemplate = flowTemplates.find(t =>
            keywords.includes(t.industry.toLowerCase()) ||
            keywords.includes(t.name.toLowerCase()) ||
            keywords.includes(t.id)
        );

        if (matchedTemplate) {
            // Clone to avoid reference issues if modified in UI
            return {
                nodes: JSON.parse(JSON.stringify(matchedTemplate.nodes)),
                edges: JSON.parse(JSON.stringify(matchedTemplate.edges))
            };
        }

        // 2. Fallback to existing heuristics (kept for backward compatibility or custom inputs)
        const nodes: Node[] = [];
        const edges: Edge[] = [];

        // Helper to add node
        let y = 50;
        const addStep = (label: string, type: 'input' | 'default' | 'output' = 'default') => {
            const id = `node-${nodes.length + 1}`;
            nodes.push({
                id,
                type,
                data: { label },
                position: { x: 250, y },
            });
            y += 100;
            return id;
        };

        // Helper to connect
        const connect = (source: string, target: string) => {
            edges.push({ id: `e${source}-${target}`, source, target, animated: false });
        };

        if (keywords.includes('bakery') || keywords.includes('food') || keywords.includes('panaderia') || keywords.includes('comida')) {
            const n1 = addStep('Recepción de Insumos', 'input');
            const n2 = addStep('Control de Calidad (Inventario)');
            const n3 = addStep('Producción / Cocina');
            const n4 = addStep('Empaquetado / Emplatado');
            const n5 = addStep('Venta (POS)', 'output');

            connect(n1, n2);
            connect(n2, n3);
            connect(n3, n4);
            connect(n4, n5);
        }
        else if (keywords.includes('logistics') || keywords.includes('transporte') || keywords.includes('envios')) {
            const n1 = addStep('Recepción de Pedido', 'input');
            const n2 = addStep('Asignación de Ruta (IA)');
            const n3 = addStep('Carga de Camión');
            const n4 = addStep('Entrega al Cliente');
            const n5 = addStep('Confirmación POD', 'output');

            connect(n1, n2);
            connect(n2, n3);
            connect(n3, n4);
            connect(n4, n5);
        }
        else if (keywords.includes('hotel') || keywords.includes('hospitality') || keywords.includes('turismo') || keywords.includes('hospedaje') || keywords.includes('hoteles')) {
            const n1 = addStep('Reserva / Check-in', 'input');
            const n2 = addStep('Asignación de Habitación');
            const n3 = addStep('Servicios / Housekeeping');
            const n4 = addStep('Consumo / Restaurante');
            const n5 = addStep('Check-out / Facturación', 'output');

            connect(n1, n2);
            connect(n2, n3);
            connect(n3, n4);
            connect(n4, n5);
        }
        else if (keywords.includes('tech') || keywords.includes('software') || keywords.includes('agencia')) {
            const n1 = addStep('Nuevo Lead (CRM)', 'input');
            const n2 = addStep('Reunión de Discovery');
            const n3 = addStep('Propuesta Comercial');
            const n4 = addStep('Firma de Contrato');
            const n5 = addStep('Onboarding Cliente', 'output');

            connect(n1, n2);
            connect(n2, n3);
            connect(n3, n4);
            connect(n4, n5);
        }
        else {
            // Generic Fallback
            const n1 = addStep('Entrada (Inicio)', 'input');
            const n2 = addStep('Proceso Principal');
            const n3 = addStep('Control de Calidad');
            const n4 = addStep('Salida (Fin)', 'output');

            connect(n1, n2);
            connect(n2, n3);
            connect(n3, n4);

        }

        return { nodes, edges };
    }
};
