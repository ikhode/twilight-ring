
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
    Zap,
    Activity,
    Clock,
    Split,
    GitBranch,
    Bell,
    Bot,
    Play,
    Eye,
    Plus,
    Minus,
    Divide,
    X,
    Sigma,
    Coins,
    Package,
    Settings2,
    MapPin
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const nodeConfigurations: Record<string, any> = {
    // Nodes Library
    trigger: { icon: Zap, color: "blue", label: "Trigger", theme: "border-blue-500 bg-blue-950/30 text-blue-400" },
    action: { icon: Activity, color: "amber", label: "Action", theme: "border-amber-500 bg-amber-950/30 text-amber-400" },
    delay: { icon: Clock, color: "slate", label: "Delay", theme: "border-slate-500 bg-slate-900/30 text-slate-400" },
    conditional: { icon: GitBranch, color: "purple", label: "Conditional", theme: "border-purple-500 bg-purple-950/30 text-purple-400" },
    decision: { icon: Split, color: "orange", label: "Decision", theme: "border-orange-500 bg-orange-950/30 text-orange-400" },
    notification: { icon: Bell, color: "rose", label: "Notification", theme: "border-rose-500 bg-rose-950/30 text-rose-400" },
    ai_agent: { icon: Bot, color: "indigo", label: "AI Agent", theme: "border-indigo-500 bg-indigo-950/30 text-indigo-400" },

    // Playable Flow
    start: { icon: Play, color: "emerald", label: "Start", theme: "border-emerald-500 bg-emerald-950/30 text-emerald-400" },
    display: { icon: Eye, color: "cyan", label: "Display Value", theme: "border-cyan-500 bg-cyan-950/30 text-cyan-400" },

    // Playable Math
    math_add: { icon: Plus, color: "lime", label: "Add", theme: "border-lime-500 bg-lime-950/30 text-lime-400" },
    math_subtract: { icon: Minus, color: "red", label: "Subtract", theme: "border-red-500 bg-red-950/30 text-red-400" },
    math_divide: { icon: Divide, color: "sky", label: "Divide", theme: "border-sky-500 bg-sky-950/30 text-sky-400" },
    math_multiply: { icon: X, color: "yellow", label: "Multiply", theme: "border-yellow-500 bg-yellow-950/30 text-yellow-400" },
    math_sum_all: { icon: Sigma, color: "pink", label: "Sum All", theme: "border-pink-500 bg-pink-950/30 text-pink-400" },

    // Playable API
    api_currency: { icon: Coins, color: "emerald", label: "Currency Conv.", theme: "border-emerald-500 bg-emerald-950/30 text-emerald-400" },

    // 360 Logic Integration
    inventory_out: { icon: Package, color: "rose", label: "Consumo Inv.", theme: "border-rose-500 bg-rose-950/30 text-rose-400" },
    inventory_in: { icon: Package, color: "emerald", label: "Entrada Inv.", theme: "border-emerald-500 bg-emerald-950/30 text-emerald-400" },
    piecework: { icon: Coins, color: "amber", label: "Ticket Destajo", theme: "border-amber-500 bg-amber-950/30 text-amber-400" },
};

export const UniversalWorkflowNode = memo(({ type, data, selected }: any) => {
    const { inventory } = data; // Access inventory from data object
    const config = nodeConfigurations[type] || { icon: Settings2, color: "slate", label: type, theme: "border-slate-800 bg-slate-950 text-slate-500" };
    const Icon = config.icon;

    // Determine if node should have a generic target handle (all except start)
    const hasTargetHandle = type !== 'start';

    // Determine if node should have a generic source handle 
    // (except end, and only if doesn't have multiple output rows like branches or items)
    const hasGenericSourceHandle = type !== 'end' && !data.branches && !data.items && !data.references && !data.subproducts;


    return (
        <div
            className={cn(
                "group relative min-w-[220px] rounded-[20px] transition-all duration-500 cursor-pointer overflow-hidden border-2",
                selected
                    ? "border-cyan-500/50 bg-[#0a0f1d] shadow-[0_0_25px_-10px_rgba(34,211,238,0.4)]"
                    : "border-slate-800 bg-[#0a0f1d]/95 hover:border-slate-700 shadow-xl",
                data.simActive && "opacity-60 grayscale-[0.5] scale-95 transition-all duration-500",
                data.activeStep && "opacity-100 grayscale-0 scale-105 z-50 border-emerald-400 shadow-[0_0_40px_-5px_rgba(16,185,129,0.4)]",
            )}
            style={{
                boxShadow: selected ? `0 0 20px -5px ${config.color === 'cyan' ? '#22d3ee44' : '#3b82f644'}` : undefined
            }}
        >
            {/* Header Section */}
            <div className="p-3 pb-2 flex items-center gap-3 relative z-10">
                <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl border-2 shadow-lg transition-transform duration-300 group-hover:scale-110",
                    selected ? `bg-${config.color}-500/10 border-${config.color}-500/50 text-${config.color}-400` : "bg-slate-900 border-slate-800 text-slate-500"
                )}>
                    <Icon className="h-5 w-5" />
                </div>
                {data.activeStep && (
                    <div className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border border-emerald-400"></span>
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className={cn(
                            "text-sm font-black uppercase tracking-wider truncate",
                            selected ? "text-white" : "text-slate-200"
                        )}>
                            {data.label || config.label}
                        </h3>
                        {data.location && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="outline" className="h-4 px-1 text-[7px] border-slate-700 bg-slate-900 text-slate-400 gap-1 lowercase font-mono">
                                            <MapPin className="w-2 h-2" />
                                            {data.location}
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-[10px] bg-slate-900 border-slate-800 text-slate-300">
                                        <p>Ubicación física: {data.location === 'patio' ? 'Patio de Recepción/Trabajo' : data.location === 'cestas' ? 'Área de Cestas' : 'Almacén Central'}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                    <p className={cn(
                        "text-[9px] font-bold uppercase tracking-[0.15em] opacity-40 leading-none mt-0.5",
                        `text-${config.color}-500`
                    )}>
                        {type === 'decision' ? 'DECISION' : type === 'display' ? 'DISPLAY' : type.replace('_', ' ')}
                    </p>
                </div>
            </div>

            {/* Description Section */}
            {data.description && (
                <div className="px-3 pb-2">
                    <p className="text-[10px] text-slate-500 italic leading-relaxed">
                        {data.description}
                    </p>
                </div>
            )}

            {/* Content / Data Section */}
            {(data.items || data.branches || data.references || data.values) && (
                <div className="px-3 pb-4 space-y-1.5 relative z-10">
                    {/* Value Rows (e.g. for Display nodes) */}
                    {data.values && Object.entries(data.values).map(([key, defaultValue], i) => {
                        const simValue = data.simValues ? data.simValues[key] : null;
                        return (
                            <div key={i} className="flex items-center justify-between bg-slate-900/40 rounded-xl px-3 py-2 border border-white/[0.03]">
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-tight">
                                    {key.replace('_', ' ')}
                                </span>
                                <span className={cn(
                                    "text-xs font-mono font-black",
                                    simValue !== null ? "text-emerald-400 animate-in zoom-in-50 duration-300" : "text-slate-400"
                                )}>
                                    {simValue ?? defaultValue}
                                </span>
                            </div>
                        );
                    })}
                    {/* Inventory/Items Rows (Direct linkage) */}
                    {data.items && data.items.map((item: any, i: number) => {
                        const productName = inventory?.find((p: any) => p.id === item.id)?.name || item.id || 'N/A';
                        return (
                            <div key={i} className="flex flex-col bg-slate-900/40 rounded-xl px-3 py-2 border border-white/[0.03] group/row hover:bg-slate-900/60 transition-colors relative">
                                <div className="flex items-center justify-between">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tight group-hover/row:text-slate-200 transition-colors truncate max-w-[120px] cursor-help">
                                                    {productName}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="text-[10px] bg-slate-900 border-slate-800 text-slate-300">
                                                <p>Producto de entrada: {productName}</p>
                                                <p className="opacity-60">Fuente: Inventario en Tiempo Real</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <span className="text-xs font-mono font-black text-emerald-400">
                                        {item.value || (Math.floor(Math.random() * 900) + 100)}
                                    </span>
                                </div>
                                {item.yield && item.yield !== 1 && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex items-center gap-1 mt-0.5 opacity-60 cursor-help">
                                                    <Zap className="w-2 h-2 text-amber-500" />
                                                    <span className="text-[8px] font-bold text-slate-500">Yield: {item.yield} Pzs/U</span>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="text-[10px] bg-slate-900 border-slate-800 text-slate-300">
                                                <p>Rendimiento esperado por unidad de entrada.</p>
                                                <p className="opacity-60">Cálculo: (Piezas Finales / Cantidad Entrada)</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={`item-${i}`}
                                    className="!w-2 !h-2 !min-w-0 !min-h-0 !border-none !bg-emerald-500 !right-[-4px]"
                                />
                            </div>
                        );
                    })}
                    {/* Product Reference Rows (Flexible Insertion) */}
                    {data.references && data.references.map((ref: any, i: number) => {
                        const productName = inventory?.find((p: any) => p.id === ref.productId)?.name || ref.productId || 'REF. VACÍA';
                        return (
                            <div key={i} className="flex items-center justify-between bg-white/[0.02] rounded-xl px-3 py-2 border border-white/[0.03] relative group/ref hover:bg-white/[0.04] transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-[7px] uppercase font-bold text-slate-500 tracking-tighter opacity-50">Atributo Externo</span>
                                    <span className="text-[9px] uppercase font-black text-slate-300 truncate max-w-[120px] leading-none">
                                        {productName}
                                    </span>
                                </div>
                                <span className="text-sm font-mono font-black text-cyan-400 group-hover/ref:scale-105 transition-transform">{ref.value}</span>
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={`ref-${i}`}
                                    className="!w-2 !h-2 !min-w-0 !min-h-0 !border-none !bg-cyan-500 !right-[-4px]"
                                />
                            </div>
                        );
                    })}

                    {/* Subproducts / Yield Output Section */}
                    {data.subproducts && data.subproducts.map((sub: any, i: number) => {
                        const productName = inventory?.find((p: any) => p.id === sub.productId)?.name || 'SUBPRODUCTO';
                        return (
                            <div key={i} className={cn(
                                "flex items-center justify-between rounded-xl px-3 py-1.5 border relative transition-all",
                                sub.isVariable
                                    ? "bg-amber-500/5 border-amber-500/20 shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]"
                                    : "bg-cyan-500/5 border-cyan-500/10"
                            )}>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                        <span className={cn(
                                            "text-[7px] uppercase font-black tracking-tighter px-1 rounded-[2px]",
                                            sub.isVariable ? "bg-amber-500 text-slate-950" : "text-cyan-500"
                                        )}>
                                            {sub.isVariable ? "CAPTURAR LUEGO" : "OUTPUT GENERADO"}
                                        </span>
                                        {sub.isVariable && <Eye className="w-2 h-2 text-amber-500 animate-pulse" />}
                                    </div>
                                    <span className="text-[9px] uppercase font-black text-slate-300 truncate max-w-[100px] leading-none mt-0.5">
                                        {productName}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {sub.isVariable ? (
                                        <span className="text-[10px] font-bold text-amber-500/80 italic">? {sub.unit || 'L'}</span>
                                    ) : (
                                        <span className="text-[10px] font-mono font-black text-cyan-400">x{sub.ratio}</span>
                                    )}
                                </div>
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={`sub-${i}`}
                                    className={cn(
                                        "!w-2 !h-2 !min-w-0 !min-h-0 !border-none !right-[-4px]",
                                        sub.isVariable ? "!bg-amber-500" : "!bg-cyan-400"
                                    )}
                                />
                            </div>
                        );
                    })}

                    {/* Decision/Conditional Branch Rows */}
                    {['decision', 'conditional'].includes(type) && (data.branches || ['Default']).map((branch: string, i: number) => (
                        <div key={i} className="flex items-center justify-between bg-[#1a1f2e]/40 rounded-lg px-3 py-2 border border-white/[0.05] relative mb-1 last:mb-0">
                            <span className="text-[10px] font-bold text-slate-300 pr-6">{branch}</span>
                            <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={`branch-${i}`}
                                className="!w-3 !h-3 !min-w-0 !min-h-0 !border-none !bg-transparent !right-0 opacity-0"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Universal Target Handle (Left) */}
            {hasTargetHandle && (
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!w-3 !h-3 !border-2 !border-slate-950 !bg-slate-400 !top-1/2 !-left-[6px] hover:!bg-white transition-colors"
                />
            )}

            {/* Generic Source Handle (Right) - only if no specific rows */}
            {hasGenericSourceHandle && (
                <Handle
                    type="source"
                    position={Position.Right}
                    className="!w-3 !h-3 !border-2 !border-slate-950 !bg-slate-400 !top-1/2 !-right-[6px] hover:!bg-white transition-colors"
                />
            )}

            {/* Selection highlight border */}
            {selected && (
                <div className="absolute inset-0 border-2 border-cyan-500/30 rounded-[20px] pointer-events-none animate-pulse" />
            )}
        </div>
    );
});
