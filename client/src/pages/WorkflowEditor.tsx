import { useState, useCallback, useEffect, useMemo } from "react";
import ReactFlow, {
    Background,
    Controls,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    Node,
    Edge,
    Position,
    Connection,
    OnNodesChange,
    OnEdgesChange,
    ReactFlowProvider,
    BackgroundVariant,
    MiniMap,
    Panel,
    MarkerType,
} from "reactflow";
import dagre from 'dagre';
import "reactflow/dist/style.css";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import {
    Zap,
    Settings2,
    Save,
    Play,
    Search,
    Layers,
    Bot,
    ArrowLeft,
    Check,
    LayoutGrid,
    Navigation2,
    Plus,
    Trash2
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Link, useSearch, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { simulateWorkflow, SimulationResult, SimulationStep } from "@/lib/simulation-engine";
import {
    Tooltip as UiTooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Custom Nodes
import TriggerNode from "@/components/workflow/nodes/TriggerNode";
import ActionNode from "@/components/workflow/nodes/ActionNode";
import ConditionNode from "@/components/workflow/nodes/ConditionNode";
import PlaceholderNode from "@/components/workflow/nodes/PlaceholderNode";
import ConnectionLine from "@/components/workflow/FloatingConnectionLine";

const nodeTypes = {
    trigger: TriggerNode,
    action: ActionNode,
    condition: ConditionNode,
    placeholder: PlaceholderNode,
};

// --- Strong Types ---
interface CatalogItem {
    id: string;
    name: string;
    description: string;
    icon?: string;
    category?: string;
    type?: 'trigger' | 'action' | 'condition';
}

interface Catalog {
    triggers: CatalogItem[];
    actions: CatalogItem[];
    conditions: CatalogItem[];
}

interface WorkflowData {
    nodes: Node[];
    edges: Edge[];
    outputProductIds?: string[];
    outputProductId?: string; // Legacy support
    inputProductId?: string;
    piecework?: {
        enabled: boolean;
        rate: number;
        unit: string;
        basis: string;
    };
}

interface ProcessData {
    id: string;
    name: string;
    workflowData: WorkflowData;
    description?: string;
}

interface Product {
    id: string;
    name: string;
    unit: string;
    groupId?: string | null;
    isArchived: boolean;
    isProductionInput: boolean;
    isProductionOutput: boolean;
    group?: {
        id: string;
        name: string;
    } | null;
}

interface Suggestion {
    id: string;
    name: string;
    description: string;
    workflow: WorkflowData;
}


function WorkflowEditor() {
    const { session } = useAuth();
    const { toast } = useToast();
    const [_location, setLocation] = useLocation();
    const searchString = useSearch();
    const _searchParams = new URLSearchParams(searchString);
    const processId = _searchParams.get("processId");

    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [isCatalogOpen, setIsCatalogOpen] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);

    // Dagre Layouting Logic
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
        const isHorizontal = direction === 'LR';
        dagreGraph.setGraph({ rankdir: direction });

        nodes.forEach((node) => {
            dagreGraph.setNode(node.id, { width: 320, height: 200 });
        });

        edges.forEach((edge) => {
            dagreGraph.setEdge(edge.source, edge.target);
        });

        dagre.layout(dagreGraph);

        const layoutedNodes = nodes.map((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            node.targetPosition = isHorizontal ? Position.Left : Position.Top;
            node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

            node.position = {
                x: nodeWithPosition.x - 320 / 2,
                y: nodeWithPosition.y - 200 / 2,
            };

            return node;
        });

        return { nodes: layoutedNodes, edges };
    };

    const onLayout = useCallback(
        (direction: string) => {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                nodes,
                edges,
                direction
            );

            setNodes([...layoutedNodes]);
            setEdges([...layoutedEdges]);
        },
        [nodes, edges]
    );
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // --- Simulation State ---
    const [isSimulating, setIsSimulating] = useState(false);
    const [simStep, setSimStep] = useState<number>(-1);
    const [simulationData, setSimulationData] = useState<SimulationResult | null>(null);
    const [simLogs, setSimLogs] = useState<string[]>([]);
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null);

    const runSimulation = () => {
        setIsSimulating(true);
        setSimStep(0);
        setSimLogs(["Initializing Simulation Environment..."]);

        // Run Engine
        const result = simulateWorkflow(nodes, edges);
        setSimulationData(result);
        setSimLogs(prev => [...prev, ...result.logs]);

        // Playback Loop
        let currentStepIdx = 0;

        const playStep = () => {
            if (currentStepIdx >= result.steps.length) {
                setTimeout(() => {
                    toast({ title: "Simulation Complete", description: "Process verification finished successfully." });
                    setIsSimulating(false);
                    setActiveNodeId(null);
                    setActiveEdgeId(null);
                }, 2000);
                return;
            }

            const step = result.steps[currentStepIdx];

            if (step.type === 'node_activation') {
                setActiveNodeId(step.nodeId!);
                setActiveEdgeId(null);
            } else if (step.type === 'token_traversal') {
                setActiveEdgeId(step.edgeId!);
                // Keep source node active briefly or clear? Let's clear to show movement.
                setActiveNodeId(null);
            }

            // Schedule next step
            // We use the duration of the current step to determine when to trigger the next logical update
            // However, for React visual sync, we might just use a fixed "Step Time" or use the step.duration directly.

            setTimeout(() => {
                currentStepIdx++;
                playStep();
            }, step.duration || 1000);
        };

        playStep();
    };

    /**
     * Helper to render the Token moving across an edge.
     * We need to find the source/target node positions to interpolate.
     */
    const SimulationOverlay = () => {
        if (!activeEdgeId || !isSimulating) return null;

        const edge = edges.find(e => e.id === activeEdgeId);
        if (!edge) return null;

        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        if (!sourceNode || !targetNode) return null;

        // Calculate absolute positions (ReactFlow manages this, but we have nodes array with position)
        // Adjust for node width/height roughly (e.g. center)
        const sx = sourceNode.position.x + 150; // approx center width
        const sy = sourceNode.position.y + 50;  // approx center height
        const tx = targetNode.position.x + 150;
        const ty = targetNode.position.y + 50;

        return (
            <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
                <motion.div
                    initial={{ x: sx, y: sy, opacity: 1, scale: 0.5 }}
                    animate={{ x: tx, y: ty, opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className="absolute w-6 h-6 bg-primary rounded-full shadow-[0_0_20px_var(--primary)] flex items-center justify-center border-2 border-white"
                >
                    <Zap className="w-3 h-3 text-white fill-current" />
                </motion.div>
            </div>
        );
    };

    // --- End Simulation ---

    const [processName, setProcessName] = useState("");

    const [description, setDescription] = useState("");
    const [selectedInputProductId, setSelectedInputProductId] = useState<string | null>(null);
    const [selectedOutputProductIds, setSelectedOutputProductIds] = useState<string[]>([]);
    const [pieceworkConfig, setPieceworkConfig] = useState({
        enabled: false,
        rate: 0,
        unit: 'pza',
        basis: 'output'
    });
    const [activePlaceholderId, setActivePlaceholderId] = useState<string | null>(null);

    // Load Existing Process
    const { data: existingProcess } = useQuery<ProcessData | null>({
        queryKey: [`/api/cpe/processes/${processId}`],
        queryFn: async () => {
            if (!processId) return null;
            const res = await fetch(`/api/cpe/processes/${processId}`, {
                headers: {
                    Authorization: `Bearer ${session?.access_token}`
                }
            });
            if (!res.ok) throw new Error("Failed to load process");
            return res.json() as Promise<ProcessData>;
        },
        enabled: !!processId && !!session?.access_token
    });

    // Hydrate State from Process
    useEffect(() => {
        if (existingProcess) {
            setProcessName(existingProcess.name);
            setDescription(existingProcess.description || "");
            if (existingProcess.workflowData) {
                setNodes(existingProcess.workflowData.nodes || []);
                setEdges(existingProcess.workflowData.edges || []);

                const wd = existingProcess.workflowData;
                if (Array.isArray(wd.outputProductIds)) {
                    setSelectedOutputProductIds(wd.outputProductIds);
                } else if (wd.outputProductId) {
                    setSelectedOutputProductIds([wd.outputProductId]);
                } else {
                    setSelectedOutputProductIds([]);
                }

                setSelectedInputProductId(wd.inputProductId || null);

                // Hydrate Piecework Config
                if (wd.piecework) {
                    setPieceworkConfig({
                        enabled: wd.piecework.enabled || false,
                        rate: (wd.piecework.rate || 0) / 100, // Convert from cents
                        unit: wd.piecework.unit || 'pza',
                        basis: wd.piecework.basis || 'output'
                    });
                }
            }
        } else if (!processId) {
            resetEditor();
        }
    }, [existingProcess, processId]);

    const resetEditor = () => {
        setProcessName("");
        setDescription("");
        setSelectedInputProductId(null);
        setSelectedOutputProductIds([]);
        setPieceworkConfig({
            enabled: false,
            rate: 0,
            unit: 'pza',
            basis: 'output'
        });
        setNodes([
            {
                id: "p-start",
                type: "placeholder",
                position: { x: 250, y: 50 },
                data: {
                    label: "Añadir un disparador",
                    onClick: () => {
                        setActivePlaceholderId("p-start");
                        setIsCatalogOpen(true);
                    }
                },
            },
        ]);
        setEdges([]);
        setLocation("/workflows"); // Clear processId from URL
    };

    // Fetch Products
    const { data: products = [] } = useQuery<Product[]>({
        queryKey: ["/api/inventory/products"],
        queryFn: async () => {
            const res = await fetch("/api/inventory/products", {
                headers: {
                    Authorization: `Bearer ${session?.access_token}`
                }
            });
            if (!res.ok) return [];
            return res.json() as Promise<Product[]>;
        },
        enabled: !!session?.access_token
    });

    // Derived state for grouped products (Group name represents all products within it)
    const groupedProducts = useMemo(() => {
        const groups: Record<string, Product> = {};
        const standalones: Product[] = [];

        // Pre-filter archived products and only keep relevant ones for production
        // Note: We include all products and will filter specific lists later for input vs output
        const activeProducts = products.filter(p => !p.isArchived);

        activeProducts.forEach(p => {
            if (p.groupId && p.group) {
                // Determine if this product should be the representative
                const existing = groups[p.groupId];
                const isExactMatch = p.name.toLowerCase() === p.group.name.toLowerCase();

                if (!existing) {
                    groups[p.groupId] = p;
                } else {
                    // If we find an exact name match, prioritize it over generic members
                    if (isExactMatch) {
                        // Merge flags to represent the whole group's capabilities
                        const combined: Product = {
                            ...p,
                            isProductionInput: existing.isProductionInput || p.isProductionInput,
                            isProductionOutput: existing.isProductionOutput || p.isProductionOutput
                        };
                        groups[p.groupId] = combined;
                    } else {
                        // Keep current representative but accumulate capability flags
                        existing.isProductionInput = existing.isProductionInput || p.isProductionInput;
                        existing.isProductionOutput = existing.isProductionOutput || p.isProductionOutput;
                    }
                }
            } else {
                standalones.push(p);
            }
        });

        // Map grouped results to represent the group name
        const groupedResults = Object.values(groups).map(p => ({
            ...p,
            name: p.group?.name || p.name // Use the group name as the label
        }));

        return [...standalones, ...groupedResults];
    }, [products]);

    // Fetch Catalog
    const { data: catalog } = useQuery<Catalog>({
        queryKey: ["/api/automation/catalog"],
        queryFn: async () => {
            const res = await fetch("/api/automation/catalog", {
                headers: {
                    Authorization: `Bearer ${session?.access_token}`
                }
            });
            if (!res.ok) throw new Error("Failed to fetch catalog");
            return res.json() as Promise<Catalog>;
        },
        enabled: !!session?.access_token
    });

    // Fetch Suggestions
    const { data: suggestions } = useQuery<Suggestion[]>({
        queryKey: ["/api/automation/suggestions"],
        queryFn: async () => {
            const res = await fetch("/api/automation/suggestions", {
                headers: {
                    Authorization: `Bearer ${session?.access_token}`
                }
            });
            if (!res.ok) throw new Error("Failed to fetch suggestions");
            return res.json() as Promise<Suggestion[]>;
        },
        enabled: !!session?.access_token
    });

    // Fetch All Workflows for Library
    const { data: allWorkflows = [], refetch: refetchWorkflows } = useQuery<ProcessData[]>({
        queryKey: ["/api/automations"],
        queryFn: async () => {
            const res = await fetch("/api/automations", {
                headers: {
                    Authorization: `Bearer ${session?.access_token}`
                }
            });
            if (!res.ok) return [];
            return res.json() as Promise<ProcessData[]>;
        },
        enabled: !!session?.access_token
    });

    // Realtime subscription for workflows
    useSupabaseRealtime({
        table: 'processes',
        queryKey: ["/api/automations"],
    });

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => { setNodes((nds) => applyNodeChanges(changes, nds)); },
        []
    );

    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => { setEdges((eds) => applyEdgeChanges(changes, eds)); },
        []
    );

    const onConnect = useCallback(
        (params: Connection) => {
            setEdges((eds) => addEdge({
                ...params,
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
                style: { strokeWidth: 2, stroke: '#3b82f6' }
            }, eds));
        },
        []
    );

    const addStep = (item: CatalogItem, type: 'action' | 'trigger' | 'condition') => {
        const id = `${type}-${Date.now()}`;
        const targetId = activePlaceholderId;

        setNodes((nds) => {
            const targetPlaceholder = nds.find(n => n.id === targetId) || nds.find(n => n.type === 'placeholder');
            if (!targetPlaceholder) return nds;

            const newNode: Node = {
                id,
                type,
                position: { ...targetPlaceholder.position },
                data: { ...item },
            };

            let newNodes = nds.filter(n => n.id !== targetPlaceholder.id);

            if (type === 'condition') {
                const yesPlaceholder: Node = {
                    id: `p-${id}-yes`,
                    type: "placeholder",
                    position: { x: targetPlaceholder.position.x - 180, y: targetPlaceholder.position.y + 200 },
                    data: {
                        label: "Si es cierto",
                        onClick: () => {
                            setActivePlaceholderId(`p-${id}-yes`);
                            setIsCatalogOpen(true);
                        }
                    },
                };
                const noPlaceholder: Node = {
                    id: `p-${id}-no`,
                    type: "placeholder",
                    position: { x: targetPlaceholder.position.x + 180, y: targetPlaceholder.position.y + 200 },
                    data: {
                        label: "Si es falso",
                        onClick: () => {
                            setActivePlaceholderId(`p-${id}-no`);
                            setIsCatalogOpen(true);
                        }
                    },
                };
                newNodes = [...newNodes, newNode, yesPlaceholder, noPlaceholder];
            } else {
                const nextPlaceholder: Node = {
                    id: `p-${id}`,
                    type: "placeholder",
                    position: { x: targetPlaceholder.position.x, y: targetPlaceholder.position.y + 150 },
                    data: {
                        label: "Añadir un paso",
                        onClick: () => {
                            setActivePlaceholderId(`p-${id}`);
                            setIsCatalogOpen(true);
                        }
                    },
                };
                newNodes = [...newNodes, newNode, nextPlaceholder];
            }

            setEdges(eds => {
                let newEdges = [...eds];
                const incomingEdge = eds.find(e => e.target === targetPlaceholder.id);
                if (incomingEdge) {
                    newEdges = newEdges.map(e =>
                        e.id === incomingEdge.id ? { ...e, target: id } : e
                    );
                }

                if (type === 'condition') {
                    newEdges.push(
                        {
                            id: `e-${id}-yes`,
                            source: id,
                            target: `p-${id}-yes`,
                            sourceHandle: 'yes',
                            label: 'SÍ',
                            animated: true,
                            markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' },
                            style: { stroke: '#22c55e', strokeWidth: 2 }
                        },
                        {
                            id: `e-${id}-no`,
                            source: id,
                            target: `p-${id}-no`,
                            sourceHandle: 'no',
                            label: 'NO',
                            animated: true,
                            markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
                            style: { stroke: '#ef4444', strokeWidth: 2 }
                        }
                    );
                } else {
                    newEdges.push({
                        id: `e-${id}-next`,
                        source: id,
                        target: `p-${id}`,
                        animated: true,
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
                        style: { strokeWidth: 2, stroke: '#3b82f6' }
                    });
                }
                return newEdges;
            });

            return newNodes;
        });

        setIsCatalogOpen(false);
        setActivePlaceholderId(null);
        toast({ title: "Proceso Actualizado", description: `${item.name} se ha configurado.` });
    };

    const applySuggestion = (suggestion: Suggestion) => {
        const { nodes: newNodes, edges: newEdges } = getLayoutedElements(
            suggestion.workflow.nodes,
            suggestion.workflow.edges,
            'TB'
        );
        setNodes(newNodes);
        setEdges(newEdges);
        setProcessName(suggestion.name);
        toast({ title: "IA: Proceso Sugerido Aplicado", description: suggestion.name });
    };

    const toggleOutputProduct = (productId: string) => {
        setSelectedOutputProductIds(prev => {
            if (prev.includes(productId)) {
                return prev.filter(id => id !== productId);
            } else {
                return [...prev, productId];
            }
        });
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                name: processName || existingProcess?.name || "Nuevo Flujo",
                description: description || "Sin descripción",
                workflowData: {
                    nodes,
                    edges,
                    // Generic data
                    piecework: pieceworkConfig.enabled ? {
                        enabled: pieceworkConfig.enabled,
                        rate: Math.round(pieceworkConfig.rate * 100), // Store in cents
                        unit: pieceworkConfig.unit,
                        basis: pieceworkConfig.basis
                    } : undefined
                },
                type: "automation"
            };

            const url = processId
                ? `/api/cpe/processes/${processId}`
                : "/api/cpe/processes";

            const method = processId ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to save");
            }

            return res.json();
        },
        onSuccess: (data) => {
            toast({ title: "Flujo Guardado", description: "Los cambios se han sincronizado." });
            refetchWorkflows();
            if (!processId && data.id) {
                setLocation(`/workflows?processId=${data.id}`);
            }
        }
    });

    const filteredActions = catalog?.actions?.filter((a) =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AppLayout
            title="Nexus Architect"
            subtitle="Diseña y automatiza el sistema operativo de tu empresa"
        >
            <div className="flex flex-row h-[calc(100vh-180px)] gap-6">
                <div className="flex-1 flex flex-col bg-slate-950/20 rounded-3xl border border-white/5 overflow-hidden relative">
                    <div className="h-14 bg-slate-900/60 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-10">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setLocation("/dashboard")}>
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black uppercase italic tracking-tighter">Nexus <span className="text-primary">Architect</span></span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                className="h-8 border-white/10 text-[10px] uppercase font-black"
                                onClick={() => { setIsLibraryOpen(true); }}
                            >
                                <Layers className="w-3.5 h-3.5 mr-2" /> Biblioteca
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 border-white/10 text-[10px] uppercase font-black"
                                onClick={resetEditor}
                            >
                                <Plus className="w-3.5 h-3.5 mr-2" /> Nuevo
                            </Button>
                            <div className="w-[1px] h-4 bg-white/10 mx-1" />
                            <Button variant="outline" className="h-8 border-white/10 text-[10px] uppercase font-black">
                                <Play className="w-3.5 h-3.5 mr-2" /> Simular
                            </Button>
                            <div className="w-[1px] h-4 bg-white/10 mx-1" />
                            <Button
                                variant="outline"
                                className="h-8 border-white/10 text-[10px] uppercase font-black"
                                onClick={() => onLayout('TB')}
                            >
                                <LayoutGrid className="w-3.5 h-3.5 mr-2" /> Layout
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 border-white/10 text-[10px] uppercase font-black"
                                onClick={() => { setIsSettingsOpen(true); }}
                            >
                                <Settings2 className="w-3.5 h-3.5 mr-2" /> Config
                            </Button>
                            <Button variant="outline" className="gap-2 border-orange-500/20 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 transition-all font-mono uppercase text-xs tracking-wider" onClick={runSimulation} disabled={isSimulating}>
                                {isSimulating ? (
                                    <>
                                        <Bot className="w-4 h-4 animate-pulse" />
                                        Simulando...
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle className="w-4 h-4" />
                                        Simular
                                    </>
                                )}
                            </Button>

                            <Button
                                onClick={handleSave}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_-5px_var(--primary)] gap-2 font-bold"
                            >
                                <Save className="w-4 h-4" />
                                Guardar
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 relative">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onNodesDelete={(deleted) => toast({ title: "Nodos Eliminados", description: `${String(deleted.length)} elementos removidos.` })}
                            onEdgesDelete={(deleted) => toast({ title: "Conexiones Eliminadas", description: `${String(deleted.length)} enlaces removidos.` })}
                            onPaneContextMenu={(e) => {
                                e.preventDefault();
                                if (confirm("¿Limpiar todo el espacio de trabajo?")) {
                                    setNodes([]);
                                    setEdges([]);
                                }
                            }}
                            nodeTypes={nodeTypes}
                            connectionLineComponent={ConnectionLine}
                            snapToGrid={true}
                            snapGrid={[20, 20]}
                            fitView
                            className="bg-slate-950"
                            defaultEdgeOptions={{
                                animated: true,
                                style: { strokeWidth: 2 },
                                markerEnd: { type: MarkerType.ArrowClosed }
                            }}
                        >
                            <Background color="#cbd5e1" gap={20} size={1} variant={BackgroundVariant.Dots} className="opacity-20" />
                            <Controls className="bg-slate-900 border-white/10" />
                            <MiniMap
                                className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden"
                                maskColor="rgba(0, 0, 0, 0.4)"
                                nodeColor={(n) => {
                                    if (n.type === 'trigger') return '#3b82f6';
                                    if (n.type === 'action') return '#64748b';
                                    if (n.type === 'condition') return '#f97316';
                                    return '#1e293b';
                                }}
                            />
                            <Panel position="bottom-right" className="flex gap-2 bg-black/40 p-2 rounded-xl backdrop-blur-md border border-white/5">
                                <Button size="sm" variant="ghost" className="h-7 text-[9px] font-black uppercase" onClick={() => { onLayout('LR'); }}>
                                    <Navigation2 className="w-3 h-3 mr-1 rotate-90" /> Horizontal
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-[9px] font-black uppercase" onClick={() => { onLayout('TB'); }}>
                                    <Navigation2 className="w-3 h-3 mr-1" /> Vertical
                                </Button>
                            </Panel>
                        </ReactFlow>
                    </div>
                </div>

                <div className="w-[320px] flex flex-col gap-4">
                    <Card className="bg-slate-900/50 border-slate-800 p-5 flex flex-col gap-4">
                        <TooltipProvider>
                            <UiTooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 text-primary cursor-help">
                                        <Bot className="w-5 h-5 animate-pulse" />
                                        <h3 className="text-xs font-black uppercase tracking-widest leading-none">Sugerencias IA</h3>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-slate-900 border-primary/20 p-3 max-w-[200px]">
                                    <p className="text-[10px] text-slate-300">
                                        <span className="font-bold text-primary block mb-1 uppercase tracking-widest text-[9px]">Motor Cognitivo Nexus</span>
                                        Analiza patrones operativos y sugiere flujos de trabajo optimizados basados en tu actividad real.
                                    </p>
                                </TooltipContent>
                            </UiTooltip>
                        </TooltipProvider>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Workflows diseñados para tu empresa:</p>

                        <div className="space-y-3">
                            {suggestions?.map((s) => (
                                <div
                                    key={s.id}
                                    onClick={() => { applySuggestion(s); }}
                                    className="p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-primary/5 hover:border-primary/30 cursor-pointer group transition-all"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-[10px] font-black text-white group-hover:text-primary transition-colors">{s.name}</p>
                                        <Zap className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <p className="text-[9px] text-slate-500 leading-tight">{s.description}</p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800 flex-1 p-5 flex flex-col">
                        <div className="flex items-center gap-2 text-slate-400 mb-4 text-[10px] font-black uppercase">
                            <Search className="w-4 h-4" />
                            <span>Catálogo Rápido</span>
                        </div>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                            <Input
                                placeholder="Buscar acciones..."
                                className="h-9 pl-9 bg-slate-950 border-slate-800 text-xs placeholder:text-slate-700"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); }}
                            />
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[8px] font-black uppercase text-slate-600 mb-2">Populares</p>
                                    <div className="grid gap-2">
                                        {filteredActions?.map((a) => (
                                            <div
                                                key={a.id}
                                                onClick={() => { addStep(a, a.type ?? 'action'); }}
                                                className="p-2 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-2"
                                            >
                                                <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center">
                                                    <Layers className="w-3 h-3 text-slate-400" />
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-300">{a.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </Card>
                </div>
            </div>

            <Dialog open={isCatalogOpen} onOpenChange={setIsCatalogOpen}>
                <DialogContent className="max-w-4xl bg-slate-950 border-slate-800 p-0 overflow-hidden">
                    <div className="flex h-[600px]">
                        <div className="w-64 bg-slate-900/50 border-r border-slate-800 p-6 flex flex-col gap-8">
                            <div>
                                <h2 className="text-xl font-black uppercase italic tracking-widest text-white mb-2">Catálogo</h2>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Nexus Library v2.4</p>
                            </div>

                            <nav className="flex flex-col gap-1">
                                {['todos', 'transacciones', 'clientes', 'productos', 'logística', 'ia'].map(cat => (
                                    <Button
                                        key={cat}
                                        variant="ghost"
                                        onClick={() => { setActiveTab(cat); }}
                                        className={cn(
                                            "justify-start h-9 text-[10px] font-black uppercase tracking-widest",
                                            activeTab === cat ? "bg-primary/10 text-primary" : "text-slate-500 hover:text-slate-300"
                                        )}
                                    >
                                        {cat}
                                    </Button>
                                ))}
                            </nav>
                        </div>

                        <div className="flex-1 flex flex-col p-8 overflow-hidden">
                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                                <Input
                                    className="h-12 pl-12 bg-white/5 border-slate-800 text-sm placeholder:text-slate-700 rounded-2xl"
                                    placeholder="De qué se trata el siguiente paso?"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); }}
                                />
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="grid grid-cols-2 gap-4">
                                    {(() => {
                                        const categoryMap: Record<string, string> = {
                                            'transacciones': 'transactions',
                                            'clientes': 'customers',
                                            'productos': 'products',
                                            'logística': 'logistics',
                                            'ia': 'ai',
                                            'todos': 'all'
                                        };
                                        const targetCategory = categoryMap[activeTab] || 'all';

                                        const filterItem = (item: CatalogItem) => {
                                            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                item.description.toLowerCase().includes(searchTerm.toLowerCase());

                                            let matchesCategory = targetCategory === 'all' || item.category === targetCategory;
                                            if (targetCategory !== 'all' && !item.category) matchesCategory = false;

                                            return matchesSearch && matchesCategory;
                                        };

                                        return (
                                            <>
                                                {catalog?.triggers.filter(filterItem).map((t) => (
                                                    <Card
                                                        key={t.id}
                                                        onClick={() => { addStep(t, 'trigger'); }}
                                                        className="p-5 bg-white/5 border-white/5 hover:border-primary/50 transition-all cursor-pointer group"
                                                    >
                                                        <Badge className="bg-primary/20 text-primary border-none text-[8px] mb-2">DISPARADOR</Badge>
                                                        <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">{t.name}</h4>
                                                        <p className="text-[10px] text-slate-500 mt-1">{t.description}</p>
                                                    </Card>
                                                ))}
                                                {catalog?.conditions.filter(filterItem).map((c) => (
                                                    <Card
                                                        key={c.id}
                                                        onClick={() => { addStep(c, 'condition'); }}
                                                        className="p-5 bg-white/5 border-white/5 hover:border-orange-500/50 transition-all cursor-pointer group"
                                                    >
                                                        <Badge className="bg-orange-500/20 text-orange-500 border-none text-[8px] mb-2">CONDICIÓN</Badge>
                                                        <h4 className="text-sm font-bold text-white group-hover:text-orange-500 transition-colors">{c.name}</h4>
                                                        <p className="text-[10px] text-slate-500 mt-1">{c.description}</p>
                                                    </Card>
                                                ))}
                                                {catalog?.actions.filter(filterItem).map((a) => (
                                                    <Card
                                                        key={a.id}
                                                        onClick={() => { addStep(a, 'action'); }}
                                                        className="p-5 bg-white/5 border-white/5 hover:border-primary/50 transition-all cursor-pointer group"
                                                    >
                                                        <Badge className="bg-slate-800 text-slate-400 border-none text-[8px] mb-2">ACCIÓN</Badge>
                                                        <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">{a.name}</h4>
                                                        <p className="text-[10px] text-slate-500 mt-1">{a.description}</p>
                                                    </Card>
                                                ))}
                                            </>
                                        );
                                    })()}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
                <DialogContent className="max-w-2xl bg-slate-950 border-slate-800 p-6">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Layers className="w-5 h-5 text-primary" />
                            Biblioteca de Automatizaciones
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 mt-4">
                        {allWorkflows.length === 0 ? (
                            <div className="py-12 text-center border border-dashed border-slate-800 rounded-2xl">
                                <p className="text-sm text-slate-500 uppercase font-black tracking-widest">No hay flujos guardados</p>
                            </div>
                        ) : (
                            allWorkflows.map((w) => (
                                <div
                                    key={w.id}
                                    className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between hover:bg-white/10 transition-all group"
                                >
                                    <div className="cursor-pointer flex-1" onClick={() => {
                                        setLocation(`/workflows?processId=${w.id}`);
                                        setIsLibraryOpen(false);
                                    }}>
                                        <p className="text-xs font-black text-white group-hover:text-primary transition-colors">{w.name}</p>
                                        <p className="text-[10px] text-slate-500 leading-tight mt-1">{w.description || 'Sin descripción'}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-slate-500 hover:text-red-500"
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (confirm("¿Estás seguro de eliminar esta automatización?")) {
                                                    await fetch(`/api/automations/${w.id}`, {
                                                        method: "DELETE",
                                                        headers: { Authorization: `Bearer ${session?.access_token}` }
                                                    });
                                                    refetchWorkflows();
                                                    toast({ title: "Flujo Eliminado", description: "Se ha removido de la biblioteca." });
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 max-h-[80vh] overflow-y-auto w-full max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-white">Configuración del Flujo</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">Nombre del Flujo</label>
                            <Input
                                value={processName}
                                onChange={(e) => { setProcessName(e.target.value); }}
                                className="bg-slate-950 border-slate-800"
                                placeholder="ej. Detección de Fraude"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">Descripción</label>
                            <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="bg-slate-950 border-slate-800"
                                placeholder="Escribe el propósito de esta automatización..."
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

export default function AutomationWrapper() {
    return (
        <ReactFlowProvider>
            <WorkflowEditor />
        </ReactFlowProvider>
    );
}
