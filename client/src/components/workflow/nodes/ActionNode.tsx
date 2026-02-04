import { Handle, Position } from "reactflow";
import { Mail, Banknote, MessageSquare, UserPlus, MoreHorizontal } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface ActionNodeData {
    id: string;
    name: string;
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    'send_email': Mail,
    'create_refund': Banknote,
    'discord_notify': MessageSquare,
    'update_crm': UserPlus,
};

export default function ActionNode({ data }: { data: ActionNodeData }) {
    const Icon = ACTION_ICONS[data.id] || MoreHorizontal;

    return (
        <div className="relative group p-[2px] rounded-2xl bg-gradient-to-br from-slate-700/50 to-transparent shadow-lg shadow-black/20">
            <Card className="w-[300px] bg-slate-900/90 border-slate-800 backdrop-blur-xl rounded-2xl overflow-hidden">
                <CardHeader className="flex flex-row items-center gap-4 py-4 px-5 space-y-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-slate-300" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">Ejecutar Acción</p>
                        <CardTitle className="text-sm font-bold text-white tracking-tight">{data.name || 'Acción'}</CardTitle>
                    </div>
                    <MoreHorizontal className="w-4 h-4 text-slate-600 cursor-pointer" />
                </CardHeader>
            </Card>

            <Handle
                type="target"
                position={Position.Top}
                className="w-3 h-3 bg-slate-700 border-4 border-slate-900 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                className="w-3 h-3 bg-slate-700 border-4 border-slate-900 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
            />
        </div>
    );
}
