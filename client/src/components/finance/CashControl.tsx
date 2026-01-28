import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, cn } from "@/lib/utils";
import {
    Plus,
    Minus,
    Lock,
    Unlock,
    History,
    AlertTriangle,
    Truck,
    Users,
    QrCode,
    CheckCircle2,
    Calculator,
    DollarSign
} from "lucide-react";
import { TransactionModal } from "./TransactionModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { QRCodeSVG } from "qrcode.react";
import { Textarea } from "@/components/ui/textarea";

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

    if (isLoading) return (
        <div className="grid lg:grid-cols-3 gap-6 h-full p-4">
            <Skeleton className="lg:col-span-2 h-full bg-white/5 rounded-[40px]" />
            <div className="space-y-6">
                <Skeleton className="h-40 bg-white/5 rounded-3xl" />
                <Skeleton className="h-40 bg-white/5 rounded-3xl" />
            </div>
        </div>
    );

    return (
        <div className="grid lg:grid-cols-12 gap-8 h-full min-h-0">
            {/* Main Control Panel (Large) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
                <Card className="flex-1 bg-white/[0.02] border-white/5 rounded-[40px] shadow-2xl overflow-hidden relative group">
                    <div className={`absolute top-0 left-0 w-2 h-full transition-all duration-700 ${isOpen ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-red-500'}`} />

                    <CardHeader className="p-10 flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-4xl font-black italic uppercase tracking-tighter text-white flex items-center gap-4">
                                {register.name}
                                <Badge variant={isOpen ? "default" : "destructive"} className={cn(
                                    "uppercase tracking-[0.2em] text-[10px] py-1 px-3 border-2 transition-all duration-500",
                                    isOpen ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                )}>
                                    {isOpen ? "SISTEMA ACTIVO" : "SISTEMA CERRADO"}
                                </Badge>
                            </CardTitle>
                            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Control de Flujos Financieros</p>
                        </div>

                        <Button
                            size="lg"
                            variant={isOpen ? "destructive" : "default"}
                            onClick={() => isOpen ? setCloseSessionDialog(true) : setOpenSessionDialog(true)}
                            className={cn(
                                "h-16 px-8 rounded-2xl font-black uppercase tracking-widest text-xs transition-all duration-500 shadow-xl",
                                !isOpen && "bg-primary hover:bg-primary/90 text-black shadow-primary/20"
                            )}
                        >
                            {isOpen ? (
                                <><Lock className="w-5 h-5 mr-3" /> CERRAR TURNO</>
                            ) : (
                                <><Unlock className="w-5 h-5 mr-3" /> ABRIR TURNO</>
                            )}
                        </Button>
                    </CardHeader>

                    <CardContent className="p-10 pt-0 flex flex-col items-center justify-center space-y-12">
                        <div className="flex flex-col items-center gap-4 group">
                            <div className="p-6 rounded-full bg-white/[0.02] border border-white/5 group-hover:scale-110 transition-transform duration-700">
                                <DollarSign className={cn("w-12 h-12", isOpen ? "text-emerald-500" : "text-slate-600")} />
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em] mb-4">BALANCE TOTAL EN CAJA</p>
                                <h2 className={cn(
                                    "text-8xl font-black font-mono tracking-[-0.05em] transition-all duration-1000",
                                    isOpen ? "text-white shadow-emerald-500/10" : "text-slate-800"
                                )}>
                                    $ {(register.balance / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 w-full max-w-2xl">
                            <Button
                                className="h-28 rounded-[30px] bg-emerald-500/5 hover:bg-emerald-500/10 border-2 border-emerald-500/10 text-emerald-500 hover:border-emerald-500/30 transition-all flex flex-col items-center justify-center gap-2 group"
                                disabled={!isOpen}
                                onClick={() => { setModalType('in'); setModalOpen(true); }}
                            >
                                <Plus className="w-8 h-8 group-hover:scale-125 transition-transform" />
                                <span className="font-black uppercase tracking-[0.2em] text-[10px]">Registrar Ingreso</span>
                            </Button>
                            <Button
                                className="h-28 rounded-[30px] bg-red-500/5 hover:bg-red-500/10 border-2 border-red-500/10 text-red-500 hover:border-red-500/30 transition-all flex flex-col items-center justify-center gap-2 group"
                                disabled={!isOpen}
                                onClick={() => { setModalType('out'); setModalOpen(true); }}
                            >
                                <Minus className="w-8 h-8 group-hover:scale-125 transition-transform" />
                                <span className="font-black uppercase tracking-[0.2em] text-[10px]">Registrar Egreso</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Side Panel: Lists (Small) */}
            <div className="lg:col-span-4 flex flex-col gap-6 overflow-hidden">
                <Card className="bg-white/[0.02] border-white/5 rounded-[40px] flex flex-col min-h-0 shadow-2xl">
                    <CardHeader className="p-8 border-b border-white/5 flex flex-row items-center justify-between shrink-0">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3">
                            <History className="w-4 h-4" />
                            HISTORIAL RECIENTE
                        </CardTitle>
                        <Badge className="bg-white/5 text-slate-400 border-white/10 uppercase text-[9px]">En tiempo real</Badge>
                    </CardHeader>
                    <CardContent className="p-0 overflow-y-auto custom-scrollbar">
                        <div className="divide-y divide-white/5">
                            {stats?.transactions?.length > 0 ? stats.transactions.map((tx: any) => (
                                <div key={tx.id} className="p-6 hover:bg-white/[0.01] transition-colors group flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500",
                                            tx.type === 'in' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                                        )}>
                                            {tx.type === 'in' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="font-black text-white italic uppercase text-xs tracking-tight">{tx.description || tx.category}</p>
                                            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">
                                                {tx.category} • {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "font-mono font-black text-sm",
                                        tx.type === 'in' ? 'text-emerald-400' : 'text-red-400'
                                    )}>
                                        {tx.type === 'in' ? '+' : '-'}$ {(tx.amount / 100).toFixed(2)}
                                    </span>
                                </div>
                            )) : (
                                <div className="text-center py-20 text-slate-800 font-black uppercase italic tracking-widest text-[10px] opacity-20">
                                    No hay movimientos recientes
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Second Sidebar Card: Settlements/Pending */}
                <Card className="bg-white/[0.02] border-white/5 rounded-[40px] shadow-2xl relative overflow-hidden group">
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                        <Truck className="w-32 h-32 rotate-12" />
                    </div>

                    <CardHeader className="p-8 pb-4 shrink-0">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-cyan-500 flex items-center gap-3">
                            <Truck className="w-4 h-4" />
                            LIQUIDACIONES PENDIENTES
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 space-y-4">
                        {driverSettlements?.length > 0 ? driverSettlements.map((s: any) => (
                            <div key={s.saleId} className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 transition-all">
                                <div>
                                    <p className="text-xs font-black text-white uppercase italic">{s.driverName}</p>
                                    <p className="text-[10px] font-mono font-bold text-cyan-400 mt-1">$ {(s.amount / 100).toFixed(2)}</p>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => handleReceiveDriverCash(s.saleId)}
                                    className="h-10 px-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black font-black uppercase text-[10px] tracking-widest transition-all"
                                >
                                    COBRAR
                                </Button>
                            </div>
                        )) : (
                            <div className="text-center py-10 text-slate-800 font-black uppercase text-[10px] tracking-widest opacity-20">
                                Chóferes al día
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
                <DialogContent className="bg-slate-950 border-white/10 text-white rounded-[40px] p-10 max-w-lg">
                    <DialogHeader className="mb-8">
                        <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter">Apertura de Turno</DialogTitle>
                        <DialogDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Confirma el efectivo inicial en caja para comenzar operaciones.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-4">Monto Inicial (Fondo Fijo)</Label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none">
                                    <span className="text-2xl font-black text-primary">$</span>
                                </div>
                                <Input
                                    type="number"
                                    className="h-24 pl-16 bg-black border-2 border-white/5 rounded-3xl text-4xl font-mono font-black tracking-tighter text-white focus:border-primary/50 transition-all text-center"
                                    placeholder="0.00"
                                    value={sessionAmount}
                                    onChange={e => setSessionAmount(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-4">Notas de Apertura</Label>
                            <Input
                                className="h-16 bg-black border-2 border-white/5 rounded-2xl px-6 font-bold uppercase tracking-widest text-xs focus:border-primary/50 transition-all"
                                placeholder="..."
                                value={sessionNotes}
                                onChange={e => setSessionNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter className="mt-10">
                        <Button onClick={handleOpenSession} className="h-20 bg-primary hover:bg-primary/90 text-black w-full rounded-[25px] font-black uppercase tracking-[0.2em] text-lg shadow-xl shadow-primary/20">CONFIRMAR APERTURA</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Close Session Dialog (Arqueo) */}
            <Dialog open={closeSessionDialog} onOpenChange={setCloseSessionDialog}>
                <DialogContent className="bg-slate-950 border-white/10 text-white rounded-[40px] p-10 max-w-md">
                    <DialogHeader className="mb-8">
                        <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-red-500 flex items-center gap-4">
                            <Calculator className="w-8 h-8" />
                            Arqueo de Caja
                        </DialogTitle>
                        <DialogDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                            Realiza el conteo físico del efectivo. No revelaremos el esperado hasta que termines.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-8 py-4">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-4">Contante Físico (MXN)</Label>
                            <Input
                                type="number"
                                className="h-32 bg-black border-2 border-primary/20 rounded-[35px] font-mono text-5xl font-black tracking-tighter text-center text-primary focus:border-primary transition-all"
                                placeholder="0.00"
                                autoFocus
                                value={sessionAmount}
                                onChange={e => setSessionAmount(e.target.value)}
                            />
                        </div>

                        {showJustificationField && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                <Label className="text-[10px] text-red-500 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Justificación por Faltante
                                </Label>
                                <Textarea
                                    className="bg-black border-2 border-red-500/20 rounded-3xl min-h-[120px] p-6 text-sm font-bold uppercase tracking-widest"
                                    placeholder="..."
                                    value={justification}
                                    onChange={e => setJustification(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter className="flex flex-col gap-4 mt-8">
                        <Button
                            variant={showJustificationField ? "destructive" : "default"}
                            onClick={handleCloseSession}
                            className={cn(
                                "w-full h-20 rounded-[25px] font-black uppercase text-lg tracking-[0.2em] transition-all shadow-xl",
                                !showJustificationField && "bg-white text-black hover:bg-slate-200"
                            )}
                        >
                            FINALIZAR TURNO
                        </Button>
                        <p className="text-[10px] text-slate-600 font-bold text-center uppercase tracking-widest">
                            * Se generará un reporte de cierre irrevocable.
                        </p>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payout QR Dialog */}
            <Dialog open={!!qrDialog} onOpenChange={() => setQrDialog(null)}>
                <DialogContent className="bg-white text-slate-950 border-none shadow-2xl rounded-[50px] p-12 max-w-sm">
                    <DialogHeader className="mb-8">
                        <DialogTitle className="text-center font-black italic uppercase tracking-tighter text-2xl">Firma de Entrega</DialogTitle>
                        <DialogDescription className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Solicita al empleado escanear el código para ver el monto y firmar.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center space-y-8">
                        <div className="p-8 bg-slate-50 rounded-[40px] border-4 border-slate-100 shadow-inner">
                            {qrDialog && (
                                <QRCodeSVG
                                    value={`${window.location.origin}/sign/${qrDialog.token}`}
                                    size={240}
                                    level="H"
                                    includeMargin={true}
                                />
                            )}
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">IMPORTE A LIQUIDAR</p>
                            <p className="text-5xl font-black text-slate-950 font-mono tracking-tighter">$ {(qrDialog?.amount / 100).toFixed(2)}</p>
                            <p className="text-sm text-emerald-600 font-black uppercase tracking-widest italic">{qrDialog?.employeeName}</p>
                        </div>
                        <div className="flex items-center gap-3 text-primary font-black animate-pulse text-[10px] uppercase tracking-[0.2em] bg-primary/10 px-6 py-3 rounded-full">
                            <QrCode className="w-5 h-5 text-primary" />
                            ESPERANDO FIRMA REMOTA...
                        </div>
                    </div>
                    <DialogFooter className="mt-12">
                        <Button variant="link" className="w-full text-slate-400 font-black uppercase tracking-widest text-[10px]" onClick={() => setQrDialog(null)}>
                            CANCELAR OPERACIÓN
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
