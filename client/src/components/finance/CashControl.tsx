import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Plus, Minus, Lock, Unlock, History, AlertTriangle } from "lucide-react";
import { TransactionModal } from "./TransactionModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function CashControl() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'in' | 'out'>('in');

    // Session Dialogs
    const [openSessionDialog, setOpenSessionDialog] = useState(false);
    const [closeSessionDialog, setCloseSessionDialog] = useState(false);

    const [sessionAmount, setSessionAmount] = useState("");
    const [sessionNotes, setSessionNotes] = useState("");

    const { data: stats, isLoading } = useQuery({
        queryKey: ['/api/finance/cash/stats']
    });

    const handleOpenSession = async () => {
        try {
            const res = await fetch('/api/finance/cash/open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startAmount: Math.round(parseFloat(sessionAmount || "0") * 100),
                    notes: sessionNotes
                })
            });
            if (!res.ok) throw new Error("Failed to open session");
            await queryClient.invalidateQueries({ queryKey: ['/api/finance/cash/stats'] });
            setOpenSessionDialog(false);
            setSessionAmount("");
            toast({ title: "Caja Abierta", description: "La sesión ha comenzado exitosamente." });
        } catch (e) {
            toast({ title: "Error", description: "No se pudo abrir la caja.", variant: "destructive" });
        }
    };

    const handleCloseSession = async () => {
        try {
            const res = await fetch('/api/finance/cash/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    declaredAmount: Math.round(parseFloat(sessionAmount || "0") * 100),
                    notes: sessionNotes
                })
            });
            if (!res.ok) throw new Error("Failed to close session");
            const data = await res.json();

            await queryClient.invalidateQueries({ queryKey: ['/api/finance/cash/stats'] });
            setCloseSessionDialog(false);
            setSessionAmount("");

            const diff = data.difference / 100;
            const diffMsg = diff === 0
                ? "Caja cuadrada perfectamente."
                : diff > 0
                    ? `Sobrante de ${formatCurrency(diff)}`
                    : `Faltante de ${formatCurrency(Math.abs(diff))}`;

            toast({
                title: "Corte de Caja Realizado",
                description: diffMsg,
                variant: diff === 0 ? "default" : "destructive"
            });

        } catch (e) {
            toast({ title: "Error", description: "No se pudo realizar el corte.", variant: "destructive" });
        }
    };

    if (isLoading) return <Skeleton className="h-[400px] w-full bg-slate-800/50 rounded-xl" />;

    const register = stats?.register || { balance: 0, status: 'closed', name: 'Caja Principal' };
    const isOpen = register.status === 'open';

    return (
        <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Control Panel */}
            <Card className="lg:col-span-2 bg-slate-900 border-slate-800 shadow-xl overflow-hidden relative">
                <div className={`absolute top-0 left-0 w-1 h-full ${isOpen ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                        {register.name}
                        <Badge variant={isOpen ? "default" : "destructive"} className="ml-2 uppercase text-[10px]">
                            {isOpen ? "Abierta" : "Cerrada"}
                        </Badge>
                    </CardTitle>
                    <Button
                        size="sm"
                        variant={isOpen ? "destructive" : "default"}
                        onClick={() => isOpen ? setCloseSessionDialog(true) : setOpenSessionDialog(true)}
                        className="h-8 text-xs font-bold uppercase tracking-wider"
                    >
                        {isOpen ? (
                            <>
                                <Lock className="w-3 h-3 mr-2" /> Corte / Cerrar
                            </>
                        ) : (
                            <>
                                <Unlock className="w-3 h-3 mr-2" /> Abrir Turno
                            </>
                        )}
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 space-y-2">
                        <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Balance Actual</p>
                        <h2 className={`text-5xl font-black tracking-tighter ${isOpen ? 'text-white' : 'text-slate-600'}`}>
                            {formatCurrency(register.balance / 100)}
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <Button
                            className="h-14 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-500 border hover:text-emerald-400"
                            disabled={!isOpen}
                            onClick={() => { setModalType('in'); setModalOpen(true); }}
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            <div className="flex flex-col items-start">
                                <span className="font-bold text-sm">Registrar Ingreso</span>
                                <span className="text-[10px] opacity-70">Ventas, Fondeo, Cobros</span>
                            </div>
                        </Button>
                        <Button
                            className="h-14 bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-500 border hover:text-red-400"
                            disabled={!isOpen}
                            onClick={() => { setModalType('out'); setModalOpen(true); }}
                        >
                            <Minus className="w-5 h-5 mr-2" />
                            <div className="flex flex-col items-start">
                                <span className="font-bold text-sm">Registrar Egreso</span>
                                <span className="text-[10px] opacity-70">Gastos, Pagos, Retiros</span>
                            </div>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Recent History Side Panel */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Últimos Movimientos
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {stats?.transactions?.length > 0 ? stats.transactions.map((tx: any) => (
                        <div key={tx.id} className="flex justify-between items-start text-sm border-b border-white/5 pb-2 last:border-0 relative pl-4">
                            <div className={`absolute left-0 top-1 w-1 h-1 rounded-full ${tx.type === 'in' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <div className="space-y-0.5">
                                <p className="font-bold text-slate-200">{tx.description || tx.category}</p>
                                <p className="text-[10px] text-slate-500 uppercase">{tx.category} • {new Date(tx.timestamp).toLocaleTimeString()}</p>
                            </div>
                            <span className={`font-mono font-bold ${tx.type === 'in' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {tx.type === 'in' ? '+' : '-'}{formatCurrency(tx.amount / 100)}
                            </span>
                        </div>
                    )) : (
                        <div className="text-center py-10 text-slate-600 text-xs italic">
                            Sin movimientos recientes
                        </div>
                    )}
                </CardContent>
            </Card>

            <TransactionModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                type={modalType}
            />

            {/* Open Session Dialog */}
            <Dialog open={openSessionDialog} onOpenChange={setOpenSessionDialog}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Apertura de Turno</DialogTitle>
                        <DialogDescription>Confirma el efectivo inicial en caja para comenzar operaciones.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Monto Inicial (Fondo Fijo)</Label>
                            <Input
                                type="number"
                                className="bg-slate-950 border-slate-700 font-mono text-lg"
                                placeholder="0.00"
                                value={sessionAmount}
                                onChange={e => setSessionAmount(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Notas</Label>
                            <Input
                                className="bg-slate-950 border-slate-700"
                                placeholder="Observaciones de apertura..."
                                value={sessionNotes}
                                onChange={e => setSessionNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleOpenSession} className="bg-emerald-600 hover:bg-emerald-500 w-full">Confirmar Apertura</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Close Session Dialog */}
            <Dialog open={closeSessionDialog} onOpenChange={setCloseSessionDialog}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-red-500 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Corte de Caja
                        </DialogTitle>
                        <DialogDescription>Ingresa el total de efectivo contado físicamente.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Efectivo Declarado (Conteo Físico)</Label>
                            <Input
                                type="number"
                                className="bg-slate-950 border-slate-700 font-mono text-lg"
                                placeholder="0.00"
                                autoFocus
                                value={sessionAmount}
                                onChange={e => setSessionAmount(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Observaciones del Corte</Label>
                            <Input
                                className="bg-slate-950 border-slate-700"
                                placeholder="Justificación de diferencias..."
                                value={sessionNotes}
                                onChange={e => setSessionNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="destructive" onClick={handleCloseSession} className="w-full">Realizar Corte Final</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
