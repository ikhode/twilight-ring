import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Square, CheckCircle2, AlertOctagon, User, Clock, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WorkstationKiosk() {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeLog, setActiveLog] = useState<any>(null);
    const [quantity, setQuantity] = useState("0");

    const { data: orders = [] } = useQuery<any[]>({
        queryKey: ["/api/manufacturing/orders"],
        enabled: !!session?.access_token
    });

    const logMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await fetch(`/api/manufacturing/orders/${payload.orderId}/log`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify(payload)
            });
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/orders"] });
            if (data.status === 'started') {
                setActiveLog(data);
                toast({ title: "Iniciado", description: "Cronómetro en marcha." });
            } else {
                setActiveLog(null);
                setQuantity("0");
                toast({ title: "Completado", description: "Actividad registrada con éxito." });
            }
        }
    });

    const activeOrder = orders.find(o => o.status === 'in_progress' || o.status === 'scheduled');

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {!activeLog ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-slate-950 border-slate-800 shadow-2xl">
                        <CardHeader className="border-b border-slate-900">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <User className="w-5 h-5 text-primary" />
                                Operador: {session?.user?.id.slice(0, 8)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="text-center py-8">
                                <div className="p-4 bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 border border-primary/20">
                                    <Clock className="w-10 h-10 text-primary" />
                                </div>
                                <h3 className="text-xl font-black text-white mb-1 uppercase tracking-tighter">Sin actividad activa</h3>
                                <p className="text-slate-500 text-xs">Selecciona una orden para iniciar producción.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">Órdenes Disponibles</h4>
                        {orders.filter(o => o.status === 'scheduled' || o.status === 'in_progress').map(order => (
                            <Card key={order.id} className="bg-slate-900/50 border-slate-800 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => {
                                logMutation.mutate({ orderId: order.id, status: 'started', operatorId: session?.user?.id });
                            }}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold text-primary">#{order.id.slice(-6).toUpperCase()}</p>
                                        <h5 className="text-sm font-bold text-white">{order.product?.name}</h5>
                                        <div className="flex gap-2 mt-1">
                                            <Badge variant="secondary" className="text-[9px] h-4 py-0">{order.quantityRequested} pcs</Badge>
                                            <Badge variant="outline" className="text-[9px] h-4 py-0 border-slate-700 capitalize">{order.status}</Badge>
                                        </div>
                                    </div>
                                    <Button size="icon" className="h-10 w-10 rounded-full bg-emerald-600 hover:bg-emerald-500">
                                        <Play className="w-5 h-5 fill-white" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ) : (
                <Card className="bg-slate-950 border-primary/20 border-2 shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)]">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-slate-900 bg-slate-900/20">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center animate-pulse">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-primary uppercase">En Producción</p>
                                <CardTitle className="text-lg">#{activeLog.orderId.slice(-6).toUpperCase()}</CardTitle>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Tiempo Transcurrido</p>
                            <p className="text-2xl font-black font-mono text-white">00:14:23</p>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-8">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <Label className="text-xs text-slate-400">Cantidad Producida</Label>
                                <Input
                                    type="number"
                                    className="h-20 text-4xl font-black text-center bg-slate-900 border-slate-800 focus:border-primary"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                />
                                <div className="grid grid-cols-3 gap-2">
                                    {[1, 5, 10].map(n => (
                                        <Button key={n} variant="outline" className="bg-slate-900 border-slate-800" onClick={() => setQuantity(String(Number(quantity) + n))}>
                                            +{n}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4 flex flex-col justify-end">
                                <Button
                                    className="h-20 bg-emerald-600 hover:bg-emerald-500 text-lg font-black gap-3"
                                    onClick={() => logMutation.mutate({
                                        orderId: activeLog.orderId,
                                        status: 'completed',
                                        quantityCompleted: Number(quantity),
                                        operatorId: session?.user?.id
                                    })}
                                    disabled={logMutation.isPending}
                                >
                                    <CheckCircle2 className="w-8 h-8" /> FINALIZAR TURNO
                                </Button>
                                <Button variant="ghost" className="text-slate-500 hover:text-red-500 gap-2">
                                    <Square className="w-4 h-4 fill-current" /> Pausar / Detener
                                </Button>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                            <div className="flex items-start gap-3">
                                <AlertOctagon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-300">Instrucciones de Seguridad</p>
                                    <p className="text-[10px] text-slate-500 leading-relaxed italic">
                                        Asegúrese de usar gafas de protección y calzado industrial. Verifique la alineación de la pieza antes de accionar la prensa hidráulica.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
