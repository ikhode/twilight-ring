import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
    Printer,
    CheckCircle2,
    MapPin,
    Package,
    QrCode,
    LogOut,
    History,
    AlertCircle
} from "lucide-react";
import { KioskSession } from "@/types/kiosk";

interface ProductionTerminalProps {
    sessionContext: KioskSession;
    onLogout: () => void;
}

export default function ProductionTerminal({ sessionContext, onLogout }: ProductionTerminalProps) {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedTask, setSelectedTask] = useState<any>(null);

    // Fetch available tasks/rates from DB
    const { data: tasks = [] } = useQuery({
        queryKey: ["/api/piecework/tasks"],
        enabled: !!sessionContext.terminal.organizationId
    });

    // Fetch recent tickets for this employee
    const { data: recentTickets = [] } = useQuery({
        queryKey: ["/api/piecework/tickets", sessionContext.driver?.id],
        queryFn: async () => {
            const res = await fetch(`/api/piecework/tickets?employeeId=${sessionContext.driver?.id}`);
            if (!res.ok) throw new Error("Failed to fetch history");
            return res.json();
        },
        enabled: !!sessionContext.driver?.id,
        refetchInterval: 5000 // Real-time poll or stick to RT subscription
    });

    const createTicketMutation = useMutation({
        mutationFn: async (task: any) => {
            const res = await fetch("/api/piecework/tickets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employeeId: sessionContext.driver?.id,
                    taskName: task.name,
                    quantity: 1, // Default to 1 unit per ticket scan
                    unitPrice: task.unitPrice,
                    totalAmount: task.unitPrice,
                    organizationId: sessionContext.terminal.organizationId
                })
            });
            if (!res.ok) throw new Error("Error creating ticket");
            return res.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Ticket Generado",
                description: `ID: ${data.id.slice(0, 8)} - $${(data.totalAmount / 100).toFixed(2)}`,
            });
            setSelectedTask(null);
            queryClient.invalidateQueries({ queryKey: ["/api/piecework/tickets"] });
            // Simulate printing
            printTicket(data);
        },
        onError: () => {
            toast({ title: "Error", description: "No se pudo registrar el trabajo", variant: "destructive" });
        }
    });

    const printTicket = (ticket: any) => {
        // Stub for printing logic
        const win = window.open('', '', 'width=300,height=400');
        win?.document.write(`
        <html>
            <body style="text-align:center; font-family: monospace;">
                <h3>Nexus Production</h3>
                <p>${new Date().toLocaleString()}</p>
                <hr/>
                <h2>${ticket.taskName}</h2>
                <h1>$${(ticket.totalAmount / 100).toFixed(2)}</h1>
                <div style="margin: 20px 0; background: #eee; padding: 10px;">
                    [ QR CODE STUB ]<br/>
                    ${ticket.id}
                </div>
                <p>Empleado: ${sessionContext.driver?.name}</p>
            </body>
        </html>
    `);
        win?.print();
        // win?.close(); // Keep open for debug
    };

    // Calculate daily total from recentTickets (Assuming backend only returns recent/today or we filter)
    const todayTotal = recentTickets.reduce((acc: number, t: any) => acc + t.totalAmount, 0);

    return (
        <div className="h-full flex flex-col gap-6 p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white">Terminal de Producción</h1>
                    <p className="text-slate-400 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> {sessionContext.terminal.location || "Planta General"}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-sm font-bold text-white">{sessionContext.driver?.name}</p>
                        <p className="text-xs text-slate-500">{sessionContext.driver?.role || "Operador"}</p>
                    </div>
                    <Button variant="outline" size="icon" onClick={onLogout}>
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

                {/* Task Selection */}
                <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800 flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary" />
                            Seleccionar Actividad
                        </CardTitle>
                        <CardDescription>Toque una tarea para generar un ticket de trabajo</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-2 gap-4">
                            {tasks.map((task: any) => (
                                <button
                                    key={task.id}
                                    onClick={() => createTicketMutation.mutate(task)}
                                    disabled={createTicketMutation.isPending}
                                    className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-slate-800 bg-slate-950 hover:border-primary/50 hover:bg-primary/5 transition-all text-center group"
                                >
                                    <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <QrCode className="w-8 h-8 text-slate-400 group-hover:text-primary" />
                                    </div>
                                    <h3 className="font-bold text-white mb-1">{task.name}</h3>
                                    <Badge variant="secondary" className="font-mono text-lg">
                                        ${(task.unitPrice / 100).toFixed(2)}
                                    </Badge>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Stats & History */}
                <div className="space-y-6 flex flex-col">
                    <Card className="bg-primary/10 border-primary/20">
                        <CardContent className="p-6 text-center">
                            <p className="text-sm text-primary/80 uppercase font-black tracking-widest mb-1">Producción Hoy</p>
                            <p className="text-4xl font-black text-white">${(todayTotal / 100).toFixed(2)}</p>
                            <p className="text-xs text-slate-400 mt-2">{recentTickets.length} piezas procesadas</p>
                        </CardContent>
                    </Card>

                    <Card className="flex-1 bg-slate-900/50 border-slate-800 flex flex-col min-h-0">
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <History className="w-4 h-4" />
                                Tickets Recientes
                            </CardTitle>
                        </CardHeader>
                        <ScrollArea className="flex-1 p-4 pt-0">
                            <div className="space-y-3">
                                {recentTickets.map((t: any) => (
                                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            <div>
                                                <p className="text-sm font-medium text-slate-300">{t.taskName}</p>
                                                <p className="text-xs text-slate-600 font-mono">
                                                    {new Date(t.createdAt).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="font-mono font-bold text-white">${(t.totalAmount / 100).toFixed(2)}</span>
                                    </div>
                                ))}
                                {recentTickets.length === 0 && <p className="text-center text-slate-500 py-4">No hay tickets recientes</p>}
                            </div>
                        </ScrollArea>
                    </Card>
                </div>

            </div>
        </div>
    );
}
