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
import { useAuth } from "@/hooks/use-auth";
import { QRCodeSVG } from "qrcode.react";
import { Textarea } from "@/components/ui/textarea";
import { Truck, Users, QrCode, CheckCircle2, Calculator } from "lucide-react";

interface CashControlProps {
    employeeId?: string; // Optional: when used in Kiosk
}

export function CashControl({ employeeId: propEmployeeId }: CashControlProps) {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'in' | 'out'>('in');

    // Session Dialogs
    const [openSessionDialog, setOpenSessionDialog] = useState(false);
    const [closeSessionDialog, setCloseSessionDialog] = useState(false);

    const [sessionAmount, setSessionAmount] = useState("");
    const [sessionNotes, setSessionNotes] = useState("");
    const [justification, setJustification] = useState("");
    const [showJustificationField, setShowJustificationField] = useState(false);

    // Payout QR Dialog
    const [qrDialog, setQrDialog] = useState<any>(null);

    const getAuthHeaders = () => {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };

        // 1. Supabase Auth
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        // 2. Terminal Bridge Auth
        const deviceId = localStorage.getItem("kiosk_device_id");
        const salt = localStorage.getItem("kiosk_device_salt");
        const employeeId = propEmployeeId || localStorage.getItem("last_auth_employee_id");

        if (deviceId && salt) {
            headers['X-Device-Auth'] = `${deviceId}:${salt}`;
        }
        if (employeeId) {
            headers['X-Employee-ID'] = employeeId;
        }

        return headers;
    };

    const { data: stats, isLoading } = useQuery({
        queryKey: ['/api/finance/cash/stats'],
        queryFn: async () => {
            const res = await fetch('/api/finance/cash/stats', {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error("Unauthorized");
            return res.json();
        },
        enabled: !!session?.access_token || !!localStorage.getItem("kiosk_device_id")
    });

    const register = stats?.register || { balance: 0, status: 'closed', name: 'Caja Principal' };
    const isOpen = register.status === 'open';

    const handleOpenSession = async () => {
        try {
            const res = await fetch('/api/finance/cash/open', {
                method: 'POST',
                headers: getAuthHeaders(),
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
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    declaredAmount: Math.round(parseFloat(sessionAmount || "0") * 100),
                    notes: sessionNotes,
                    justification: justification
                })
            });

            if (!res.ok) {
                const data = await res.json();
                if (data.blocking) {
                    setShowJustificationField(true);
                    toast({
                        title: "Justificación Requerida",
                        description: data.message,
                        variant: "destructive"
                    });
                    return;
                }
                throw new Error("Failed to close session");
            }

            const data = await res.json();

            await queryClient.invalidateQueries({ queryKey: ['/api/finance/cash/stats'] });
            setCloseSessionDialog(false);
            setSessionAmount("");
            setJustification("");
            setShowJustificationField(false);

            toast({
                title: data.status === 'ok' ? "Corte Exitoso" : "Corte con Faltante",
                description: data.message,
                variant: data.status === 'ok' ? "default" : "destructive"
            });

        } catch (e) {
            toast({ title: "Error", description: "No se pudo realizar el corte.", variant: "destructive" });
        }
    };

    const handleReceiveDriverCash = async (saleId: string) => {
        try {
            const res = await fetch(`/api/finance/driver-settlements/${saleId}/receive`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error("Failed");
            queryClient.invalidateQueries({ queryKey: ['/api/finance/driver-settlements'] });
            queryClient.invalidateQueries({ queryKey: ['/api/finance/cash/stats'] });
            toast({ title: "Efectivo Recibido", description: "Se ha registrado el ingreso en caja." });
        } catch (e) {
            toast({ title: "Error", description: "No se pudo procesar la liquidación.", variant: "destructive" });
        }
    };

    const handlePreparePayout = async (employeeId: string, amount: number, ticketIds?: string[]) => {
        try {
            const res = await fetch('/api/finance/payout/prepare', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ employeeId, amount, ticketIds })
            });
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            setQrDialog(data);
        } catch (e) {
            toast({ title: "Error", description: "No se pudo generar el código de pago.", variant: "destructive" });
        }
    };

    const { data: driverSettlements } = useQuery({
        queryKey: ['/api/finance/driver-settlements'],
        queryFn: async () => {
            const res = await fetch('/api/finance/driver-settlements', { headers: getAuthHeaders() });
            return res.json();
        },
        enabled: isOpen
    });

    const { data: pendingTickets } = useQuery({
        queryKey: ['/api/piecework/tickets', { status: 'approved' }],
        queryFn: async () => {
            const res = await fetch('/api/piecework/tickets?status=approved', { headers: getAuthHeaders() });
            return res.json();
        },
        enabled: isOpen
    });

    if (isLoading) return <Skeleton className="h-[400px] w-full bg-slate-800/50 rounded-xl" />;

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

            {/* Recent History & Pending Side Panel */}
            <div className="space-y-6">
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Truck className="w-4 h-4 text-primary" />
                            Liquidaciones (Chóferes)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {driverSettlements?.length > 0 ? driverSettlements.map((s: any) => (
                            <div key={s.saleId} className="flex flex-col p-2 rounded-lg bg-background/40 border border-white/5">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-white">{s.driverName}</span>
                                    <span className="text-xs font-mono text-emerald-400 font-bold">{formatCurrency(s.amount / 100)}</span>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[10px] uppercase font-bold"
                                    onClick={() => handleReceiveDriverCash(s.saleId)}
                                >
                                    Recibir Efectivo
                                </Button>
                            </div>
                        )) : (
                            <div className="text-center py-6 text-slate-600 text-xs italic">
                                No hay liquidaciones pendientes
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            Pendientes (A destajo)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {pendingTickets?.length > 0 ? pendingTickets.map((t: any) => (
                            <div key={t.id} className="flex flex-col p-2 rounded-lg bg-background/40 border border-white/5">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-white">{t.employeeName}</span>
                                    <span className="text-xs font-mono text-amber-400 font-bold">{formatCurrency(t.totalAmount / 100)}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground mb-2">{t.taskName} ({t.quantity} pzas)</div>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-7 text-[10px] uppercase font-bold"
                                    onClick={() => handlePreparePayout(t.employeeId, t.totalAmount, [t.id])}
                                >
                                    Pagar con Firma
                                </Button>
                            </div>
                        )) : (
                            <div className="text-center py-6 text-slate-600 text-xs italic">
                                No hay pagos pendientes
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2 text-white">
                        <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <History className="w-4 h-4" />
                            Recientes
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
                            <div className="text-center py-6 text-slate-600 text-xs italic">
                                Sin movimientos
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <TransactionModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                type={modalType}
                employeeId={propEmployeeId}
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

            {/* Close Session Dialog (Arqueo) */}
            <Dialog open={closeSessionDialog} onOpenChange={setCloseSessionDialog}>
                <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-red-500 flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-primary" />
                            Arqueo de Caja (Cierre)
                        </DialogTitle>
                        <DialogDescription>
                            Realiza el conteo físico del efectivo. No revelaremos el esperado hasta que termines.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Contante Físico</Label>
                            <Input
                                type="number"
                                className="bg-slate-900 border-primary/20 font-mono text-2xl h-16 text-center text-primary"
                                placeholder="0.00"
                                autoFocus
                                value={sessionAmount}
                                onChange={e => setSessionAmount(e.target.value)}
                            />
                        </div>

                        {showJustificationField && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <Label className="text-xs text-destructive uppercase font-bold tracking-wider flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Justificación por Faltante
                                </Label>
                                <Textarea
                                    className="bg-destructive/5 border-destructive/20 min-h-[100px]"
                                    placeholder="Explica el motivo del faltante de dinero..."
                                    value={justification}
                                    onChange={e => setJustification(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter className="flex flex-col gap-2">
                        <Button
                            variant={showJustificationField ? "destructive" : "default"}
                            onClick={handleCloseSession}
                            className="w-full h-12 font-bold uppercase"
                        >
                            Finalizar Turno
                        </Button>
                        <p className="text-[10px] text-muted-foreground text-center">
                            Después del arqueo, podrás cerrar sesión o finalizar tu jornada laboral.
                        </p>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payout QR Dialog */}
            <Dialog open={!!qrDialog} onOpenChange={() => setQrDialog(null)}>
                <DialogContent className="bg-white text-slate-900 border-none shadow-2xl max-w-xs">
                    <DialogHeader>
                        <DialogTitle className="text-center font-display text-xl text-slate-800">Firma de Entrega</DialogTitle>
                        <DialogDescription className="text-center">
                            Solicita al empleado escanear el código para ver el monto y firmar.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center py-6 space-y-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 shadow-inner">
                            {qrDialog && (
                                <QRCodeSVG
                                    value={`${window.location.origin}/sign/${qrDialog.token}`}
                                    size={200}
                                    level="H"
                                    includeMargin={true}
                                />
                            )}
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-black text-slate-900">{formatCurrency(qrDialog?.amount / 100)}</p>
                            <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">{qrDialog?.employeeName}</p>
                        </div>
                        <div className="flex items-center gap-2 text-primary font-bold animate-pulse text-xs uppercase">
                            <QrCode className="w-4 h-4" />
                            Esperando firma remota...
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" className="w-full text-slate-400" onClick={() => setQrDialog(null)}>
                            Cancelar Pago
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
