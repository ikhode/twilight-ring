import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
    Loader2,
    LogOut,
    Play,
    StopCircle,
    Coffee,
    Utensils,
    Hammer,
    ArrowRight,
    CheckCircle2,
    AlertTriangle,
    Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface OperatorTerminalProps {
    employee: any; // Extended with activeLog
    terminal: any;
    onLogout: () => void;
}

export default function OperatorTerminal({ employee, terminal, onLogout }: OperatorTerminalProps) {
    const queryClient = useQueryClient();
    const [actionLoading, setActionLoading] = useState(false);
    const [view, setView] = useState<'home' | 'select-task'>('home');
    const [selectedType, setSelectedType] = useState<string>('production');

    // Timer Logic
    const [elapsed, setElapsed] = useState("00:00:00");
    useEffect(() => {
        if (!employee.activeLog) return;
        const interval = setInterval(() => {
            const start = new Date(employee.activeLog.startedAt).getTime();
            const now = new Date().getTime();
            const diff = now - start;

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);
        return () => clearInterval(interval);
    }, [employee.activeLog]);

    // Fetch Options
    const { data: options } = useQuery({
        queryKey: [`/api/kiosks/${terminal.id}/production-options`],
        queryFn: async () => {
            const res = await fetch(`/api/kiosks/${terminal.id}/production-options`);
            if (!res.ok) return { tasks: [], batches: [] };
            return res.json();
        },
        enabled: view === 'select-task'
    });

    const actionMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await fetch("/api/kiosks/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    terminalId: terminal.id,
                    employeeId: employee.id,
                    ...payload
                })
            });
            if (!res.ok) throw new Error("Action failed");
            return res.json();
        },
        onSuccess: (data) => {
            // Reload page or re-identify logic? 
            // Best is to call onLogout to force re-scan for security OR just update state if we want persistent session.
            // Kiosk usually logs out after action for security.
            // But for "Start" -> "Stop", maybe we stay? 
            // "Iniciar Actividad" -> Success -> Logout? Or show "Working" screen?
            // If we logout, user has to scan again to stop.
            // Let's Logout after action to allow next person.
            onLogout();
        },
        onSettled: () => setActionLoading(false)
    });

    const handleStartActivity = (type: string, taskId?: string, batchId?: string) => {
        setActionLoading(true);
        actionMutation.mutate({
            action: "start_activity",
            activityType: type,
            taskId,
            batchId,
            area: "Production"
        });
    };

    const handleStopActivity = () => {
        setActionLoading(true);
        actionMutation.mutate({
            action: "end_activity",
            area: "Production"
        });
    };

    if (employee.activeLog) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 space-y-12 animate-in fade-in slide-in-from-bottom-8">
                <div className="text-center space-y-4">
                    <div className="mx-auto w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                        <Briefcase className="w-16 h-16 text-primary" />
                    </div>
                    <h2 className="text-5xl font-black uppercase italic tracking-tighter">
                        {employee.activeLog.activityType === 'production' ? 'PRODUCCIÓN EN CURSO' : 'EN PAUSA'}
                    </h2>
                    <p className="text-xl text-slate-400 font-bold uppercase tracking-widest">
                        {employee.activeLog.taskId ? 'Tarea Específica' : employee.activeLog.activityType}
                    </p>
                </div>

                <div className="text-9xl font-mono font-black text-white tabular-nums tracking-tighter">
                    {elapsed}
                </div>

                <Button
                    size="lg"
                    variant="destructive"
                    className="h-32 w-full max-w-2xl text-4xl font-black uppercase italic tracking-tighter rounded-[40px] shadow-2xl hover:scale-105 transition-all"
                    onClick={handleStopActivity}
                    disabled={actionLoading}
                >
                    {actionLoading ? <Loader2 className="w-12 h-12 animate-spin" /> : <span className="flex items-center gap-4"><StopCircle className="w-12 h-12" /> TERMINAR ACTIVIDAD</span>}
                </Button>
            </div>
        )
    }

    if (view === 'select-task') {
        const tasks = options?.tasks || [];
        const batches = options?.batches || [];

        return (
            <div className="h-full flex flex-col gap-8">
                <div className="flex items-center justify-between">
                    <h2 className="text-4xl font-black uppercase italic tracking-tighter">Seleccionar Tarea</h2>
                    <Button variant="ghost" onClick={() => setView('home')} className="h-14 px-8 rounded-2xl bg-white/5">
                        CANCELAR
                    </Button>
                </div>

                <ScrollArea className="flex-1 -mx-4 px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                        {tasks.map((task: any) => (
                            <button
                                key={task.id}
                                onClick={() => handleStartActivity('production', task.id)}
                                className="group p-8 rounded-[30px] bg-white/[0.02] border border-white/5 hover:bg-emerald-500 hover:border-emerald-500 hover:text-black text-left transition-all"
                            >
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2">{task.name}</h3>
                                <div className="flex items-center gap-2 opacity-50 font-mono text-xs">
                                    <span>${task.unitPrice / 100} / {task.unit}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col items-center justify-center gap-12 animate-in fade-in">
            <div className="text-center space-y-2">
                <h1 className="text-6xl font-black uppercase italic tracking-tighter">Hola, {employee.name.split(' ')[0]}</h1>
                <p className="text-slate-500 uppercase tracking-[0.3em] font-bold">¿Qué deseas registrar hoy?</p>
            </div>

            <div className="grid grid-cols-2 gap-6 w-full max-w-4xl">
                <button
                    onClick={() => {
                        setSelectedType('production');
                        setView('select-task');
                    }}
                    className="p-10 rounded-[40px] bg-emerald-500 text-black flex flex-col items-center justify-center gap-6 hover:scale-[1.02] transition-transform shadow-2xl shadow-emerald-500/20"
                >
                    <Hammer className="w-20 h-20" />
                    <span className="text-3xl font-black uppercase italic tracking-tighter">Producción</span>
                </button>

                <div className="grid grid-rows-2 gap-6">
                    <button
                        onClick={() => handleStartActivity('break')}
                        className="p-6 rounded-[35px] bg-white/10 hover:bg-yellow-500 hover:text-black transition-colors flex items-center gap-6 group"
                    >
                        <Coffee className="w-10 h-10 text-yellow-500 group-hover:text-black" />
                        <span className="text-xl font-black uppercase italic tracking-tighter">Descanso (15m)</span>
                    </button>
                    <button
                        onClick={() => handleStartActivity('lunch')}
                        className="p-6 rounded-[35px] bg-white/10 hover:bg-orange-500 hover:text-black transition-colors flex items-center gap-6 group"
                    >
                        <Utensils className="w-10 h-10 text-orange-500 group-hover:text-black" />
                        <span className="text-xl font-black uppercase italic tracking-tighter">Comida (1h)</span>
                    </button>
                </div>
            </div>

            <Button variant="ghost" className="mt-8 text-slate-500 hover:text-white" onClick={onLogout}>
                <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
            </Button>
        </div>
    );
}
