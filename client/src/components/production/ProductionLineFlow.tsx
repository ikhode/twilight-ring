
import { useMemo } from "react";
import ReactFlow, {
    Background,
    Controls,
    BackgroundVariant,
    Edge,
    MarkerType
} from 'reactflow';
import { useState, useEffect, useCallback } from "react";
import {
    Layers,
    Search,
    Play,
    Pause,
    RefreshCw,
    Box,
    ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import 'reactflow/dist/style.css';
import { Badge } from "@/components/ui/badge";
import { ProcessNode } from "./nodes/ProcessNode";
import { StartNode } from "./nodes/StartNode";
import { EndNode } from "./nodes/EndNode";
import { QualityNode } from "./nodes/QualityNode";

const nodeTypes = {
    start: StartNode,
    process: ProcessNode,
    end: EndNode,
    quality: QualityNode
};

interface ProductionLineFlowProps {
    processes?: any[];
    inventory?: any[];
    onSelect?: (process: any) => void;
    onDelete?: (id: string) => void;
}

export function ProductionLineFlow({ processes = [], inventory = [], onSelect, onDelete }: ProductionLineFlowProps) {
    const [isSimulating, setIsSimulating] = useState(false);
    const [simStep, setSimStep] = useState(-1);

    const toggleSimulation = () => {
        if (isSimulating) {
            setIsSimulating(false);
            setSimStep(-1);
        } else {
            setIsSimulating(true);
            setSimStep(0);
        }
    };



    // Check if we have a primary graph defined in any process
    const masterGraphProcess = processes.find(p => p.workflowData?.nodes && p.workflowData.nodes.length > 0);

    const activeNodes = useMemo(() => {
        if (masterGraphProcess) {
            // Use the saved graph nodes
            return masterGraphProcess.workflowData.nodes.map((node: any) => ({
                ...node,
                data: {
                    ...node.data,
                    isSimulating,
                    simActive: isSimulating && simStep === node.data.orderIndex,
                    onClick: () => onSelect && onSelect(masterGraphProcess),
                    onDelete: () => onDelete && onDelete(masterGraphProcess.id)
                }
            }));
        }

        const sorted = [...processes].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

        return sorted.map((p, idx) => {
            const inputItem = inventory?.find(i => i.id === p.workflowData?.inputProductId);
            const outputItems = p.workflowData?.outputProductIds?.map((id: string) =>
                inventory?.find(i => i.id === id)
            ).filter(Boolean) || [];

            let nodeType = 'process';
            if (idx === 0) nodeType = 'start';
            else if (idx === sorted.length - 1) nodeType = 'end';
            else if (p.name.toLowerCase().includes('calidad') || p.name.toLowerCase().includes('inspecc')) nodeType = 'quality';

            const active = isSimulating && simStep === idx;
            const completed = isSimulating && simStep > idx;

            return {
                id: p.id,
                type: nodeType,
                position: { x: idx * 350, y: 100 },
                data: {
                    label: p.name,
                    description: p.description,
                    orderIndex: p.orderIndex,
                    input: p.workflowData?.inputProductId,
                    inputName: inputItem?.name,
                    outputs: outputItems,
                    quantity: p.workflowData?.meta?.quantity,
                    pieceworkEnabled: p.workflowData?.piecework?.enabled,
                    rate: p.workflowData?.piecework?.rate || 0,
                    unit: p.workflowData?.piecework?.unit || 'u',
                    // Simulation Props
                    isSimulating,
                    simActive: active,
                    simCompleted: completed,
                    origin: p.workflowData?.meta?.origin_location,
                    destination: p.workflowData?.meta?.target_location,
                    onClick: () => onSelect && onSelect(p),
                    onDelete: () => onDelete && onDelete(p.id)
                }
            };
        });
    }, [processes, masterGraphProcess, inventory, onSelect, onDelete, isSimulating, simStep]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isSimulating) {
            interval = setInterval(() => {
                setSimStep((prev) => (prev + 1) % (activeNodes.length + 1));
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [isSimulating, activeNodes.length]);

    const flowEdges = useMemo(() => {
        if (masterGraphProcess && masterGraphProcess.workflowData.edges) {
            return masterGraphProcess.workflowData.edges.map((edge: any) => ({
                ...edge,
                animated: isSimulating,
                style: {
                    stroke: '#3b82f6',
                    strokeWidth: 2,
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: '#3b82f6',
                },
            }));
        }

        const e: Edge[] = [];
        const sortedNodes = [...activeNodes].sort((a, b) => (a.data.orderIndex || 0) - (b.data.orderIndex || 0));
        for (let i = 0; i < sortedNodes.length - 1; i++) {
            const isActiveEdge = isSimulating && simStep === i;

            e.push({
                id: `e-${sortedNodes[i].id}-${sortedNodes[i + 1].id}`,
                source: sortedNodes[i].id,
                target: sortedNodes[i + 1].id,
                type: 'smoothstep',
                animated: isSimulating && (simStep >= i),
                label: isSimulating && simStep === i ? "Trasladando..." : undefined,
                labelStyle: { fill: '#3b82f6', fontWeight: 700, fontSize: 10 },
                style: {
                    stroke: isSimulating && simStep >= i ? '#10b981' : '#3b82f6',
                    strokeWidth: isSimulating && simStep === i ? 4 : 2,
                    opacity: isSimulating && simStep < i ? 0.2 : 1,
                    transition: 'all 0.5s ease'
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: isSimulating && simStep >= i ? '#10b981' : '#3b82f6',
                },
            });
        }
        return e;
    }, [activeNodes, masterGraphProcess, isSimulating, simStep]);

    return (
        <div className="h-[500px] w-full bg-[#030712] rounded-3xl border border-slate-800/50 shadow-2xl relative overflow-hidden group/flow">
            <ReactFlow
                nodes={activeNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                draggable={false}
                panOnDrag={!isSimulating}
                zoomOnScroll={true}
                nodesDraggable={false}
                className={cn("transition-all duration-500", isSimulating ? "bg-slate-950/80" : "bg-transparent")}
            >
                <Background color="#1e293b" gap={25} size={1} variant={BackgroundVariant.Dots} />
                <Controls className="bg-slate-900 border-slate-800" />
            </ReactFlow>

            {/* Simulation Controls */}
            <div className="absolute top-6 right-6 flex items-center gap-2 z-20">
                <Button
                    onClick={toggleSimulation}
                    variant={isSimulating ? "destructive" : "default"}
                    className={cn(
                        "h-10 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 transition-all active:scale-95 shadow-xl",
                        !isSimulating && "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
                    )}
                >
                    {isSimulating ? (
                        <>
                            <Pause className="w-4 h-4 fill-current" /> Detener Simulación
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4 fill-current" /> Simular Flujo
                        </>
                    )}
                </Button>
                {isSimulating && (
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-xl bg-slate-900 border-slate-800"
                        onClick={() => setSimStep(0)}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                )}
            </div>

            <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
                <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-xl border border-white/5 py-1.5 pl-2 pr-4 rounded-2xl">
                    <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary glow-xs">
                        <Layers className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Nexus Operating System</p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Línea de Producción Dinámica</p>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover/flow:opacity-100 transition-opacity duration-300">
                <Badge className="bg-slate-900/80 backdrop-blur-md border-slate-800 text-slate-400 text-[9px] py-1 px-3 uppercase font-black">
                    <Search className="w-3 h-3 mr-2" /> Arrastra para explorar · Scroll para zoom
                </Badge>
            </div>
        </div>
    );
}
