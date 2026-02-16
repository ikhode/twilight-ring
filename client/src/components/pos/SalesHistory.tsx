import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/shared/DataTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Eye, Package, CheckCircle2, Loader2, ShieldCheck, FileText, Receipt, Activity } from "lucide-react";
import { DossierView } from "@/components/shared/DossierView";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PaySaleDialog } from "./PaySaleDialog";
import { TaxReportDialog } from "./TaxReportDialog";

export function SalesHistory({ openSaleId }: { openSaleId?: string | null }) {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const formatCurrency = (amount: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

    const [activeSale, setActiveSale] = useState<any>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const handleExport = async () => {
        try {
            const res = await fetch("/api/sales/export", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Export failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ventas_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast({ title: "Exportación exitosa", description: "El archivo CSV se ha descargado." });
        } catch (e) {
            toast({ title: "Error", description: "No se pudo exportar.", variant: "destructive" });
        }
    };

    const { data: orders = [] } = useQuery({
        queryKey: ["/api/sales/orders"],
        queryFn: async () => {
            const res = await fetch("/api/sales/orders", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            return res.json();
        },
        enabled: !!session?.access_token
    });

    // Deep Link Effect
    useEffect(() => {
        if (openSaleId && orders.length > 0) {
            // Fuzzy match because ID coming from external might be numeric or string
            const found = orders.find((o: any) => o.id == openSaleId);
            if (found) {
                setActiveSale(found);
                setDetailsOpen(true);
            }
        }
    }, [openSaleId, orders]);

    const updateDeliveryMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const res = await fetch(`/api/sales/${id}/delivery`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                body: JSON.stringify({ status })
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/sales/orders"] });
            toast({ title: "Estado de entrega actualizado" });
        }
    });

    const columns = [
        { key: "id", header: "ID", render: (it: any) => <span className="font-mono text-xs text-muted-foreground">#{it.id.toString().slice(0, 6)}</span> },
        { key: "date", header: "Fecha", render: (it: any) => new Date(it.date).toLocaleString() },
        { key: "product", header: "Producto", render: (it: any) => it.product?.name || "Desconocido" },
        { key: "quantity", header: "Cant.", render: (it: any) => it.quantity },
        { key: "totalPrice", header: "Total", render: (it: any) => <span className="font-bold text-green-600">{formatCurrency(it.totalPrice / 100)}</span> },
        {
            key: "deliveryStatus",
            header: "Entrega",
            render: (it: any) => (
                <Badge variant={it.deliveryStatus === "delivered" ? "default" : "secondary"} className={cn(it.deliveryStatus === "pending" && "bg-amber-100 text-amber-700")}>
                    {it.deliveryStatus === "delivered" ? "Entregado" : it.deliveryStatus === "shipped" ? "En Camino" : "Pendiente"}
                </Badge>
            )
        },
        {
            key: "paymentStatus",
            header: "Pago",
            render: (it: any) => (
                <div className="flex flex-col gap-1">
                    <Badge variant={it.paymentStatus === "paid" ? "outline" : "secondary"} className={cn(it.paymentStatus === "paid" ? "border-green-500 text-green-600" : "bg-red-100 text-red-700")}>
                        {it.paymentStatus === "paid" ? "Pagado" : "Pendiente"}
                    </Badge>
                    {it.paymentMethod && <span className="text-[10px] opacity-70 uppercase">{it.paymentMethod}</span>}
                </div>
            )
        },
        {
            key: "actions",
            header: "Acciones",
            render: (it: any) => (
                <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setActiveSale(it); setDetailsOpen(true); }}>
                        <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <DossierView
                        entityType="transaction"
                        entityId={it.id}
                        entityName={it.product?.name || "Venta"}
                    />

                    {it.paymentStatus !== "paid" && <PaySaleDialog sale={it} />}
                    {it.deliveryStatus !== "delivered" && (
                        <Button size="sm" variant="outline" onClick={() => updateDeliveryMutation.mutate({ id: it.id, status: "delivered" })}>
                            <Package className="w-3 h-3 mr-1" /> Entregar
                        </Button>
                    )}
                </div>
            )
        }
    ];

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Historial de Transacciones</h3>
                    <div className="flex gap-2">
                        <TaxReportDialog />
                        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                            <FileText className="w-4 h-4" /> Exportar CSV
                        </Button>
                    </div>
                </div>
                <DataTable columns={columns} data={orders} />
                <SaleDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} sale={activeSale} formatCurrency={formatCurrency} />
            </CardContent>
        </Card>
    );
}

function SaleDetailsDialog({ open, onOpenChange, sale, formatCurrency }: { open: boolean, onOpenChange: (v: boolean) => void, sale: any, formatCurrency: (v: number) => string }) {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const stampMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/sales/${sale.id}/stamp`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${session?.access_token}` }
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to stamp");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/sales/orders"] });
            toast({ title: "CFDI Timbrado con éxito", description: "El UUID ha sido registrado en el sistema oficial." });
        },
        onError: (error: any) => {
            toast({ variant: "destructive", title: "Error de Timbrado", description: error.message });
        }
    });

    const handleDownloadPdf = async () => {
        try {
            const res = await fetch(`/api/sales/${sale.id}/pdf`, {
                headers: { "Authorization": `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to download PDF");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Factura_${sale.fiscalUuid.slice(0, 8)}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            toast({ variant: "destructive", title: "Error de descarga", description: "No se pudo obtener el PDF de la factura." });
        }
    };

    if (!sale) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Detalle de Venta #{sale.id.toString().slice(0, 6)}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1">Operación</p>
                            <p className="font-medium">{new Date(sale.date).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1">Monto Total</p>
                            <p className="font-bold text-primary">{formatCurrency(sale.totalPrice / 100)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1">Producto / Servicio</p>
                            <p className="font-medium">{sale.product?.name || "N/A"} (x{sale.quantity})</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1">Método de Pago</p>
                            <p className="font-medium capitalize">{sale.paymentMethod || "N/A"}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1">Cobranza</p>
                            <Badge variant={sale.paymentStatus === "paid" ? "default" : "secondary"} className={cn(sale.paymentStatus === "paid" ? "bg-emerald-500" : "bg-amber-100 text-amber-700")}>
                                {sale.paymentStatus === "paid" ? "Liquidado" : "Pago Pendiente"}
                            </Badge>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1">Logística</p>
                            <Badge variant="outline" className="border-blue-500/50 text-blue-500 capitalize">{sale.deliveryStatus}</Badge>
                        </div>
                    </div>

                    <Separator />

                    {/* Fiscal Compliance Layer (Phase 3) */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cumplimiento Fiscal (SAT)</h4>
                        </div>

                        {sale.fiscalUuid ? (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-emerald-600 font-bold uppercase tracking-tighter">CFDI 4.0 Certificado</span>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                </div>
                                <div className="bg-slate-950/50 p-2 rounded font-mono text-[9px] text-slate-400 break-all border border-slate-800">
                                    {sale.fiscalUuid}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="outline" size="sm" className="h-8 gap-2 border-slate-700 hover:bg-slate-800" onClick={handleDownloadPdf}>
                                        <FileText className="w-3.5 h-3.5" /> PDF
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-8 gap-2 border-slate-700 hover:bg-slate-800" disabled>
                                        <Receipt className="w-3.5 h-3.5" /> XML
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg space-y-3">
                                <p className="text-[11px] text-slate-400 italic">Esta transacción no cuenta con comprobante fiscal digital (CFDI).</p>
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="w-full gap-2 font-bold shadow-lg shadow-primary/20"
                                    disabled={sale.paymentStatus !== 'paid' || stampMutation.isPending}
                                    onClick={() => stampMutation.mutate()}
                                >
                                    {stampMutation.isPending ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Activity className="w-3.5 h-3.5" />
                                    )}
                                    {sale.paymentStatus !== 'paid' ? "Liquidación Requerida" : "Timbrar Factura (PAC)"}
                                </Button>
                                {sale.paymentStatus === 'paid' && (
                                    <p className="text-[9px] text-slate-500 text-center">
                                        Al timbrar se consumirá 1 crédito de timbrado oficial.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" className="border-slate-800" onClick={() => onOpenChange(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
