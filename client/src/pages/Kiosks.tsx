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
import { StatusBadge } from "@/components/shared/StatusBadge";
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
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { mockKiosks, kioskTypes, mockModules } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const kioskIcons: Record<string, typeof Clock> = {
  timeclock: Clock,
  supervisor: ClipboardCheck,
  pos: CreditCard,
  management: BarChart3,
  logistics: Truck,
};

export default function Kiosks() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [kiosks, setKiosks] = useState(mockKiosks);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedKiosk, setSelectedKiosk] = useState<typeof mockKiosks[0] | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [newKiosk, setNewKiosk] = useState({
    name: "",
    type: "",
    location: "",
    modules: [] as string[],
  });

  const handleCreateKiosk = () => {
    if (!newKiosk.name || !newKiosk.type || !newKiosk.location) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    const kiosk = {
      id: Date.now(),
      ...newKiosk,
      status: "offline" as const,
      lastPing: "Nunca",
    };

    setKiosks([...kiosks, kiosk]);
    setIsCreateOpen(false);
    setNewKiosk({ name: "", type: "", location: "", modules: [] });

    toast({
      title: "Kiosko creado",
      description: "El magic link ha sido generado",
    });
  };

  const handleOpenKiosk = (kiosk: typeof mockKiosks[0]) => {
    toast({
      title: `Abriendo ${kiosk.name}`,
      description: "Redirigiendo a la interfaz de terminal...",
    });
    
    // In a real app this would open the specific kiosk view
    // For now we'll route to our unified kiosk interface
    setLocation("/kiosk-terminal");
  };

  const openSettings = (kiosk: typeof mockKiosks[0], e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedKiosk(kiosk);
    setIsSettingsOpen(true);
  };

  const generateMagicLink = (kioskId: number) => {
    const link = `https://flexierp.app/kiosk/${kioskId}?token=${btoa(String(kioskId))}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Magic Link copiado",
      description: "El enlace ha sido copiado al portapapeles",
    });
  };

  const toggleModule = (moduleId: string) => {
    setNewKiosk((prev) => ({
      ...prev,
      modules: prev.modules.includes(moduleId)
        ? prev.modules.filter((m) => m !== moduleId)
        : [...prev.modules, moduleId],
    }));
  };

  return (
    <AppLayout title="Kioskos y Terminales" subtitle="Gestiona los dispositivos y sus módulos">
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
                {kiosks.filter((k) => k.status === "offline").length} desconectados
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
                <DialogTitle className="font-display text-2xl">Crear Nuevo Kiosko</DialogTitle>
                <DialogDescription>
                  Configure el kiosko y seleccione los módulos disponibles
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre del Kiosko</Label>
                    <Input
                      id="name"
                      placeholder="Ej: Reloj Checador - Entrada"
                      value={newKiosk.name}
                      onChange={(e) => setNewKiosk({ ...newKiosk, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Ubicación</Label>
                    <Input
                      id="location"
                      placeholder="Ej: Planta Principal"
                      value={newKiosk.location}
                      onChange={(e) => setNewKiosk({ ...newKiosk, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold">Tipo de Kiosko</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {kioskTypes.map((type) => {
                      const Icon = kioskIcons[type.id];
                      const isSelected = newKiosk.type === type.id;
                      return (
                        <button
                          key={type.id}
                          onClick={() => setNewKiosk({ ...newKiosk, type: type.id })}
                          className={cn(
                            "p-4 rounded-xl border-2 text-left transition-all group",
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border hover:border-primary/50 hover:bg-muted/50"
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-6 h-6 mb-2 transition-transform group-hover:scale-110",
                              isSelected ? "text-primary" : "text-muted-foreground"
                            )}
                          />
                          <p className="font-bold text-sm">{type.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                            {type.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold">Módulos Activables</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl bg-muted/30 border border-dashed border-muted-foreground/20">
                    {mockModules.map((module) => (
                      <div
                        key={module.id}
                        className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={module.id}
                          checked={newKiosk.modules.includes(module.id)}
                          onCheckedChange={() => toggleModule(module.id)}
                          className="mt-1"
                        />
                        <label
                          htmlFor={module.id}
                          className="text-sm font-medium cursor-pointer flex-1"
                        >
                          <span className="block font-bold">{module.name}</span>
                          <span className="block text-[10px] text-muted-foreground font-normal">
                            {module.description}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateKiosk} className="bg-primary hover:bg-primary/90">
                  Generar Magic Link y Crear
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kiosks.map((kiosk) => {
            const Icon = kioskIcons[kiosk.type] || Monitor;
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
                          {kiosk.location}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex flex-wrap gap-1.5">
                    {kiosk.modules.map((module) => (
                      <Badge key={module} variant="secondary" className="text-[10px] font-bold tracking-tight py-0">
                        {module.toUpperCase()}
                      </Badge>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-border/50 pb-2">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <StatusBadge status={kiosk.status} className="h-4 px-1" />
                        Status
                      </span>
                      <span className="font-mono text-muted-foreground">{kiosk.lastPing}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-background/50 backdrop-blur-sm border-primary/20 hover:border-primary/50 text-xs font-bold"
                      onClick={() => generateMagicLink(kiosk.id)}
                    >
                      <Link2 className="w-3.5 h-3.5 mr-1.5 text-primary" />
                      Magic Link
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

        {/* Kiosk Settings Dialog */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configurar {selectedKiosk?.name}
              </DialogTitle>
              <DialogDescription>
                Ajustes rápidos de la terminal
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-3 h-12">
                   <Lock className="w-4 h-4 text-warning" />
                   Reiniciar Credenciales Face ID
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 h-12">
                   <Eye className="w-4 h-4 text-primary" />
                   Ver Registros Locales
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 h-12">
                   <Smartphone className="w-4 h-4 text-accent" />
                   Sincronizar Dispositivo
                </Button>
                <Separator className="my-2" />
                <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-destructive hover:bg-destructive/10 hover:text-destructive">
                   <Trash2 className="w-4 h-4" />
                   Eliminar Terminal
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsSettingsOpen(false)}>Listo</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
