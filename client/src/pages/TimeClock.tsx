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
} from "lucide-react";
import { cn } from "@/lib/utils";

type ClockAction = "entry" | "exit" | "break_start" | "break_end";

interface ClockRecord {
  id: number;
  employee: string;
  action: ClockAction;
  time: string;
}

export default function TimeClock() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    employee?: string;
    action?: ClockAction;
  } | null>(null);
  const [recentRecords, setRecentRecords] = useState<ClockRecord[]>([
    { id: 1, employee: "María García", action: "entry", time: "08:15" },
    { id: 2, employee: "José Hernández", action: "entry", time: "07:58" },
    { id: 3, employee: "Carlos Mendoza", action: "entry", time: "08:02" },
    { id: 4, employee: "Ana López", action: "break_start", time: "10:30" },
  ]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const simulateFaceRecognition = (action: ClockAction) => {
    setIsScanning(true);
    setScanResult(null);

    setTimeout(() => {
      const success = Math.random() > 0.1;
      const employees = ["Carlos Mendoza", "María García", "José Hernández", "Ana López"];
      const randomEmployee = employees[Math.floor(Math.random() * employees.length)];

      setScanResult({
        success,
        employee: success ? randomEmployee : undefined,
        action: success ? action : undefined,
      });
      setIsScanning(false);

      if (success) {
        setRecentRecords((prev) => [
          {
            id: Date.now(),
            employee: randomEmployee,
            action,
            time: currentTime.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
          },
          ...prev.slice(0, 4),
        ]);
      }

      setTimeout(() => setScanResult(null), 3000);
    }, 2000);
  };

  const actionLabels: Record<ClockAction, { label: string; icon: typeof LogIn; color: string }> = {
    entry: { label: "Entrada", icon: LogIn, color: "text-success" },
    exit: { label: "Salida", icon: LogOut, color: "text-destructive" },
    break_start: { label: "Inicio Descanso", icon: Coffee, color: "text-warning" },
    break_end: { label: "Fin Descanso", icon: Coffee, color: "text-primary" },
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
            FlexiERP
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
              <div className="relative aspect-[4/3] rounded-xl bg-gradient-to-br from-muted to-muted/50 overflow-hidden mb-6">
                <div className="absolute inset-0 flex items-center justify-center">
                  {isScanning ? (
                    <div className="text-center space-y-4">
                      <div className="relative">
                        <div className="w-32 h-32 rounded-full border-4 border-primary animate-pulse" />
                        <Scan className="absolute inset-0 m-auto w-16 h-16 text-primary animate-pulse" />
                      </div>
                      <div className="flex items-center gap-2 text-primary">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-medium">Escaneando rostro...</span>
                      </div>
                    </div>
                  ) : scanResult ? (
                    <div className="text-center space-y-4 animate-in">
                      {scanResult.success ? (
                        <>
                          <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center glow-success">
                            <CheckCircle2 className="w-12 h-12 text-success" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-success">¡Registro Exitoso!</p>
                            <p className="text-lg font-display mt-1">{scanResult.employee}</p>
                            <Badge className="mt-2 bg-success/20 text-success border-success/30">
                              {actionLabels[scanResult.action!].label}
                            </Badge>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-24 h-24 rounded-full bg-destructive/20 flex items-center justify-center">
                            <XCircle className="w-12 h-12 text-destructive" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-destructive">No Reconocido</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Intente nuevamente o contacte al administrador
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                        <Camera className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Cámara lista</p>
                        <p className="text-sm text-muted-foreground/70">
                          Seleccione una acción para iniciar
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-xs font-medium">Cámara activa</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur-sm">
                    <Shield className="w-3 h-3 text-primary" />
                    <span className="text-xs font-medium">Face ID</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="lg"
                  onClick={() => simulateFaceRecognition("entry")}
                  disabled={isScanning}
                  className="h-16 text-lg font-semibold bg-success hover:bg-success/90 glow-success"
                  data-testid="button-clock-entry"
                >
                  <LogIn className="w-6 h-6 mr-2" />
                  Entrada
                </Button>
                <Button
                  size="lg"
                  onClick={() => simulateFaceRecognition("exit")}
                  disabled={isScanning}
                  className="h-16 text-lg font-semibold bg-destructive hover:bg-destructive/90"
                  data-testid="button-clock-exit"
                >
                  <LogOut className="w-6 h-6 mr-2" />
                  Salida
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => simulateFaceRecognition("break_start")}
                  disabled={isScanning}
                  className="h-14 font-semibold border-warning text-warning hover:bg-warning/10"
                  data-testid="button-clock-break-start"
                >
                  <Coffee className="w-5 h-5 mr-2" />
                  Iniciar Descanso
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => simulateFaceRecognition("break_end")}
                  disabled={isScanning}
                  className="h-14 font-semibold border-primary text-primary hover:bg-primary/10"
                  data-testid="button-clock-break-end"
                >
                  <Coffee className="w-5 h-5 mr-2" />
                  Fin Descanso
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Registros Recientes
              </h3>
              <div className="space-y-3">
                {recentRecords.map((record) => {
                  const ActionIcon = actionLabels[record.action].icon;
                  return (
                    <div
                      key={record.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors animate-in"
                      data-testid={`record-${record.id}`}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          record.action === "entry"
                            ? "bg-success/20"
                            : record.action === "exit"
                            ? "bg-destructive/20"
                            : "bg-warning/20"
                        )}
                      >
                        <ActionIcon
                          className={cn("w-5 h-5", actionLabels[record.action].color)}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{record.employee}</p>
                        <p className="text-sm text-muted-foreground">
                          {actionLabels[record.action].label}
                        </p>
                      </div>
                      <span className="text-lg font-mono font-semibold tabular-nums">
                        {record.time}
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
    </div>
  );
}
