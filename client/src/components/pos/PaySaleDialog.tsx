import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2, DollarSign, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function PaySaleDialog({ sale, trigger }: { sale: any, trigger?: React.ReactNode }) {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [method, setMethod] = useState<"cash" | "transfer">((sale.paymentMethod as any) === 'transfer' ? 'transfer' : 'cash');
    const [bankId, setBankId] = useState(sale.bankAccountId || "");

    const { data: accounts = [] } = useQuery({
        queryKey: ["/api/finance/accounts"],
        queryFn: async () => {
            const res = await fetch("/api/finance/accounts", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            return res.json();
        },
        enabled: open
    });

    const payMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/sales/${sale.id}/pay`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                body: JSON.stringify({ paymentMethod: method, bankAccountId: bankId || null })
            });
            if (!res.ok) throw new Error("Payment failed");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/sales/orders"] });
            queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
            queryClient.invalidateQueries({ queryKey: ["/api/sales/orders", "pending"] }); // Also invalidate pending
            setOpen(false);
            toast({ title: method === 'transfer' ? "Transferencia validada" : "Pago registrado exitosamente" });
        },
        onError: () => {
            toast({ title: "Error", description: "No se pudo registrar el pago", variant: "destructive" });
        }
    });

    const isTransferConfirmation = sale.paymentMethod === 'transfer';

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button
                        size="sm"
                        variant={isTransferConfirmation ? "outline" : "default"}
                        className={cn(
                            isTransferConfirmation
                                ? "border-amber-500 text-amber-500 hover:bg-amber-50 hover:text-amber-600"
                                : "bg-green-600 hover:bg-green-700"
                        )}
                    >
                        {isTransferConfirmation ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <DollarSign className="w-3 h-3 mr-1" />}
                        {isTransferConfirmation ? "Validar" : "Cobrar"}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isTransferConfirmation ? "Validar Transferencia" : "Registrar Pago"}: #{sale.id.slice(0, 6)}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
                        <span className="font-medium">Monto:</span>
                        <span className="text-xl font-bold font-mono text-green-600">
                            {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(sale.totalPrice / 100)}
                        </span>
                    </div>

                    {isTransferConfirmation && (
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded text-xs text-amber-700 mb-2">
                            <p className="font-bold mb-1">⚠️ Verificación Requerida</p>
                            Asegúrate de haber recibido los fondos en la cuenta bancaria antes de confirmar.
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Método de Cobro</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Button variant={method === 'cash' ? 'default' : 'outline'} onClick={() => setMethod('cash')}>Efectivo</Button>
                            <Button variant={method === 'transfer' ? 'default' : 'outline'} onClick={() => setMethod('transfer')}>Transferencia</Button>
                        </div>
                    </div>
                    {method === 'transfer' && (
                        <div className="space-y-2">
                            <Label>Cuenta Destino</Label>
                            <select className="w-full bg-background border border-border rounded-md p-2 text-sm" value={bankId} onChange={(e) => setBankId(e.target.value)}>
                                <option value="">Seleccione cuenta...</option>
                                {accounts.map((a: any) => (<option key={a.id} value={a.id}>{a.name} ({a.bankName})</option>))}
                            </select>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={() => payMutation.mutate()} disabled={payMutation.isPending || (method === 'transfer' && !bankId)}>
                        {payMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {method === 'transfer' ? "Confirmar Recepción" : "Confirmar Pago"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
