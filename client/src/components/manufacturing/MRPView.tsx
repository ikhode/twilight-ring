import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { PackageSearch, ShoppingCart, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

export function MRPView() {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: recommendations = [], isLoading } = useQuery<any[]>({
        queryKey: ["/api/manufacturing/mrp/recommendations"],
        enabled: !!session?.access_token
    });

    const convertToPOMutation = useMutation({
        mutationFn: async (recId: string) => {
            // Simplified logic: In a real system, this would create a Purchase Order in commerce
            const res = await fetch(`/api/manufacturing/mrp/recommendations/${recId}/convert`, {
                method: "POST",
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/mrp/recommendations"] });
            toast({ title: "Orden de Compra Generada", description: "Se ha enviado la solicitud al departamento de compras." });
        }
    });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <PackageSearch className="w-5 h-5 text-primary" />
                    Material Requirements Planning (MRP)
                </h3>
            </div>

            <DataTable
                data={recommendations}
                emptyMessage="No hay requerimientos de material pendientes. ¡Stock balanceado!"
                columns={[
                    {
                        header: "Prioridad",
                        key: "priority",
                        render: (item: any) => (
                            <Badge className={item.suggestedPurchaseQuantity > 50 ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}>
                                {item.suggestedPurchaseQuantity > 50 ? "CRÍTICO" : "ALERTA"}
                            </Badge>
                        )
                    },
                    { header: "Material / Insumo", key: "product", render: (item: any) => item.product?.name || "Desconocido" },
                    { header: "Orden Relacionada", key: "orderId", render: (item: any) => `OP-${item.orderId.slice(-6).toUpperCase()}` },
                    { header: "Cantidad Req.", key: "suggestedPurchaseQuantity", render: (item: any) => <span className="font-bold">{item.suggestedPurchaseQuantity}</span> },
                    {
                        header: "Acción",
                        key: "id",
                        render: (item: any) => (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-2 border-primary/20 hover:bg-primary/10 text-primary"
                                onClick={() => convertToPOMutation.mutate(item.id)}
                                disabled={convertToPOMutation.isPending}
                            >
                                <ShoppingCart className="w-3 h-3" /> Generar OC
                            </Button>
                        )
                    }
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-950 border-slate-800">
                    <CardHeader><CardTitle className="text-sm">Abastecimiento Just-in-Time</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            El sistema MRP analiza las explosiones de materiales (BOM) de todas las órdenes programadas y las contrasta contra el inventario físico y en tránsito para sugerir compras exactas.
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-950 border-slate-800">
                    <CardHeader><CardTitle className="text-sm">Ahorro Estimado</CardTitle></CardHeader>
                    <CardContent className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-emerald-500">12.5%</div>
                        <div className="text-[10px] text-slate-500 uppercase font-black">Reducción en sobre-stock vs mes anterior</div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-primary/20 border-2">
                    <CardHeader><CardTitle className="text-sm text-primary">IA Predictiva</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-300">
                            Próximamente: Integración con ShieldLine para predecir retrasos de proveedores basados en historial de entregas.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
