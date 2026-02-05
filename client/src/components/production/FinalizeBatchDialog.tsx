import { useState, useMemo, useEffect } from "react";
import ReactFlow, { Background, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Workflow, Package, CheckCircle2, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisionCounter } from "@/components/production/VisionCounter";

const nodeTypes = {
    process: ({ data }: any) => (
        <div className={cn(
            "px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all min-w-[100px]",
            data.active ? "bg-blue-500/20 border-blue-500 text-white shadow-[0_0_15px_-5px_#3b82f6]" : "bg-slate-900 border-slate-700 text-slate-500 opacity-50"
        )}>
            {data.label}
            {data.quantity > 0 && <div className="text-[9px] text-emerald-400 mt-1">{data.quantity} {data.unit}</div>}
        </div>
    )
};

interface FinalizeBatchDialogProps {
    instance: any;
    process: any;
    allProcesses?: any[];
    inventory?: any[];
    tickets?: any[];
    onConfirm: (data: any) => void;
    isVisionEnabled: boolean;
    isLoading?: boolean;
}

export function FinalizeBatchDialog({ instance, process, allProcesses = [], inventory = [], tickets = [], onConfirm, isVisionEnabled, isLoading }: FinalizeBatchDialogProps) {
    const [outputs, setOutputs] = useState<Record<string, number>>({});
    const [estimatedInput, setEstimatedInput] = useState(0);
    const [visionCount, setVisionCount] = useState(0);
    const [coProducts, setCoProducts] = useState<{ productId: string, quantity: number }[]>([]);

    const addCoProduct = () => { setCoProducts([...coProducts, { productId: "", quantity: 0 }]); };
    const updateCoProduct = (index: number, field: string, value: any) => {
        const newCoProducts = [...coProducts];
        (newCoProducts as any)[index][field] = value;
        setCoProducts(newCoProducts);
    };

    const outputProducts = process?.workflowData?.outputProductIds || [];

    const stats = {
        totalPieces: tickets.reduce((a, b) => a + (b.quantity || 0), 0),
        destopado: tickets.filter(t => t.taskName?.toLowerCase().includes('destop')).reduce((a, b) => a + (b.quantity || 0), 0),
        deshuesado: tickets.filter(t => t.taskName?.toLowerCase().includes('deshue')).reduce((a, b) => a + (b.quantity || 0), 0),
        pelado: tickets.filter(t => t.taskName?.toLowerCase().includes('pela')).reduce((a, b) => a + (b.quantity || 0), 0),
        // Heuristic: sum of tickets where task name matches common output stages
        mainOutputQty: tickets.filter(t => t.taskName?.toLowerCase().includes('pela') || t.taskName?.toLowerCase().includes('termina')).reduce((a, b) => a + (b.quantity || 0), 0),
    };

    const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
        const nodes = allProcesses
            .map((p: any, idx: number) => {
                const qty = tickets.filter(t => t.taskName === p.name).reduce((a, b) => a + (b.quantity || 0), 0);
                return {
                    id: p.id,
                    type: 'process',
                    position: { x: idx * 130, y: 15 },
                    data: {
                        label: p.name,
                        quantity: qty,
                        unit: (p.workflowData as any)?.piecework?.unit || 'u',
                        active: qty > 0 || p.id === process?.id
                    }
                };
            });

        const edges = [];
        for (let i = 0; i < nodes.length - 1; i++) {
            edges.push({
                id: `e${i}-${i + 1}`,
                source: nodes[i].id,
                target: nodes[i + 1].id,
                animated: nodes[i].data.active,
                style: { stroke: nodes[i].data.active ? '#3b82f6' : '#1e293b', strokeWidth: 2 }
            });
        }
        return { nodes, edges };
    }, [allProcesses, tickets, process]);

    const pathAnomalies = useMemo(() => {
        const alerts: any[] = [];
        for (let i = 1; i < flowNodes.length; i++) {
            const prev = flowNodes[i - 1];
            const curr = flowNodes[i];
            if (prev.data.quantity > curr.data.quantity && prev.data.quantity > 0 && curr.data.active) {
                alerts.push({
                    prev: prev.data.label,
                    curr: curr.data.label,
                    diff: prev.data.quantity - curr.data.quantity
                });
            }
        }
        return alerts;
    }, [flowNodes]);

    const calculateEstimate = () => {
        // Estimado de entrada: Mayor volumen de piezas reportado en tickets iniciales
        const initialTask = tickets.find(t => t.taskName?.toLowerCase().includes('destop') || t.taskName?.toLowerCase().includes('inici'));
        if (initialTask) setEstimatedInput(initialTask.quantity);

        // Si no hay valores manuales, pre-llenar con la suma de tickets de la etapa final
        if (outputProducts.length > 0 && Object.keys(outputs).length === 0) {
            setOutputs({ [outputProducts[0]]: stats.mainOutputQty });
        }
    };

    useEffect(() => {
        calculateEstimate();
    }, [tickets, process]);

    return (
        <Dialog>
            <DialogTrigger asChild><Button size="sm" variant="secondary">Finalizar</Button></DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>[{process?.name || 'Proceso'}] Cierre de Lote & Balance de Masas</DialogTitle>
                    <DialogDescription>ID: {instance.id.substring(0, 8)}</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                        {/* Process Flow Visualization */}
                        <div className="p-4 bg-slate-900/80 rounded-lg space-y-3 border border-slate-700/50">
                            <h4 className="font-bold text-xs uppercase text-slate-400 flex items-center gap-2">
                                <Workflow className="w-3 h-3" />
                                Flujo de Proceso Nexus
                            </h4>
                            <div className="h-24 w-full bg-slate-950 rounded border border-slate-800 relative overflow-hidden">
                                <ReactFlowProvider>
                                    <ReactFlow
                                        nodes={flowNodes}
                                        edges={flowEdges}
                                        nodeTypes={nodeTypes}
                                        fitView
                                        fitViewOptions={{ padding: 0.2 }}
                                        draggable={false}
                                        panOnDrag={false}
                                        zoomOnScroll={false}
                                        zoomOnPinch={false}
                                        nodesDraggable={false}
                                        nodesConnectable={false}
                                        elementsSelectable={false}
                                    >
                                        <Background color="#1e293b" gap={10} size={1} />
                                    </ReactFlow>
                                </ReactFlowProvider>
                            </div>

                            {pathAnomalies.map((alert, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg animate-pulse">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <div className="space-y-1">
                                        <p className="font-bold text-[10px] uppercase">Pérdida Detectada en Flujo</p>
                                        <p className="text-[10px] leading-tight text-amber-200/70">{alert.diff} unidades no progresaron de {alert.prev} a {alert.curr}.</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-slate-900 rounded-lg space-y-3">
                            <h4 className="font-bold text-sm uppercase text-slate-400 flex items-center gap-2">
                                <Package className="w-4 h-4 text-emerald-500" />
                                Captura de Producción Final
                            </h4>

                            <div className="space-y-4">
                                {outputProducts.map((pid: string) => {
                                    const product = inventory.find(p => p.id === pid);
                                    return (
                                        <div key={pid} className="space-y-2">
                                            <Label className="text-xs font-bold text-slate-300 uppercase">
                                                {product?.name || 'Producto'} ({product?.unit || 'u'})
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    className="bg-slate-950 border-slate-800 pl-20"
                                                    value={outputs[pid] ?? ""}
                                                    onChange={(e) => setOutputs({ ...outputs, [pid]: e.target.value === "" ? 0 : Number(e.target.value) })}
                                                    placeholder="0.00"
                                                />
                                                <div className="absolute left-3 top-2.5 text-[10px] text-primary font-bold uppercase tracking-tighter">
                                                    ∑ TICKETS
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-slate-500 italic mt-1 font-medium">Sugerencia basada en tickets: {stats.mainOutputQty} {product?.unit || 'u'}</p>
                                        </div>
                                    );
                                })}

                                {(!outputProducts || outputProducts.length === 0) && (
                                    <div className="p-4 border border-dashed border-slate-800 rounded text-center text-xs text-slate-500">
                                        No hay productos de salida definidos en este proceso.
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-slate-800 space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs uppercase text-blue-400 font-bold">Subproductos Adicionales</Label>
                                    <Button type="button" variant="ghost" size="sm" onClick={addCoProduct} className="h-6 text-[10px]"><Plus className="w-3 h-3 mr-1" /> Agregar</Button>
                                </div>
                                {coProducts.map((cp, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <div className="flex-1">
                                            <Select value={cp.productId} onValueChange={(v) => { updateCoProduct(idx, 'productId', v); }}>
                                                <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-800"><SelectValue placeholder="Producto" /></SelectTrigger>
                                                <SelectContent>
                                                    {inventory.filter(p => !outputProducts.includes(p.id)).map((p: any) => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            className="w-24 h-8 text-xs bg-slate-950 border-slate-800"
                                            placeholder="0.00"
                                            value={cp.quantity ?? ""}
                                            onChange={(e) => { updateCoProduct(idx, 'quantity', e.target.value === "" ? 0 : Number(e.target.value)); }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {isVisionEnabled && (
                            <VisionCounter onCountChange={setVisionCount} />
                        )}
                    </div>

                    <div className="space-y-4 flex flex-col justify-between">
                        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg h-full">
                            <h4 className="font-bold text-sm uppercase text-slate-400 mb-4">Estimación Inteligente</h4>
                            <div className="space-y-6">
                                <div className="text-center space-y-1">
                                    <p className="text-xs text-slate-500">Consumo Estimado (Cocos)</p>
                                    <div className="text-4xl font-black text-white">{estimatedInput}</div>
                                    <p className="text-[10px] text-slate-500 italic">Calculado base rendimientos típicos</p>
                                </div>

                                {visionCount > 0 && (
                                    <div className="text-center space-y-1 pt-4 border-t border-slate-800">
                                        <p className="text-xs text-emerald-500">Sensor Visión</p>
                                        <div className="text-xl font-bold text-emerald-400">{visionCount}</div>
                                    </div>
                                )}

                                <div className="pt-4 space-y-2">
                                    {outputProducts.map((pid: string) => {
                                        const product = inventory.find(p => p.id === pid);
                                        const qty = outputs[pid] || 0;
                                        return (
                                            <div key={pid} className="flex justify-between text-xs">
                                                <span className="text-slate-400">Rendimiento {product?.name}:</span>
                                                <span className="font-mono text-emerald-400">
                                                    {qty > 0 ? (qty / (visionCount || estimatedInput || 1)).toFixed(3) : '-'} {product?.unit || 'u'}/in
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={() => { onConfirm({ yields: outputs, estimatedInput: visionCount > 0 ? visionCount : estimatedInput, coProducts }); }} isLoading={isLoading}>
                        Confirmar Cierre e Inventario
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
