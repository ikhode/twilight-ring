import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
    Clock,
    LogOut,
    Coffee,
    Utensils,
    Briefcase,
    Play,
    StopCircle,
    RotateCcw,
    CheckCircle2,
    MapPin,
    AlertTriangle,
    Loader2
} from "lucide-react";
import { KioskSession } from "@/types/kiosk";
import { cn } from "@/lib/utils";
import { getKioskHeaders } from "@/lib/kiosk-auth";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";


interface AttendanceTerminalProps {
    sessionContext: KioskSession;
    onLogout: () => void;
}

export default function AttendanceTerminal({ sessionContext, onLogout }: AttendanceTerminalProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    // In a real app, we would fetch the current status from the backend
    // For now, we'll assume the sessionContext might have it or we fetch it.
    // Let's assume we start "neutral" and user self-reports, or we fetch status.
    // Ideally, currentStatus comes from the employee record we just fetched.
    // We'll manage local state assuming it updates via mutation.

    // Correctly initialize using currentStatus (real-time) instead of status (employment)
    const [status, setStatus] = useState<string>(sessionContext.driver?.currentStatus || "offline");
    const [isLoading, setIsLoading] = useState(false);

    // Activity Start State
    const [isActivityOpen, setIsActivityOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<string>("");
    const [notes, setNotes] = useState("");

    // Confirmation Overlay State
    const [confirmation, setConfirmation] = useState<{ show: boolean, title: string, sub: string, type: 'success' | 'error' } | null>(null);

    // Fetch Production Options (Processes)
    const { data: options } = useQuery({
        queryKey: [`/api/kiosks/${sessionContext.terminal.id}/production-options`],
        queryFn: async () => {
            const res = await fetch(`/api/kiosks/${sessionContext.terminal.id}/production-options`, {
                headers: getKioskHeaders({ employeeId: sessionContext.driver?.id })
            });
            return res.json();
        }
    });

    const actionMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/kiosks/action", {
                method: "POST",
                headers: getKioskHeaders({ employeeId: sessionContext.driver?.id }),
                body: JSON.stringify({
                    employeeId: sessionContext.driver?.id,
                    terminalId: sessionContext.terminal.id,
                    ...data
                })
            });
            if (!res.ok) throw new Error("Error ejecutando acción");
            return res.json();
        },
        onSuccess: (data, variables) => {
            let msg = "Acción registrada";
            let title = "ACCIÓN REGISTRADA";
            let sub = "Operación completada exitosamente";

            if (variables.action === "check_in") {
                msg = "Entrada registrada correctamente";
                title = "BIENVENIDO";
                sub = "Tu entrada ha sido registrada exitosamente.";
            }
            if (variables.action === "check_out") {
                msg = "Salida registrada. ¡Hasta luego!";
                title = "HASTA LUEGO";
                sub = "Tu salida ha sido registrada. Que tengas buen descanso.";
            }
            if (variables.action === "break") {
                msg = "Descanso iniciado";
                title = "BUEN PROVECHO";
                sub = "Tu tiempo de descanso comienza ahora.";
            }
            if (variables.action === "resume") {
                msg = "Retorno de descanso registrado";
                title = "A TRABAJAR";
                sub = "Has retomado tus labores exitosamente.";
            }
            if (variables.action === "start_activity") {
                msg = "Proceso iniciado";
                title = "ACTIVIDAD INICIADA";
                sub = "El proceso está corriendo. Enfócate en tu tarea.";
            }
            if (variables.action === "end_activity") {
                title = "TAREA FINALIZADA";
                sub = "La actividad se ha cerrado correctamente.";
            }

            toast({ title: "Éxito", description: msg });

            // Update local status logic
            if (variables.action === "check_in") setStatus("active");
            if (variables.action === "check_out") {
                setStatus("offline");
                setTimeout(onLogout, 2000); // Check-out ALWAYS logs out
            }
            if (variables.action === "break") {
                setStatus("break");
                // Only auto-logout if persistence is FALSE
                if (!sessionContext.terminal.sessionPersistence) {
                    setTimeout(onLogout, 3000);
                }
            }
            if (variables.action === "resume") setStatus("active");
            if (variables.action === "start_activity") {
                setStatus("working");
                setSelectedActivity(variables.activityType);
                setIsActivityOpen(false);
            }
            if (variables.action === "end_activity") setStatus("active");

            // GLOBAL Auto-Logout behavior for non-checkout actions
            if (variables.action !== "check_out") {
                if (!sessionContext.terminal.sessionPersistence) {
                    // NO PERSISTENCE: Standard Flow
                    setConfirmation({ show: true, title, sub, type: 'success' });
                    setTimeout(() => onLogout(), 3000);
                } else {
                    // PERSISTENCE ENABLED: Stay on screen
                    toast({ title: title, description: sub });
                }
            }
        },
        onError: () => {
            toast({ title: "Error", description: "No se pudo registrar la acción", variant: "destructive" });
        }
    });

    const handleAction = (action: string, extraData: any = {}) => {
        actionMutation.mutate({ action, ...extraData });
    };

    const currentTime = new Date();

    return (
        <div className="h-full w-full flex flex-col gap-4 overflow-hidden">
            {/* Header */}
            <header className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[18px] bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                        <Clock className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div className="space-y-0.5">
                        <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase leading-none">
                            Control <span className="text-slate-500">Asistencia</span>
                        </h1>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-indigo-500/20 text-indigo-500 bg-indigo-500/5 uppercase text-[9px] font-black tracking-widest px-1.5 py-0.5">
                                {sessionContext.terminal.location || "GENERAL"}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 p-1.5 pr-4 rounded-[20px] bg-white/[0.02] border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 border-2 border-indigo-500/50 flex items-center justify-center overflow-hidden">
                        <div className="text-base font-black text-indigo-500">{sessionContext.driver?.name?.charAt(0)}</div>
                    </div>
                    <div className="text-left">
                        <p className="text-xs font-black text-white uppercase italic leading-none">{sessionContext.driver?.name}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                            ESTADO: <span className={cn(
                                "text-indigo-500",
                                status === "active" && "text-emerald-500",
                                status === "break" && "text-amber-500",
                                status === "offline" && "text-slate-500"
                            )}>{status}</span>
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onLogout}
                        className="ml-2 h-8 w-8 rounded-lg hover:bg-red-500/20 hover:text-red-500 transition-all duration-300"
                    >
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            {/* Main Action Grid */}
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">

                {/* CHECK IN / OUT DOMAIN */}
                <Card className={cn("col-span-full lg:col-span-2 bg-white/[0.02] border-white/5 rounded-[30px] p-6 flex flex-col relative overflow-hidden group",
                    status === "active" ? "border-emerald-500/20" : "border-indigo-500/20"
                )}>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                    <div className="relative z-10 text-center space-y-1 shrink-0 mb-4">
                        <h2 className="text-5xl md:text-7xl font-black font-mono tracking-tighter tabular-nums leading-none">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </h2>
                        <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px] md:text-xs">
                            {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>

                    <div className="relative z-10 flex-1 grid grid-cols-2 gap-4 min-h-0">
                        {(status === "offline" || status === "check_out") ? (
                            <Button
                                onClick={() => handleAction("check_in")}
                                disabled={actionMutation.isPending}
                                className="h-full w-full rounded-[20px] bg-emerald-500 hover:bg-emerald-400 text-black text-2xl md:text-3xl font-black uppercase italic tracking-tighter shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:scale-[1.01] transition-all whitespace-normal leading-tight"
                            >
                                {actionMutation.isPending ? <Loader2 className="w-10 h-10 animate-spin" /> : "ENTRADA"}
                            </Button>
                        ) : (
                            <Button
                                onClick={() => handleAction("check_out")}
                                disabled={actionMutation.isPending}
                                className="h-full w-full rounded-[20px] bg-red-500 hover:bg-red-400 text-black text-2xl md:text-3xl font-black uppercase italic tracking-tighter shadow-[0_0_30px_rgba(239,68,68,0.2)] hover:scale-[1.01] transition-all whitespace-normal leading-tight"
                            >
                                {actionMutation.isPending ? <Loader2 className="w-10 h-10 animate-spin" /> : "SALIDA"}
                            </Button>
                        )}

                        <div className="flex flex-col gap-4 h-full min-h-0">
                            {status === "active" ? (
                                <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
                                    <Button
                                        onClick={() => handleAction("break", { breakType: "lunch" })}
                                        disabled={actionMutation.isPending}
                                        className="h-full rounded-[20px] bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-black font-black uppercase tracking-widest text-xs md:text-sm flex flex-col items-center justify-center gap-2 whitespace-normal leading-tight"
                                    >
                                        <Utensils className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
                                        <span>COMER</span>
                                    </Button>
                                    <Button
                                        onClick={() => handleAction("break", { breakType: "bathroom" })}
                                        disabled={actionMutation.isPending}
                                        className="h-full rounded-[20px] bg-sky-500/10 border border-sky-500/20 text-sky-500 hover:bg-sky-500 hover:text-black font-black uppercase tracking-widest text-xs md:text-sm flex flex-col items-center justify-center gap-2 whitespace-normal leading-tight"
                                    >
                                        <Coffee className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
                                        <span>BAÑO</span>
                                    </Button>
                                </div>
                            ) : status === "break" ? (
                                <Button
                                    onClick={() => handleAction("resume")}
                                    disabled={actionMutation.isPending}
                                    className="flex-1 rounded-[20px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-black font-black uppercase tracking-widest text-sm md:text-lg whitespace-normal"
                                >
                                    <Play className="w-5 h-5 md:w-6 md:h-6 mr-2 shrink-0" /> RETOMAR LABOR
                                </Button>
                            ) : (
                                <div className="flex-1 rounded-[20px] bg-white/5 border border-white/5 flex items-center justify-center opacity-30">
                                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-center px-4">NO DISPONIBLE</span>
                                </div>
                            )}

                            {/* Quick Access Grid */}
                            {status === "active" && options?.processes && options.processes.length > 0 && (
                                <div className="grid grid-cols-2 gap-3 min-h-0 flex-1">
                                    {options.processes.slice(0, 4).map((p: any) => (
                                        <Button
                                            key={p.id}
                                            onClick={() => handleAction("start_activity", { activityType: p.name })}
                                            disabled={actionMutation.isPending}
                                            className="h-full rounded-[20px] bg-indigo-500/10 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 text-indigo-400 font-bold uppercase text-[10px] md:text-xs flex flex-col items-center justify-center p-2 text-center leading-tight transition-all"
                                        >
                                            <Briefcase className="w-4 h-4 mb-1 opacity-70" />
                                            <span className="line-clamp-2">{p.name}</span>
                                        </Button>
                                    ))}
                                </div>
                            )}

                            {status === "working" ? (
                                <Button
                                    onClick={() => handleAction("end_activity")}
                                    disabled={actionMutation.isPending}
                                    className="h-full rounded-[25px] bg-indigo-500 hover:bg-indigo-400 text-white border border-indigo-500/20 font-black uppercase tracking-widest text-lg shadow-[0_0_30px_rgba(99,102,241,0.3)] animate-pulse"
                                >
                                    <CheckCircle2 className="w-6 h-6 mr-3" /> TERMINAR TAREA
                                </Button>
                            ) : (
                                <Dialog open={isActivityOpen} onOpenChange={setIsActivityOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            disabled={status === "offline" || status === "break"}
                                            className="h-full rounded-[25px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 hover:bg-indigo-500 hover:text-white font-black uppercase tracking-widest text-lg"
                                        >
                                            <Briefcase className="w-6 h-6 mr-3" /> INICIAR ACTIVIDAD
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-[#0a0a0a] border-white/10 text-white rounded-[30px] max-w-4xl p-6 md:p-8 max-h-[90vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter text-indigo-500 mb-2">Seleccionar Tarea</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-6 py-4">
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {options?.processes && options.processes.length > 0 ? (
                                                    options.processes.map((p: any) => (
                                                        <Button
                                                            key={p.id}
                                                            onClick={() => handleAction("start_activity", { activityType: p.name, notes })}
                                                            disabled={actionMutation.isPending}
                                                            className="h-32 rounded-3xl bg-white/5 hover:bg-indigo-500 hover:text-white border-2 border-white/10 hover:border-indigo-500 flex flex-col items-center justify-center gap-2 transition-all p-4"
                                                        >
                                                            <Briefcase className="w-8 h-8 opacity-50 mb-1" />
                                                            <span className="text-sm font-black uppercase text-center leading-tight whitespace-normal">
                                                                {p.name}
                                                            </span>
                                                        </Button>
                                                    ))
                                                ) : (
                                                    <>
                                                        <Button
                                                            onClick={() => handleAction("start_activity", { activityType: "cleaning", notes })}
                                                            disabled={actionMutation.isPending}
                                                            className="h-32 rounded-3xl bg-white/5 hover:bg-indigo-500 border-2 border-white/10 flex flex-col items-center justify-center p-4"
                                                        >
                                                            <span className="font-black uppercase">Limpieza</span>
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleAction("start_activity", { activityType: "support", notes })}
                                                            disabled={actionMutation.isPending}
                                                            className="h-32 rounded-3xl bg-white/5 hover:bg-indigo-500 border-2 border-white/10 flex flex-col items-center justify-center p-4"
                                                        >
                                                            <span className="font-black uppercase">Soporte</span>
                                                        </Button>
                                                    </>
                                                )}
                                            </div>

                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center">
                                                    <span className="w-full border-t border-white/10" />
                                                </div>
                                                <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                                                    <span className="bg-[#0a0a0a] px-2 text-slate-500">Opcional</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notas (Agregar antes de seleccionar)</label>
                                                <textarea
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                    className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500/50 resize-none"
                                                    placeholder="Detalles..."
                                                />
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Info / Status Panel */}
                <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
                    <Card className="bg-white/[0.02] border-white/5 rounded-[30px] p-6 flex-1 min-h-0 flex flex-col">
                        <div className="space-y-4 flex-1 overflow-y-auto scrollbar-none">
                            <div className="flex items-center gap-3 sticky top-0 bg-[#060606] z-10 pb-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                <h3 className="text-lg font-black uppercase italic tracking-tighter">Resumen</h3>
                            </div>

                            <div className="space-y-3">
                                <div className="p-4 rounded-2xl bg-white/5 flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase text-slate-400">Hora Entrada</span>
                                    <span className="font-mono font-black text-xl">08:00 AM</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase text-slate-400">Tiempo Activo</span>
                                    <span className="font-mono font-black text-xl text-emerald-500">4h 32m</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase text-slate-400">Actividad Actual</span>
                                    <span className="font-black uppercase text-xs text-indigo-400">{selectedActivity || "GENERAL"}</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {status === "working" && (
                        <Card className="bg-indigo-500/10 border-indigo-500/20 rounded-[40px] p-8">
                            <div className="text-center space-y-4">
                                <Briefcase className="w-12 h-12 text-indigo-500 mx-auto animate-pulse" />
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-indigo-400">Tarea en Progreso</h3>
                                <p className="text-xs font-bold uppercase tracking-widest text-indigo-300/70">
                                    {selectedActivity.replace("_", " ")}
                                </p>
                                <Button
                                    onClick={() => handleAction("end_activity")}
                                    className="w-full h-14 rounded-2xl bg-indigo-500 text-white font-black uppercase tracking-widest"
                                >
                                    TERMINAR TAREA
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
            {/* Confirmation Overlay - ONLY SHOW IF NOT PERSISTENT */}
            {confirmation && !sessionContext.terminal.sessionPersistence && (
                <div className="absolute inset-0 z-50 bg-[#020202] flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-300">
                    <div className="mb-10 relative">
                        <div className="w-32 h-32 rounded-full bg-emerald-500/20 flex items-center justify-center animate-bounce">
                            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                        </div>
                        <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-white mb-6">
                        {confirmation.title}
                    </h2>
                    <p className="text-xl md:text-3xl text-slate-400 font-bold uppercase tracking-widest max-w-2xl leading-relaxed">
                        {confirmation.sub}
                    </p>
                    <div className="mt-20 flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-600">Cerrando sesión...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
