import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  LogIn,
  LogOut,
  Coffee,
  Loader2,
  Scan,
  Shield,
  Bath,
  Activity,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { FaceAuthCamera } from "@/components/kiosks/FaceAuthCamera";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type ClockAction = "entry" | "exit" | "break_start" | "break_end" | "lunch_start" | "lunch_end" | "restroom_start" | "restroom_end" | "activity_start" | "activity_end";

interface ClockRecord {
  id: number;
  employee: string;
  action: ClockAction;
  time: string;
}

export default function TimeClock() {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [authenticatedEmployee, setAuthenticatedEmployee] = useState<any>(null);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: recentRecords = [] } = useQuery({
    queryKey: ["/api/hr/attendance/recent"],
    enabled: !!session?.access_token
  });

  const { data: availableProcesses = [] } = useQuery({
    queryKey: ["/api/cpe/processes"],
    enabled: !!authenticatedEmployee
  });

  const attendanceMutation = useMutation({
    mutationFn: async (payload: { action: ClockAction; area?: string; notes?: string }) => {
      const res = await fetch("/api/hr/attendance/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          employeeId: authenticatedEmployee.id,
          ...payload
        })
      });
      if (!res.ok) throw new Error("Failed to log attendance");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/attendance/recent"] });
      toast({
        title: "Registro Exitoso",
        description: `Estado actualizado a: ${data.status}`
      });
      setAuthenticatedEmployee(null);
      setIsActivityDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error de Registro",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  });

  const handleAction = (action: ClockAction, area?: string) => {
    if (action === "activity_start" && !area) {
      setIsActivityDialogOpen(true);
      return;
    }
    attendanceMutation.mutate({ action, area });
  };

  const actionLabels: Record<ClockAction, { label: string; icon: any; color: string; variant?: "success" | "destructive" | "warning" | "primary" }> = {
    entry: { label: "Entrada", icon: LogIn, color: "text-success", variant: "success" },
    exit: { label: "Salida", icon: LogOut, color: "text-destructive", variant: "destructive" },
    break_start: { label: "Inicio Descanso", icon: Coffee, color: "text-warning", variant: "warning" },
    break_end: { label: "Fin Descanso", icon: Coffee, color: "text-primary", variant: "primary" },
    lunch_start: { label: "Inicio Comida", icon: Coffee, color: "text-warning", variant: "warning" },
    lunch_end: { label: "Fin Comida", icon: Coffee, color: "text-primary", variant: "primary" },
    restroom_start: { label: "Entrada Baño", icon: Bath, color: "text-warning", variant: "warning" },
    restroom_end: { label: "Salida Baño", icon: Bath, color: "text-primary", variant: "primary" },
    activity_start: { label: "Iniciar Actividad", icon: Activity, color: "text-primary", variant: "primary" },
    activity_end: { label: "Fin Actividad", icon: CheckCircle2, color: "text-success", variant: "success" },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 noise">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-display font-bold gradient-text" data-testid="text-kiosk-title">
            Cognitive OS
          </h1>
          <p className="text-muted-foreground">Reloj Checador con Reconocimiento Facial</p>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-card border border-border shadow-lg">
            <Clock className="w-6 h-6 text-primary" />
            <span className="text-5xl font-display font-bold tracking-tight tabular-nums" data-testid="text-current-time">
              {currentTime.toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
          <p className="text-muted-foreground mt-2">
            {currentTime.toLocaleDateString("es-MX", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card overflow-hidden">
            <CardContent className="p-6">
              {!authenticatedEmployee ? (
                <div className="space-y-6">
                  <FaceAuthCamera
                    terminalId="Attendance-Kiosk-1"
                    onAuthenticated={(emp) => setAuthenticatedEmployee(emp)}
                  />
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/10 border border-primary/20">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold opacity-50 uppercase tracking-widest">Bienvenido/a</p>
                      <p className="text-2xl font-display font-black">{authenticatedEmployee.name}</p>
                      <Badge variant="outline" className="mt-1">{authenticatedEmployee.role}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      size="lg"
                      onClick={() => handleAction("entry")}
                      disabled={attendanceMutation.isPending}
                      className="h-20 text-lg font-black uppercase bg-success hover:bg-success/90 glow-success"
                    >
                      <LogIn className="w-6 h-6 mr-2" />
                      Entrada
                    </Button>
                    <Button
                      size="lg"
                      onClick={() => handleAction("exit")}
                      disabled={attendanceMutation.isPending}
                      className="h-20 text-lg font-black uppercase bg-destructive hover:bg-destructive/90"
                    >
                      <LogOut className="w-6 h-6 mr-2" />
                      Salida
                    </Button>

                    <div className="col-span-2 grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleAction("restroom_start")}
                        disabled={attendanceMutation.isPending}
                        className="h-16 flex-col gap-1 border-warning/30 text-warning hover:bg-warning/10"
                      >
                        <Bath className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase">Baño (Ent)</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleAction("lunch_start")}
                        disabled={attendanceMutation.isPending}
                        className="h-16 flex-col gap-1 border-warning/30 text-warning hover:bg-warning/10"
                      >
                        <Coffee className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase">Comida (Ent)</span>
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => handleAction("activity_start")}
                        disabled={attendanceMutation.isPending}
                        className="h-16 flex-col gap-1 bg-primary hover:bg-primary/90"
                      >
                        <Activity className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase">Nueva Actividad</span>
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleAction("restroom_end")}
                        disabled={attendanceMutation.isPending}
                        className="h-16 flex-col gap-1 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Bath className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase">Baño (Sal)</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleAction("lunch_end")}
                        disabled={attendanceMutation.isPending}
                        className="h-16 flex-col gap-1 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Coffee className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase">Comida (Sal)</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleAction("activity_end")}
                        disabled={attendanceMutation.isPending}
                        className="h-16 flex-col gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase">Fin Actividad</span>
                      </Button>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    className="w-full text-xs opacity-50"
                    onClick={() => setAuthenticatedEmployee(null)}
                  >
                    Cancelar / No soy yo
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Registros Recientes
              </h3>
              <div className="space-y-3">
                {(recentRecords as any[]).map((record: any) => {
                  const action = actionLabels[record.notes?.includes("activity") ? "activity_start" : "entry"]; // Placeholder logic
                  const ActionIcon = action.icon;
                  return (
                    <div
                      key={record.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors animate-in"
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
                        <ActionIcon className={cn("w-5 h-5", action.color)} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{record.employee?.name}</p>
                        <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">
                          {record.area} {record.status === "active" ? "• EN CURSO" : ""}
                        </p>
                      </div>
                      <span className="text-lg font-mono font-semibold tabular-nums">
                        {new Date(record.startedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Terminal: Reloj Checador - Entrada Principal</p>
          <p className="text-xs mt-1">ID: KIOSK-001 | Última sincronización: Hace 30 segundos</p>
        </div>
      </div>
      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-widest text-primary italic">Seleccionar Actividad</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2 py-4">
              {(availableProcesses as any[]).map((process: any) => (
                <button
                  key={process.id}
                  onClick={() => handleAction("activity_start", process.name)}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/50 transition-all group"
                >
                  <div className="text-left">
                    <p className="font-bold text-white group-hover:text-primary transition-colors">{process.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{process.type}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              ))}
              {(availableProcesses as any[]).length === 0 && (
                <p className="text-center py-8 text-slate-500 font-bold uppercase text-xs">No hay procesos disponibles para este empleado</p>
              )}
            </div>

          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
