import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign, Wallet, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function CashCountDialog({ trigger }: { trigger?: React.ReactNode }) {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    // Form States
    const [amount, setAmount] = useState("");
    const [notes, setNotes] = useState("");
    const [justification, setJustification] = useState("");

    const formatCurrency = (val: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);

    const { data: cashStats, isLoading } = useQuery({
        queryKey: ["/api/finance/cash/stats"],
        queryFn: async () => {
            const res = await fetch("/api/finance/cash/stats", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            return res.json();
        },
        enabled: open
    });

    const isRegisterOpen = cashStats?.register?.status === 'open';
    const expectedAmount = cashStats?.register?.balance || 0;

    const openSessionMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/finance/cash/open", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                body: JSON.stringify({ startAmount: Math.round(parseFloat(amount || "0") * 100), notes })
            });
            if (!res.ok) throw new Error("Failed to open session");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/finance/cash/stats"] });
            toast({ title: "Caja Abierta", description: "La sesión ha comenzado correctamente." });
            setOpen(false);
            setAmount("");
            setNotes("");
        }
    });

    const closeSessionMutation = useMutation({
        mutationFn: async () => {
            const declared = Math.round(parseFloat(amount || "0") * 100);
            const res = await fetch("/api/finance/cash/close", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                body: JSON.stringify({ declaredAmount: declared, notes, justification })
            });

            const data = await res.json();
            if (!res.ok) {
                if (data.blocking) throw new Error(data.message); // Force catch
                throw new Error(data.message || "Failed to close session");
            }
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/finance/cash/stats"] });
            if (data.status === 'shortage') {
                toast({ variant: "destructive", title: "Cierre con Faltante", description: data.message });
            } else {
                toast({ title: "Corte Exitoso", description: data.message });
            }
            setOpen(false);
            setAmount("");
            setNotes("");
            setJustification("");
        },
        onError: (error: any) => {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    });

    // Sub-components
    const OpenSessionForm = () => (
        <div className="space-y-4 py-4">
            <div className="bg-blue-50 text-blue-700 p-4 rounded-lg flex items-start gap-3">
                <Wallet className="w-5 h-5 mt-0.5" />
                <div>
                    <h4 className="font-bold text-sm">Apertura de Turno</h4>
                    <p className="text-xs">Ingresa el fondo inicial en efectivo para comenzar a operar.</p>
                </div>
            </div>
            <div className="space-y-2">
                <Label>Fondo Inicial</Label>
                <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="number"
                        placeholder="0.00"
                        className="pl-9 text-lg font-bold"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Notas (Opcional)</Label>
                <Textarea placeholder="Ej. Billetes de baja denominación..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
        </div>
    );

    const CloseSessionForm = () => {
        const declared = parseFloat(amount || "0") * 100;
        const difference = declared - expectedAmount;
        const isShortage = difference < 0;

        return (
            <div className="space-y-4 py-4">
                <div className="bg-amber-50 text-amber-800 p-4 rounded-lg flex items-start gap-3 border border-amber-100">
                    <AlertTriangle className="w-5 h-5 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-sm">Corte de Caja (Arqueo)</h4>
                        <p className="text-xs">Cuenta todo el efectivo físico y decláralo a continuación.</p>
                    </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-muted rounded">
                    <span className="text-sm font-medium">Se espera en sistema:</span>
                    <span className="font-mono font-bold">***</span> {/* Hidden for blind count usually, or show it? User says 'nunca le decimos' */}
                    {/* The backend comment says 'nunca le decimos'. I will hide it visually or show logic only after input? */}
                    {/* For this UI, let's keep it blind. */}
                </div>

                <div className="space-y-2">
                    <Label>Efectivo en Caja (Declarado)</Label>
                    <div className="relative">
                        <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="number"
                            placeholder="0.00"
                            className={cn("pl-9 text-lg font-bold", isShortage && amount ? "border-red-300 focus-visible:ring-red-300" : "")}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                </div>

                {isShortage && amount && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm font-bold">Diferencia Detectada: {formatCurrency(difference / 100)}</span>
                        </div>
                        <Label className="text-red-700">Justificación Obligatoria</Label>
                        <Textarea
                            placeholder="Explica la razón del faltante..."
                            className="border-red-200 focus-visible:ring-red-200 bg-red-50"
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                        />
                    </div>
                )}

                {!isShortage && amount && difference > 0 && (
                    <div className="p-2 bg-green-50 text-green-700 text-sm rounded flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Sobrante: {formatCurrency(difference / 100)} (Se registrará como ingreso extra)
                    </div>
                )}
            </div>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className={cn("gap-2", isRegisterOpen ? "border-amber-200 hover:bg-amber-50 text-amber-700" : "border-blue-200 hover:bg-blue-50 text-blue-700")}>
                        <Wallet className="w-4 h-4" />
                        {isLoading ? "..." : isRegisterOpen ? "Corte de Caja" : "Abrir Caja"}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isRegisterOpen ? "Finalizar Turno" : "Iniciar Operaciones"}</DialogTitle>
                    <DialogDescription>
                        {isRegisterOpen ? "Realiza el arqueo para cerrar la sesión actual." : "Configura el fondo inicial para la nueva sesión."}
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="py-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
                ) : isRegisterOpen ? (
                    <CloseSessionForm />
                ) : (
                    <OpenSessionForm />
                )}

                <DialogFooter>
                    {isRegisterOpen ? (
                        <Button
                            variant="destructive"
                            onClick={() => closeSessionMutation.mutate()}
                            disabled={closeSessionMutation.isPending || (!amount) || (parseFloat(amount) * 100 - expectedAmount < 0 && !justification)}
                        >
                            {closeSessionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Confirmar Cierre
                        </Button>
                    ) : (
                        <Button onClick={() => openSessionMutation.mutate()} disabled={openSessionMutation.isPending || !amount}>
                            {openSessionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Abrir Caja
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
