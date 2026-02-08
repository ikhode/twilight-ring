import { memo } from "react";
import { Handle, Position } from 'reactflow';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
    Factory,
    DollarSign,
    X,
    ArrowRight,
    Box,
    Settings2,
    Package
} from "lucide-react";

export const ProcessNode = memo(({ data, selected }: any) => {
    return (
        <div
            className={cn(
                "group relative min-w-[240px] rounded-xl border-2 transition-all duration-300",
                selected
                    ? "border-primary bg-slate-900 shadow-[0_0_30px_-10px_var(--primary)] text-slate-100"
                    : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:bg-slate-900"
            )}
            onClick={() => data.onClick && data.onClick()}
        >
            {/* Visual Accent */}
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-xl opacity-50 group-hover:opacity-100 transition-opacity" />

            {/* Header */}
            <div className={cn(
                "flex items-center justify-between px-4 py-3 border-b transition-colors",
                selected ? "border-primary/20 bg-primary/5" : "border-slate-800 bg-slate-900/50"
            )}>
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg border shadow-inner",
                        selected
                            ? "bg-primary text-primary-foreground border-primary/50"
                            : "bg-slate-900 border-slate-800 text-slate-500"
                    )}>
                        <Settings2 className="h-4 w-4" />
                    </div>
                    <div>
                        <p className={cn(
                            "text-xs font-bold uppercase tracking-wider",
                            selected ? "text-white" : "text-slate-300"
                        )}>
                            {data.label}
                        </p>
                        <p className="text-[9px] font-mono text-slate-500">ETAPA {String(data.orderIndex).padStart(2, '0')}</p>
                    </div>
                </div>
                {data.pieceworkEnabled && (
                    <Badge variant="outline" className="text-[8px] bg-emerald-500/5 text-emerald-400 border-emerald-500/20 font-black">
                        DESTAJO
                    </Badge>
                )}
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 font-mono bg-slate-900/50 p-2 rounded border border-slate-800/50">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <Package className="w-3 h-3 text-slate-600 shrink-0" />
                        <span className="truncate" title={data.inputName}>{data.inputName || 'S/I'}</span>
                    </div>
                    {data.pieceworkEnabled && (
                        <div className="flex items-center gap-1 text-emerald-400 font-bold border-l border-slate-800 pl-2 shrink-0">
                            <DollarSign className="w-3 h-3" />
                            {(data.rate / 100).toFixed(2)}
                        </div>
                    )}
                </div>

                {data.description && (
                    <p className="text-[10px] text-slate-500 line-clamp-2 italic">
                        {data.description}
                    </p>
                )}
            </div>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className={cn(
                    "w-3 h-3 border-2 transition-colors",
                    selected ? "bg-primary border-primary-foreground" : "bg-slate-950 border-slate-700"
                )}
            />
            <Handle
                type="source"
                position={Position.Right}
                className={cn(
                    "w-3 h-3 border-2 transition-colors",
                    selected ? "bg-primary border-primary-foreground" : "bg-slate-950 border-slate-700"
                )}
            />

            {/* Delete Button */}
            <button
                onClick={(e) => { e.stopPropagation(); data.onDelete(); }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-500 hover:border-rose-500 hover:bg-rose-950/50 rounded-full flex items-center justify-center shadow-xl opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200"
            >
                <X className="w-3 h-3" />
            </button>
        </div>
    );
});

ProcessNode.displayName = "ProcessNode";
