import { Handle, Position } from "reactflow";
import { Zap, Package, ShieldAlert, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ICONS: Record<string, any> = {
    zap: Zap,
    package: Package,
    'shield-alert': ShieldAlert,
    users: Users,
};

export default function TriggerNode({ data }: { data: any }) {
    const Icon = ICONS[data.icon] || Zap;

    return (
        <div className="relative group p-[2px] rounded-2xl bg-gradient-to-br from-primary/40 to-transparent shadow-lg shadow-primary/5">
            <Card className="w-[300px] bg-slate-900/90 border-slate-800 backdrop-blur-xl rounded-2xl overflow-hidden">
                <div className="h-1 bg-primary/50" />
                <CardHeader className="flex flex-row items-center gap-4 py-4 px-5 space-y-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none mb-1">Cuando esto suceda</p>
                        <CardTitle className="text-sm font-bold text-white tracking-tight">{data.name || 'Disparador'}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                    <p className="text-xs text-slate-400 leading-relaxed italic">
                        {data.description || 'Configurar disparador...'}
                    </p>
                </CardContent>
            </Card>

            {/* Input handle - allows connections TO this trigger */}
            <Handle
                type="target"
                position={Position.Top}
                className="w-3 h-3 bg-primary border-4 border-slate-900 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            />

            {/* Output handle - allows connections FROM this trigger */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="w-3 h-3 bg-primary border-4 border-slate-900 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            />
        </div>
    );
}
