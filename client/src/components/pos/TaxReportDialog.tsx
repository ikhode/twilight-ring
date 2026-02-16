import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Calculator, TrendingDown, TrendingUp, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function TaxReportDialog({ trigger }: { trigger?: React.ReactNode }) {
    const { session } = useAuth();
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    const formatCurrency = (val: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);

    const { data, isLoading } = useQuery({
        queryKey: ["/api/finance/taxes", month, year],
        queryFn: async () => {
            const res = await fetch(`/api/finance/taxes?month=${month}&year=${year}`, { headers: { Authorization: `Bearer ${session?.access_token}` } });
            return res.json();
        },
        enabled: open
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Building2 className="w-4 h-4" /> Impuestos
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-primary" />
                        Reporte Fiscal (Estimado)
                    </DialogTitle>
                </DialogHeader>

                <div className="flex gap-4 mb-4">
                    <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Mes" /></SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                    {new Date(0, i).toLocaleString('es-MX', { month: 'long' })}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                        <SelectTrigger className="w-[120px]"><SelectValue placeholder="Año" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2024">2024</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2026">2026</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {isLoading ? (
                    <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
                ) : data ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="bg-emerald-50 border-emerald-100">
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="text-sm font-medium text-emerald-800">IVA Trasladado (Cobrado)</p>
                                            <p className="text-xs text-emerald-600">Sobre Ventas: {formatCurrency(data.sales.total / 100)}</p>
                                        </div>
                                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-emerald-700">{formatCurrency(data.sales.vat / 100)}</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-blue-50 border-blue-100">
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="text-sm font-medium text-blue-800">IVA Acreditable (Pagado)</p>
                                            <p className="text-xs text-blue-600">Sobre Gastos: {formatCurrency(data.expenses.total / 100)}</p>
                                        </div>
                                        <TrendingDown className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(data.expenses.vat / 100)}</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className={cn("border-2", data.payable > 0 ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50")}>
                            <CardContent className="pt-6 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-lg">IVA por Pagar (Estimado)</h4>
                                    <p className="text-sm text-muted-foreground">{data.payable > 0 ? "Saldo a cargo" : "Saldo a favor"}</p>
                                </div>
                                <div className="text-right">
                                    <p className={cn("text-3xl font-bold", data.payable > 0 ? "text-amber-700" : "text-green-700")}>
                                        {formatCurrency(Math.abs(data.payable) / 100)}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <p className="text-[11px] text-center text-muted-foreground">
                            * Cálculo estimativo basado en flujo de efectivo. No sustituye la contabilidad fiscal oficial.
                        </p>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
