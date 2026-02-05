import { Handle, Position } from 'reactflow';
import { cn } from "@/lib/utils";
import { Flag, PackageCheck } from "lucide-react";

export const EndNode = ({ data, selected }: any) => {
    return (
        <div className={cn(
            "group relative min-w-[180px] rounded-xl border-2 transition-all duration-300",
            selected
                ? "border-blue-500 bg-blue-950/30 shadow-[0_0_30px_-10px_var(--blue-500)]"
                : "border-blue-900/50 bg-slate-950 text-slate-400 hover:border-blue-800"
        )}>
            <div className="flex items-center gap-3 px-4 py-3">
                <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border shadow-inner transition-colors",
                    selected ? "bg-blue-500 text-white border-blue-400" : "bg-blue-950/50 border-blue-900 text-blue-500"
                )}>
                    <PackageCheck className="h-4 w-4" />
                </div>
                <div>
                    <p className={cn(
                        "text-xs font-bold uppercase tracking-wider",
                        selected ? "text-white" : "text-blue-500"
                    )}>
                        {data.label || 'Final'}
                    </p>
                    <p className="text-[9px] font-mono text-slate-500">SALIDA</p>
                </div>
            </div>

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
};
