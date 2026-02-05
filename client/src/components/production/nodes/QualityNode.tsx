import { Handle, Position } from 'reactflow';
import { cn } from "@/lib/utils";
import { ShieldCheck, Search } from "lucide-react";

export const QualityNode = ({ data, selected }: any) => {
    return (
        <div className={cn(
            "group relative min-w-[200px] rounded-xl border-2 transition-all duration-300",
            selected
                ? "border-purple-500 bg-purple-950/30 shadow-[0_0_30px_-10px_var(--purple-500)]"
                : "border-purple-900/50 bg-slate-950 text-slate-400 hover:border-purple-800"
        )}
            onClick={() => data.onClick && data.onClick()}
        >
            <div className="flex items-center justify-between px-4 py-3 border-b border-purple-900/30">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg border shadow-inner",
                        selected ? "bg-purple-500 text-white border-purple-400" : "bg-purple-950/50 border-purple-900 text-purple-500"
                    )}>
                        <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                        <p className={cn(
                            "text-xs font-bold uppercase tracking-wider",
                            selected ? "text-white" : "text-purple-400"
                        )}>
                            {data.label}
                        </p>
                        <p className="text-[9px] font-mono text-purple-600/80">CONTROL CALIDAD</p>
                    </div>
                </div>
            </div>

            <div className="p-3 bg-purple-950/10">
                <div className="flex items-center gap-2 text-[10px] text-purple-300/70">
                    <Search className="w-3 h-3" />
                    <span>Inspección obligatoria</span>
                </div>
            </div>

            <Handle
                type="target"
                position={Position.Left}
                className={cn(
                    "w-3 h-3 border-2 transition-colors",
                    selected ? "bg-purple-500 border-white" : "bg-slate-950 border-purple-900"
                )}
            />
            <Handle
                type="source"
                position={Position.Right}
                className={cn(
                    "w-3 h-3 border-2 transition-colors",
                    selected ? "bg-purple-500 border-white" : "bg-slate-950 border-purple-900"
                )}
            />
        </div>
    );
};
