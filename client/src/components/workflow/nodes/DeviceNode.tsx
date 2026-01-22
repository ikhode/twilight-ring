import { Handle, Position } from "reactflow";
import { Tablet, Smartphone, Search, Radio, Server } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ICONS: Record<string, any> = {
    tablet: Tablet,
    terminal: Smartphone,
    sensor: Radio,
    scanner: Search,
    server: Server
};

export default function DeviceNode({ data }: { data: any }) {
    const Icon = ICONS[data.icon] || Tablet;

    return (
        <div className="relative group p-[2px] rounded-2xl bg-gradient-to-br from-emerald-500/40 to-transparent shadow-lg shadow-emerald-500/5">
            <Card className="w-[280px] bg-slate-900/90 border-slate-800 backdrop-blur-xl rounded-2xl overflow-hidden">
                <div className="h-1 bg-emerald-500/50" />
                <CardHeader className="flex flex-row items-center gap-4 py-4 px-5 space-y-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        <Icon className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest leading-none mb-1">Punto Físico</p>
                        <CardTitle className="text-sm font-bold text-white tracking-tight">{data.name || 'Dispositivo'}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                    <p className="text-xs text-slate-400 leading-relaxed italic">
                        {data.description || 'Interacción física...'}
                    </p>
                </CardContent>
            </Card>

            {/* Device nodes typically have input from system AND output to system */}
            <Handle
                type="target"
                position={Position.Top}
                className="w-3 h-3 bg-emerald-500 border-4 border-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            />

            <Handle
                type="source"
                position={Position.Bottom}
                className="w-3 h-3 bg-emerald-500 border-4 border-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            />
        </div>
    );
}
