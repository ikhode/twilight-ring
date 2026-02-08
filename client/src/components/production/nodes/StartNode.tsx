import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";

export const StartNode = memo(({ data, selected }: any) => {
    return (
        <div
            onClick={() => data.onClick && data.onClick()}
            className={cn(
                "group relative min-w-[180px] rounded-xl border-2 transition-all duration-300 cursor-pointer overflow-hidden",
                selected
                    ? "border-emerald-500 bg-emerald-950/30 shadow-[0_0_30px_-10px_var(--emerald-500)]"
                    : "border-emerald-900/50 bg-slate-950 text-slate-400 hover:border-emerald-800",
                data.simActive && "border-emerald-500 ring-2 ring-emerald-500/50 scale-105 z-50 shadow-[0_0_40px_-10px_var(--emerald-500)]"
            )}
        >
            {/* Simulation Pulse */}
            {data.simActive && (
                <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
            )}

            <div className="flex items-center gap-3 px-4 py-3 relative z-10">
                <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border shadow-inner transition-colors",
                    data.simActive ? "bg-emerald-500 text-white border-emerald-400 animate-bounce" :
                        (selected ? "bg-emerald-500 text-white border-emerald-400" : "bg-emerald-950/50 border-emerald-900 text-emerald-600")
                )}>
                    <Play className="h-4 w-4 fill-current" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <p className={cn(
                            "text-xs font-bold uppercase tracking-wider",
                            selected || data.simActive ? "text-white" : "text-emerald-500"
                        )}>
                            {data.label || 'Inicio'}
                        </p>
                        {data.simActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
                    </div>
                    <p className="text-[9px] font-mono text-slate-500">ENTRADA</p>
                </div>
            </div>

            {data.origin && (
                <div className="px-4 py-1.5 bg-emerald-950/20 border-t border-emerald-900/30 text-[8px] font-bold text-emerald-600 uppercase tracking-widest relative z-10">
                    DE: {data.origin} (PATIO)
                </div>
            )}

            <Handle
                type="source"
                position={Position.Right}
                className={cn(
                    "w-3 h-3 border-2 transition-colors",
                    selected ? "bg-emerald-500 border-white" : "bg-slate-950 border-emerald-900"
                )}
            />
        </div>
    );
});
