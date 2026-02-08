
import { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    Node,
    Edge,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
    Handle,
    Position,
    NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './workflow.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Package,
    ArrowRight,
    Settings2,
    CheckCircle2,
    AlertCircle,
    Plus,
    Minus,
    Trash2,
    Save,
    Zap,
    Activity,
    GitBranch,
    Bot,
    Play,
    Eye,
    Sigma,
    Coins,
    X,
    Clock,
    Send,
    Split,
    Divide
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UniversalWorkflowNode } from './nodes/UniversalWorkflowNode';

const nodeTypes = {
    start: UniversalWorkflowNode,
    end: UniversalWorkflowNode,
    process: UniversalWorkflowNode,
    quality: UniversalWorkflowNode,
    trigger: UniversalWorkflowNode,
    action: UniversalWorkflowNode,
    delay: UniversalWorkflowNode,
    conditional: UniversalWorkflowNode,
    decision: UniversalWorkflowNode,
    notification: UniversalWorkflowNode,
    ai_agent: UniversalWorkflowNode,
    display: UniversalWorkflowNode,
    math_add: UniversalWorkflowNode,
    math_subtract: UniversalWorkflowNode,
    math_divide: UniversalWorkflowNode,
    math_multiply: UniversalWorkflowNode,
    math_sum_all: UniversalWorkflowNode,
    api_currency: UniversalWorkflowNode,
    inventory_out: UniversalWorkflowNode,
    inventory_in: UniversalWorkflowNode,
    piecework: UniversalWorkflowNode,
};

// Default edge style
const defaultEdgeOptions = {
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#1e293b', strokeWidth: 2 },
};

// --- Main Editor Component ---

interface ProcessWorkflowEditorProps {
    initialNodes?: Node[];
    initialEdges?: Edge[];
    inventory: any[];
    tasks: any[];
    onSave?: (nodes: Node[], edges: Edge[]) => void;
}

export function ProcessWorkflowEditor({
    initialNodes = [],
    initialEdges = [],
    inventory,
    tasks,
    onSave
}: ProcessWorkflowEditorProps) {
    const [nodes, setNodes] = useState<Node[]>(initialNodes && initialNodes.length > 0 ? initialNodes : [
        {
            id: 'start-1',
            type: 'start',
            position: { x: -100, y: 200 },
            data: {
                label: 'Compra de Coco',
                subLabel: 'Materia Prima Inicial',
                items: [{ id: 'coco-parent', type: 'product', yield: 1 }]
            }
        },
        {
            id: 'destopado-1',
            type: 'process',
            position: { x: 250, y: 200 },
            data: {
                label: 'Destopado',
                subLabel: 'Remoción de Estopa',
                pieceworkRate: 0.40,
                items: [{ id: 'coco-parent', type: 'product' }],
                subproducts: [
                    { productId: 'coco-sin-estopa', ratio: 1 },
                    { productId: 'estopa', isVariable: true, unit: 'm3' }
                ]
            }
        },
        {
            id: 'decision-1',
            type: 'decision',
            position: { x: 600, y: 200 },
            data: {
                label: 'Control Calidad',
                subLabel: 'Validación de Lote',
                branches: ['Lote Aprobado', 'Rechazo/Desecho']
            }
        },
        {
            id: 'deshuesado-1',
            type: 'process',
            position: { x: 950, y: 100 },
            data: {
                label: 'Deshuesado',
                subLabel: 'Extracción de Almendra',
                pieceworkRate: 0.35,
                subproducts: [
                    { productId: 'almendra-coco', ratio: 1 },
                    { productId: 'agua-coco', isVariable: true, unit: 'L' }
                ]
            }
        },
        {
            id: 'pelado-1',
            type: 'process',
            position: { x: 1300, y: 100 },
            data: {
                label: 'Pelado de Pulpa',
                subLabel: 'Procesamiento Final',
                pieceworkRate: 2.00,
                subproducts: [
                    { productId: 'pulpa-coco', isVariable: true, unit: 'Kg' }
                ]
            }
        },
        {
            id: 'end-1',
            type: 'end',
            position: { x: 1650, y: 200 },
            data: { label: 'Producto Terminado', subLabel: 'Almacén Central' }
        }
    ]);

    const [edges, setEdges] = useState<Edge[]>(initialEdges && initialEdges.length > 0 ? initialEdges : [
        { id: 'e1-2', source: 'start-1', target: 'destopado-1', animated: true },
        { id: 'e2-3', source: 'destopado-1', target: 'decision-1', animated: true },
        { id: 'e3-4', source: 'decision-1', sourceHandle: 'branch-0', target: 'deshuesado-1', animated: true },
        { id: 'e4-5', source: 'deshuesado-1', target: 'pelado-1', animated: true },
        { id: 'e5-6', source: 'pelado-1', target: 'end-1', animated: true }
    ]);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    // Simulation Engine State
    const [isSimulating, setIsSimulating] = useState(false);
    const [simStep, setSimStep] = useState(0);
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const [simValues, setSimValues] = useState<Record<string, any>>({});
    const [simHistory, setSimHistory] = useState<string[]>([]);

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => {
            setNodes((nds) => applyNodeChanges(changes, nds));
        },
        []
    );

    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => {
            setEdges((eds) => applyEdgeChanges(changes, eds));
        },
        []
    );

    const onConnect: OnConnect = useCallback(
        (connection) => {
            setEdges((eds) => addEdge(connection, eds));
        },
        []
    );

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
    }, []);

    const addNode = (type: string) => {
        const id = `${type}-${Date.now()}`;
        const newNode: Node = {
            id,
            type,
            position: { x: 250, y: 150 },
            data: {
                label: type === 'process' ? 'Nueva Tarea' : type === 'quality' ? 'Control Calidad' : type === 'start' ? 'Entrada' : 'Salida',
                onDelete: () => {
                    setNodes((nds) => nds.filter((n) => n.id !== id));
                }
            },
        };
        setNodes((nds) => nds.concat(newNode));
    };

    const updateNodeData = (key: string, value: any) => {
        if (!selectedNode) return;
        setNodes((nds) => {
            const nextNodes = nds.map((node) => {
                if (node.id === selectedNode.id) {
                    const newData = { ...node.data, [key]: value };
                    // Look up inventory name if it's an ID
                    if (key === 'inventoryId') {
                        const product = inventory.find(i => i.id === value);
                        if (product) newData.label = product.name;
                    }
                    return { ...node, data: newData };
                }
                return node;
            });
            return nextNodes;
        });
        // Visual update of selected node local wrapper
        setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, [key]: value } } : null);
    };

    const deleteSelectedNode = () => {
        if (!selectedNode) return;
        setNodes((nds) => {
            const nextNodes = nds.filter((n) => n.id !== selectedNode.id);
            return nextNodes;
        });
        setSelectedNode(null);
    }

    // Derived lists
    const inputProducts = useMemo(() => inventory.filter((i: any) => i.isProductionInput), [inventory]);
    const outputProducts = useMemo(() => inventory.filter((i: any) => i.isProductionOutput), [inventory]);

    // --- Simulation Logic ---

    const toggleSimulation = () => {
        const nextState = !isSimulating;
        setIsSimulating(nextState);

        if (nextState) {
            // Find start node
            const startNode = nodes.find(n => n.type === 'start');
            setActiveNodeId(startNode?.id || null);
            setSimStep(0);
            setSimHistory([]);

            // Initialize simulation values (extract from display nodes or defaults)
            const initialValues: any = {};
            nodes.forEach(n => {
                if (n.data?.values) {
                    Object.assign(initialValues, n.data.values);
                }
            });
            setSimValues(initialValues);
        } else {
            setActiveNodeId(null);
        }

        setNodes(nds => nds.map(n => ({
            ...n,
            data: { ...n.data, simActive: nextState, activeStep: false }
        })));

        setEdges(eds => eds.map(e => ({
            ...e,
            animated: nextState,
            activeSim: false,
            style: { stroke: nextState ? '#10b981' : '#1e293b', strokeWidth: 2 }
        })));
    };

    const runSimulationStep = useCallback(() => {
        if (!activeNodeId) return;

        const currentNode = nodes.find(n => n.id === activeNodeId);
        if (!currentNode) return;

        setSimStep(s => s + 1);
        setSimHistory(h => [...h, activeNodeId]);

        // 1. Process Logic of Current Node
        let nextValues = { ...simValues };

        // Support for Math Nodes
        if (currentNode.type?.startsWith('math_') && currentNode.data.expression) {
            const expression = currentNode.data.expression;
            // Enhanced expression evaluation: replace {{var}} with actual values
            let evalExpr = expression.replace(/{{(.*?)}}/g, (_: string, varName: string) => {
                return (Number(nextValues[varName]) || 0).toString();
            });

            try {
                // Safe evaluation for basic math
                // eslint-disable-next-line no-eval
                const result = eval(evalExpr);
                // If it's a display/indicator node or we want to store the result
                if (currentNode.data.resultVar) {
                    nextValues[currentNode.data.resultVar] = result;
                } else {
                    // Default behavior: if expression is just a variable mutation
                    const variableMatch = expression.match(/{{(.*?)}}/);
                    if (variableMatch) {
                        nextValues[variableMatch[1]] = result;
                    }
                }
                setSimValues(nextValues);
            } catch (e) {
                console.error("Expression error", e);
            }
        }

        // 2. Find Next Node via Edges
        const outgoingEdges = edges.filter(e => e.source === activeNodeId);
        let nextNodeId: string | null = null;

        if (currentNode.type === 'decision' || currentNode.type === 'conditional') {
            // Logic for decisions: For simulation, we can prompt or default to first branch
            // For now, let's take the first branch unless branches are empty
            const firstEdge = outgoingEdges.find(e => e.sourceHandle === 'branch-0') || outgoingEdges[0];
            nextNodeId = firstEdge?.target || null;
        } else {
            nextNodeId = outgoingEdges[0]?.target || null;
        }

        setActiveNodeId(nextNodeId);

        // 3. Update Visuals
        setNodes(nds => nds.map(n => ({
            ...n,
            data: {
                ...n.data,
                activeStep: n.id === nextNodeId,
                simValues: nextValues
            }
        })));

        setEdges(eds => eds.map(e => ({
            ...e,
            activeSim: (e.source === activeNodeId && e.target === nextNodeId),
            animated: true,
            style: {
                stroke: (e.source === activeNodeId && e.target === nextNodeId) ? '#22d3ee' : '#10b981',
                strokeWidth: (e.source === activeNodeId && e.target === nextNodeId) ? 4 : 2
            }
        })));

    }, [activeNodeId, nodes, edges, simValues]);

    const nodesWithContext = useMemo(() =>
        nodes.map(n => ({
            ...n,
            data: {
                ...n.data,
                inventory,
                tasks,
                simValues,
                simActive: isSimulating,
            }
        }))
        , [nodes, inventory, tasks, simValues, isSimulating]);

    return (
        <div className="flex h-[800px] border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
            {/* Sidebar: Node Library */}
            <div className="w-[280px] border-r border-slate-800 bg-[#0a0f1d] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-900/30">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Biblioteca de Nodos</h2>
                    <p className="text-[10px] text-slate-400 italic">Arrastra o haz clic para añadir</p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                    <button
                        className="w-full flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-blue-500/5 hover:border-blue-500/30 transition-all text-left group"
                        onClick={() => addNode('start')}
                    >
                        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                            <Play className="w-4 h-4 fill-current" />
                        </div>
                        <div>
                            <div className="text-[11px] font-bold text-slate-200">Inicio de Flujo</div>
                            <div className="text-[9px] text-slate-500 leading-tight">Punto de entrada para la producción</div>
                        </div>
                    </button>

                    <button
                        className="w-full flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-amber-500/5 hover:border-amber-500/30 transition-all text-left group"
                        onClick={() => addNode('action')}
                    >
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                            <Activity className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[11px] font-bold text-slate-200">Proceso / Acción</div>
                            <div className="text-[9px] text-slate-500 leading-tight">Transformación o tarea física</div>
                        </div>
                    </button>

                    <button
                        className="w-full flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-orange-500/5 hover:border-orange-500/30 transition-all text-left group"
                        onClick={() => addNode('decision')}
                    >
                        <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 group-hover:scale-110 transition-transform">
                            <Split className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[11px] font-bold text-slate-200">Decisión</div>
                            <div className="text-[9px] text-slate-500 leading-tight">Ramas basadas en condiciones</div>
                        </div>
                    </button>

                    <button
                        className="w-full flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-cyan-500/5 hover:border-cyan-500/30 transition-all text-left group"
                        onClick={() => addNode('display')}
                    >
                        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
                            <Eye className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[11px] font-bold text-slate-200">Indicador / Datos</div>
                            <div className="text-[9px] text-slate-500 leading-tight">Muestra métricas en tiempo real</div>
                        </div>
                    </button>

                    <button
                        className="w-full flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all text-left group"
                        onClick={() => addNode('delay')}
                    >
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                            <Clock className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[11px] font-bold text-slate-200">Espera / Delay</div>
                            <div className="text-[9px] text-slate-500 leading-tight">Pausa el flujo temporalmente</div>
                        </div>
                    </button>

                    <button
                        className="w-full flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-blue-500/5 hover:border-blue-500/30 transition-all text-left group"
                        onClick={() => addNode('notification')}
                    >
                        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                            <Send className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[11px] font-bold text-slate-200">Notificación</div>
                            <div className="text-[9px] text-slate-500 leading-tight">Alerta a supervisores</div>
                        </div>
                    </button>

                    <div className="pt-4 px-2">
                        <Label className="text-[9px] font-black uppercase text-slate-600 tracking-widest mb-3 flex items-center gap-2">
                            <Zap className="w-2.5 h-2.5" /> Matemáticas
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-12 border-slate-800 bg-slate-900/30 hover:bg-pink-500/5 hover:border-pink-500/30 text-pink-400 text-[10px] font-bold gap-2"
                                onClick={() => addNode('math_add')}
                            >
                                <Plus className="w-3 h-3" /> SUMA
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-12 border-slate-800 bg-slate-900/30 hover:bg-cyan-500/5 hover:border-cyan-500/30 text-cyan-400 text-[10px] font-bold gap-2"
                                onClick={() => addNode('math_subtract')}
                            >
                                <Minus className="w-3 h-3" /> RESTA
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            <Separator className="bg-slate-800" />

            {/* Main Editor Area */}
            <div className="flex-1 relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
                {/* Simulation Toolbar (Top Overlay) */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-full px-4 py-1.5 gap-3 shadow-2xl">
                    <div className="flex items-center gap-2 border-r border-slate-800 pr-3 mr-1">
                        <div className={cn("w-2 h-2 rounded-full", isSimulating ? "bg-emerald-500 animate-ping" : "bg-slate-700")} />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            {isSimulating ? "SIMULACIÓN ACTIVA" : "EDITOR DE FLUJO"}
                        </span>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-8 w-8", isSimulating ? "text-red-400" : "text-emerald-400")}
                        onClick={toggleSimulation}
                    >
                        {isSimulating ? <Trash2 className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    </Button>

                    {isSimulating && (
                        <>
                            <Separator orientation="vertical" className="h-4 bg-slate-800" />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-3 text-[10px] font-bold text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 gap-2"
                                onClick={runSimulationStep}
                                disabled={!activeNodeId}
                            >
                                <ArrowRight className="w-3.5 h-3.5" />
                                PASO SIGUIENTE
                            </Button>
                        </>
                    )}

                    <Separator orientation="vertical" className="h-4 bg-slate-800" />

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-blue-400"
                        onClick={() => onSave?.(nodes, edges)}
                    >
                        <Save className="w-4 h-4" />
                    </Button>
                </div>

                <ReactFlow
                    nodes={nodesWithContext}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    nodeTypes={nodeTypes}
                    defaultEdgeOptions={defaultEdgeOptions}
                    fitView
                    className="bg-transparent"
                >
                    {isSimulating && (
                        <div className="absolute top-16 left-4 z-10 bg-slate-900/90 border border-slate-800 p-3 rounded-xl backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-left-4">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Simulación en Vivo</h4>
                            <div className="space-y-1.5">
                                {Object.entries(simValues).map(([key, val]) => (
                                    <div key={key} className="flex items-center justify-between gap-4">
                                        <span className="text-[10px] text-slate-400 font-bold tracking-tight">{key.replace('_', ' ')}:</span>
                                        <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
                                            {val}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <Background color="#1e293b" gap={16} />
                    <Controls className="bg-slate-900 border-slate-800 text-slate-400" />
                </ReactFlow>
            </div>

            <Separator orientation="vertical" className="bg-slate-800" />

            {/* Properties Panel (Right) */}
            <div className="w-[320px] bg-[#0a0f1d] flex flex-col">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-xs font-black uppercase tracking-widest text-white">Propiedades</h2>
                        {selectedNode && (
                            <Badge variant="outline" className="text-[8px] bg-blue-500/5 border-blue-500/20 text-blue-400 px-1 py-0">
                                {selectedNode.type?.toUpperCase()}
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {selectedNode ? (
                        <div className="space-y-6">
                            {/* General Settings */}
                            <section className="space-y-3">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">General</Label>
                                <div className="space-y-2">
                                    <Label className="text-[11px] text-slate-400">Título del Nodo</Label>
                                    <Input
                                        value={selectedNode.data?.label || ''}
                                        onChange={(e) => updateNodeData('label', e.target.value)}
                                        className="h-9 text-xs bg-slate-950/50 border-slate-800 text-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[11px] text-slate-400">Descripción / Notas</Label>
                                    <textarea
                                        className="w-full min-h-[60px] text-[10px] bg-slate-950/50 border border-slate-800 rounded-md p-2 outline-none text-slate-300 resize-none"
                                        value={selectedNode.data?.description || ''}
                                        onChange={(e) => updateNodeData('description', e.target.value)}
                                    />
                                </div>
                            </section>

                            <Separator className="bg-slate-800/50" />

                            {/* Node Specific Settings */}
                            <section className="space-y-4">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Lógica & Datos</Label>

                                {selectedNode.type?.startsWith('math_') && (
                                    <div className="space-y-4">
                                        <div className="flex-1 space-y-2">
                                            <Label className="text-[11px] text-cyan-400 font-bold">Variable Resultado</Label>
                                            <Input
                                                value={selectedNode.data?.resultVar || ''}
                                                onChange={(e) => updateNodeData('resultVar', e.target.value)}
                                                placeholder="nombre_variable"
                                                className="h-8 text-xs bg-slate-950 border-cyan-500/20 text-cyan-50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Zap className="w-3 h-3 text-cyan-400" />
                                                <Label className="text-[11px] text-cyan-400 font-bold">Expresión</Label>
                                            </div>
                                            <Input
                                                value={selectedNode.data?.expression || ''}
                                                onChange={(e) => updateNodeData('expression', e.target.value)}
                                                placeholder="{{ejemplo}} + 1"
                                                className="h-8 text-xs bg-slate-950 border-cyan-500/20 font-mono text-cyan-50"
                                            />
                                        </div>
                                    </div>
                                )}

                                {selectedNode.type === 'start' && (
                                    <div className="space-y-4 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                                        <div className="space-y-2">
                                            <Label className="text-[11px] text-emerald-400 font-bold">Tipo de Entrada</Label>
                                            <select
                                                className="w-full text-[10px] bg-slate-950 border border-slate-800 rounded-md p-1.5 text-slate-300"
                                                value={selectedNode.data?.inputType || 'master'}
                                                onChange={(e) => updateNodeData('inputType', e.target.value)}
                                            >
                                                <option value="master">Master Product (Configurable)</option>
                                                <option value="sku">SKU Específico</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[11px] text-emerald-400 font-bold">Ubicación Inicial</Label>
                                            <select
                                                className="w-full text-[10px] bg-slate-950 border border-slate-800 rounded-md p-1.5 text-slate-300"
                                                value={selectedNode.data?.location || ''}
                                                onChange={(e) => updateNodeData('location', e.target.value)}
                                            >
                                                <option value="">-- No Definido --</option>
                                                <option value="patio">Patio de Recepción</option>
                                                <option value="cestas">Área de Cestas</option>
                                                <option value="almacen">Almacén General</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {selectedNode.type === 'process' && (
                                    <div className="space-y-4 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                                        <div className="space-y-2">
                                            <Label className="text-[11px] text-amber-400 font-bold">Ubicación de Proceso</Label>
                                            <select
                                                className="w-full text-[10px] bg-slate-950 border border-slate-800 rounded-md p-1.5 text-slate-300"
                                                value={selectedNode.data?.location || ''}
                                                onChange={(e) => updateNodeData('location', e.target.value)}
                                            >
                                                <option value="">-- No Definido --</option>
                                                <option value="patio">Patio de Trabajo</option>
                                                <option value="cestas">Línea de Cestas</option>
                                                <option value="empaque">Área de Empaque</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {(['start', 'end', 'inventory_in', 'inventory_out'].includes(selectedNode.type || '')) && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[11px] text-slate-400">Items/Productos</Label>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-6 px-2 text-[9px] border-slate-800"
                                                onClick={() => {
                                                    const items = selectedNode.data?.items || [];
                                                    updateNodeData('items', [...items, { id: '', yield: 1 }]);
                                                }}
                                            >+ Item</Button>
                                        </div>
                                        <div className="space-y-2">
                                            {(selectedNode.data?.items || []).map((item: any, idx: number) => (
                                                <div key={idx} className="flex gap-2">
                                                    <select
                                                        className="flex-1 text-[10px] bg-slate-950 border border-slate-800 rounded-md p-1 text-slate-300"
                                                        value={item.id}
                                                        onChange={(e) => {
                                                            const newItems = [...selectedNode.data.items];
                                                            newItems[idx] = { ...item, id: e.target.value };
                                                            updateNodeData('items', newItems);
                                                        }}
                                                    >
                                                        <option value="">-- Seleccionar --</option>
                                                        {inventory.map((p: any) => (
                                                            <option key={p.id} value={p.id}>{p.name}</option>
                                                        ))}
                                                    </select>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-slate-600 hover:text-red-500"
                                                        onClick={() => {
                                                            const newItems = selectedNode.data.items.filter((_: any, i: number) => i !== idx);
                                                            updateNodeData('items', newItems);
                                                        }}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(['decision', 'conditional'].includes(selectedNode.type || '')) && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[11px] text-slate-400">Ramas de Salida</Label>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-6 px-2 text-[9px] border-slate-800"
                                                onClick={() => {
                                                    const branches = selectedNode.data?.branches || ['Default'];
                                                    updateNodeData('branches', [...branches, `Rama ${branches.length + 1}`]);
                                                }}
                                            >+ Rama</Button>
                                        </div>
                                        <div className="space-y-2">
                                            {(selectedNode.data?.branches || []).map((branch: string, i: number) => (
                                                <div key={i} className="flex gap-2">
                                                    <Input
                                                        value={branch}
                                                        onChange={(e) => {
                                                            const newBranches = [...selectedNode.data.branches];
                                                            newBranches[i] = e.target.value;
                                                            updateNodeData('branches', newBranches);
                                                        }}
                                                        className="h-8 text-xs bg-slate-950/50 border-slate-800 text-slate-300"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500"
                                                        onClick={() => {
                                                            const newBranches = selectedNode.data.branches.filter((_: any, idx: number) => idx !== i);
                                                            updateNodeData('branches', newBranches.length > 0 ? newBranches : ['Default']);
                                                        }}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedNode.type === 'process' && !selectedNode.data?.subproducts && (
                                    <div className="space-y-3">
                                        <Label className="text-[11px] text-slate-400">Configuración de Proceso</Label>
                                        <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                                            <p className="text-[10px] text-slate-500 italic">No hay parámetros específicos para este nodo.</p>
                                        </div>
                                    </div>
                                )}
                            </section>

                            <Separator className="bg-slate-800/50" />

                            <div className="pt-2">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full h-8 text-[10px] font-black uppercase gap-2"
                                    onClick={deleteSelectedNode}
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Eliminar Nodo
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-3 px-6 text-center opacity-40">
                            <div className="w-16 h-16 rounded-2xl bg-slate-800/20 border border-slate-800 flex items-center justify-center">
                                <Settings2 className="w-8 h-8" />
                            </div>
                            <p className="text-xs uppercase tracking-tighter font-black">Editor de Propiedades</p>
                            <p className="text-[10px] italic">Selecciona un nodo para configurar</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
