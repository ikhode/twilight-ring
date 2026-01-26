import { useState, useCallback, useEffect } from "react";
import ReactFlow, {
    Background,
    Controls,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    Node,
    Edge,
    Connection,
    OnNodesChange,
    OnEdgesChange,
    ReactFlowProvider,
    BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
    Zap,
    Settings2,
    Save,
    Play,
    Search,
    Layers,
    Bot,
    ArrowLeft,
    Check
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

// Custom Nodes
import TriggerNode from "@/components/workflow/nodes/TriggerNode";
import ActionNode from "@/components/workflow/nodes/ActionNode";
import ConditionNode from "@/components/workflow/nodes/ConditionNode";
import PlaceholderNode from "@/components/workflow/nodes/PlaceholderNode";

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
}

interface Suggestion {
    id: string;
    name: string;
    description: string;
    workflow: any;
}

export default function WorkflowEditorWrapper() {
    return (
        <ReactFlowProvider>
            <WorkflowEditor />
        </ReactFlowProvider>
    );
}

function WorkflowEditor() {
    const { session } = useAuth();
    const { toast } = useToast();
    const [location, setLocation] = useLocation();
    const searchString = useSearch();
    const searchParams = new URLSearchParams(searchString);
    const processId = searchParams.get("processId");

    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [isCatalogOpen, setIsCatalogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [processName, setProcessName] = useState("");
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
            const res = await fetch(`/api/cpe/processes/${processId}`);
            if (!res.ok) throw new Error("Failed to load process");
            return res.json() as Promise<ProcessData>;
        },
        enabled: !!processId
    });

    // Hydrate State from Process
    useEffect(() => {
        if (existingProcess) {
            setProcessName(existingProcess.name);
            if (existingProcess.workflowData) {
                setNodes(existingProcess.workflowData.nodes || []);
                setEdges(existingProcess.workflowData.edges || []);

                const wd = existingProcess.workflowData as any;
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
            // Default start node for new workflows
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
        }
    }, [existingProcess, processId]);

    // Fetch Products
    const { data: products = [] } = useQuery<Product[]>({
        queryKey: ["/api/inventory/products"],
        queryFn: async () => {
            const res = await fetch("/api/inventory/products");
            if (!res.ok) return [];
            return res.json() as Promise<Product[]>;
        }
    });

    // Fetch Catalog
    const { data: catalog } = useQuery<Catalog>({
        queryKey: ["/api/automation/catalog"],
        queryFn: async () => {
            const res = await fetch("/api/automation/catalog");
            if (!res.ok) throw new Error("Failed to fetch catalog");
            return res.json() as Promise<Catalog>;
        }
    });

    // Fetch Suggestions
    const { data: suggestions } = useQuery<Suggestion[]>({
        queryKey: ["/api/automation/suggestions"],
        queryFn: async () => {
            const res = await fetch("/api/automation/suggestions");
            if (!res.ok) throw new Error("Failed to fetch suggestions");
            return res.json() as Promise<Suggestion[]>;
        }
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
        (params: Connection) => { setEdges((eds) => addEdge({ ...params, animated: true }, eds)); },
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
                            animated: true,
                            style: { stroke: '#22c55e', strokeWidth: 2 }
                        },
                        {
                            id: `e-${id}-no`,
                            source: id,
                            target: `p-${id}-no`,
                            sourceHandle: 'no',
                            animated: true,
                            style: { stroke: '#64748b', strokeWidth: 2 }
                        }
                    );
                } else {
                    newEdges.push({
                        id: `e-${id}-next`,
                        source: id,
                        target: `p-${id}`,
                        animated: true,
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

    const applySuggestion = (suggestion: any) => {
        setNodes(suggestion.workflow.nodes);
        setEdges(suggestion.workflow.edges);
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
                description: existingProcess?.description || "Sin descripción",
                workflowData: {
                    nodes,
                    edges,
                    outputProductIds: selectedOutputProductIds,
                    // Backward compatibility
                    outputProductId: selectedOutputProductIds.length > 0 ? selectedOutputProductIds[0] : null,
                    inputProductId: selectedInputProductId,
                    piecework: {
                        enabled: pieceworkConfig.enabled,
                        rate: Math.round(pieceworkConfig.rate * 100), // Store in cents
                        unit: pieceworkConfig.unit,
                        basis: pieceworkConfig.basis
                    }
                },
                type: "production"
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
        onSuccess: () => {
            toast({ title: "Flujo Guardado", description: "Los cambios se han sincronizado." });
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
                                onClick={() => { setIsSettingsOpen(true); }}
                            >
                                <Settings2 className="w-3.5 h-3.5 mr-2" /> Config
                            </Button>
                            <Button variant="outline" className="h-8 border-white/10 text-[10px] uppercase font-black">
                                <Play className="w-3.5 h-3.5 mr-2" /> Simular
                            </Button>
                            <Button
                                onClick={() => { saveMutation.mutate(); }}
                                className="h-8 bg-primary hover:bg-primary/90 text-[10px] uppercase font-black uppercase glow-xs"
                            >
                                <Save className="w-3.5 h-3.5 mr-2" /> Guardar
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
                            nodeTypes={nodeTypes}
                            fitView
                            className="bg-slate-950"
                        >
                            <Background color="#cbd5e1" gap={20} size={1} variant={BackgroundVariant.Dots} className="opacity-20" />
                            <Controls className="bg-slate-900 border-white/10" />
                        </ReactFlow>
                    </div>
                </div>

                <div className="w-[320px] flex flex-col gap-4">
                    <Card className="bg-slate-900/50 border-slate-800 p-5 flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-primary">
                            <Bot className="w-5 h-5 animate-pulse" />
                            <h3 className="text-xs font-black uppercase tracking-widest leading-none">Sugerencias IA</h3>
                        </div>
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
                                                onClick={() => { addStep(a, a.type || 'action'); }}
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
                                            if (!item) return false;
                                            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                item.description.toLowerCase().includes(searchTerm.toLowerCase());

                                            let matchesCategory = targetCategory === 'all' || item.category === targetCategory;
                                            if (targetCategory !== 'all' && !item.category) matchesCategory = false;

                                            return matchesSearch && matchesCategory;
                                        };

                                        return (
                                            <>
                                                {catalog?.triggers?.filter(filterItem).map((t) => (
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
                                                {catalog?.conditions?.filter(filterItem).map((c) => (
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
                                                {catalog?.actions?.filter(filterItem).map((a) => (
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

            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 max-h-[80vh] overflow-y-auto w-full max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-white">Configuración del Proceso</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">Nombre del Proceso</label>
                            <Input
                                value={processName}
                                onChange={(e) => { setProcessName(e.target.value); }}
                                className="bg-slate-950 border-slate-800"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">Insumo Principal (Input)</label>
                            <p className="text-[10px] text-slate-500">Materia prima que se consume automáticamete al iniciar o finalizar lotes.</p>
                            <ScrollArea className="h-32 rounded-md border border-slate-800 bg-slate-950 p-2">
                                <div className="space-y-1">
                                    {products.map((p) => (
                                        <div
                                            key={`in-${p.id}`}
                                            onClick={() => { setSelectedInputProductId(p.id); }}
                                            className={cn(
                                                "p-2 rounded cursor-pointer flex justify-between items-center text-xs transition-colors",
                                                selectedInputProductId === p.id
                                                    ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                                                    : "text-slate-400 hover:bg-slate-900 border border-transparent"
                                            )}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-semibold">{p.name}</span>
                                                <span className="text-[9px] opacity-70">Unidad: {p.unit}</span>
                                            </div>
                                            {selectedInputProductId === p.id && <Zap className="w-3 h-3" />}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">Producto Resultante (Output)</label>
                            <p className="text-[10px] text-slate-500">Selecciona uno o más productos que se generan. <span className="text-primary font-bold">El primero seleccionado será el principal.</span></p>
                            <ScrollArea className="h-48 rounded-md border border-slate-800 bg-slate-950 p-2">
                                <div className="space-y-1">
                                    {products.map((p) => {
                                        const isSelected = selectedOutputProductIds.includes(p.id);
                                        const isMain = selectedOutputProductIds[0] === p.id;

                                        return (
                                            <div
                                                key={`out-${p.id}`}
                                                onClick={() => { toggleOutputProduct(p.id); }}
                                                className={cn(
                                                    "p-2 rounded cursor-pointer flex justify-between items-center text-xs transition-colors group",
                                                    isSelected
                                                        ? "bg-primary/20 text-primary border border-primary/30"
                                                        : "text-slate-400 hover:bg-slate-900 border border-transparent"
                                                )}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{p.name}</span>
                                                    <span className="text-[9px] opacity-70">Unidad: {p.unit}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isMain && <span className="text-[8px] bg-primary text-white px-1 rounded uppercase font-bold">Principal</span>}
                                                    {isSelected && <Check className="w-3 h-3" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </div>

                        <div className="pt-4 border-t border-slate-800 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Configuración de Destajo</label>
                                    <p className="text-[10px] text-slate-500">Habilitar pago automático por producción reportada.</p>
                                </div>
                                <div
                                    className={cn("w-10 h-5 rounded-full cursor-pointer transition-colors relative", pieceworkConfig.enabled ? "bg-primary" : "bg-slate-800")}
                                    onClick={() => setPieceworkConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                                >
                                    <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", pieceworkConfig.enabled ? "left-6" : "left-1")} />
                                </div>
                            </div>

                            {pieceworkConfig.enabled && (
                                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Tarifa ($)</label>
                                        <Input
                                            type="number"
                                            value={pieceworkConfig.rate || ''}
                                            onChange={e => setPieceworkConfig(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
                                            className="h-8 text-xs bg-slate-900 border-slate-700"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Unidad de Pago</label>
                                        <select
                                            className="w-full h-8 text-xs bg-slate-900 border border-slate-700 rounded px-2 text-white"
                                            value={pieceworkConfig.unit}
                                            onChange={e => setPieceworkConfig(prev => ({ ...prev, unit: e.target.value }))}
                                        >
                                            <option value="pza">Por Pieza</option>
                                            <option value="kg">Por Kilo</option>
                                            <option value="100u">Por Ciento (100)</option>
                                            <option value="1000u">Por Millar (1000)</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Base de Cálculo</label>
                                        <div className="flex gap-2">
                                            <div
                                                onClick={() => setPieceworkConfig(prev => ({ ...prev, basis: 'input' }))}
                                                className={cn(
                                                    "flex-1 p-2 rounded border text-xs cursor-pointer text-center transition-all",
                                                    pieceworkConfig.basis === 'input' ? "bg-blue-500/20 border-blue-500 text-blue-400" : "bg-slate-900 border-slate-800 text-slate-400"
                                                )}
                                            >
                                                Input (Mat. Prima Consumida)
                                            </div>
                                            <div
                                                onClick={() => setPieceworkConfig(prev => ({ ...prev, basis: 'output' }))}
                                                className={cn(
                                                    "flex-1 p-2 rounded border text-xs cursor-pointer text-center transition-all",
                                                    pieceworkConfig.basis === 'output' ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-slate-900 border-slate-800 text-slate-400"
                                                )}
                                            >
                                                Output (Producto Generado)
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
