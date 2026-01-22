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
    Plus
} from "lucide-react";
import { KioskSession } from "@/types/kiosk";

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

// ... existing imports

export default function CashierTerminal({ sessionContext, onLogout }: CashierTerminalProps) {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [scanCode, setScanCode] = useState("");
    const [employeeId, setEmployeeId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'payouts' | 'general'>('payouts');

    const getAuthHeaders = () => {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };

        // 1. Supabase Auth
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        // 2. Terminal Bridge Auth
        const deviceId = localStorage.getItem("kiosk_device_id");
        const salt = localStorage.getItem("kiosk_device_salt");
        const terminalAuthEmployeeId = sessionContext.driver?.id || localStorage.getItem("last_auth_employee_id");

        if (deviceId && salt) {
            headers['X-Device-Auth'] = `${deviceId}:${salt}`;
        }
        if (terminalAuthEmployeeId) {
            headers['X-Employee-ID'] = terminalAuthEmployeeId;
        }

        return headers;
    };

    // Mock employee search for now, replacing with real search if endpoint exists
    const handleEmployeeSearch = () => {
        if (!scanCode) return;
        setEmployeeId(scanCode);
    };

    // Fetch unpaid tickets for this employee
    const { data: unpaidTickets = [], isLoading: loadingTickets } = useQuery<UnpaidTicket[]>({
        queryKey: ["/api/piecework/tickets/unpaid", employeeId],
        queryFn: async () => {
            if (!employeeId) return [];
            const res = await fetch(`/api/piecework/tickets?employeeId=${employeeId}&status=pending`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error("Failed to fetch tickets");
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
        <div className="h-full flex flex-col gap-6 p-6 max-w-7xl mx-auto">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-white/5 pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                        <DollarSign className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white leading-none">Caja Chica</h1>
                        <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Estación: {sessionContext.terminal.location || "Oficina"}</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-xl font-black text-white leading-none uppercase">{sessionContext.driver?.name}</p>
                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-1">CAJERO AUTORIZADO</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onLogout} className="bg-white/5 hover:bg-destructive/20 hover:text-destructive">
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </header>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md bg-white/5 border border-white/10 rounded-2xl h-16 p-1">
                    <TabsTrigger value="payouts" className="rounded-xl font-black uppercase tracking-widest text-xs h-full data-[state=active]:bg-primary data-[state=active]:text-black">Pagos de Nómina</TabsTrigger>
                    <TabsTrigger value="general" className="rounded-xl font-black uppercase tracking-widest text-xs h-full data-[state=active]:bg-emerald-500 data-[state=active]:text-black">Caja General</TabsTrigger>
                </TabsList>
            </Tabs>

            {activeTab === 'general' ? (
                <div className="flex-1 min-h-0 overflow-y-auto">
                    <CashControl employeeId={sessionContext.driver?.id} />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

                    {/* Helper / Search */}
                    <div className="space-y-6">
                        <Card className="bg-slate-900/50 border-slate-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Scan className="w-5 h-5 text-primary" />
                                    Escanear Empleado
                                </CardTitle>
                                <CardDescription>Escanee el gafete o ingrese ID</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-2">
                                    <Input
                                        value={scanCode}
                                        onChange={(e) => setScanCode(e.target.value)}
                                        placeholder="ID de Empleado..."
                                        className="font-mono uppercase"
                                    />
                                    <Button size="icon" onClick={handleEmployeeSearch}>
                                        <Search className="w-4 h-4" />
                                    </Button>
                                </div>

                                {employeeId && (
                                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                                            <User className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">Empleado</p>
                                            <p className="text-xs text-primary/80">ID: {employeeId.slice(0, 8)}...</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {employeeId && (
                            <Card className="bg-emerald-950/30 border-emerald-900/50">
                                <CardHeader>
                                    <CardTitle className="text-emerald-400 flex items-center gap-2">
                                        <Wallet className="w-5 h-5" />
                                        Resumen de Pago
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Bruto (Tickets)</span>
                                        <span className="text-white font-mono">${(totalTickets / 100).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-red-400">Deducciones (Adelantos)</span>
                                        <span className="text-red-400 font-mono">-${(totalAdvances / 100).toFixed(2)}</span>
                                    </div>
                                    <div className="h-px bg-slate-800 my-2" />
                                    <div className="flex justify-between text-xl font-black">
                                        <span className="text-white">NETO A PAGAR</span>
                                        <span className="text-emerald-400 font-mono">${(netPay / 100).toFixed(2)}</span>
                                    </div>

                                    <Button
                                        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                        onClick={() => payMutation.mutate()}
                                        disabled={payMutation.isPending || netPay === 0}
                                    >
                                        {payMutation.isPending ? "Procesando..." : "Confirmar Pago en Efectivo"}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {employeeId && (
                            <Card className="bg-slate-900/50 border-slate-800">
                                <CardContent className="p-4">
                                    <NewAdvanceDialog
                                        employeeId={employeeId}
                                        onSuccess={() => {
                                            queryClient.invalidateQueries({ queryKey: ["/api/piecework/advances"] });
                                            queryClient.invalidateQueries({ queryKey: ["/api/operations/finance/summary"] });
                                        }}
                                        getAuthHeaders={getAuthHeaders}
                                    />
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Details Grid */}
                    <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800 flex flex-col min-h-0">
                        <CardHeader>
                            <CardTitle>Desglose de Actividad</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
                            {!employeeId ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-50">
                                    <Scan className="w-16 h-16 mb-4" />
                                    <p>Escanee un empleado para ver detalles</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1 min-h-0 flex flex-col">
                                        <h3 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Tickets Pendientes</h3>
                                        <ScrollArea className="flex-1 rounded-md border border-slate-800 bg-slate-950/30 p-2">
                                            <div className="space-y-2">
                                                {unpaidTickets.map((t) => (
                                                    <div key={t.id} className="flex items-center justify-between p-3 rounded bg-slate-900/50 border border-slate-800/50">
                                                        <div className="flex items-center gap-3">
                                                            <DollarSign className="w-4 h-4 text-emerald-500" />
                                                            <div>
                                                                <p className="font-medium text-slate-200">{t.taskName}</p>
                                                                <p className="text-xs text-slate-500 font-mono">{t.id.slice(0, 8)}</p>
                                                            </div>
                                                        </div>
                                                        <span className="font-mono text-white">${(t.totalAmount / 100).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                                {unpaidTickets.length === 0 && <p className="text-center text-slate-500 py-4">No hay tickets pendientes</p>}
                                            </div>
                                        </ScrollArea>
                                    </div>

                                    <div className="h-1/3 min-h-0 flex flex-col">
                                        <h3 className="text-sm font-bold text-red-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            Adelantos / Deducciones
                                        </h3>
                                        <ScrollArea className="flex-1 rounded-md border border-red-900/20 bg-red-950/10 p-2">
                                            <div className="space-y-2">
                                                {advances.map((a) => (
                                                    <div key={a.id} className="flex items-center justify-between p-3 rounded bg-red-900/10 border border-red-900/20">
                                                        <div>
                                                            <p className="font-medium text-red-200">Adelanto de Nómina</p>
                                                            <p className="text-xs text-red-400/70">{new Date(a.date).toLocaleDateString()}</p>
                                                        </div>
                                                        <span className="font-mono text-red-400">-${(a.amount / 100).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                                {advances.length === 0 && <p className="text-center text-slate-500 py-4">No hay deducciones pendientes</p>}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                </div>
            )}
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
                    amount: parseFloat(amount) * 100, // cents
                    status: "paid" // Cashier gives it immediately
                })
            });
            if (!res.ok) throw new Error("Error creating advance");
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Adelanto Registrado", description: "El gasto se ha registrado automáticamente." });
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
                <Button variant="secondary" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Adelanto
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Registrar Adelanto</DialogTitle>
                    <DialogDescription>
                        Ingrese el monto a entregar al empleado. Se registrará como gasto de nómina.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Monto</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="number"
                                className="pl-9"
                                placeholder="0.00"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !amount}>
                        {mutation.isPending ? "Registrando..." : "Confirmar Entrega"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
