import { Handle, Position } from "reactflow";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaceholderNodeData {
    label?: string;
    onClick?: () => void;
}

export default function PlaceholderNode({ data }: { data: PlaceholderNodeData }) {
    const isTrigger = data.label?.toLowerCase().includes('trigger');

    return (
        <div className="relative flex flex-col items-center">
            <div
                className={cn(
                    "w-[300px] h-[80px] rounded-2xl border-2 border-dashed flex items-center gap-4 px-6 transition-all cursor-pointer group hover:bg-white/5",
                    isTrigger ? "border-primary/30 hover:border-primary/50" : "border-slate-800 hover:border-slate-600"
                )}
                onClick={data.onClick}
            >
                <div className={cn(
                    "w-10 h-10 rounded-xl border flex items-center justify-center transition-all group-hover:scale-110",
                    isTrigger ? "bg-primary/10 border-primary/20 text-primary" : "bg-slate-900 border-slate-800 text-slate-500"
                )}>
                    <Plus className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">
                        {isTrigger ? "Cuando esto suceda" : "Haz esto"}
                    </p>
                    <p className={cn(
                        "text-sm font-bold tracking-tight",
                        isTrigger ? "text-primary" : "text-slate-400 group-hover:text-slate-200"
                    )}>
                        {data.label || 'Añadir paso'}
                    </p>
                </div>
            </div>

            <Handle
                type="target"
                position={Position.Top}
                className="w-0 h-0 opacity-0"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                className="w-0 h-0 opacity-0"
            />
        </div>
    );
}
