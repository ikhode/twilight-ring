import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, ClipboardList, CheckCircle2, AlertTriangle, Plus, ArrowRight, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function ProductionScheduler() {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const { data: orders = [] } = useQuery<any[]>({
        queryKey: ["/api/manufacturing/orders"],
        enabled: !!session?.access_token
    });

    const { data: boms = [] } = useQuery<any[]>({
        queryKey: ["/api/manufacturing/bom"],
        enabled: !!session?.access_token
    });

    const createMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await fetch("/api/manufacturing/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify(payload)
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/orders"] });
            toast({ title: "Orden Generada", description: "Se ha disparado el análisis MRP de materiales." });
            setIsCreateOpen(false);
        }
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
            toast({ title: "Producción Finalizada", description: "El inventario ha sido actualizado." });
        }
    });

    const statuses = ["draft", "scheduled", "in_progress", "qc_pending", "completed"];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    Secuenciación de Órdenes
                </h3>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 bg-primary hover:bg-primary/90">
                            <Plus className="w-4 h-4" /> Nueva Orden
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-950 border-slate-800">
                        <DialogHeader><DialogTitle>Programar Orden de Producción</DialogTitle></DialogHeader>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            const bomId = fd.get("bomId") as string;
                            const bom = boms.find(b => b.id === bomId);
                            createMutation.mutate({
                                bomId,
                                productId: bom?.productId,
                                quantityRequested: Number(fd.get("quantity")),
                                priority: fd.get("priority")
                            });
                        }} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Estructura (BOM)</Label>
                                <Select name="bomId" required>
                                    <SelectTrigger className="bg-slate-900 border-slate-800">
                                        <SelectValue placeholder="Seleccionar BOM..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-950 border-slate-800">
                                        {boms.map((b: any) => (
                                            <SelectItem key={b.id} value={b.id}>{b.name} ({b.product?.name})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Cantidad</Label>
                                    <Input name="quantity" type="number" defaultValue="100" className="bg-slate-900 border-slate-800" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Prioridad</Label>
                                    <Select name="priority" defaultValue="medium">
                                        <SelectTrigger className="bg-slate-900 border-slate-800">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-950 border-slate-800">
                                            <SelectItem value="low">Baja</SelectItem>
                                            <SelectItem value="medium">Media</SelectItem>
                                            <SelectItem value="high">Alta</SelectItem>
                                            <SelectItem value="urgent">Urgente</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={createMutation.isPending}>Crear Orden</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-800">
                {statuses.map(status => (
                    <div key={status} className="flex-shrink-0 w-80 space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-widest text-slate-500 border-slate-800">
                                {status.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-slate-600 font-bold">{orders.filter((o: any) => o.status === status).length}</span>
                        </div>

                        <div className="space-y-3 min-h-[500px] rounded-xl bg-slate-900/20 p-2 border border-slate-900/50">
                            {orders.filter((o: any) => o.status === status).map((order: any) => (
                                <Card key={order.id} className="bg-slate-950 border-slate-800 hover:border-primary/50 cursor-pointer transition-all group">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <p className="text-[10px] font-bold text-slate-500">#{order.id.slice(-6).toUpperCase()}</p>
                                            {order.priority === 'urgent' && <AlertTriangle className="w-3 h-3 text-red-500 fill-red-500/10" />}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-200">{order.product?.name}</h4>
                                            <p className="text-xs text-slate-500">BOM: {order.bom?.name}</p>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                <PackageSearch className="w-3 h-3" />
                                                <span>{order.quantityRequested} pzas</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                <Clock className="w-3 h-3" />
                                                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        {status === 'qc_pending' && (
                                            <Button
                                                size="sm"
                                                className="w-full h-7 text-[10px] bg-emerald-600 hover:bg-emerald-500"
                                                onClick={() => finalizeMutation.mutate(order.id)}
                                            >
                                                LIBERACIÓN FINAL
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const PackageSearch = ({ className }: { className?: string }) => <PackageSearchIcon className={className} />;
import { PackageSearch as PackageSearchIcon } from "lucide-react";
