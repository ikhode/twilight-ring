import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Clock,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
  Coffee,
  Loader2,
  Scan,
  Shield,
  ArrowLeft,
  ClipboardCheck,
  Package,
  Factory,
  CheckCircle,
  History,
  AlertCircle,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

type KioskType = "timeclock" | "supervisor" | "pos" | "management" | "logistics";

export default function KioskInterface() {
  const [location, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isScanning, setIsScanning] = useState(false);
  const [activeKiosk, setActiveKiosk] = useState<KioskType>("timeclock");
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    employee?: string;
    action?: string;
  } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    // Extract type from URL if possible, or use state
    const path = window.location.pathname;
    if (path.includes("supervisor")) setActiveKiosk("supervisor");
    return () => clearInterval(timer);
  }, []);

  const simulateFaceRecognition = (action: string) => {
    setIsScanning(true);
    setScanResult(null);

    setTimeout(() => {
      const success = Math.random() > 0.05;
      const employees = ["Carlos Mendoza", "María García", "José Hernández", "Ana López"];
      const randomEmployee = employees[Math.floor(Math.random() * employees.length)];

      setScanResult({
        success,
        employee: success ? randomEmployee : undefined,
        action: success ? action : undefined,
      });
      setIsScanning(false);
      setTimeout(() => setScanResult(null), 3000);
    }, 1500);
  };

  const renderTimeClock = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in">
      <Card className="glass-card overflow-hidden">
        <CardContent className="p-6">
          <div className="relative aspect-video rounded-xl bg-muted overflow-hidden mb-6 flex items-center justify-center">
            {isScanning ? (
              <div className="text-center space-y-4">
                <Scan className="w-16 h-16 text-primary animate-pulse mx-auto" />
                <p className="text-primary font-medium">Validando Identidad...</p>
              </div>
            ) : scanResult ? (
              <div className="text-center animate-in">
                {scanResult.success ? (
                  <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-2" />
                ) : (
                  <XCircle className="w-16 h-16 text-destructive mx-auto mb-2" />
                )}
                <p className={cn("text-xl font-bold", scanResult.success ? "text-success" : "text-destructive")}>
                  {scanResult.success ? `¡Hola ${scanResult.employee}!` : "No reconocido"}
                </p>
              </div>
            ) : (
              <Camera className="w-12 h-12 text-muted-foreground opacity-30" />
            )}
            <div className="absolute top-4 left-4 flex gap-2">
              <Badge className="bg-success/80 backdrop-blur-md border-none">FaceID Activo</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button size="lg" className="h-20 bg-success hover:bg-success/90 text-xl font-bold" onClick={() => simulateFaceRecognition("entry")}>
              <LogIn className="w-6 h-6 mr-2" /> ENTRADA
            </Button>
            <Button size="lg" className="h-20 bg-destructive hover:bg-destructive/90 text-xl font-bold" onClick={() => simulateFaceRecognition("exit")}>
              <LogOut className="w-6 h-6 mr-2" /> SALIDA
            </Button>
            <Button variant="outline" size="lg" className="h-16 border-warning text-warning hover:bg-warning/10 font-bold" onClick={() => simulateFaceRecognition("break")}>
              <Coffee className="w-5 h-5 mr-2" /> DESCANSO
            </Button>
            <Button variant="outline" size="lg" className="h-16 border-primary text-primary hover:bg-primary/10 font-bold" onClick={() => simulateFaceRecognition("return")}>
              <Clock className="w-5 h-5 mr-2" /> RETORNO
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> Historial Reciente
          </h3>
          <div className="space-y-3">
            {[
              { name: "Carlos M.", time: "08:02 AM", action: "Entrada" },
              { name: "Maria G.", time: "08:15 AM", action: "Entrada" },
              { name: "Ana L.", time: "10:30 AM", action: "Descanso" },
            ].map((log, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-muted/50 border border-border/50">
                <span className="font-medium">{log.name}</span>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-[10px]">{log.action}</Badge>
                  <span className="font-mono text-sm">{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSupervisor = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in">
      <Card className="md:col-span-2 glass-card">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-primary" /> Panel de Producción
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <Button className="h-24 flex-col gap-2 bg-primary/10 border-primary/20 text-primary hover:bg-primary/20" onClick={() => simulateFaceRecognition("ticket")}>
              <Plus className="w-8 h-8" />
              Generar Ticket de Producción
            </Button>
            <Button className="h-24 flex-col gap-2 bg-accent/10 border-accent/20 text-accent hover:bg-accent/20">
              <CheckCircle className="w-8 h-8" />
              Validar Calidad (QA)
            </Button>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Lotes en Curso</h4>
            {[
              { id: "L-992", name: "Harina T1", qty: "500kg", status: "Procesando" },
              { id: "L-993", name: "Pan Blanco", qty: "200u", status: "Horneando" },
            ].map((lote, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center font-bold text-xs">
                    {lote.id}
                  </div>
                  <div>
                    <p className="font-bold">{lote.name}</p>
                    <p className="text-xs text-muted-foreground">{lote.qty}</p>
                  </div>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/30">{lote.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="space-y-6">
        <Card className="glass-card border-warning/20">
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-warning mx-auto" />
            <h4 className="font-bold">Requiere Acción</h4>
            <p className="text-xs text-muted-foreground">Materia prima "Levadura" por debajo del mínimo de seguridad.</p>
            <Button size="sm" variant="outline" className="w-full border-warning text-warning hover:bg-warning/10">Generar Requisición</Button>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-6">
             <h4 className="font-bold mb-4">Métricas Turno</h4>
             <div className="space-y-3">
               <div>
                 <div className="flex justify-between text-xs mb-1">
                   <span>Eficiencia Lote L-992</span>
                   <span className="text-success">92%</span>
                 </div>
                 <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                   <div className="h-full bg-success w-[92%]" />
                 </div>
               </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background noise p-6 flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-8">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => setLocation("/kiosks")} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Salir del Kiosko
          </Button>
          <div className="text-right">
            <h1 className="text-3xl font-display font-black tracking-tighter gradient-text">FLEXI-KIOSK</h1>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.3em]">Universal ERP Terminal</p>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex bg-muted/50 p-1 rounded-xl border border-border/50">
            <button 
              onClick={() => setActiveKiosk("timeclock")}
              className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeKiosk === "timeclock" ? "bg-primary text-white shadow-lg" : "text-muted-foreground")}
            >
              Reloj Checador
            </button>
            <button 
              onClick={() => setActiveKiosk("supervisor")}
              className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeKiosk === "supervisor" ? "bg-primary text-white shadow-lg" : "text-muted-foreground")}
            >
              Supervisor Planta
            </button>
          </div>
        </div>

        <div className="text-center py-4">
          <div className="text-6xl font-display font-black tracking-tight tabular-nums mb-2">
            {currentTime.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
            {currentTime.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {activeKiosk === "timeclock" ? renderTimeClock() : renderSupervisor()}

        <div className="fixed bottom-6 left-6 right-6 flex justify-between items-end opacity-40 pointer-events-none">
          <div className="space-y-1">
            <p className="text-[10px] font-bold">TERMINAL-ID: NODE-0992</p>
            <p className="text-[10px]">ENCRIPTACIÓN: AES-256 FACEID</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-bold">SINCRONIZADO CON NUBE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
