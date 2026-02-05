
import { useMemo } from "react";
import ReactFlow, {
    Background,
    Controls,
    BackgroundVariant,
    Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Badge } from "@/components/ui/badge";
import {
    Layers,
    Search
} from "lucide-react";
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
    const nodes = useMemo(() => {
        // 1. Sort processes by orderIndex (Client-side safety)
        const sortedProcesses = [...processes].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

        return sortedProcesses.map((p, idx) => {
            const inputItem = inventory?.find(i => i.id === p.workflowData?.inputProductId);

            let nodeType = 'process';
            if (idx === 0) nodeType = 'start';
            else if (idx === sortedProcesses.length - 1) nodeType = 'end';
            else if (p.name.toLowerCase().includes('calidad') || p.name.toLowerCase().includes('inspecc')) nodeType = 'quality';

            return {
                id: p.id,
                type: nodeType,
                position: { x: idx * 300, y: 100 },
                data: {
                    label: p.name,
                    description: p.description,
                    orderIndex: p.orderIndex,
                    input: p.workflowData?.inputProductId,
                    inputName: inputItem?.name,
                    quantity: p.workflowData?.meta?.quantity, // For Start/End nodes to show output hints
                    pieceworkEnabled: p.workflowData?.piecework?.enabled,
                    rate: p.workflowData?.piecework?.rate || 0,
                    unit: p.workflowData?.piecework?.unit || 'u',
                    onClick: () => onSelect && onSelect(p),
                    onDelete: () => onDelete && onDelete(p.id)
                }
            };
        });
    }, [processes, inventory, onSelect, onDelete]);

    const edges = useMemo(() => {
        const e: Edge[] = [];
        const sortedNodes = [...nodes].sort((a, b) => (a.data.orderIndex || 0) - (b.data.orderIndex || 0));
        for (let i = 0; i < sortedNodes.length - 1; i++) {
            e.push({
                id: `e-${sortedNodes[i].id}-${sortedNodes[i + 1].id}`,
                source: sortedNodes[i].id,
                target: sortedNodes[i + 1].id,
                type: 'smoothstep',
                animated: true,
                style: { stroke: '#3b82f6', strokeWidth: 2 },
            });
        }
        return e;
    }, [nodes]);

    return (
        <div className="h-[500px] w-full bg-[#030712] rounded-3xl border border-slate-800/50 shadow-2xl relative overflow-hidden group/flow">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                draggable={false}
                panOnDrag={true}
                zoomOnScroll={true}
                nodesDraggable={false}
                className="cursor-grab active:cursor-grabbing"
            >
                <Background color="#1e293b" gap={25} size={1} variant={BackgroundVariant.Dots} />
                <Controls className="bg-slate-900 border-slate-800" />
            </ReactFlow>

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
