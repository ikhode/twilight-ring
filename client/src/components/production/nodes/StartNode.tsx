import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";

export const StartNode = memo(({ data, selected }: any) => {
    return (
        <div className={cn(
            "group relative min-w-[180px] rounded-xl border-2 transition-all duration-300",
            selected
                ? "border-emerald-500 bg-emerald-950/30 shadow-[0_0_30px_-10px_var(--emerald-500)]"
                : "border-emerald-900/50 bg-slate-950 text-slate-400 hover:border-emerald-800"
        )}>
            <div className="flex items-center gap-3 px-4 py-3">
                <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border shadow-inner transition-colors",
                    selected ? "bg-emerald-500 text-white border-emerald-400" : "bg-emerald-950/50 border-emerald-900 text-emerald-600"
                )}>
                    <Play className="h-4 w-4 fill-current" />
                </div>
                <div>
                    <p className={cn(
                        "text-xs font-bold uppercase tracking-wider",
                        selected ? "text-white" : "text-emerald-500"
                    )}>
                        {data.label || 'Inicio'}
                    </p>
                    <p className="text-[9px] font-mono text-slate-500">ENTRADA</p>
                </div>
            </div>

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
