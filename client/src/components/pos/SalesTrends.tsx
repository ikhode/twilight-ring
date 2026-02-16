import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from "@/lib/utils";

export function SalesTrends() {
    const { session } = useAuth();
    const formatCurrency = (amount: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

    const { data: stats } = useQuery({
        queryKey: ["/api/sales/stats"],
        queryFn: async () => {
            const res = await fetch("/api/sales/stats", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            return res.json();
        },
        enabled: !!session?.access_token
    });

    if (!stats) return <div className="py-20 text-center text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />Cargando tendencias...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="md:col-span-2">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Ventas (Últimos 30 días)</CardTitle>
                        {stats.metrics && stats.metrics[0] && (
                            <div className="text-right">
                                <p className="text-2xl font-bold">{formatCurrency(stats.metrics[0].value / 100)}</p>
                                <p className={cn("text-xs flex items-center justify-end gap-1", stats.metrics[0].growth >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                    {stats.metrics[0].growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {Math.abs(stats.metrics[0].growth).toFixed(1)}% vs periodo anterior
                                </p>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.days}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey="date" fontSize={12} tickFormatter={(val) => new Date(val).getDate().toString()} />
                            <YAxis fontSize={12} tickFormatter={(val) => `$${val}`} />
                            <Tooltip formatter={(val: number) => formatCurrency(val)} labelFormatter={(val) => new Date(val).toLocaleDateString()} />
                            <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Productos Más Vendidos</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {stats.topProducts?.map((p: any, i: number) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="w-6 h-6 flex items-center justify-center rounded-full p-0">#{i + 1}</Badge>
                                    <p className="font-medium">{p.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold">{formatCurrency(p.revenue)}</p>
                                    <p className="text-xs text-muted-foreground">{p.quantity} unidades</p>
                                </div>
                            </div>
                        ))}
                        {(!stats.topProducts || stats.topProducts.length === 0) && <p className="text-center text-muted-foreground">Sin datos suficientes</p>}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Proyección de Demanda</CardTitle></CardHeader>
                <CardContent className="flex flex-col items-center justify-center text-center py-8">
                    <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">IA Analizando patrones de compra...</p>
                    <p className="text-sm text-balance">Actualmente recolectando datos históricos suficientes para generar predicciones precisas.</p>
                </CardContent>
            </Card>
        </div>
    );
}
