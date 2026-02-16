import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { Loader2, ChefHat, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface OrderItem {
    id: number;
    product: { name: string };
    quantity: number;
    modifiers?: string[];
}

interface KitchenOrder {
    id: string;
    tableNumber?: string;
    orderType: "dine-in" | "takeout" | "delivery";
    date: string;
    kitchenStatus: "pending" | "preparing" | "ready" | "served";
    items: OrderItem[];
    notes?: string;
}

export default function KitchenDisplay() {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    useSupabaseRealtime({
        table: 'sales',
        queryKey: ["/api/sales/kitchen"],
    });

    const { data: orders = [], isLoading } = useQuery({
        queryKey: ["/api/sales/kitchen"],
        queryFn: async () => {
            const res = await fetch("/api/sales/kitchen", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch kitchen orders");
            return res.json();
        },
        enabled: !!session?.access_token,
        refetchInterval: 10000 // Polling backup
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const res = await fetch(`/api/sales/${id}/kitchen-status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error("Failed to update status");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/sales/kitchen"] });
            toast({ title: "Estado Actualizado" });
        }
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
            case "preparing": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
            case "ready": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
            default: return "bg-slate-500/10 text-slate-500 border-slate-500/20";
        }
    };

    const getElapsedTime = (dateString: string) => {
        const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
        return `${diff} min`;
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-slate-950 p-4 font-sans text-slate-100">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20">
                        <ChefHat className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Cocina (KDS)</h1>
                        <p className="text-slate-400">Sistema de Pantalla de Cocina</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="text-lg px-4 py-1 border-amber-500/50 text-amber-500 bg-amber-500/10">
                        Pendientes: {orders.filter((o: any) => o.kitchenStatus === 'pending').length}
                    </Badge>
                    <Clock className="w-6 h-6 text-slate-500" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {orders.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                        <CheckCircle2 className="w-16 h-16 mb-4 text-emerald-500" />
                        <h2 className="text-xl font-bold">Todo en orden</h2>
                        <p>No hay comandas pendientes.</p>
                    </div>
                )}

                {orders.map((order: KitchenOrder) => (
                    <Card key={order.id} className={cn(
                        "border-l-4 overflow-hidden flex flex-col h-full",
                        order.kitchenStatus === 'pending' ? "border-l-amber-500 border-y-slate-800 border-r-slate-800 bg-slate-900" :
                            order.kitchenStatus === 'preparing' ? "border-l-blue-500 border-y-slate-800 border-r-slate-800 bg-slate-900" :
                                "border-l-emerald-500 border-y-slate-800 border-r-slate-800 bg-slate-900/50 opacity-70"
                    )}>
                        <CardHeader className="pb-2 bg-slate-950/30">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg font-mono">#{order.id.slice(0, 4)}</CardTitle>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="secondary" className="uppercase text-[10px] font-bold tracking-widest">
                                            {order.orderType === 'dine-in' ? `Mesa ${order.tableNumber || '?'}` :
                                                order.orderType === 'takeout' ? 'Para Llevar' : 'Domicilio'}
                                        </Badge>
                                        <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {getElapsedTime(order.date)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 py-4 space-y-4">
                            <ul className="space-y-3">
                                {order.items.map((item, idx) => (
                                    <li key={idx} className="flex justify-between items-start border-b border-slate-800/50 pb-2 last:border-0">
                                        <div className="flex gap-2">
                                            <span className="font-bold text-lg w-6">{item.quantity}</span>
                                            <div>
                                                <span className="font-medium text-lg text-slate-200">{item.product.name}</span>
                                                {item.modifiers && item.modifiers.length > 0 && (
                                                    <div className="text-xs text-amber-400 mt-1 italic">
                                                        {item.modifiers.join(", ")}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            {order.notes && (
                                <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded text-sm flex gap-2 items-start">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    {order.notes}
                                </div>
                            )}
                        </CardContent>

                        <div className="p-3 bg-slate-950/50 border-t border-slate-800 mt-auto grid grid-cols-2 gap-2">
                            {order.kitchenStatus === 'pending' && (
                                <Button className="col-span-2 bg-blue-600 hover:bg-blue-700" onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'preparing' })}>
                                    Empezar (Oído)
                                </Button>
                            )}
                            {order.kitchenStatus === 'preparing' && (
                                <Button className="col-span-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'ready' })}>
                                    Terminar (Listo)
                                </Button>
                            )}
                            {order.kitchenStatus === 'ready' && (
                                <Button variant="outline" className="col-span-2 text-slate-400 hover:text-white" onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'served' })}>
                                    Archivar
                                </Button>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
