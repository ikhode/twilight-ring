import { Handle, Position } from "reactflow";
import { GitBranch, Filter, MoreHorizontal } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface ConditionNodeData {
    name: string;
}

export default function ConditionNode({ data }: { data: ConditionNodeData }) {
    return (
        <div className="relative group flex flex-col items-center">
            {/* Connector line from top */}
            <div className="w-[1px] h-4 bg-slate-700 mb-[-1px]" />

            {/* Diamond Shape Wrapper */}
            <div className="w-10 h-10 rotate-45 bg-slate-900 border border-slate-700 flex items-center justify-center rounded-sm shadow-xl z-20">
                <GitBranch className="w-5 h-5 text-slate-400 -rotate-45" />
            </div>

            <Card className="w-[300px] mt-4 bg-slate-900/90 border-slate-800 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
                <CardHeader className="flex flex-row items-center gap-4 py-4 px-5 space-y-0 text-left">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                        <Filter className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest leading-none mb-1">Si se cumple esta condición</p>
                        <CardTitle className="text-sm font-bold text-white tracking-tight leading-tight">
                            {data.name || 'Validar condición...'}
                        </CardTitle>
                    </div>
                    <MoreHorizontal className="w-4 h-4 text-slate-600" />
                </CardHeader>
            </Card>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Top}
                className="w-3 h-3 bg-slate-700 border-4 border-slate-900 z-30"
            />

            <div className="flex justify-between w-full px-12 mt-4 relative">
                <div className="flex flex-col items-center gap-2">
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="yes"
                        className="w-3 h-3 bg-success border-4 border-slate-900 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                        style={{ left: '25%' }}
                    />
                    <span className="text-[10px] font-black uppercase text-success tracking-tighter mt-1">Si es cierto</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="no"
                        className="w-3 h-3 bg-slate-600 border-4 border-slate-900 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                        style={{ left: '75%' }}
                    />
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter mt-1">Si es falso</span>
                </div>
            </div>
        </div>
    );
}
