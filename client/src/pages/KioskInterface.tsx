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
import { useQuery } from "@tanstack/react-query";
import { Terminal, Employee } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { usePresence } from "@/hooks/usePresence";
import ProductionTerminal from "./kiosks/ProductionTerminal";
import CashierTerminal from "./kiosks/CashierTerminal";
import AdminTerminal from "./kiosks/AdminTerminal";
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
  const [activeView, setActiveView] = useState<"launcher" | "main" | "entry-coco" | "worker-activity" | "faceid-config">("launcher");
  const [selectedWorker, setSelectedWorker] = useState<Employee | null>(null);
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
  const { data: kioskInfo, isLoading } = useQuery<Terminal>({
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
  useEffect((): void => {
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
    const interval = setInterval((): void => {
      sendHeartbeat().catch((err: Error) => console.error("Heartbeat interval catch:", err));
    }, 60000); // Every minute
    return (): void => clearInterval(interval);
  }, [kioskInfo?.id, deviceId, deviceSalt, currentCoords]);

  // GPS Tracking Logic
  useEffect((): void => {
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

  // Fetch Real Employees (Optional - requires session or device auth)
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
      // TODO: Implement device-token based fetch for employees if needed
      return [];
    },
    enabled: !!session?.access_token // Only try if user is logged in for now
  });

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>;
  }

  // RENDER: Functional Terminals Override
  // If authenticated and has specific capabilities, show specialized UI

  // 1. Production Terminal
  if (session?.access_token && kioskInfo?.capabilities?.includes("production")) {
    return (
      <ProductionTerminal
        sessionContext={{
          terminal: kioskInfo,
          driver: undefined // Mapping employee to generic user context if needed
        }}
        onLogout={() => window.location.reload()}
      />
    );
  }

  // 2. Cashier Terminal
  if (session?.access_token && kioskInfo?.capabilities?.includes("cashier")) {
    return (
      <CashierTerminal
        sessionContext={{ terminal: kioskInfo, driver: undefined }}
        onLogout={() => window.location.reload()}
      />
    );
  }

  // 3. Admin Terminal
  if (session?.access_token && kioskInfo?.capabilities?.includes("admin")) {
    return (
      <AdminTerminal
        sessionContext={{ terminal: kioskInfo, driver: undefined }}
        onLogout={() => window.location.reload()}
      />
    );
  }

  // FIX: If we have a deviceId but kioskInfo is null, it might be loading or failed.
  // If failed (404), then show error. If loading, show loader.
  // But useQuery isLoading handles the loading state.
  // So if isLoading is false and kioskInfo is null, THEN show error.
  if (!kioskInfo && !isLoading && deviceId) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6 selection:bg-primary/30">
        <Card className="max-w-md w-full glass-card bg-white/[0.03] border-white/10 p-8 space-y-6">
          <div className="text-center space-y-4">
            <Shield className="w-12 h-12 text-primary mx-auto animate-pulse" />
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">Terminal No Encontrada</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest leading-relaxed">
              El dispositivo tiene un ID pero no está registrado en el sistema.
            </p>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center space-y-4">
            <p className="text-sm text-slate-400">
              Solicite un administrador que genere un <strong>Código QR de Vinculación</strong>.
            </p>
            <div className="p-4 bg-black/40 rounded-lg font-mono text-[10px] text-primary break-all">
              ID: {deviceId}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-white"
              onClick={() => {
                localStorage.removeItem("kiosk_device_id");
                localStorage.removeItem("kiosk_device_salt");
                window.location.reload();
              }}
            >
              Restablecer Vinculación Local
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // If no deviceId, show Link Request (or if effectively no kioskInfo and no deviceId)
  if (!deviceId) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6 selection:bg-primary/30">
        <Card className="max-w-md w-full glass-card bg-white/[0.03] border-white/10 p-8 space-y-6">
          <div className="text-center space-y-4">
            <Shield className="w-12 h-12 text-primary mx-auto animate-pulse" />
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">Terminal No Vinculada</h1>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center space-y-4">
            <p className="text-sm text-slate-400">
              Solicite un administrador que genere un <strong>Código QR de Vinculación</strong> desde el Panel de Control.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  /**
   * Maneja el registro de asistencia mediante simulación de escaneo.
   * 
   * @param {string} action - La acción a realizar (entry, exit, etc).
   * @returns {Promise<void>}
   */
  const handleAttendance = async (action: string): Promise<void> => {
    setIsScanning(true);
    setScanResult(null);

    // Simulated verification logic for dynamic terminal
    setTimeout(async () => {
      if (employees.length === 0) {
        setIsScanning(false);
        setScanResult({ success: false });
        return;
      }
      const randomEmployee = employees[Math.floor(Math.random() * employees.length)];

      // Note: Attendance logging is now handled via dynamic events/flows
      // This is a simulation of the successful scan
      setScanResult({
        success: true,
        employee: randomEmployee.name,
        action: action
      });

      setIsScanning(false);
      setTimeout(() => setScanResult(null), 3000);
    }, 1500);
  };

  /**
   * Renderiza la vista de entrada de coco.
   * 
   * @returns {JSX.Element} El componente de entrada de coco.
   */
  const renderEntryCoco = (): JSX.Element => (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setActiveView("main")} className="text-white hover:bg-white/10">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver
        </Button>
        <h2 className="text-2xl font-black tracking-tighter uppercase italic">Registro de Entrada de Coco</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="glass-card bg-white/[0.03] border-white/10 p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Proveedor / Productor</label>
              <select className="w-full bg-black border border-white/10 rounded-xl p-4 text-white focus:border-primary outline-none">
                <option>Seleccionar Productor...</option>
                <option>Productores de la Costa S.C.</option>
                <option>Fincas Unidas del Sur</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Tipo de Coco</label>
              <div className="grid grid-cols-2 gap-3">
                <button className="p-4 rounded-xl border border-primary bg-primary/10 text-primary font-bold">Coco Bueno</button>
                <button className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 font-bold">Desecho</button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Peso Bruto (KG)</label>
              <div className="relative">
                <input type="number" className="w-full bg-black border border-white/10 rounded-xl p-6 text-4xl font-black font-mono text-primary outline-none focus:border-primary" placeholder="0.00" />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xl font-bold opacity-30">KG</div>
              </div>
            </div>
          </div>
          <Button className="w-full h-20 bg-primary hover:bg-primary/90 text-xl font-black uppercase tracking-widest glow-sm">Confirmar Pesaje y Generar Ticket</Button>
        </Card>
        <Card className="glass-card bg-white/[0.03] border-white/10 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <h3 className="font-bold uppercase tracking-widest text-xs">Lectura de Báscula en Tiempo Real</h3>
          </div>
          <div className="aspect-square rounded-3xl bg-black flex items-center justify-center border-2 border-dashed border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 animate-pulse" />
            <div className="text-center space-y-2 relative z-10">
              <p className="text-8xl font-black font-mono tracking-tighter">0.00</p>
              <p className="text-xs font-bold opacity-30 uppercase tracking-[0.3em]">Estabilizando...</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  /**
   * Renderiza la vista de actividad del trabajador.
   * 
   * @returns {JSX.Element} El componente de actividad del trabajador.
   */
  const renderWorkerActivity = (): JSX.Element => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setActiveView("main")} className="text-white hover:bg-white/10">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver
        </Button>
        <h2 className="text-2xl font-black tracking-tighter uppercase italic">Registro de Actividad Obrera</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card bg-white/[0.03] border-white/10 p-6">
          <h3 className="text-xs font-bold opacity-50 uppercase tracking-widest mb-4">Seleccionar Empleado</h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {employees.map((employee: Employee) => (
              <button
                key={employee.id}
                onClick={() => setSelectedWorker(employee)}
                className={cn(
                  "w-full p-4 rounded-2xl flex items-center gap-4 border transition-all",
                  selectedWorker?.id === employee.id ? "bg-primary border-primary shadow-lg shadow-primary/20" : "bg-white/5 border-white/5 hover:bg-white/10"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold">{employee.name.charAt(0)}</div>
                <div className="text-left">
                  <p className="font-bold text-sm">{employee.name}</p>
                  <p className="text-[10px] opacity-70 uppercase">{employee.role}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="md:col-span-2 glass-card bg-white/[0.03] border-white/10 p-8 space-y-8">
          {!selectedWorker ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30 py-20">
              <Scan className="w-20 h-20 mb-4" />
              <p className="font-bold uppercase tracking-[0.2em]">Seleccione un empleado para registrar actividad</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-6 border-b border-white/5">
                <div>
                  <h3 className="text-3xl font-black tracking-tight uppercase">{selectedWorker.name}</h3>
                  <p className="text-primary font-bold text-xs uppercase tracking-widest">{selectedWorker.role}</p>
                </div>
                <Badge className="bg-success/20 text-success border-success/30 px-4 py-1 text-xs">ACTIVO HOY</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Proceso Realizado</label>
                  <div className="grid grid-cols-1 gap-2">
                    {["Destope", "Perforación", "Deshuese", "Pelado", "Copra"].map(proc => (
                      <button key={proc} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary hover:bg-primary/5 text-left font-bold text-sm transition-all flex justify-between items-center group">
                        {proc}
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Cantidad (Unidades/KG)</label>
                    <div className="relative">
                      <input type="number" className="w-full bg-black border border-white/10 rounded-xl p-6 text-4xl font-black font-mono text-accent outline-none focus:border-accent" placeholder="0" />
                    </div>
                  </div>
                  <div className="p-6 rounded-2xl bg-accent/5 border border-accent/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Pago Estimado</span>
                      <span className="text-accent font-black text-xl">$0.00</span>
                    </div>
                    <p className="text-[10px] leading-tight opacity-50 italic">Cálculo basado en tarifa por unidad del proceso seleccionado.</p>
                  </div>
                  <Button className="w-full h-16 bg-accent hover:bg-accent/90 text-lg font-black uppercase tracking-widest glow-sm">Emitir Ticket de Trabajo</Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );

  /**
   * Renderiza la vista de configuración de Face ID.
   * 
   * @returns {JSX.Element} El componente de configuración de Face ID.
   */
  const renderFaceIdConfig = (): JSX.Element => (
    <div className="animate-in fade-in zoom-in-95 duration-300 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setActiveView("main")} className="text-white hover:bg-white/10">
          <ArrowLeft className="w-4 h-4 mr-2" /> Cancelar
        </Button>
        <h2 className="text-2xl font-black tracking-tighter uppercase italic">Configuración de Face ID</h2>
      </div>

      <Card className="glass-card bg-white/[0.03] border-white/10 p-10 text-center space-y-8">
        <div className="relative aspect-square max-w-[400px] mx-auto rounded-[40px] bg-black border-4 border-primary/20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_black_70%)] z-10" />
          <Camera className="w-32 h-32 text-white/10 absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2" />
          <div className="absolute inset-0 z-20">
            <div className="h-full w-full relative">
              <div className="absolute top-10 left-10 w-20 h-20 border-t-4 border-l-4 border-primary rounded-tl-3xl" />
              <div className="absolute top-10 right-10 w-20 h-20 border-t-4 border-r-4 border-primary rounded-tr-3xl" />
              <div className="absolute bottom-10 left-10 w-20 h-20 border-b-4 border-l-4 border-primary rounded-bl-3xl" />
              <div className="absolute bottom-10 right-10 w-20 h-20 border-b-4 border-r-4 border-primary rounded-br-3xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 border-2 border-white/10 rounded-[100px] animate-pulse" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-2xl font-black uppercase tracking-tight">Captura de Biometría</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">Posicione el rostro dentro del marco y mantenga la mirada fija. Se capturarán 128 puntos de referencia para encriptación AES-256.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-square rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Shield className="w-6 h-6 opacity-20" />
            </div>
          ))}
        </div>

        <Button className="w-full h-20 bg-primary hover:bg-primary/90 text-xl font-black uppercase tracking-widest">Iniciar Mapeo Facial</Button>
      </Card>
    </div>
  );

  /**
   * Renderiza el lanzador de módulos disponible para la terminal.
   * 
   * @returns {JSX.Element} El componente del lanzador.
   */
  const renderLauncher = (): JSX.Element => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-10 animate-in fade-in zoom-in-95 duration-500">
      {kioskInfo.capabilities?.map((capId: string) => {
        const cap = KIOSK_CAPABILITIES.find(c => c.id === capId);
        if (!cap) return null;
        const Icon = cap.icon;
        return (
          <Button
            key={capId}
            variant="outline"
            className="h-64 flex-col gap-6 bg-white/[0.03] border-white/10 hover:border-primary/50 hover:bg-primary/5 group transition-all rounded-[40px] p-8"
            onClick={() => {
              setActiveCapability(capId);
              setActiveView("main");
            }}
          >
            <div className="w-24 h-24 rounded-[32px] bg-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Icon className="w-12 h-12 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tight italic group-hover:text-primary transition-colors">{cap.name}</h3>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{cap.description}</p>
            </div>
          </Button>
        );
      })}
    </div>
  );

  /**
   * Renderiza la vista principal del módulo activo.
   * 
   * @returns {JSX.Element} El componente de la vista principal.
   */
  const renderMainView = (): JSX.Element => (
    <>
      {kioskInfo.capabilities && kioskInfo.capabilities.length > 1 && (
        <div className="flex justify-start">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveView("launcher")}
            className="text-muted-foreground hover:text-white hover:bg-white/5 gap-2 px-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="font-bold text-[10px] uppercase tracking-widest">Cambiar Módulo</span>
          </Button>
        </div>
      )}

      <div className="text-center py-4">
        <div className="text-6xl font-display font-black tracking-tight tabular-nums mb-2">
          {currentTime.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
          {currentTime.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {activeCapability === "attendance" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in">
          <Card className="glass-card overflow-hidden border-primary/20 bg-primary/[0.02]">
            <CardContent className="p-8 text-center">
              <div className="relative aspect-square max-w-[300px] mx-auto rounded-3xl bg-black/40 overflow-hidden mb-8 border-2 border-primary/30 flex items-center justify-center">
                {isScanning ? (
                  <div className="text-center space-y-4">
                    <div className="relative">
                      <Scan className="w-24 h-24 text-primary animate-pulse mx-auto" />
                      <div className="absolute inset-0 bg-primary/20 animate-scan-line h-1 w-full" />
                    </div>
                    <p className="text-primary font-bold tracking-widest uppercase text-xs">Escaneando Rostro...</p>
                  </div>
                ) : scanResult ? (
                  <div className="text-center animate-in zoom-in-95 duration-300">
                    {scanResult.success ? (
                      <div className="space-y-4">
                        <CheckCircle2 className="w-24 h-24 text-success mx-auto drop-shadow-glow" />
                        <p className="text-2xl font-black text-success uppercase tracking-tight">Acceso Concedido</p>
                        <p className="text-lg font-medium text-white/80">{scanResult.employee}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <XCircle className="w-24 h-24 text-destructive mx-auto" />
                        <p className="text-2xl font-black text-destructive uppercase tracking-tight">No Reconocido</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center space-y-4 opacity-50">
                    <Camera className="w-20 h-20 text-muted-foreground mx-auto" />
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase">Cámara Lista</p>
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button size="lg" className="h-24 bg-success hover:bg-success/90 text-2xl font-black shadow-lg shadow-success/20" onClick={() => handleAttendance("entry")}>
                  <LogIn className="w-8 h-8 mr-2" /> ENTRADA
                </Button>
                <Button size="lg" className="h-24 bg-destructive hover:bg-destructive/90 text-2xl font-black shadow-lg shadow-destructive/20" onClick={() => handleAttendance("exit")}>
                  <LogOut className="w-8 h-8 mr-2" /> SALIDA
                </Button>
                <Button variant="outline" size="lg" className="h-20 border-warning/50 text-warning hover:bg-warning/10 font-black text-xl" onClick={() => handleAttendance("break")}>
                  <Coffee className="w-6 h-6 mr-2" /> DESCANSO
                </Button>
                <Button variant="outline" size="lg" className="h-20 border-primary/50 text-primary hover:bg-primary/10 font-black text-xl" onClick={() => handleAttendance("return")}>
                  <Clock className="w-6 h-6 mr-2" /> RETORNO
                </Button>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card className="glass-card border-white/5 bg-white/[0.02]">
              <CardContent className="p-6">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" /> Registro de Patio
                </h3>
                <div className="space-y-3">
                  {[
                    { name: "José Hernández", role: "Supervisor", time: "07:58 AM", action: "Entrada" },
                    { name: "Ana López", role: "Operador", time: "08:00 AM", action: "Entrada" },
                    { name: "Carlos M.", role: "Gerente", time: "08:02 AM", action: "Entrada" },
                  ].map((log, i) => (
                    <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xs">
                          {log.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{log.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{log.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-[10px] font-bold border-success/30 text-success mb-1">{log.action}</Badge>
                        <p className="font-mono text-xs text-muted-foreground">{log.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Button variant="outline" onClick={() => setActiveView("faceid-config")} className="w-full h-16 border-white/10 text-white hover:bg-white/5 font-bold uppercase tracking-widest text-xs gap-3">
              <Shield className="w-5 h-5 text-primary" /> Configurar Nuevo Rostro
            </Button>
          </div>
        </div>
      ) : activeCapability === "coco-entry" || activeCapability === "worker-activity" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in">
          <Card className="lg:col-span-2 glass-card border-accent/20 bg-accent/[0.02]">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black flex items-center gap-3 tracking-tight">
                  <ClipboardCheck className="w-8 h-8 text-accent shadow-glow" />
                  CONTROL DE PATIO Y PROCESO
                </h3>
                <Badge className="bg-accent/20 text-accent border-accent/30 px-3 py-1">Estación: {kioskInfo.location}</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                <Button className="h-32 flex-col gap-3 bg-accent/10 border-accent/20 text-accent hover:bg-accent/20 text-lg font-black group transition-all" onClick={() => setActiveView("entry-coco")}>
                  <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-8 h-8" />
                  </div>
                  REGISTRAR ENTRADA COCO
                </Button>
                <Button className="h-32 flex-col gap-3 bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 text-lg font-black group transition-all" onClick={() => setActiveView("worker-activity")}>
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Factory className="w-8 h-8" />
                  </div>
                  REGISTRAR ACTIVIDAD OBRERA
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-[0.2em]">Monitoreo de Lotes Activos</h4>
                  <Badge variant="outline" className="text-[10px]">Actualizado: Recién</Badge>
                </div>
                {[
                  { id: "LT-CO-992", name: "Coco Entero (Bueno)", progress: 85, status: "Destopando", color: "bg-primary" },
                  { id: "LT-CO-993", name: "Pulpa de Coco", progress: 40, status: "Deshuezando", color: "bg-accent" },
                ].map((lote, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center font-black text-xs border border-white/10">
                          {lote.id}
                        </div>
                        <div>
                          <p className="font-black tracking-tight">{lote.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> {lote.status}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black font-mono tracking-tighter">{lote.progress}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className={cn("h-full transition-all duration-1000", lote.color)} style={{ width: `${lote.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="glass-card border-warning/20 bg-warning/[0.02]">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-warning/10 flex items-center justify-center mx-auto mb-2 border border-warning/20">
                  <AlertCircle className="w-12 h-12 text-warning animate-pulse" />
                </div>
                <h4 className="text-xl font-black tracking-tight">ALERTA DE PATIO</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">Área de almacenamiento de <strong>Coco Desecho</strong> al 90% de su capacidad.</p>
                <Button size="lg" variant="outline" className="w-full border-warning/50 text-warning hover:bg-warning/10 font-bold h-14">
                  NOTIFICAR LOGÍSTICA
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-card bg-white/[0.02]">
              <CardContent className="p-6">
                <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" /> Rendimiento de Planta
                </h4>
                <div className="space-y-6">
                  {[
                    { label: "Eficiencia Destope", value: 94, color: "text-success" },
                    { label: "Extracción Agua", value: 78, color: "text-primary" },
                    { label: "Mermas Desecho", value: 12, color: "text-destructive" },
                  ].map((metric, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-wide">
                        <span className="text-muted-foreground">{metric.label}</span>
                        <span className={metric.color}>{metric.value}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className={cn("h-full", metric.color.replace("text-", "bg-"))} style={{ width: `${metric.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : activeCapability === "logistics" ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className={cn(
              "glass-card transition-all duration-500 p-8 flex flex-col items-center justify-center text-center space-y-6 border-2",
              isRouteActive ? "bg-primary/10 border-primary shadow-lg shadow-primary/20" : "bg-white/[0.02] border-white/5"
            )}>
              <div className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-700",
                isRouteActive ? "bg-primary animate-pulse" : "bg-white/10"
              )}>
                {isRouteActive ? <Navigation className="w-16 h-16 text-black animate-bounce" /> : <MapPin className="w-16 h-16 text-white/20" />}
              </div>

              <div className="space-y-2">
                <h3 className="text-3xl font-black uppercase italic tracking-tighter">
                  {isRouteActive ? "Ruta en Progreso" : "Ruta Inactiva"}
                </h3>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-[0.2em]">
                  {isRouteActive ? "GPS y Wake Lock Activos" : "Presione iniciar para comenzar seguimiento"}
                </p>
              </div>

              <div className="flex gap-4 w-full">
                {!isRouteActive ? (
                  <Button
                    onClick={() => setIsRouteActive(true)}
                    className="w-full h-20 bg-primary hover:bg-primary/90 text-xl font-black uppercase italic tracking-widest glow-sm"
                  >
                    Iniciar Ruta
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={() => setIsRouteActive(false)}
                    className="w-full h-20 text-xl font-black uppercase italic tracking-widest"
                  >
                    Terminar Ruta
                  </Button>
                )}
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="glass-card bg-white/[0.02] border-white/5 p-6">
                <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-50 mb-4">
                  <Info className="w-3 h-3 text-primary" /> Telemetría de Dispositivo
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                    <p className="text-[10px] uppercase opacity-50">Localización</p>
                    <p className="font-mono text-sm">
                      {currentCoords ? `${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)}` : "---, ---"}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                    <p className="text-[10px] uppercase opacity-50">Wake Lock</p>
                    <div className="flex items-center gap-2">
                      {wakeLock ? <Lock className="w-3 h-3 text-success" /> : <Unlock className="w-3 h-3 text-warning" />}
                      <p className={cn("font-bold text-sm uppercase", wakeLock ? "text-success" : "text-warning")}>
                        {wakeLock ? "Protegido" : "Inactivo"}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="glass-card bg-white/[0.02] border-white/5 p-6 space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-50">Próximas Paradas</h4>
                <div className="space-y-3">
                  {[
                    { addr: "Av. Industrial 402", city: "Colima, Col.", status: "Pendiente" },
                    { addr: "Bodega Norte - Lote 12", city: "Manzanillo, Col.", status: "Pendiente" },
                  ].map((stop, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex justify-between items-center group hover:bg-white/5 transition-all">
                      <div>
                        <p className="font-bold text-sm tracking-tight">{stop.addr}</p>
                        <p className="text-[10px] opacity-50">{stop.city}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10">Ver</Button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
          <Info className="w-16 h-16 text-primary/20 mb-6" />
          <h3 className="text-xl font-bold uppercase tracking-tight italic">Módulo no Configurado</h3>
          <p className="text-sm text-muted-foreground mt-2">Este módulo requiere configuración adicional en el Panel.</p>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 selection:bg-primary/30">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                <Factory className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter uppercase italic">
                {kioskInfo.name.split(" - ")[0]}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/50 text-primary font-bold tracking-widest text-[10px]">
                ESTACIÓN: {(kioskInfo.location || "Sin Ubicación").toUpperCase()}
              </Badge>
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Online</span>
            </div>
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
