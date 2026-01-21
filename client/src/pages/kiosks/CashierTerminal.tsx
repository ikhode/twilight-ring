import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
    Scan,
    DollarSign,
    Wallet,
    CheckCircle,
    AlertTriangle,
    User,
    LogOut,
    Search
} from "lucide-react";
import { KioskSession } from "@/types/kiosk";

interface CashierTerminalProps {
    sessionContext: KioskSession;
    onLogout: () => void;
}

export default function CashierTerminal({ sessionContext, onLogout }: CashierTerminalProps) {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [scanCode, setScanCode] = useState("");
    const [employeeId, setEmployeeId] = useState<string | null>(null);

    // Mock employee search for now, replacing with real search if endpoint exists
    const handleEmployeeSearch = () => {
        // In real app, query /api/hr/employees by ID or Name
        // For demo, we assume the scanned code IS the employee ID or ticket contains it.
        // Let's assume we scan a generic "Ticket ID" but for payouts we need "Employee ID".
        // Simplification: We search pending tickets for a specific employee.
        setEmployeeId(scanCode); // Just treating the scan as "Employee ID" for payout flow
    };

    // Fetch unpaid tickets for this employee
    const { data: unpaidTickets = [], isLoading: loadingTickets } = useQuery({
        queryKey: ["/api/piecework/tickets/unpaid", employeeId],
        queryFn: async () => {
            // Mock endpoint standard: GET /api/piecework/tickets?status=pending&userId={employeeId}
            // Assuming we have such filter logic. For now, stubbing response based on input.
            if (!employeeId) return [];

            // Stub data
            return [
                { id: "MX-8291", taskName: "Corte de Pantalón (Jeans)", totalAmount: 1500, date: new Date().toISOString() },
                { id: "MX-8292", taskName: "Corte de Pantalón (Jeans)", totalAmount: 1500, date: new Date().toISOString() },
                { id: "MX-8295", taskName: "Pegado de Bolsas", totalAmount: 500, date: new Date().toISOString() }
            ];
        },
        enabled: !!employeeId
    });

    // Fetch pending advances
    const { data: advances = [] } = useQuery({
        queryKey: ["/api/hr/payroll/advances", employeeId],
        queryFn: async () => {
            // Stub data
            if (!employeeId) return [];
            return [
                { id: "ADV-101", amount: 50000, date: new Date().toISOString(), reason: "Adelanto personal" } // $500.00
            ];
        },
        enabled: !!employeeId
    });

    const payMutation = useMutation({
        mutationFn: async () => {
            // Here we would call POST /api/hr/payroll/payout 
            // passing ticket IDs and advance IDs to mark as paid/deducted
            await new Promise(r => setTimeout(r, 1000)); // Mock delay
            return { success: true, totalPaid: 3500 - 500 };
        },
        onSuccess: () => {
            toast({
                title: "Pago Exitoso",
                description: "Se han registrado los tickets como pagados.",
            });
            setEmployeeId(null);
            setScanCode("");
        }
    });

    const totalTickets = unpaidTickets.reduce((acc: number, t: any) => acc + t.totalAmount, 0);
    const totalAdvances = advances.reduce((acc: number, a: any) => acc + a.amount, 0);
    const netPay = Math.max(0, totalTickets - totalAdvances);

    return (
        <div className="h-full flex flex-col gap-6 p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white">Terminal de Caja</h1>
                    <p className="text-slate-400">Pagos y Nómina</p>
                </div>
                <Button variant="outline" size="icon" onClick={onLogout}>
                    <LogOut className="w-4 h-4" />
                </Button>
            </div>

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
                                        <p className="font-bold text-white">Juan Pérez</p>
                                        <p className="text-xs text-primary/80">ID: {employeeId}</p>
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
                                            {unpaidTickets.map((t: any) => (
                                                <div key={t.id} className="flex items-center justify-between p-3 rounded bg-slate-900/50 border border-slate-800/50">
                                                    <div className="flex items-center gap-3">
                                                        <DollarSign className="w-4 h-4 text-emerald-500" />
                                                        <div>
                                                            <p className="font-medium text-slate-200">{t.taskName}</p>
                                                            <p className="text-xs text-slate-500 font-mono">{t.id}</p>
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
                                            {advances.map((a: any) => (
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
        </div>
    );
}
