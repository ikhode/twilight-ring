import { Handle, Position } from 'reactflow';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
    Factory,
    DollarSign,
    X,
    ArrowRight,
    Clock,
    Box
} from "lucide-react";

export const ProcessNode = ({ data, selected }: any) => {
    return (
        <div className={cn(
            "group relative min-w-[240px] rounded-xl border-2 transition-all duration-300",
            selected
                ? "border-primary bg-slate-900 shadow-[0_0_30px_-10px_var(--primary)] text-slate-100"
                : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:bg-slate-900"
        )}
            onClick={() => data.onClick && data.onClick()}
        >
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
                        <Factory className="h-4 w-4" />
                    </div>
                    <div>
                        <p className={cn(
                            "text-xs font-bold uppercase tracking-wider",
                            selected ? "text-white" : "text-slate-300"
                        )}>
                            {data.label}
                        </p>
                        <p className="text-[9px] font-mono text-slate-500">IDX: {String(data.orderIndex).padStart(2, '0')}</p>
                    </div>
                </div>
                {data.quantity !== undefined && data.quantity > 0 && (
                    <Badge variant="default" className="text-[10px] h-5 px-1.5 bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20">
                        {data.quantity} {data.unit}
                    </Badge>
                )}
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
                {/* Visual Flow Indicator */}
                <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 font-mono bg-slate-900/50 p-2 rounded border border-slate-800/50">
                    <div className="flex items-center gap-1.5">
                        <Box className="w-3 h-3 text-slate-600" />
                        <span>IN</span>
                    </div>
                    <ArrowRight className="w-3 h-3 opacity-20" />
                    <div className="flex items-center gap-1.5">
                        <Box className="w-3 h-3 text-slate-600" />
                        <span>OUT</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-slate-600">Origen Input</span>
                        <div className="text-[10px] font-medium text-slate-300 truncate" title={data.inputName || 'No definido'}>
                            {data.inputName || <span className="text-slate-600 italic">--</span>}
                        </div>
                    </div>

                    {data.pieceworkEnabled && (
                        <div className="space-y-1">
                            <span className="text-[9px] uppercase font-bold text-slate-600">Tarifa</span>
                            <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                                <DollarSign className="w-3 h-3" />
                                {(data.rate / 100).toFixed(2)}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Selection/Hover Halo */}
            <div className="absolute -inset-px -z-10 rounded-xl bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 opacity-0 group-hover:from-primary/10 group-hover:to-blue-500/10 group-hover:opacity-100 transition-all duration-500" />

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

            {/* Actions */}
            <button
                onClick={(e) => { e.stopPropagation(); data.onDelete(); }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-500 hover:border-rose-500 hover:bg-rose-950/50 rounded-full flex items-center justify-center shadow-xl opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200"
            >
                <X className="w-3 h-3" />
            </button>
        </div>
    );
};
