import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { PaySaleDialog } from "./PaySaleDialog";

interface OpenOrdersDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function OpenOrdersDialog({ open, onOpenChange }: OpenOrdersDialogProps) {
    const { toast } = useToast();
    const formatCurrency = (amount: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

    const { data: openOrders, isLoading: isLoadingOpenOrders } = useQuery({
        queryKey: ["/api/sales/orders", "pending"],
        queryFn: async () => {
            const res = await fetch("/api/sales/orders?status=pending");
            if (!res.ok) return [];
            return res.json();
        },
        enabled: open
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Cuentas Abiertas / Pendientes</DialogTitle>
                    <DialogDescription>
                        Selecciona una orden para cobrarla.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    {isLoadingOpenOrders ? (
                        <div className="p-8 text-center text-muted-foreground">Cargando...</div>
                    ) : openOrders && openOrders.length > 0 ? (
                        <div className="grid gap-2">
                            {openOrders.filter((o: any) => o.paymentStatus === 'pending').map((order: any) => (
                                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="font-bold">
                                            {order.orderType === 'dine-in' ? `Mesa ${order.tableNumber}` : 'Para Llevar'}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(order.date).toLocaleTimeString()} - {order.customer?.name || "Cliente General"}
                                        </span>
                                        <span className="text-sm">
                                            {order.product?.name} x{order.quantity}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold font-mono text-lg">{formatCurrency(order.totalPrice / 100)}</span>
                                        <PaySaleDialog sale={order} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground">No hay cuentas abiertas.</div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
