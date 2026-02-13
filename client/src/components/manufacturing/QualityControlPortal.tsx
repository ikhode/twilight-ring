import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, ClipboardCheck, Search, FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function QualityControlPortal() {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [notes, setNotes] = useState("");

    const { data: orders = [] } = useQuery<any[]>({
        queryKey: ["/api/manufacturing/orders"],
        enabled: !!session?.access_token
    });

    const finalizeMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/manufacturing/orders/${id}/finalize`, {
                method: "POST",
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/orders"] });
            toast({ title: "Orden Liberada", description: "El producto ha sido ingresado al inventario." });
            setSelectedOrder(null);
        }
    });

    const pendingOrders = orders.filter(o => o.status === 'qc_pending');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Sidebar: Pending List */}
            <Card className="bg-slate-950 border-slate-800">
                <CardHeader className="border-b border-slate-900">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Search className="w-4 h-4 text-primary" /> Pendientes de Inspección
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {pendingOrders.length > 0 ? (
                        pendingOrders.map(order => (
                            <div
                                key={order.id}
                                className={`p-4 border-b border-slate-900 cursor-pointer transition-colors hover:bg-slate-900/50 ${selectedOrder?.id === order.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                                onClick={() => setSelectedOrder(order)}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] font-bold text-slate-500 tracking-tighter">#{order.id.slice(-6).toUpperCase()}</span>
                                    {order.priority === 'urgent' && <Badge variant="destructive" className="h-4 text-[8px] animate-pulse">URGENTE</Badge>}
                                </div>
                                <h5 className="text-sm font-bold text-slate-200">{order.product?.name}</h5>
                                <p className="text-[10px] text-slate-500">Cant: {order.quantityProduced || order.quantityRequested} pcs</p>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-2" />
                            <p className="text-xs text-slate-600">No hay órdenes esperando inspección.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Main: Inspection Detail */}
            <div className="lg:col-span-2 space-y-6">
                {selectedOrder ? (
                    <Card className="bg-slate-950 border-slate-800 shadow-2xl">
                        <CardHeader className="bg-slate-900/40 border-b border-slate-800">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                        <ClipboardCheck className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base lowercase first-letter:uppercase">Revisión: {selectedOrder.product?.name}</CardTitle>
                                        <p className="text-[10px] text-slate-500">OP #{selectedOrder.id.slice(-6).toUpperCase()} • BOM v1.0.2</p>
                                    </div>
                                </div>
                                <XCircle className="w-5 h-5 text-slate-700 hover:text-red-500 cursor-pointer" onClick={() => setSelectedOrder(null)} />
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            {/* Checklist */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    "Dimensiones según plano",
                                    "Acabado superficial (Sin rebabas)",
                                    "Integridad de ensambles",
                                    "Funcionalidad eléctrica/mecánica",
                                    "Etiquetado y empaque"
                                ].map((check, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-900/30 rounded-lg border border-slate-800/50 group hover:border-emerald-500/30 transition-colors">
                                        <div className="h-5 w-5 rounded border-2 border-slate-700 flex items-center justify-center group-hover:border-emerald-500">
                                            <div className="h-2.5 w-2.5 bg-emerald-500 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        </div>
                                        <span className="text-xs text-slate-400 group-hover:text-slate-200">{check}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <Label className="text-xs font-bold text-slate-500">Notas de Inspección</Label>
                                <Textarea
                                    placeholder="Detalles sobre hallazgos o ajustes realizados..."
                                    className="bg-slate-900 border-slate-800 min-h-[100px] text-xs resize-none"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-slate-900">
                                <Button
                                    className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 font-bold gap-2 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]"
                                    onClick={() => finalizeMutation.mutate(selectedOrder.id)}
                                    disabled={finalizeMutation.isPending}
                                >
                                    <CheckCircle2 className="w-5 h-5" /> APROBAR Y LIBERAR
                                </Button>
                                <Button variant="outline" className="h-12 border-red-500/20 text-red-500 hover:bg-red-500/10 font-bold gap-2">
                                    <AlertTriangle className="w-5 h-5" /> RECHAZO / RE-TRABAJO
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-900 rounded-3xl p-12 text-center text-slate-600">
                        <FileText className="w-16 h-16 mb-4 opacity-10" />
                        <h3 className="text-lg font-bold text-slate-500 mb-2">Editor de Calidad</h3>
                        <p className="max-w-xs text-xs leading-relaxed">
                            Seleccione una orden del panel izquierdo para iniciar el proceso de inspección y registro de hallazgos.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
