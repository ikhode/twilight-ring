import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { cn } from "@/lib/utils";
import { Flag, PackageCheck } from "lucide-react";

export const EndNode = memo(({ data, selected }: any) => {
    return (
        <div
            onClick={() => data.onClick && data.onClick()}
            className={cn(
                "group relative min-w-[180px] rounded-xl border-2 transition-all duration-300 cursor-pointer overflow-hidden",
                selected
                    ? "border-blue-500 bg-blue-950/30 shadow-[0_0_30px_-10px_var(--blue-500)]"
                    : "border-blue-900/50 bg-slate-950 text-slate-400 hover:border-blue-800",
                data.simActive && "border-blue-500 ring-2 ring-blue-500/50 scale-105 z-50 shadow-[0_0_40px_-10px_var(--blue-500)]"
            )}
        >
            {/* Simulation Pulse */}
            {data.simActive && (
                <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
            )}

            <div className="flex items-center gap-3 px-4 py-3 relative z-10">
                <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border shadow-inner transition-colors",
                    data.simActive ? "bg-blue-500 text-white border-blue-400 animate-bounce" :
                        (selected ? "bg-blue-500 text-white border-blue-400" : "bg-blue-950/50 border-blue-900 text-blue-500")
                )}>
                    <PackageCheck className="h-4 w-4" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <p className={cn(
                            "text-xs font-bold uppercase tracking-wider",
                            selected || data.simActive ? "text-white" : "text-blue-500"
                        )}>
                            {data.label || 'Final'}
                        </p>
                        {data.simActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />}
                    </div>
                    <p className="text-[9px] font-mono text-slate-500">SALIDA</p>
                </div>
            </div>

            {data.destination && (
                <div className="px-4 py-1.5 bg-blue-950/20 border-t border-blue-900/30 text-[8px] font-bold text-blue-400 uppercase tracking-widest relative z-10">
                    A: {data.destination} (CESTAS)
                </div>
            )}

            <Handle
                type="target"
                position={Position.Left}
                className={cn(
                    "w-3 h-3 border-2 transition-colors",
                    selected ? "bg-blue-500 border-white" : "bg-slate-950 border-blue-900"
                )}
            />
        </div>
    );
});
