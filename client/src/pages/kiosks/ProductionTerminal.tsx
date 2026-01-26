import { useState, useEffect } from "react";
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
    AlertCircle,
    ArrowLeft,
    Plus,
    Box,
    Check
} from "lucide-react";
import { KioskSession } from "@/types/kiosk";
import { cn } from "@/lib/utils";
import { getKioskHeaders } from "@/lib/kiosk-auth";

interface ProductionTerminalProps {
    sessionContext: KioskSession;
    onLogout: () => void;
}

interface Task {
    id: string;
    name: string;
    unitPrice: number;
}

interface Ticket {
    id: string;
    taskName: string;
    totalAmount: number;
    createdAt: string;
    status: string;
}

type Stage = "batch" | "task" | "quantity" | "quality" | "completed";

export default function ProductionTerminal({ sessionContext, onLogout }: ProductionTerminalProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [currentStage, setCurrentStage] = useState<Stage>("batch");
    const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [quantity, setQuantity] = useState<number>(0);

    // Fetch real batches from inventory
    const { data: batches = [] } = useQuery({
        queryKey: ["/api/production/batches"],
        queryFn: async () => {
            const res = await fetch("/api/production/batches", {
                headers: getKioskHeaders({ employeeId: sessionContext.driver?.id })
            });
            if (!res.ok) return [];
            return res.json();
        },
        refetchInterval: 30000 // Refresh every 30 seconds
    });

    // Fetch available tasks/rates from DB
    const { data: tasks = [] } = useQuery<Task[]>({
        queryKey: ["/api/piecework/tasks"],
        queryFn: async () => {
            const res = await fetch("/api/piecework/tasks", {
                headers: getKioskHeaders({ employeeId: sessionContext.driver?.id })
            });
            if (!res.ok) return [];
            return res.json();
        }
    });

    // Fetch recent tickets for this employee
    const { data: recentTickets = [] } = useQuery<Ticket[]>({
        queryKey: ["/api/piecework/tickets", sessionContext.driver?.id],
        queryFn: async () => {
            const res = await fetch(`/api/piecework/tickets?employeeId=${sessionContext.driver?.id}`, {
                headers: getKioskHeaders({ employeeId: sessionContext.driver?.id })
            });
            if (!res.ok) throw new Error("Failed to fetch history");
            return res.json();
        },
        enabled: !!sessionContext.driver?.id
    });

    const createTicketMutation = useMutation({
        mutationFn: async () => {
            if (!selectedTask || !selectedBatch) return;

            const res = await fetch("/api/piecework/tickets", {
                method: "POST",
                headers: getKioskHeaders({ employeeId: sessionContext.driver?.id }),
                body: JSON.stringify({
                    employeeId: sessionContext.driver?.id,
                    taskName: selectedTask.name,
                    quantity: quantity || 1,
                    unitPrice: selectedTask.unitPrice,
                    totalAmount: selectedTask.unitPrice * (quantity || 1),
                    organizationId: sessionContext.terminal.organizationId,
                    notes: `Procesado de Lote ${selectedBatch}`
                })
            });
            if (!res.ok) throw new Error("Error creating ticket");
            return res.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Producción Registrada",
                description: `Ticket #${data.id.slice(0, 8)} generado satisfactoriamente.`,
            });
            setCurrentStage("completed");
            queryClient.invalidateQueries({ queryKey: ["/api/piecework/tickets"] });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message || "No se pudo registrar el trabajo", variant: "destructive" });
        }
    });

    const resetWorkflow = () => {
        setCurrentStage("batch");
        setSelectedBatch(null);
        setSelectedTask(null);
        setQuantity(0);
    };

    const todayTotal = recentTickets.reduce((acc: number, t: Ticket) => acc + t.totalAmount, 0);

    return (
        <div className="h-full flex flex-col gap-6 p-6 max-w-7xl mx-auto">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-white/5 pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                        <Package className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white leading-none">Terminal de Planta</h1>
                        <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Estación: {sessionContext.terminal.location || "General"}</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-xl font-black text-white leading-none uppercase">{sessionContext.driver?.name}</p>
                        <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">IDENTIFICADO: {sessionContext.driver?.role}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onLogout} className="bg-white/5 hover:bg-destructive/20 hover:text-destructive">
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 min-h-0">
                {/* Workflow Card */}
                <Card className="lg:col-span-3 bg-white/[0.02] border-white/5 flex flex-col overflow-hidden">
                    <CardHeader className="border-b border-white/5 bg-white/[0.01]">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-xl font-black uppercase italic tracking-tight">Registro de Producción</CardTitle>
                                <CardDescription className="text-slate-500 text-xs uppercase tracking-widest">Flujo Cognitivo Peladero</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                {["batch", "task", "quantity", "completed"].map((s, i) => (
                                    <div
                                        key={s}
                                        className={cn(
                                            "w-2.5 h-2.5 rounded-full transition-all duration-500",
                                            currentStage === s ? "bg-primary scale-125 glow" : i < ["batch", "task", "quantity", "completed"].indexOf(currentStage) ? "bg-success" : "bg-white/10"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 p-8 overflow-y-auto">
                        {currentStage === "batch" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <h2 className="text-4xl font-black tracking-tight uppercase">Seleccione Lote</h2>
                                {batches.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <Box className="w-16 h-16 mx-auto mb-4 text-slate-700" />
                                        <p className="text-slate-500">No hay lotes disponibles</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {batches.map((batch: any) => (
                                            <button
                                                key={batch.id}
                                                onClick={() => {
                                                    setSelectedBatch(batch.id);
                                                    setCurrentStage("task");
                                                }}
                                                className="group relative p-8 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                                            >
                                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                                    <Box className="w-6 h-6 text-slate-400 group-hover:text-primary" />
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{batch.id}</p>
                                                <h3 className="text-xl font-black text-white uppercase leading-tight group-hover:text-primary transition-colors">{batch.name}</h3>
                                                <Badge variant="outline" className="mt-4 border-slate-700 text-slate-400 text-[9px] font-bold uppercase tracking-widest">{batch.quality}</Badge>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {currentStage === "task" && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="flex items-center gap-4">
                                    <Button variant="ghost" size="icon" onClick={() => setCurrentStage("batch")} className="rounded-full bg-white/5">
                                        <ArrowLeft className="w-5 h-5" />
                                    </Button>
                                    <h2 className="text-4xl font-black tracking-tight uppercase">Seleccione Proceso</h2>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {tasks.map((task) => (
                                        <button
                                            key={task.id}
                                            onClick={() => {
                                                setSelectedTask(task);
                                                setCurrentStage("quantity");
                                            }}
                                            className="group p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-accent/50 hover:bg-accent/5 transition-all text-center"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-slate-900 mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <QrCode className="w-8 h-8 text-slate-400 group-hover:text-accent" />
                                            </div>
                                            <h3 className="font-bold text-white uppercase text-sm mb-2 group-hover:text-accent transition-colors">{task.name}</h3>
                                            <p className="text-lg font-black font-mono text-accent/80">${(task.unitPrice / 100).toFixed(2)}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {currentStage === "quantity" && selectedTask && (
                            <div className="h-full flex flex-col justify-center max-w-md mx-auto space-y-12 animate-in fade-in zoom-in-95 duration-500">
                                <div className="text-center space-y-4">
                                    <h2 className="text-4xl font-black tracking-tight uppercase">Ingresar Cantidad</h2>
                                    <p className="text-slate-500 uppercase tracking-widest text-xs font-bold">Procesando {selectedTask.name} del {selectedBatch}</p>
                                </div>

                                <div className="relative">
                                    <input
                                        type="number"
                                        value={quantity || ""}
                                        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                                        className="w-full bg-black/50 border-2 border-primary/20 rounded-[40px] p-12 text-7xl font-black font-mono text-center text-primary outline-none focus:border-primary glow-sm"
                                        placeholder="0"
                                        autoFocus
                                    />
                                    <div className="absolute right-10 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-800 uppercase italic underline decoration-primary/30 decoration-4">UNIDADES</div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={() => setCurrentStage("task")}
                                        className="h-20 rounded-3xl border-white/10 text-xl font-bold uppercase tracking-widest"
                                    >
                                        Atrás
                                    </Button>
                                    <Button
                                        size="lg"
                                        disabled={quantity <= 0 || createTicketMutation.isPending}
                                        onClick={() => createTicketMutation.mutate()}
                                        className="h-20 rounded-3xl bg-primary hover:bg-primary/90 text-2xl font-black uppercase tracking-widest glow"
                                    >
                                        {createTicketMutation.isPending ? "Grabando..." : "Confirmar"}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {currentStage === "completed" && (
                            <div className="h-full flex flex-col items-center justify-center space-y-12 animate-in fade-in zoom-in-95 duration-700">
                                <div className="relative">
                                    <div className="w-48 h-48 rounded-full bg-success/10 flex items-center justify-center animate-pulse">
                                        <CheckCircle2 className="w-24 h-24 text-success drop-shadow-glow" />
                                    </div>
                                    <div className="absolute -inset-4 border-2 border-dashed border-success/30 rounded-full animate-spin-slow" />
                                </div>

                                <div className="text-center space-y-4">
                                    <h2 className="text-5xl font-black tracking-tight uppercase italic">¡Registro Exitoso!</h2>
                                    <p className="text-slate-400 uppercase tracking-widest font-bold">Ticket de trabajo enviado a cola de impresión.</p>
                                </div>

                                <div className="flex gap-6">
                                    <Button
                                        size="lg"
                                        onClick={resetWorkflow}
                                        className="h-24 px-12 rounded-[40px] bg-white text-black hover:bg-slate-200 text-2xl font-black uppercase tracking-tighter italic shadow-xl"
                                    >
                                        Nueva Entrada <Plus className="w-8 h-8 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sidebar Stats */}
                <aside className="space-y-6 flex flex-col">
                    <Card className="bg-primary/5 border-primary/20 p-8 text-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <TrendingUp className="w-20 h-20 -mr-4 -mt-4" />
                        </div>
                        <p className="text-[10px] text-primary font-black uppercase tracking-[0.3em] mb-4">Ingresos Hoy</p>
                        <p className="text-5xl font-black text-white font-mono tracking-tighter tabular-nums">${(todayTotal / 100).toFixed(2)}</p>
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <Badge className="bg-success/20 text-success border-success/30 px-3 py-1 font-bold text-[10px] uppercase">ACTIVO</Badge>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{recentTickets.length} REGISTROS</span>
                        </div>
                    </Card>

                    <Card className="flex-1 bg-white/[0.01] border-white/5 flex flex-col min-h-0">
                        <CardHeader className="py-6 border-b border-white/5">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xs flex items-center gap-2 font-black uppercase tracking-widest">
                                    <History className="w-4 h-4 text-primary" /> Historial Reciente
                                </CardTitle>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                                    <Printer className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <ScrollArea className="flex-1 p-0">
                            <div className="divide-y divide-white/5">
                                {recentTickets.map((t) => (
                                    <div key={t.id} className="p-4 hover:bg-white/[0.03] transition-colors flex items-center justify-between group">
                                        <div className="space-y-1">
                                            <p className="font-bold text-xs text-white uppercase tracking-tight">{t.taskName}</p>
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-white/5 text-[9px] text-slate-500 border-none px-1 h-4">{t.id.slice(0, 8)}</Badge>
                                                <span className="text-[9px] text-slate-600 font-bold">{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                        <span className="font-mono font-bold text-sm text-white group-hover:text-primary transition-colors">${(t.totalAmount / 100).toFixed(2)}</span>
                                    </div>
                                ))}
                                {recentTickets.length === 0 && (
                                    <div className="p-20 text-center opacity-20">
                                        <Package className="w-12 h-12 mx-auto mb-4" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest">Sin registros recientes</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </Card>
                </aside>
            </div>
        </div>
    );
}

// Reuse Printer logic if needed or extend with Capacitor for hardware.
import { TrendingUp } from "lucide-react";
