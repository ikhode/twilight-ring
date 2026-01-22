import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  History,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  Info,
  Navigation,
  Lock,
  Unlock,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Terminal, Employee } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { usePresence } from "@/hooks/usePresence";
import { supabase } from "@/lib/supabase";
import ProductionTerminal from "./kiosks/ProductionTerminal";
import CashierTerminal from "./kiosks/CashierTerminal";
import AdminTerminal from "./kiosks/AdminTerminal";
import { FaceAuthCamera } from "@/components/kiosks/FaceAuthCamera";
import { format } from "date-fns";

// Define Kiosk Capabilities
const KIOSK_CAPABILITIES = [
  { id: "attendance", name: "Control de Asistencia", description: "Registro de entradas y salidas", icon: Clock },
  { id: "coco-entry", name: "Entrada de Coco", description: "Registro de pesaje y lotes de coco", icon: Package },
  { id: "worker-activity", name: "Actividad Obrera", description: "Registro de tareas y producción", icon: Factory },
  { id: "faceid-config", name: "Configuración Face ID", description: "Enrollamiento biométrico facial", icon: Shield },
  { id: "logistics", name: "Ruta Logística", description: "Seguimiento GPS y entrega de pedidos", icon: Navigation },
];

/**
 * Interfaz de Kiosco Multipropropósito de NexusERP.
 * Soporta control de asistencia, producción, FaceID y logística.
 * 
 * @returns {JSX.Element} El componente de interfaz de kiosco.
 */
export default function KioskInterface(): JSX.Element {
  const { id } = useParams();
  const { session } = useAuth();
  const [, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isScanning, setIsScanning] = useState(false);
  const [activeCapability, setActiveCapability] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"launcher" | "main" | "entry-coco" | "worker-activity" | "faceid-config" | "login">("launcher");
  const [selectedWorker, setSelectedWorker] = useState<Employee | null>(null);
  const [authenticatedEmployee, setAuthenticatedEmployee] = useState<Employee | null>(null);
  const [pendingCapability, setPendingCapability] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    employee?: string;
    action?: string;
  } | null>(null);
  const [deviceId] = useState<string | null>(localStorage.getItem("kiosk_device_id"));
  const [deviceSalt] = useState<string | null>(localStorage.getItem("kiosk_device_salt"));

  // Logistics & GPS State
  const [isRouteActive, setIsRouteActive] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  // Fetch real Kiosk Data
  const { data: kioskInfo, isLoading } = useQuery<Terminal | null>({
    queryKey: [`/api/kiosks/device/${deviceId}`],
    queryFn: async (): Promise<Terminal | null> => {
      if (!deviceId) return null;
      // FIX: Encode deviceId to handle special chars in UserAgent
      const encodedId = encodeURIComponent(deviceId);
      const res = await fetch(`/api/kiosks/device/${encodedId}`);
      if (!res.ok) return null;
      return res.json() as Promise<Terminal>;
    },
    enabled: !!deviceId,
  });

  const queryClient = useQueryClient();

  // Real-time Reactivity for authorization
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`terminal-auth-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'terminals',
          filter: `id=eq.${id}`,
        },
        () => {
          // If the terminal we are watching is updated, refresh the info
          queryClient.invalidateQueries({ queryKey: [`/api/kiosks/device/${deviceId}`] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, deviceId, queryClient]);

  // Use Presence instead of polling for heartbeat
  usePresence(`kiosk-${id}`);

  useEffect((): void => {
    const timer = setInterval((): void => setCurrentTime(new Date()), 1000);
    return (): void => clearInterval(timer);
  }, []);

  // Set default capability if only one is available, or show launcher
  useEffect((): void => {
    if (kioskInfo?.capabilities && kioskInfo.capabilities.length > 0) {
      if (kioskInfo.capabilities.length === 1) {
        const firstCap = kioskInfo.capabilities[0];
        // Definiendo el estado de manera asíncrona para evitar advertencias de ESLint sobre setState en efectos
        setTimeout((): void => {
          setActiveCapability((prev) => (prev !== firstCap ? firstCap : prev));
          setActiveView((prev) => (prev !== "main" ? "main" : prev));
        }, 0);
      } else {
        setTimeout((): void => {
          setActiveView((prev) => (prev !== "launcher" ? "launcher" : prev));
        }, 0);
      }
    } else if (kioskInfo?.capabilities) {
      setTimeout((): void => {
        setActiveView((prev) => (prev !== "main" ? "main" : prev));
      }, 0);
    }
  }, [kioskInfo?.capabilities]);

  // Secure Heartbeat
  useEffect(() => {
    if (!kioskInfo?.id) return;

    /**
     * Envía un latido (heartbeat) al servidor con el estado del dispositivo y su ubicación.
     * 
     * @returns {Promise<void>}
     */
    const sendHeartbeat = async (): Promise<void> => {
      try {
        await fetch(`/api/kiosks/${kioskInfo.id}/heartbeat`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Device-Auth": `${deviceId}:${deviceSalt}`
          },
          body: JSON.stringify({
            latitude: currentCoords?.lat,
            longitude: currentCoords?.lng
          })
        });
      } catch (err) {
        console.error("Heartbeat failed:", err);
      }
    };

    sendHeartbeat().catch((err: Error) => console.error("Heartbeat catch:", err)); // Immediate
    const interval = setInterval(() => {
      sendHeartbeat().catch((err: Error) => console.error("Heartbeat interval catch:", err));
    }, 60000); // Every minute
    return () => clearInterval(interval);
  }, [kioskInfo?.id, deviceId, deviceSalt, currentCoords]);

  // GPS Tracking Logic
  useEffect(() => {
    if (!isRouteActive) {
      return;
    }

    if (!("geolocation" in navigator)) {
      console.error("Geolocation not supported");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos: GeolocationPosition): void => {
        setCurrentCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      (err: GeolocationPositionError): void => console.error("GPS Error:", err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return (): void => {
      navigator.geolocation.clearWatch(watchId);
      setCurrentCoords(null);
    };
  }, [isRouteActive]);

  // Wake Lock Logic
  useEffect((): void => {
    /**
     * Solicita un bloqueo de pantalla (Wake Lock) para mantener el dispositivo activo.
     */
    const requestWakeLock = async (): Promise<void> => {
      if ("wakeLock" in navigator && isRouteActive) {
        try {
          const lock = await (navigator as unknown as { wakeLock: { request: (type: string) => Promise<WakeLockSentinel> } }).wakeLock.request("screen");
          setWakeLock(lock);
          console.log("Wake Lock active");
        } catch (err) {
          console.error("Wake Lock error:", err);
        }
      }
    };

    if (isRouteActive) {
      requestWakeLock();
    } else if (wakeLock) {
      wakeLock.release().then(() => setWakeLock(null));
    }

    return (): void => {
      if (wakeLock) {
        wakeLock.release().catch((err: Error) => console.error("Release failed:", err));
      }
    };
  }, [isRouteActive, wakeLock]);

  // Auto-generate Device ID if missing
  useEffect(() => {
    if (!deviceId) {
      const newId = crypto.randomUUID();
      localStorage.setItem("kiosk_device_id", newId);
      localStorage.setItem("kiosk_device_salt", crypto.randomUUID());
      window.location.reload();
    }
  }, [deviceId]);

  // Fetch Real Employees (Optional - requires session or device auth)
  const [bindingToken, setBindingToken] = useState("");
  const [isBinding, setIsBinding] = useState(false);

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/hr/employees"],
    queryFn: async (): Promise<Employee[]> => {
      // If we have a session, use it
      if (session?.access_token) {
        const res = await fetch("/api/hr/employees", {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (!res.ok) return [];
        return res.json() as Promise<Employee[]>;
      }
      return [];
    },
    enabled: !!session?.access_token
  });

  const handleBindDevice = async () => {
    if (!bindingToken || bindingToken.length !== 6) {
      return;
    }
    setIsBinding(true);
    try {
      const res = await fetch("/api/kiosks/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: bindingToken, deviceId })
      });

      if (!res.ok) throw new Error("Token inválido");

      const data = await res.json();
      window.location.reload();
    } catch (error) {
      console.error(error);
      setIsBinding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }


  // 1. Production Terminal
  if (kioskInfo?.capabilities?.includes("production")) {
    if (!authenticatedEmployee) {
      return (
        <KioskLoginView
          terminal={kioskInfo}
          onAuthenticated={setAuthenticatedEmployee}
        />
      );
    }
    return (
      <ProductionTerminal
        sessionContext={{
          terminal: kioskInfo as Terminal,
          driver: authenticatedEmployee
        }}
        onLogout={() => setAuthenticatedEmployee(null)}
      />
    );
  }

  // 2. Cashier Terminal (Caja Chica)
  if (kioskInfo?.capabilities?.includes("sales")) {
    // Enforcement: If no authenticated employee, show login screen
    if (!authenticatedEmployee) {
      return (
        <KioskLoginView
          terminal={kioskInfo}
          onAuthenticated={setAuthenticatedEmployee}
        />
      );
    }

    return (
      <CashierTerminal
        sessionContext={{ terminal: kioskInfo as Terminal, driver: authenticatedEmployee }}
        onLogout={() => setAuthenticatedEmployee(null)}
      />
    );
  }

  // 3. Admin Terminal
  if (session?.access_token && kioskInfo?.capabilities?.includes("admin")) {
    return (
      <AdminTerminal
        sessionContext={{ terminal: kioskInfo as Terminal, driver: undefined }}
        onLogout={() => window.location.reload()}
      />
    );
  }

  // 2. Binding Shield View (If deviceId exists but terminal not found)
  if (!kioskInfo) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white selection:bg-primary/30">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-4 uppercase tracking-widest animate-pulse">
              Provisioning Mode
            </Badge>
            <h1 className="text-5xl font-black italic tracking-tighter uppercase">Nexus Terminal</h1>
            <p className="text-slate-500 uppercase tracking-[0.2em] text-xs">Awaiting System Authorization</p>
          </div>

          <div className="p-10 rounded-[40px] bg-white/[0.02] border border-white/5 space-y-6">
            <div className="space-y-4">
              <Label className="text-xs uppercase tracking-widest font-black opacity-30">Vincular Dispositivo</Label>
              <Input
                value={bindingToken}
                onChange={(e) => setBindingToken(e.target.value.toUpperCase())}
                placeholder="000000"
                maxLength={6}
                className="text-center text-4xl h-24 font-mono font-black tracking-[0.5em] bg-black border-2 border-white/10 rounded-3xl selection:bg-primary"
              />
            </div>

            <Button
              className="w-full h-20 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest rounded-3xl glow-sm transition-all"
              onClick={handleBindDevice}
              disabled={isBinding || bindingToken.length !== 6}
            >
              {isBinding ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Shield className="w-5 h-5 mr-2" />}
              {isBinding ? "ENLAZANDO..." : "AUTORIZAR HARDWARE"}
            </Button>
          </div>

          <div className="pt-8 grid grid-cols-2 gap-4 border-t border-white/5">
            <div className="text-left space-y-1">
              <p className="text-[10px] uppercase opacity-30">DevID_Sig</p>
              <p className="text-[10px] font-mono">{deviceId?.slice(0, 12)}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] uppercase opacity-30">Status</p>
              <p className="text-[10px] font-mono">STANDBY_AUTH_REQ</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Unauthorized View (Kiosk found but not associated with an organization effectively)
  if (!kioskInfo.organizationId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white">
        <div className="max-w-sm w-full space-y-4 text-center">
          <XCircle className="w-16 h-16 text-destructive mx-auto" />
          <h2 className="text-2xl font-bold italic uppercase tracking-tighter">Terminal Huérfana</h2>
          <p className="text-slate-400 text-sm">Este hardware no tiene una organización asignada. Contacte a soporte técnico.</p>
          <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>REINTENTAR</Button>
        </div>
      </div>
    );
  }

  // 4. Launcher Selection (Default active view)
  const renderLauncher = () => {
    // Filter capabilities based on terminal metadata
    const activeCaps = KIOSK_CAPABILITIES.filter(cap =>
      kioskInfo.capabilities?.includes(cap.id)
    );

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeCaps.map((cap) => (
          <button
            key={cap.id}
            onClick={() => {
              if (cap.id === "attendance" || cap.id === "worker-activity" || cap.id === "coco-entry") {
                setPendingCapability(cap.id);
                setActiveView("login");
              } else {
                setActiveView(cap.id as any);
              }
            }}
            className="group relative p-8 rounded-[40px] bg-white/[0.02] border border-white/5 hover:border-primary/50 hover:bg-primary/5 transition-all text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <cap.icon className="w-32 h-32 -mr-16 -mt-16" />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <cap.icon className="w-8 h-8 text-primary shadow-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white group-hover:text-primary transition-colors">
                  {cap.name}
                </h3>
                <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-bold">
                  {cap.description}
                </p>
              </div>
              <div className="pt-4 flex items-center text-[10px] font-black uppercase tracking-[0.3em] overflow-hidden">
                <span className="translate-x-[-100%] opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500 text-primary">
                  ACCEDER AL SISTEMA —
                </span>
                <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </button>
        ))}

        {activeCaps.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-30 space-y-4 border-2 border-dashed border-white/5 rounded-[40px]">
            <XCircle className="w-12 h-12 mx-auto" />
            <p className="font-black uppercase tracking-widest text-xs">Módulo no configurado</p>
          </div>
        )}
      </div>
    );
  };

  const renderMainView = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setActiveView("launcher")} className="rounded-full bg-white/5">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-4xl font-black italic tracking-tighter uppercase underline decoration-primary/30 decoration-4">Terminal Activa</h2>
      </div>
      <Card className="bg-white/[0.01] border-white/5 p-12 text-center rounded-[60px]">
        <div className="max-w-md mx-auto space-y-8">
          <div className="relative inline-block">
            <Camera className="w-32 h-32 text-primary shadow-2xl opacity-50" />
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tighter">Bienvenido a {kioskInfo.name}</h3>
          <p className="text-slate-500">Seleccione un módulo del menú principal o escanee su identificación biométrica para registrar su actividad.</p>
        </div>
      </Card>
    </div>
  );

  const renderEntryCoco = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setActiveView("launcher")} className="rounded-full bg-white/5">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-4xl font-black italic tracking-tighter uppercase">Recepción de Coco</h2>
      </div>
      <p className="text-slate-400">Modulo de recepción en desarrollo.</p>
    </div>
  );

  const renderWorkerActivity = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setActiveView("launcher")} className="rounded-full bg-white/5">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-4xl font-black italic tracking-tighter uppercase">Actividad de Obreros</h2>
      </div>
      <p className="text-slate-400">Seleccione un obrero para registrar su actividad.</p>
    </div>
  );

  const renderFaceIdConfig = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setActiveView("launcher")} className="rounded-full bg-white/5">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-4xl font-black italic tracking-tighter uppercase">Face ID Enroll</h2>
      </div>
      <p className="text-slate-400">Configuración biométrica de empleados.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30 selection:text-white p-6 md:p-12 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-white/5 pb-12">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-6xl font-black italic tracking-[ -0.05em] uppercase leading-none">
                NEXUS<span className="text-slate-500 font-medium">.OS</span>
              </h1>
            </div>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.4em] opacity-50">
              {currentTime.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>

          <div className="text-right hidden md:block">
            <div className="text-6xl font-black font-mono tracking-tighter tabular-nums mb-1">
              {currentTime.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
              <span className="text-2xl opacity-40 ml-1">{currentTime.toLocaleTimeString("es-MX", { second: "2-digit" })}</span>
            </div>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.4em] opacity-50">
              {currentTime.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>

          <Button
            variant="ghost"
            onClick={() => setLocation("/kiosks")}
            className="md:order-last text-muted-foreground hover:text-white hover:bg-white/5 border border-white/5"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Panel Admin
          </Button>
        </header>

        <main className="space-y-8">
          {activeView === "launcher" && renderLauncher()}
          {activeView === "main" && renderMainView()}
          {activeView === "entry-coco" && renderEntryCoco()}
          {activeView === "worker-activity" && renderWorkerActivity()}
          {activeView === "faceid-config" && renderFaceIdConfig()}
          {activeView === "login" && kioskInfo && (
            <KioskLoginView
              terminal={kioskInfo}
              onAuthenticated={(emp) => {
                setAuthenticatedEmployee(emp);
                if (pendingCapability) {
                  setActiveView(pendingCapability as any);
                  setPendingCapability(null);
                } else {
                  setActiveView("launcher");
                }
              }}
            />
          )}
        </main>

        <footer className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 opacity-30">
          <div className="flex gap-8">
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest">Hardware ID</p>
              <p className="text-[9px] font-mono">NODE_FX_COCO_09{id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest">Protocolo Seg</p>
              <p className="text-[9px] font-mono">TLS 1.3 + FaceID</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[9px] font-black tracking-widest uppercase">Cognitive OS v4.2</span>
            </div>
            <p className="text-[9px] font-medium">© 2026 COCO FACTORY SYSTEMS</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

/**
 * Vista de Login Biométrico para Kiosko.
 */
function KioskLoginView({ terminal, onAuthenticated }: { terminal: Terminal, onAuthenticated: (emp: Employee) => void }) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white selection:bg-primary/30">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-2">
          <Badge className="bg-primary/10 text-primary border-primary/20 mb-4 uppercase tracking-widest">
            {terminal.location}
          </Badge>
          <h1 className="text-5xl font-black italic tracking-tighter uppercase">{terminal.name}</h1>
          <p className="text-slate-500 uppercase tracking-[0.2em] text-xs">Identificación Biométrica Requerida</p>
        </div>

        <FaceAuthCamera
          terminalId={terminal.id}
          onAuthenticated={onAuthenticated}
        />

        <div className="pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
          <div className="text-left space-y-1">
            <p className="text-[10px] uppercase opacity-30">Hardware</p>
            <p className="text-[10px] font-mono">{terminal.id.slice(0, 8)}</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-[10px] uppercase opacity-30">Versión</p>
            <p className="text-[10px] font-mono">COG_OS_4.2</p>
          </div>
        </div>
      </div>
    </div>
  );
}
