import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
    Printer,
    CheckCircle2,
    Package,
    QrCode,
    LogOut,
    History,
    ArrowLeft,
    Plus,
    Box,
    TrendingUp,
    ChevronRight,
    Loader2,
    Settings,
    Play,
    StopCircle,
    Activity,
    AlertTriangle,
    X,
    Info
} from "lucide-react";
import { KioskSession } from "@/types/kiosk";
import { cn } from "@/lib/utils";
import { getKioskHeaders } from "@/lib/kiosk-auth";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ProductionTerminalProps {
    sessionContext: KioskSession;
    onLogout: () => void;
}

interface Ticket {
    id: string;
    taskName: string;
    totalAmount: number;
    createdAt: string;
    status: string;
    quantity: number;
}

interface ProcessInstance {
    id: string;
    processId: string;
    processName: string;
    status: string;
    startedAt: string;
}

interface Process {
    id: string;
    name: string;
    description: string;
}

interface Employee {
    id: string;
    name: string;
    role: string;
}

type Stage = "batch" | "report" | "completed";

export default function ProductionTerminal({ sessionContext, onLogout }: ProductionTerminalProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [currentStage, setCurrentStage] = useState<Stage>("batch");
    const [selectedInstance, setSelectedInstance] = useState<ProcessInstance | null>(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [quantity, setQuantity] = useState<number>(0);
    const [isStartBatchOpen, setIsStartBatchOpen] = useState(false);
    const [selectedProcessId, setSelectedProcessId] = useState<string>("");
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [isFinishBatchOpen, setIsFinishBatchOpen] = useState(false);
    const [closureData, setClosureData] = useState({ yields: 0, notes: "" });

    // Realtime Reactivity
    useRealtimeSubscription({
        table: 'piecework_tickets',
        queryKeyToInvalidate: ["/api/piecework/tickets", "recent-production"]
    });

    useRealtimeSubscription({
        table: 'process_instances',
        queryKeyToInvalidate: ["/api/production/instances"]
    });

    // Fetch active manufacturing instances (Lotes en Planta)
    const { data: activeInstances = [] } = useQuery<ProcessInstance[]>({
        queryKey: ["/api/production/instances"],
        queryFn: async () => {
            const res = await fetch("/api/production/instances", {
                headers: getKioskHeaders({ employeeId: sessionContext.driver?.id })
            });
            if (!res.ok) return [];
            return res.json();
        }
    });

    // Fetch process definitions for supervisors
    const { data: availableProcesses = [] } = useQuery<Process[]>({
        queryKey: ["/api/production/processes"],
        queryFn: async () => {
            const res = await fetch("/api/production/processes", {
                headers: getKioskHeaders({ employeeId: sessionContext.driver?.id })
            });
            if (!res.ok) return [];
            return res.json();
        }
    });

    // Fetch tickets for the current batch to show progress
    const { data: batchTickets = [] } = useQuery<Ticket[]>({
        queryKey: ["/api/piecework/tickets", "batch", selectedInstance?.id],
        queryFn: async () => {
            if (!selectedInstance) return [];
            const res = await fetch(`/api/piecework/tickets?batchId=${selectedInstance.id}`, {
                headers: getKioskHeaders({ employeeId: sessionContext.driver?.id })
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!selectedInstance
    });

    // Realtime invalidation for batch tickets
    useRealtimeSubscription({
        table: 'piecework_tickets',
        queryKeyToInvalidate: ["/api/piecework/tickets", "batch", selectedInstance?.id]
    });

    // Fetch all employees for selection
    const { data: employees = [] } = useQuery<Employee[]>({
        queryKey: ["/api/hr/employees"],
        queryFn: async () => {
            const res = await fetch("/api/hr/employees", {
                headers: getKioskHeaders({ employeeId: sessionContext.driver?.id })
            });
            if (!res.ok) return [];
            return res.json();
        }
    });

    // Fetch recent tickets
    const { data: recentTickets = [] } = useQuery<Ticket[]>({
        queryKey: ["/api/piecework/tickets", "recent-production"],
        queryFn: async () => {
            const res = await fetch(`/api/piecework/tickets?limit=10`, {
                headers: getKioskHeaders({ employeeId: sessionContext.driver?.id })
            });
            if (!res.ok) throw new Error("Failed to fetch history");
            return res.json();
        }
    });

    const createInstanceMutation = useMutation({
        mutationFn: async (processId: string) => {
            const res = await fetch("/api/production/instances", {
                method: "POST",
                headers: getKioskHeaders({ employeeId: sessionContext.driver?.id }),
                body: JSON.stringify({ processId })
            });
            if (!res.ok) throw new Error("Fallo al iniciar lote");
            return res.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Lote Iniciado",
                description: `Nuevo lote #${data.id.slice(0, 6)} ha sido creado.`,
            });
            setIsStartBatchOpen(false);
            queryClient.invalidateQueries({ queryKey: ["/api/production/instances"] });
        }
    });

    const createTicketMutation = useMutation({
        mutationFn: async ({ empId, qty }: { empId: string, qty: number }) => {
            if (!selectedInstance) return;

            const res = await fetch("/api/production/report", {
                method: "POST",
                headers: getKioskHeaders({ employeeId: sessionContext.driver?.id }),
                body: JSON.stringify({
                    employeeId: empId,
                    instanceId: selectedInstance.id,
                    quantity: qty
                })
            });
            if (!res.ok) throw new Error("Error creating ticket");
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Producción Registrada",
                description: `Ticket generado satisfactoriamente.`,
            });
            // We don't change stage here, we stay in 'report' to allow more entries
            queryClient.invalidateQueries({ queryKey: ["/api/piecework/tickets"] });
            setQuantity(0);
            setSelectedEmployeeId(null);
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message || "No se pudo registrar", variant: "destructive" });
        }
    });

    const finishBatchMutation = useMutation({
        mutationFn: async () => {
            if (!selectedInstance) return;
            const res = await fetch(`/api/production/instances/${selectedInstance.id}/finish`, {
                method: "POST",
                headers: getKioskHeaders({ employeeId: sessionContext.driver?.id }),
                body: JSON.stringify({
                    yields: closureData.yields,
                    notes: closureData.notes
                })
            });
            if (!res.ok) throw new Error("Error al finalizar lote");
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Lote Finalizado",
                description: "El lote ha sido cerrado y el inventario actualizado.",
            });
            setIsFinishBatchOpen(false);
            setCurrentStage("completed");
            queryClient.invalidateQueries({ queryKey: ["/api/production/instances"] });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message || "Fallo al finalizar", variant: "destructive" });
        }
    });

    const resetWorkflow = () => {
        setCurrentStage("batch");
        setSelectedInstance(null);
        setSelectedEmployeeId(null);
        setQuantity(0);
    };

    const totalPiecesToday = recentTickets.reduce((acc, t) => acc + (t.quantity || 0), 0);
    const filteredEmployees = employees.filter(e =>
        e.name.toLowerCase().includes(employeeSearch.toLowerCase())
    );

    // Calculate totals per employee in this batch
    const batchTotals = batchTickets.reduce((acc: Record<string, number>, t: any) => {
        acc[t.employeeId] = (acc[t.employeeId] || 0) + t.quantity;
        return acc;
    }, {});

    return (
        <div className="h-[100vh] w-full bg-[#020202] text-white selection:bg-primary/30 p-4 md:p-8 flex flex-col gap-6 overflow-hidden">
            {/* Ultra Modern Header */}
            <header className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-white/5">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[22px] bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(var(--primary),0.2)]">
                        <Activity className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                            Producción <span className="text-slate-500">Inteligente</span>
                        </h1>
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 bg-emerald-500/5 uppercase text-[9px] font-black tracking-widest px-2 py-0.5">
                                Estación: {sessionContext.terminal.location || "PLANTA PRAL"}
                            </Badge>
                            <span className="w-1 h-1 rounded-full bg-white/10" />
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">SISTEMA EN TIEMPO REAL</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 p-2 pr-6 rounded-[25px] bg-white/[0.02] border border-white/5">
                    <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center overflow-hidden">
                        <div className="text-lg font-black text-primary">{sessionContext.driver?.name?.charAt(0)}</div>
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-black text-white uppercase italic leading-none">{sessionContext.driver?.name}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">ROL: {sessionContext.driver?.role || "OPERADOR"}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onLogout}
                        className="ml-4 h-10 w-10 rounded-xl hover:bg-red-500/20 hover:text-red-500 transition-all duration-300"
                    >
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </header>

            {/* Main Area */}
            <div className="grid grid-cols-12 gap-8 flex-1 min-h-0">
                {/* Workflow Control */}
                <Card className="col-span-12 lg:col-span-8 bg-white/[0.01] border-white/5 rounded-[50px] flex flex-col overflow-hidden shadow-2xl relative">
                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 flex gap-2 px-10 pt-6 z-10">
                        {["batch", "report", "completed"].map((s, i) => (
                            <div
                                key={s}
                                className={cn(
                                    "flex-1 h-1 rounded-full transition-all duration-700",
                                    currentStage === s ? "bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]" :
                                        ["batch", "report", "completed"].indexOf(currentStage) > i ? "bg-emerald-500" : "bg-white/5"
                                )}
                            />
                        ))}
                    </div>

                    <CardContent className="flex-1 p-12 pt-24 overflow-y-auto custom-scrollbar">
                        {currentStage === "batch" && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <h2 className="text-6xl font-black tracking-tight uppercase italic leading-tight">Lotes <br /><span className="text-primary underline decoration-primary/20">en Proceso</span></h2>
                                        <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-xs">Seleccione el lote activo para reportar</p>
                                    </div>

                                    {/* SUPERVISOR ACTION: START BATCH */}
                                    <Dialog open={isStartBatchOpen} onOpenChange={setIsStartBatchOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="h-20 px-8 rounded-3xl bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase italic tracking-tighter text-xl shadow-xl shadow-emerald-500/10 gap-4">
                                                <Play className="w-6 h-6 fill-black" /> NUEVO LOTE
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-[#0a0a0a] border-white/10 text-white rounded-[40px] max-w-xl p-0 overflow-hidden shadow-3xl">
                                            <div className="p-10 space-y-10">
                                                <DialogHeader>
                                                    <div className="flex items-center justify-between">
                                                        <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-emerald-500">Iniciar Nuevo Lote</DialogTitle>
                                                        <Button variant="ghost" size="icon" onClick={() => setIsStartBatchOpen(false)} className="rounded-full h-12 w-12 bg-white/5">
                                                            <X className="w-6 h-6" />
                                                        </Button>
                                                    </div>
                                                </DialogHeader>

                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-2">Proceso a Ejecutar</label>
                                                    <Select value={selectedProcessId} onValueChange={setSelectedProcessId}>
                                                        <SelectTrigger className="h-20 bg-white/5 border-white/10 rounded-3xl text-xl font-bold px-8 focus:ring-emerald-500 transition-all">
                                                            <SelectValue placeholder="Seleccionar Proceso" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-white/10 text-white rounded-2xl">
                                                            {availableProcesses.map(p => (
                                                                <SelectItem key={p.id} value={p.id} className="h-14 text-lg font-bold">
                                                                    {p.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[30px] p-8 flex gap-6">
                                                    <Info className="w-8 h-8 text-emerald-500 shrink-0" />
                                                    <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-widest">
                                                        El sistema generará automáticamente un ID de Lote único y comenzará el tracking de tiempo real.
                                                    </p>
                                                </div>

                                                <Button
                                                    onClick={() => createInstanceMutation.mutate(selectedProcessId)}
                                                    disabled={!selectedProcessId || createInstanceMutation.isPending}
                                                    className="w-full h-24 bg-emerald-500 hover:bg-emerald-400 text-black text-2xl font-black uppercase italic tracking-tighter rounded-[35px] shadow-2xl shadow-emerald-500/20"
                                                >
                                                    {createInstanceMutation.isPending ? <Loader2 className="w-10 h-10 animate-spin" /> : "Iniciar Producción"}
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>

                                {activeInstances.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 bg-white/[0.01] rounded-[50px] border-2 border-dashed border-white/5">
                                        <AlertTriangle className="w-20 h-20 text-slate-800 mb-6" />
                                        <p className="font-black uppercase tracking-[0.5em] text-slate-700 italic text-sm">No hay lotes activos en planta</p>
                                        <p className="text-[10px] text-slate-800 font-bold uppercase mt-4">Inicie un proceso para comenzar el registro</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {activeInstances.map((instance) => (
                                            <button
                                                key={instance.id}
                                                onClick={() => {
                                                    setSelectedInstance(instance);
                                                    setCurrentStage("report");
                                                }}
                                                className="group relative p-10 rounded-[45px] bg-white/[0.02] border border-white/5 hover:border-primary/50 hover:bg-primary/5 transition-all duration-500 text-left overflow-hidden shadow-lg"
                                            >
                                                <div className="absolute -top-10 -right-10 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                                                    <Box className="w-64 h-64 rotate-12" />
                                                </div>
                                                <div className="relative z-10 space-y-6">
                                                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-500 border border-white/5">
                                                        <Activity className="w-8 h-8 text-slate-500 group-hover:text-primary transition-colors" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">ID SESIÓN: {instance.id.slice(0, 8)}</p>
                                                        <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter group-hover:text-primary transition-colors">{instance.processName}</h3>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{instance.status}</span>
                                                        </div>
                                                        <ChevronRight className="w-6 h-6 text-slate-800 group-hover:text-primary group-hover:translate-x-2 transition-all" />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {currentStage === "report" && selectedInstance && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700 flex flex-col h-full">
                                <div className="flex items-center justify-between shrink-0">
                                    <div className="space-y-2">
                                        <h2 className="text-6xl font-black tracking-tight uppercase italic leading-tight">Reporte <br /><span className="text-primary underline decoration-primary/20">de Lote</span></h2>
                                        <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-xs">Estableciendo producción para: {selectedInstance.processName}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="relative group">
                                            <input
                                                placeholder="BUSCAR EMPLEADO..."
                                                value={employeeSearch}
                                                onChange={(e) => setEmployeeSearch(e.target.value)}
                                                className="h-20 bg-white/5 border border-white/10 rounded-3xl px-8 w-80 text-lg font-bold focus:outline-none focus:border-primary/50 transition-all uppercase italic tracking-tighter"
                                            />
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => setCurrentStage("batch")} className="h-20 w-20 rounded-3xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 group">
                                            <ArrowLeft className="w-8 h-8 group-hover:-translate-x-2 transition-transform" />
                                        </Button>
                                    </div>
                                </div>

                                <ScrollArea className="flex-1 -mx-4 px-4 custom-scrollbar">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                                        {filteredEmployees.map((emp) => (
                                            <div
                                                key={emp.id}
                                                className={cn(
                                                    "group p-8 rounded-[40px] border transition-all duration-500 flex flex-col gap-6",
                                                    selectedEmployeeId === emp.id
                                                        ? "bg-primary/10 border-primary/50"
                                                        : "bg-white/[0.02] border-white/5 hover:border-white/20"
                                                )}
                                            >
                                                <div className="flex items-center gap-6">
                                                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center">
                                                        <div className="text-xl font-black text-primary uppercase">{emp.name.charAt(0)}</div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-lg font-black text-white uppercase italic tracking-tighter truncate">{emp.name}</h3>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">Total: {batchTotals[emp.id] || 0} pza</p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        onClick={() => setSelectedEmployeeId(selectedEmployeeId === emp.id ? null : emp.id)}
                                                        variant="ghost"
                                                        className="h-14 w-14 rounded-2xl bg-white/5"
                                                    >
                                                        {selectedEmployeeId === emp.id ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                                                    </Button>
                                                </div>

                                                {selectedEmployeeId === emp.id && (
                                                    <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                                                        <div className="flex items-center gap-4">
                                                            <input
                                                                type="number"
                                                                value={quantity || ""}
                                                                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                                                                className="flex-1 h-20 bg-black/40 border border-white/10 rounded-2xl p-6 text-4xl font-mono font-black text-center outline-none focus:border-primary transition-all"
                                                                placeholder="0"
                                                                autoFocus
                                                            />
                                                            <Button
                                                                onClick={() => createTicketMutation.mutate({ empId: emp.id, qty: quantity })}
                                                                disabled={quantity <= 0 || createTicketMutation.isPending}
                                                                className="h-20 px-8 rounded-2xl bg-primary text-black font-black uppercase italic tracking-tighter text-xl"
                                                            >
                                                                {createTicketMutation.isPending ? <Loader2 className="w-8 h-8 animate-spin" /> : "REGISTRAR"}
                                                            </Button>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {[10, 50, 100].map(v => (
                                                                <Button
                                                                    key={v}
                                                                    variant="outline"
                                                                    onClick={() => setQuantity(v)}
                                                                    className="flex-1 h-12 rounded-xl border-white/5 hover:bg-primary/20 text-[10px] font-black"
                                                                >
                                                                    {v} PCS
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>

                                <div className="absolute bottom-4 right-4 flex gap-4">
                                    <Dialog open={isFinishBatchOpen} onOpenChange={setIsFinishBatchOpen}>
                                        <DialogTrigger asChild>
                                            <Button
                                                className="h-20 px-10 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500 font-black uppercase italic tracking-tighter text-xl hover:bg-red-500 hover:text-white transition-all shadow-2xl"
                                            >
                                                FINALIZAR LOTE <StopCircle className="w-6 h-6 ml-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-[#0a0a0a]/95 border-white/10 text-white backdrop-blur-3xl rounded-[40px] p-12 max-w-2xl">
                                            <DialogHeader className="space-y-6">
                                                <DialogTitle className="text-5xl font-black italic uppercase tracking-tighter">Cierre de <span className="text-primary">Producción</span></DialogTitle>
                                                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Reporta el rendimiento final para cerrar este lote</p>
                                            </DialogHeader>

                                            <div className="space-y-10 py-10">
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">RENDIMIENTO TOTAL (PIEZAS/KG)</label>
                                                    <input
                                                        type="number"
                                                        value={closureData.yields || ""}
                                                        onChange={(e) => setClosureData({ ...closureData, yields: parseInt(e.target.value) || 0 })}
                                                        className="w-full h-24 bg-white/5 border border-white/10 rounded-3xl px-10 text-5xl font-mono font-black text-primary outline-none focus:border-primary/50 transition-all"
                                                        placeholder="0"
                                                    />
                                                </div>

                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">NOTAS DE CIERRE</label>
                                                    <textarea
                                                        value={closureData.notes}
                                                        onChange={(e) => setClosureData({ ...closureData, notes: e.target.value })}
                                                        className="w-full h-32 bg-white/5 border border-white/10 rounded-3xl p-8 text-lg font-bold outline-none focus:border-primary/50 transition-all resize-none"
                                                        placeholder="OBSERVACIONES DEL TURNO..."
                                                    />
                                                </div>

                                                <Button
                                                    onClick={() => finishBatchMutation.mutate()}
                                                    disabled={finishBatchMutation.isPending}
                                                    className="w-full h-28 rounded-[35px] bg-primary text-black text-3xl font-black uppercase italic tracking-tighter shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
                                                >
                                                    {finishBatchMutation.isPending ? <Loader2 className="w-10 h-10 animate-spin" /> : "CONFIRMAR CIERRE"}
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>

                                    <Button
                                        onClick={() => setCurrentStage("completed")}
                                        className="h-20 px-10 rounded-3xl bg-emerald-500 text-black font-black uppercase italic tracking-tighter text-xl shadow-2xl"
                                    >
                                        VER RESUMEN <CheckCircle2 className="w-6 h-6 ml-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {currentStage === "completed" && (
                            <div className="h-full flex flex-col items-center justify-center space-y-12 animate-in fade-in zoom-in-95 duration-1000">
                                <div className="relative">
                                    <div className="w-80 h-80 rounded-full bg-emerald-500/10 flex items-center justify-center animate-pulse border-2 border-emerald-500/20 shadow-[0_0_100px_rgba(16,185,129,0.1)]">
                                        <CheckCircle2 className="w-40 h-40 text-emerald-500 drop-shadow-[0_0_50px_rgba(16,185,129,0.5)]" />
                                    </div>
                                    <div className="absolute -inset-10 border-4 border-dashed border-emerald-500/10 rounded-full animate-spin-slow opacity-30" />
                                </div>

                                <div className="text-center space-y-6">
                                    <h2 className="text-8xl font-black tracking-tighter uppercase italic leading-none">¡ÉXITO <br /> <span className="text-primary italic">TOTAL!</span></h2>
                                    <p className="text-slate-600 uppercase tracking-[0.5em] font-black text-sm">Registro sincronizado con el núcleo financiero</p>
                                </div>

                                <Button
                                    size="lg"
                                    onClick={resetWorkflow}
                                    className="h-36 px-24 rounded-[60px] bg-white text-black hover:bg-slate-200 text-4xl font-black uppercase tracking-tighter italic shadow-3xl transition-all hover:scale-105 active:scale-95"
                                >
                                    NUEVO REGISTRO <Plus className="w-12 h-12 ml-8 stroke-[4]" />
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sidebar Stats & History */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-8 min-h-0">
                    <Card className="bg-primary/5 border-primary/20 p-12 rounded-[50px] relative overflow-hidden group shadow-2xl flex-shrink-0">
                        <div className="absolute -top-10 -right-10 p-8 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                            <TrendingUp className="w-64 h-64" />
                        </div>
                        <div className="relative z-10 space-y-6">
                            <p className="text-[12px] text-primary font-black uppercase tracking-[0.6em]">PRODUCCIÓN HOY</p>
                            <div className="flex items-baseline gap-4">
                                <h2 className="text-9xl font-black text-white font-mono tracking-tighter tabular-nums leading-none">{totalPiecesToday}</h2>
                                <span className="text-2xl font-black text-slate-700 uppercase italic">PCS</span>
                            </div>
                            <div className="flex items-center gap-4 pt-4">
                                <div className="flex h-3 w-3 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </div>
                                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em]">NÚCLEO FINANCIERO CONECTADO</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="flex-1 bg-white/[0.01] border-white/5 rounded-[50px] flex flex-col min-h-0 shadow-2xl relative overflow-hidden">
                        <CardHeader className="p-10 pb-8 border-b border-white/5 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xs font-black uppercase tracking-[0.5em] text-slate-600 flex items-center gap-4">
                                    <History className="w-5 h-5 text-primary" /> ACTIVIDAD RECIENTE
                                </CardTitle>
                            </div>
                            <Button variant="ghost" size="icon" className="h-12 w-12 bg-white/5 rounded-2xl border border-white/10 hover:bg-primary hover:text-black transition-all">
                                <Printer className="w-6 h-6" />
                            </Button>
                        </CardHeader>
                        <ScrollArea className="flex-1 p-0 overflow-y-auto custom-scrollbar">
                            <div className="divide-y divide-white/5">
                                {recentTickets.map((t) => (
                                    <div key={t.id} className="p-10 hover:bg-white/[0.02] transition-colors flex items-center justify-between group">
                                        <div className="space-y-2">
                                            <p className="font-black text-xl text-white uppercase italic tracking-tighter group-hover:text-primary transition-colors leading-none">{t.taskName}</p>
                                            <div className="flex items-center gap-4">
                                                <Badge className="bg-white/5 text-[10px] text-slate-600 border-none px-3 h-5 font-black uppercase rounded-full">#{t.id.slice(0, 5)}</Badge>
                                                <span className="text-[10px] text-slate-800 font-bold uppercase tracking-widest">{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block font-black text-3xl text-white font-mono leading-none">{t.quantity}</span>
                                            <span className="text-[10px] text-slate-700 font-black uppercase tracking-widest mt-1 inline-block">UNIDADES</span>
                                        </div>
                                    </div>
                                ))}
                                {recentTickets.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-24 opacity-10">
                                        <Activity className="w-24 h-24 mb-6" />
                                        <p className="text-[12px] font-black uppercase tracking-[0.5em]">Sin actividad reciente</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                        {/* Shadow Gradient for bottom fade */}
                        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#020202] to-transparent pointer-events-none" />
                    </Card>
                </div>
            </div>
        </div>
    );
}
