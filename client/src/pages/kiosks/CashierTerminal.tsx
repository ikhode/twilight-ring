import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
    Scan,
    DollarSign,
    Wallet,
    CheckCircle,
    AlertTriangle,
    User,
    LogOut,
    Search,
    Plus,
    Camera,
    X,
    Loader2,
    ArrowRight
} from "lucide-react";
import { KioskSession } from "@/types/kiosk";
import { getKioskHeaders } from "@/lib/kiosk-auth";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useRealtimeSubscription } from "@/hooks/use-realtime";

interface CashierTerminalProps {
    sessionContext: KioskSession;
    onLogout: () => void;
}

interface UnpaidTicket {
    id: string;
    taskName: string;
    totalAmount: number;
}

interface Advance {
    id: string;
    amount: number;
    date: string;
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CashControl } from "@/components/finance/CashControl";
import { FaceAuthCamera } from "@/components/kiosks/FaceAuthCamera";

// ... existing imports

export default function CashierTerminal({ sessionContext, onLogout }: CashierTerminalProps) {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [scanCode, setScanCode] = useState("");
    const [employeeId, setEmployeeId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'payouts' | 'general'>('payouts');

    // Realtime Sync
    useRealtimeSubscription({
        table: 'cash_registers',
        queryKeyToInvalidate: ['/api/finance/cash/stats']
    });

    useRealtimeSubscription({
        table: 'cash_transactions',
        queryKeyToInvalidate: ['/api/finance/cash/stats']
    });

    useRealtimeSubscription({
        table: 'piecework_tickets',
        queryKeyToInvalidate: ['/api/piecework/tickets']
    });

    const getAuthHeaders = () => {
        return getKioskHeaders({
            employeeId: sessionContext.driver?.id || localStorage.getItem("last_auth_employee_id"),
            supabaseToken: session?.access_token
        });
    };

    // Stats for the header
    const { data: stats } = useQuery({
        queryKey: ['/api/finance/cash/stats'],
        queryFn: async () => {
            const res = await fetch('/api/finance/cash/stats', { headers: getAuthHeaders() });
            return res.json();
        }
    });

    const isSessionOpen = stats?.register?.status === 'open';

    // Smart Scan Logic
    const handleSmartSearch = async () => {
        if (!scanCode) return;

        // 1. Try to find a Ticket first (Smart Scan)
        if (scanCode.includes('-') && scanCode.length > 20) {
            try {
                const res = await fetch(`/api/piecework/tickets/${scanCode}`, { headers: getAuthHeaders() });
                if (res.ok) {
                    const ticket = await res.json();
                    if (ticket && (ticket.status === 'pending' || ticket.status === 'approved')) {
                        setScannedTicket(ticket); // Trigger Ticket Pay Modal
                        setScanCode("");
                        return;
                    } else if (ticket) {
                        toast({ title: "Ticket ya procesado", description: `Estado: ${ticket.status}`, variant: "destructive" });
                        return;
                    }
                }
            } catch (e) { /* Ignore, proceed to employee check */ }
        }

        // 2. Fallback to Employee ID
        setEmployeeId(scanCode);
        setScanCode("");
    };

    const [scannedTicket, setScannedTicket] = useState<any | null>(null);
    const [showFaceCam, setShowFaceCam] = useState(false);

    // Pay Single Ticket Mutation
    const paySingleTicketMutation = useMutation({
        mutationFn: async (ticketId: string) => {
            const res = await fetch(`/api/piecework/tickets/${ticketId}/pay`, { method: "POST", headers: getAuthHeaders() });
            if (!res.ok) throw new Error("Failed to pay ticket");
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Ticket Pagado", description: "Pago registrado exitosamente." });
            setScannedTicket(null);
            queryClient.invalidateQueries({ queryKey: ["/api/piecework/tickets"] });
        }
    });

    // Fetch unpaid tickets for this employee (Ready for Payment = Pending or Approved)
    const { data: unpaidTickets = [] } = useQuery<UnpaidTicket[]>({
        queryKey: ["/api/piecework/tickets/unpaid", employeeId, "payable"],
        queryFn: async () => {
            if (!employeeId) return [];
            const res = await fetch(`/api/piecework/tickets?employeeId=${employeeId}&status=approved,pending`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error("Failed to fetch tickets");
            return res.json();
        },
        enabled: !!employeeId
    });

    // Fetch Employee Details for Feedback
    const { data: employeeDetails } = useQuery<any>({
        queryKey: ["/api/hr/employees", employeeId],
        queryFn: async () => {
            if (!employeeId) return null;
            const res = await fetch(`/api/hr/employees/${employeeId}`, { headers: getAuthHeaders() });
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!employeeId
    });

    // Fetch pending advances
    const { data: advances = [] } = useQuery<Advance[]>({
        queryKey: ["/api/piecework/advances", employeeId],
        queryFn: async () => {
            if (!employeeId) return [];
            const res = await fetch(`/api/piecework/advances?employeeId=${employeeId}&status=pending`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error("Failed to fetch advances");
            return res.json();
        },
        enabled: !!employeeId
    });

    const payMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/piecework/payout", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    ticketIds: unpaidTickets.map((t: any) => t.id),
                    advanceIds: advances.map((a: any) => a.id)
                })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Payout failed");
            }
            return res.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Pago Exitoso",
                description: `Pagado $${(data.netPayout / 100).toFixed(2)}. Tickets: ${data.processedTickets}`,
            });
            setEmployeeId(null);
            setScanCode("");
            queryClient.invalidateQueries({ queryKey: ["/api/piecework/tickets"] });
            queryClient.invalidateQueries({ queryKey: ["/api/piecework/advances"] });
        },
        onError: (err) => {
            toast({
                title: "Error",
                description: err.message || "No se pudo procesar el pago",
                variant: "destructive"
            });
        }
    });

    const totalTickets = unpaidTickets.reduce((acc: number, t: any) => acc + t.totalAmount, 0);
    const totalAdvances = advances.reduce((acc: number, a: any) => acc + a.amount, 0);
    const netPay = Math.max(0, totalTickets - totalAdvances);

    return (
        <div className="h-[100vh] w-full bg-[#050505] text-white selection:bg-primary/30 p-4 md:p-8 flex flex-col gap-6 overflow-hidden">
            {/* Ultra Modern Header */}
            <header className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-white/5">
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                        <div className="relative p-4 bg-black rounded-2xl border border-white/10 flex items-center justify-center">
                            <DollarSign className="w-8 h-8 text-emerald-400" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-black tracking-[ -0.05em] uppercase italic leading-none">Caja Chica</h1>
                            <Badge variant={isSessionOpen ? "default" : "destructive"} className="uppercase tracking-widest text-[10px] py-0.5 px-2 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                {isSessionOpen ? 'SESIÓN ACTIVA' : 'SISTEMA CERRADO'}
                            </Badge>
                        </div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-2">
                            Estación: <span className="text-slate-300">{sessionContext.terminal.location || "Principal"}</span> — Terminal ID: {sessionContext.terminal.id.slice(0, 8)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-8 bg-white/[0.02] border border-white/5 p-3 rounded-[30px] pr-6">
                    <div className="flex items-center gap-4 border-r border-white/10 pr-6">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center border-2 border-white/10 shadow-xl">
                            <User className="w-6 h-6 text-slate-300" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-black text-white uppercase leading-none">{sessionContext.driver?.name}</p>
                            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-1">Cajero Senior</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onLogout}
                        className="w-12 h-12 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-all border border-white/5"
                    >
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </header>

            {/* Navigation & Status Card */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full md:w-auto">
                    <TabsList className="bg-white/5 border border-white/5 p-1 rounded-2xl h-14 w-full md:w-[400px]">
                        <TabsTrigger value="payouts" className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-full data-[state=active]:bg-primary data-[state=active]:text-black transition-all">
                            Nómina & Tickets
                        </TabsTrigger>
                        <TabsTrigger value="general" className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-full data-[state=active]:bg-emerald-500 data-[state=active]:text-black transition-all">
                            Control de Efectivo
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {isSessionOpen && stats?.register && (
                    <div className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl shadow-lg shadow-emerald-500/5">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Saldo en Caja:</span>
                        <span className="text-xl font-mono font-black text-white">$ {(stats.register.balance / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                )}
            </div>

            {activeTab === 'general' ? (
                <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <CashControl employeeId={sessionContext.driver?.id} />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">

                    {/* Left Column: Input & Summary (4 cols) */}
                    <div className="lg:col-span-4 flex flex-col gap-6">

                        {/* Scan Card */}
                        <Card className="bg-white/[0.02] border-white/5 rounded-[40px] p-8 shadow-2xl relative overflow-hidden group">
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition duration-700" />
                            <CardHeader className="p-0 mb-6">
                                <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3">
                                    <Scan className="w-4 h-4 text-primary" />
                                    Terminal de Escaneo
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 space-y-6">
                                <div className="flex gap-3">
                                    <Input
                                        value={scanCode}
                                        onChange={(e) => setScanCode(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSmartSearch()}
                                        placeholder="ESCANEAR GAFETE..."
                                        className="h-16 bg-black border-2 border-white/5 rounded-2xl font-mono text-xl tracking-widest uppercase focus:border-primary/50 transition-all placeholder:text-slate-800"
                                    />
                                    <Button
                                        onClick={handleSmartSearch}
                                        className="h-16 w-16 rounded-2xl bg-white/5 hover:bg-primary hover:text-black transition-all border border-white/5"
                                    >
                                        <Search className="w-6 h-6" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowFaceCam(true)}
                                        className="h-16 w-16 rounded-2xl bg-primary/5 border-primary/20 text-primary hover:bg-primary hover:text-black transition-all"
                                    >
                                        <Camera className="w-6 h-6" />
                                    </Button>
                                </div>

                                {employeeId && employeeDetails ? (
                                    <div className="p-6 rounded-[30px] bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center gap-4 animate-in zoom-in-95">
                                        <div className="w-16 h-16 rounded-2xl bg-black border-2 border-primary/30 flex items-center justify-center overflow-hidden">
                                            {employeeDetails.avatar ? (
                                                <img src={employeeDetails.avatar} alt="P" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-8 h-8 text-primary" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xl font-black text-white italic leading-none">{employeeDetails.name}</p>
                                            <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-2 bg-black/40 px-2 py-0.5 rounded-full inline-block">
                                                {employeeDetails.role} • {employeeDetails.department}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-[30px] opacity-20">
                                        <p className="text-xs font-black uppercase tracking-widest italic">Aguardando entrada de ID...</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Payment Card */}
                        <Card className={cn(
                            "bg-white/[0.02] border-white/5 rounded-[40px] p-8 shadow-2xl transition-all duration-700",
                            employeeId ? "opacity-100 scale-100" : "opacity-30 scale-95 grayscale"
                        )}>
                            <CardHeader className="p-0 mb-6">
                                <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-emerald-500 flex items-center gap-3">
                                    <Wallet className="w-4 h-4" />
                                    Resumen de Liquidación
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center px-4 py-2 rounded-xl bg-white/[0.02]">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Acumulado Tickets</span>
                                        <span className="text-sm font-mono font-bold">$ {(totalTickets / 100).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center px-4 py-2 rounded-xl bg-red-500/5">
                                        <span className="text-xs font-bold text-red-500/50 uppercase tracking-wider">Adelantos / Deducción</span>
                                        <span className="text-sm font-mono font-bold text-red-400">-$ {(totalAdvances / 100).toFixed(2)}</span>
                                    </div>
                                    <div className="h-px bg-white/5 mx-4" />
                                    <div className="flex justify-between items-center px-4 py-4">
                                        <span className="text-xs font-black text-white uppercase tracking-[0.2em]">Neto a Entregar</span>
                                        <span className="text-4xl font-mono font-black text-emerald-400 tracking-tighter">
                                            $ {(netPay / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-20 rounded-[25px] bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 text-lg group transition-all"
                                    disabled={!employeeId || netPay <= 0 || payMutation.isPending || !isSessionOpen}
                                    onClick={() => payMutation.mutate()}
                                >
                                    {payMutation.isPending ? (
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    ) : (
                                        <>
                                            CONFIRMAR PAGO
                                            <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" />
                                        </>
                                    )}
                                </Button>
                                {!isSessionOpen && (
                                    <p className="text-[10px] text-center text-red-400 font-bold uppercase tracking-widest mt-2 animate-pulse">
                                        * DEBE ABRIR TURNO PARA REALIZAR PAGOS
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {employeeId && (
                            <NewAdvanceDialog
                                employeeId={employeeId}
                                onSuccess={() => {
                                    queryClient.invalidateQueries({ queryKey: ["/api/piecework/advances"] });
                                    queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
                                }}
                                getAuthHeaders={getAuthHeaders}
                            />
                        )}
                    </div>

                    {/* Right Column: Detail Lists (8 cols) */}
                    <div className="lg:col-span-8 flex flex-col gap-8 min-h-[600px]">
                        <Card className="flex-1 bg-white/[0.02] border-white/5 rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
                            <CardHeader className="p-8 border-b border-white/5">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-xl font-black italic uppercase tracking-tighter text-white">
                                        Desglose de Actividad <span className="text-slate-500 font-medium">/ Hoy</span>
                                    </CardTitle>
                                    <Badge className="bg-primary/10 text-primary border-primary/20 font-bold">
                                        {unpaidTickets.length} TICKETS DETECTADOS
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 flex flex-col min-h-0 bg-black/20">
                                {!employeeId ? (
                                    <div className="flex-1 flex flex-col items-center justify-center p-20 opacity-10">
                                        <Scan className="w-32 h-32 mb-6" />
                                        <p className="text-2xl font-black uppercase italic tracking-tighter">Aguardando Escaneo</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full divide-y divide-white/5 overflow-hidden">
                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4 px-2">Listado de Producción</h3>
                                            {unpaidTickets.map((t) => (
                                                <div key={t.id} className="group p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-primary/30 transition-all flex items-center justify-between">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                                            <CheckCircle className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-white italic uppercase tracking-tight">{t.taskName}</p>
                                                            <p className="text-[10px] text-slate-500 font-mono tracking-widest mt-1">REF_{t.id.slice(0, 12).toUpperCase()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xl font-mono font-black text-white">$ {(t.totalAmount / 100).toFixed(2)}</p>
                                                        <p className={cn(
                                                            "text-[9px] font-black uppercase tracking-widest mt-1",
                                                            (t as any).status === 'approved' ? "text-emerald-500" : "text-amber-500"
                                                        )}>
                                                            {(t as any).status === 'approved' ? "APROBADO" : "PENDIENTE"}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                            {unpaidTickets.length === 0 && (
                                                <div className="py-10 text-center text-slate-600 italic uppercase text-xs font-bold opacity-30">
                                                    No se encontraron tickets aprobados para pago
                                                </div>
                                            )}
                                        </div>

                                        {advances.length > 0 && (
                                            <div className="h-1/3 bg-red-500/[0.02] p-6 overflow-y-auto border-t border-red-500/20">
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-4 px-2 flex items-center gap-2">
                                                    <AlertTriangle className="w-3 h-3" /> Deducciones Pendientes
                                                </h3>
                                                <div className="space-y-3">
                                                    {advances.map((a) => (
                                                        <div key={a.id} className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-center justify-between">
                                                            <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Adelanto de Nómina</p>
                                                            <p className="font-mono text-red-400 font-black">-$ {(a.amount / 100).toFixed(2)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Face ID Auth Modal Overlay */}
            <Dialog open={showFaceCam} onOpenChange={setShowFaceCam}>
                <DialogContent className="max-w-xl bg-slate-950 border-white/10 p-0 overflow-hidden rounded-[40px]">
                    <div className="p-8 border-b border-white/5">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Escaneo Biométrico</DialogTitle>
                            <DialogDescription className="uppercase tracking-widest text-[10px] font-bold text-slate-500">
                                Acerque el rostro a la cámara para identificación segura
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    <div className="p-8 pt-0">
                        <FaceAuthCamera
                            terminalId={sessionContext.terminal.id}
                            onAuthenticated={(emp) => {
                                setEmployeeId(emp.id);
                                setShowFaceCam(false);
                                toast({
                                    title: "Acceso Concedido",
                                    description: `Identificado: ${emp.name}`,
                                    className: "bg-emerald-500 text-black font-black"
                                });
                            }}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Quick Pay Ticket Dialog */}
            <Dialog open={!!scannedTicket} onOpenChange={(open) => !open && setScannedTicket(null)}>
                <DialogContent className="max-w-sm bg-slate-950 border-white/10 rounded-[30px] p-6">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="flex items-center gap-3 text-xl font-black italic uppercase tracking-tighter">
                            <DollarSign className="w-6 h-6 text-emerald-500" />
                            Pago Instantáneo
                        </DialogTitle>
                    </DialogHeader>
                    {scannedTicket && (
                        <div className="space-y-6">
                            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Actividad</p>
                                    <p className="text-lg font-black text-white italic uppercase">{scannedTicket.taskName}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Empleado</p>
                                    <p className="text-sm font-bold text-slate-300">{scannedTicket.employeeName}</p>
                                </div>
                                <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                                    <p className="text-xs font-black text-white uppercase tracking-widest mb-1">Total</p>
                                    <p className="text-3xl font-mono font-black text-emerald-400Tracking-tighter italic">
                                        ${(scannedTicket.totalAmount / 100).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="ghost" className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest border border-white/5" onClick={() => setScannedTicket(null)}>
                                    CANCELAR
                                </Button>
                                <Button
                                    className="flex-[2] h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                                    onClick={() => paySingleTicketMutation.mutate(scannedTicket.id)}
                                    disabled={paySingleTicketMutation.isPending || !isSessionOpen}
                                >
                                    {paySingleTicketMutation.isPending ? "PROCESANDO..." : "AUTORIZAR PAGO"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function NewAdvanceDialog({ employeeId, onSuccess, getAuthHeaders }: { employeeId: string, onSuccess: () => void, getAuthHeaders: () => Record<string, string> }) {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState("");
    const { toast } = useToast();

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/piecework/advances", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    employeeId,
                    amount: Math.round(parseFloat(amount) * 100), // cents
                    status: "paid" // Cashier gives it immediately
                })
            });
            if (!res.ok) throw new Error("Error creating advance");
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Gasto Registrado",
                description: "Adelanto entregado y registrado exitosamente.",
                className: "bg-primary text-black font-black"
            });
            setOpen(false);
            setAmount("");
            onSuccess();
        },
        onError: () => {
            toast({ title: "Error", description: "No se pudo registrar el adelanto", variant: "destructive" });
        }
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full h-16 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-xs shadow-xl transition-all">
                    <Plus className="w-4 h-4 mr-2" />
                    Entregar Adelanto de Nómina
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-950 border-white/10 rounded-[40px] p-8 max-w-md">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Nuevo Adelanto</DialogTitle>
                    <DialogDescription className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">
                        Ingrese el monto que se entregará físicamente al empleado
                    </DialogDescription>
                </DialogHeader>
                <div className="py-8 space-y-6">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Monto Solicitado (MXN)</Label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                                <span className="text-2xl font-black text-primary opacity-50">$</span>
                            </div>
                            <Input
                                type="number"
                                className="h-24 pl-12 bg-black border-2 border-white/5 rounded-3xl text-4xl font-mono font-black tracking-tighter text-white focus:border-primary/50 transition-all text-center"
                                placeholder="0.00"
                                autoFocus
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                            * Al confirmar, este monto se restará automáticamente del próximo pago de nómina del empleado y se registrará como un egreso en la sesión de caja actual.
                        </p>
                    </div>
                </div>
                <DialogFooter className="gap-3">
                    <Button variant="ghost" className="h-16 rounded-2xl font-black uppercase tracking-widest border border-white/5" onClick={() => setOpen(false)}>
                        CANCELAR
                    </Button>
                    <Button
                        className="flex-[2] h-16 rounded-2xl bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                        onClick={() => mutation.mutate()}
                        disabled={mutation.isPending || !amount}
                    >
                        {mutation.isPending ? "REGISTRANDO..." : "CONFIRMAR ENTREGA"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
