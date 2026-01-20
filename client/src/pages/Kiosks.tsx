import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Monitor,
  Plus,
  Clock,
  ClipboardCheck,
  CreditCard,
  BarChart3,
  Truck,
  Link2,
  Settings,
  Trash2,
  ExternalLink,
  Wifi,
  WifiOff,
  Layout,
  Eye,
  Lock,
  Smartphone,
  Info,
  ShieldCheck,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { QRCodeCanvas } from "qrcode.react";
import { Terminal } from "@shared/schema";

// Kiosk capabilities (dynamic modules)
const KIOSK_CAPABILITIES = [
  { id: "attendance", name: "Asistencia", description: "Verificación biométrica y turnos", icon: Clock },
  { id: "production", name: "Producción", description: "Control de patio y procesos", icon: ClipboardCheck },
  { id: "sales", name: "Ventas / POS", description: "Despacho y facturación", icon: CreditCard },
  { id: "info", name: "Información", description: "Tableros de anuncios e indicadores", icon: Info },
];

export default function Kiosks() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { session } = useAuth(); // Get Session
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedKiosk, setSelectedKiosk] = useState<Terminal | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProvisioningOpen, setIsProvisioningOpen] = useState(false);
  const [provisioningToken, setProvisioningToken] = useState<string | null>(null);

  const [newKiosk, setNewKiosk] = useState({
    name: "",
    capabilities: [] as string[],
    location: "",
  });

  const { data: kiosks = [], isLoading } = useQuery<Terminal[]>({
    queryKey: ["/api/kiosks"],
    queryFn: async () => {
      if (!session?.access_token) return [];
      const res = await fetch("/api/kiosks", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch kiosks");
      return res.json();
    },
    enabled: !!session?.access_token,
  });

  // Setup Realtime subscription for automatic kiosk updates
  useSupabaseRealtime({
    table: 'terminals',
    queryKey: ["/api/kiosks"],
  });

  const createKioskMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/kiosks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error creating kiosk");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kiosks"] });
      setIsCreateOpen(false);
      setNewKiosk({ name: "", capabilities: [], location: "" });
      toast({
        title: "Kiosko creado",
        description: "El dispositivo ha sido registrado correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear el kiosko. Intente nuevamente.",
        variant: "destructive",
      });
    }
  });

  const handleCreateKiosk = () => {
    if (!newKiosk.name || newKiosk.capabilities.length === 0 || !newKiosk.location) {
      toast({
        title: "Campos incompletos",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    createKioskMutation.mutate({
      ...newKiosk,
      status: "offline",
    });
  };

  const generateProvisioningTokenMutation = useMutation({
    mutationFn: async (kioskId: string) => {
      const res = await fetch(`/api/kiosks/${kioskId}/provisioning`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to generate token");
      return res.json();
    },
    onSuccess: (data) => {
      setProvisioningToken(data.token);
      setIsProvisioningOpen(true);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo generar el código de vinculación.",
        variant: "destructive",
      });
    }
  });

  const handleLinkDevice = (kiosk: Terminal, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedKiosk(kiosk);
    generateProvisioningTokenMutation.mutate(kiosk.id);
  };

  const handleOpenKiosk = (kiosk: Terminal) => {
    toast({
      title: `Abriendo ${kiosk.name}`,
      description: "Redirigiendo a la interfaz de terminal...",
    });
    setLocation(`/kiosk-terminal/${kiosk.id}`);
  };

  const openSettings = (kiosk: Terminal, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedKiosk(kiosk);
    setIsSettingsOpen(true);
  };

  return (
    <AppLayout title="Kioskos y Terminales" subtitle="Gestiona los dispositivos y sus módulos dinámicos">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10 border border-success/20">
              <Wifi className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">
                {kiosks.filter((k) => k.status === "online").length} en línea
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
              <WifiOff className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {kiosks.filter((k) => k.status !== "online").length} desconectados
              </span>
            </div>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-create-kiosk">
                <Plus className="w-4 h-4" />
                Crear Kiosko
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">Configurar Nueva Terminal</DialogTitle>
                <DialogDescription>
                  Defina el nombre y las capacidades que tendrá este hardware
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre de la Terminal</Label>
                    <Input
                      id="name"
                      placeholder="Ej: Acceso Planta A"
                      value={newKiosk.name}
                      onChange={(e) => setNewKiosk({ ...newKiosk, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Ubicación física</Label>
                    <Input
                      id="location"
                      placeholder="Ej: Entrada Principal"
                      value={newKiosk.location || ""}
                      onChange={(e) => setNewKiosk({ ...newKiosk, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold">Capacidades de la Terminal</Label>
                  <p className="text-xs text-muted-foreground">Seleccione todos los módulos que estarán activos en este hardware</p>
                  <div className="grid grid-cols-2 gap-3">
                    {KIOSK_CAPABILITIES.map((cap) => {
                      const Icon = cap.icon;
                      const isSelected = newKiosk.capabilities.includes(cap.id);
                      return (
                        <button
                          key={cap.id}
                          type="button"
                          onClick={() => {
                            const current = [...newKiosk.capabilities];
                            if (isSelected) {
                              setNewKiosk({ ...newKiosk, capabilities: current.filter(id => id !== cap.id) });
                            } else {
                              setNewKiosk({ ...newKiosk, capabilities: [...current, cap.id] });
                            }
                          }}
                          className={cn(
                            "p-4 rounded-xl border-2 text-left transition-all group relative",
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border hover:border-primary/50 hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Icon
                              className={cn(
                                "w-6 h-6 transition-transform group-hover:scale-110",
                                isSelected ? "text-primary" : "text-muted-foreground"
                              )}
                            />
                            {isSelected && <Checkbox checked className="rounded-full shadow-none" />}
                          </div>
                          <p className="font-bold text-sm">{cap.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                            {cap.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateKiosk}
                  disabled={createKioskMutation.isPending || newKiosk.capabilities.length === 0}
                  className="bg-primary hover:bg-primary/90"
                >
                  {createKioskMutation.isPending ? "Registrando..." : "Crear Terminal y Vincular"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kiosks.map((kiosk) => {
              const mainCap = kiosk.capabilities?.[0] || 'info';
              const Icon = KIOSK_CAPABILITIES.find(c => c.id === mainCap)?.icon || Monitor;
              return (
                <Card
                  key={kiosk.id}
                  className={cn(
                    "group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
                    kiosk.status === "online" ? "border-success/30 bg-success/[0.02]" : "bg-card"
                  )}
                  data-testid={`kiosk-card-${kiosk.id}`}
                >
                  {kiosk.status === "online" && (
                    <div className="absolute top-0 right-0 p-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                      </span>
                    </div>
                  )}

                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-3 shadow-sm",
                            kiosk.status === "online"
                              ? "bg-primary text-white glow"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="w-7 h-7" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-display font-bold">
                            {kiosk.name}
                          </CardTitle>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <Layout className="w-3 h-3" />
                            {kiosk.location || "Sin ubicación"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {kiosk.capabilities?.map((capId) => {
                        const cap = KIOSK_CAPABILITIES.find(c => c.id === capId);
                        return (
                          <Badge key={capId} variant="secondary" className="text-[9px] px-1.5 py-0 bg-primary/5 text-primary border-primary/10">
                            {cap?.name || capId}
                          </Badge>
                        );
                      })}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs border-b border-border/50 pb-2">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          {kiosk.status === 'online' ? <Wifi className="w-3 h-3 text-success" /> : <WifiOff className="w-3 h-3" />}
                          Estado
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {kiosk.lastActiveAt
                            ? formatDistanceToNow(new Date(kiosk.lastActiveAt), { addSuffix: true, locale: es })
                            : "Nunca"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-background/50 backdrop-blur-sm border-primary/20 hover:border-primary/50 text-xs font-bold"
                        onClick={(e) => handleLinkDevice(kiosk, e)}
                        disabled={generateProvisioningTokenMutation.isPending && selectedKiosk?.id === kiosk.id}
                      >
                        <Smartphone className="w-3.5 h-3.5 mr-1.5 text-primary" />
                        {kiosk.deviceSalt ? "Re-vincular" : "Vincular"}
                      </Button>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-xs font-bold glow-sm"
                        onClick={() => handleOpenKiosk(kiosk)}
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        Abrir
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute bottom-2 right-2 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => openSettings(kiosk, e)}
                    >
                      <Settings className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}

            <Card className="border-dashed border-2 border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/[0.02] transition-all cursor-pointer flex items-center justify-center min-h-[260px] group">
              <button
                onClick={() => setIsCreateOpen(true)}
                className="text-center p-6 space-y-4"
              >
                <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mx-auto transition-all group-hover:bg-primary/10 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg">
                  <Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <p className="font-display font-bold text-muted-foreground group-hover:text-primary transition-colors">Agregar Kiosko</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 max-w-[140px] mx-auto">
                    Despliega una nueva terminal en tu red
                  </p>
                </div>
              </button>
            </Card>
          </div>
        )}

        {/* Provisioning QR Dialog */}
        <Dialog open={isProvisioningOpen} onOpenChange={setIsProvisioningOpen}>
          <DialogContent className="max-w-sm border-primary/20 bg-slate-900 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl flex items-center gap-2 text-white">
                <Smartphone className="w-6 h-6 text-primary" />
                Vincular Dispositivo
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Escanea este código con el dispositivo que deseas convertir en terminal.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-8 space-y-6">
              <div className="p-6 bg-white rounded-3xl shadow-inner border-8 border-slate-800">
                {provisioningToken && (
                  <QRCodeCanvas
                    value={`${window.location.origin}/kiosk-link?token=${provisioningToken}`}
                    size={200}
                    level="H"
                    includeMargin
                  />
                )}
              </div>
              <div className="text-center space-y-2">
                <p className="text-xs font-mono text-primary animate-pulse">
                  TOKEN DE UN SOLO USO
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                  Expira en 5 minutos
                </p>
              </div>

              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 w-full flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  Este proceso vincula permanentemente este hardware a la terminal <strong>{selectedKiosk?.name}</strong>.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsProvisioningOpen(false)} className="w-full bg-slate-800 hover:bg-slate-700 text-white">
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
