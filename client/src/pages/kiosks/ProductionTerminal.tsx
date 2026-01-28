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

type Stage = "batch" | "task" | "quantity" | "completed";

export default function ProductionTerminal({ sessionContext, onLogout }: ProductionTerminalProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [currentStage, setCurrentStage] = useState<Stage>("batch");
    const [selectedInstance, setSelectedInstance] = useState<ProcessInstance | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [quantity, setQuantity] = useState<number>(0);
    const [isStartBatchOpen, setIsStartBatchOpen] = useState(false);
    const [selectedProcessId, setSelectedProcessId] = useState<string>("");

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
        mutationFn: async () => {
            if (!selectedTask || !selectedInstance) return;

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
                    batchId: selectedInstance.id,
                    notes: `Producción en Lote ${selectedInstance.processName}`
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
            setCurrentStage("completed");
            queryClient.invalidateQueries({ queryKey: ["/api/piecework/tickets"] });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message || "No se pudo registrar", variant: "destructive" });
        }
    });

    const resetWorkflow = () => {
        setCurrentStage("batch");
        setSelectedInstance(null);
        setSelectedTask(null);
        setQuantity(0);
    };

    const totalPiecesToday = recentTickets.reduce((acc, t) => acc + (t.quantity || 0), 0);

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
                        {["batch", "task", "quantity", "completed"].map((s, i) => (
                            <div
                                key={s}
                                className={cn(
                                    "flex-1 h-1 rounded-full transition-all duration-700",
                                    currentStage === s ? "bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]" :
                                        ["batch", "task", "quantity", "completed"].indexOf(currentStage) > i ? "bg-emerald-500" : "bg-white/5"
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
                                                    setCurrentStage("task");
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

                        {currentStage === "task" && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <h2 className="text-6xl font-black tracking-tight uppercase italic leading-tight">Actividad <br /><span className="text-primary underline decoration-primary/20">de Destajo</span></h2>
                                        <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-xs">¿Qué labor completó en {selectedInstance?.processName}?</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setCurrentStage("batch")} className="h-20 w-20 rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/5 group">
                                        <ArrowLeft className="w-8 h-8 group-hover:-translate-x-2 transition-transform" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {tasks.map((task) => (
                                        <button
                                            key={task.id}
                                            onClick={() => {
                                                setSelectedTask(task);
                                                setCurrentStage("quantity");
                                            }}
                                            className="group flex items-center gap-6 p-10 rounded-[40px] bg-white/[0.02] border border-white/5 hover:border-accent/40 hover:bg-accent/5 transition-all duration-500 text-left"
                                        >
                                            <div className="w-20 h-20 rounded-[28px] bg-slate-900 border border-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-accent/20 transition-all duration-500">
                                                <QrCode className="w-10 h-10 text-slate-500 group-hover:text-accent transition-colors" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter group-hover:text-accent transition-colors">{task.name}</h3>
                                                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em] mt-1">OPERACIÓN REGULADA</p>
                                            </div>
                                            <ChevronRight className="w-8 h-8 text-slate-800 group-hover:text-accent transition-all" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {currentStage === "quantity" && selectedTask && (
                            <div className="h-full flex flex-col justify-center max-w-2xl mx-auto space-y-12 animate-in fade-in zoom-in-95 duration-700">
                                <div className="text-center space-y-8">
                                    <h2 className="text-8xl font-black tracking-tighter uppercase italic leading-none">Reportar <br /><span className="text-primary italic">Volumen</span></h2>
                                    <div className="flex items-center justify-center gap-6">
                                        <Badge className="bg-white/5 text-slate-400 border-white/10 h-10 px-8 uppercase text-[12px] font-black tracking-[0.3em] rounded-full">{selectedTask.name}</Badge>
                                        <span className="text-slate-800 text-3xl opacity-20">/</span>
                                        <Badge className="bg-white/5 text-slate-400 border-white/10 h-10 px-8 uppercase text-[12px] font-black tracking-[0.3em] rounded-full">LOTE: {selectedInstance?.processName}</Badge>
                                    </div>
                                </div>

                                <div className="relative group p-6 rounded-[60px] bg-black/40 border-2 border-white/5 focus-within:border-primary/50 transition-all duration-700 shadow-3xl">
                                    <input
                                        type="number"
                                        value={quantity || ""}
                                        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                                        className="w-full bg-transparent p-12 text-[12rem] font-black font-mono text-center text-white outline-none caret-primary leading-none"
                                        placeholder="0"
                                        autoFocus
                                    />
                                    <div className="absolute right-16 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-800 uppercase italic tracking-widest pointer-events-none opacity-40">
                                        PIEZAS
                                    </div>
                                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
                                        {[10, 50, 100, 500].map(val => (
                                            <button
                                                key={val}
                                                onClick={() => setQuantity(q => q + val)}
                                                className="h-16 px-10 rounded-full bg-white/5 border border-white/10 hover:bg-primary hover:text-black font-black text-xl transition-all shadow-xl active:scale-90"
                                            >
                                                +{val}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-10 pt-16">
                                    <Button
                                        variant="ghost"
                                        size="lg"
                                        onClick={() => setCurrentStage("task")}
                                        className="h-28 rounded-[40px] border-2 border-white/5 text-2xl font-black uppercase tracking-tighter hover:bg-white/5 transition-all text-slate-500"
                                    >
                                        Regresar
                                    </Button>
                                    <Button
                                        size="lg"
                                        disabled={quantity <= 0 || createTicketMutation.isPending}
                                        onClick={() => createTicketMutation.mutate()}
                                        className="h-28 rounded-[40px] bg-primary hover:bg-primary/90 text-black text-4xl font-black uppercase tracking-tighter italic shadow-2xl transition-all active:scale-95"
                                    >
                                        {createTicketMutation.isPending ? (
                                            <Loader2 className="w-12 h-12 animate-spin" />
                                        ) : (
                                            <>REGISTRAR <Plus className="w-12 h-12 ml-4 stroke-[4]" /></>
                                        )}
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
