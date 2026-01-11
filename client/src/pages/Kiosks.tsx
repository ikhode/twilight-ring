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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Copy,
  ExternalLink,
  QrCode,
  Wifi,
  WifiOff,
} from "lucide-react";
import { mockKiosks, kioskTypes, mockModules } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const kioskIcons: Record<string, typeof Clock> = {
  timeclock: Clock,
  supervisor: ClipboardCheck,
  pos: CreditCard,
  management: BarChart3,
  logistics: Truck,
};

export default function Kiosks() {
  const { toast } = useToast();
  const [kiosks, setKiosks] = useState(mockKiosks);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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
                <DialogTitle className="font-display">Crear Nuevo Kiosko</DialogTitle>
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
                      data-testid="input-kiosk-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Ubicación</Label>
                    <Input
                      id="location"
                      placeholder="Ej: Planta Principal"
                      value={newKiosk.location}
                      onChange={(e) => setNewKiosk({ ...newKiosk, location: e.target.value })}
                      data-testid="input-kiosk-location"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Kiosko</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {kioskTypes.map((type) => {
                      const Icon = kioskIcons[type.id];
                      const isSelected = newKiosk.type === type.id;
                      return (
                        <button
                          key={type.id}
                          onClick={() => setNewKiosk({ ...newKiosk, type: type.id })}
                          className={cn(
                            "p-4 rounded-xl border-2 text-left transition-all",
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50 hover:bg-muted/50"
                          )}
                          data-testid={`button-kiosk-type-${type.id}`}
                        >
                          <Icon
                            className={cn(
                              "w-6 h-6 mb-2",
                              isSelected ? "text-primary" : "text-muted-foreground"
                            )}
                          />
                          <p className="font-medium text-sm">{type.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {type.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Módulos Disponibles</Label>
                  <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-muted/50">
                    {mockModules.map((module) => (
                      <div
                        key={module.id}
                        className="flex items-center space-x-3"
                      >
                        <Checkbox
                          id={module.id}
                          checked={newKiosk.modules.includes(module.id)}
                          onCheckedChange={() => toggleModule(module.id)}
                          data-testid={`checkbox-module-${module.id}`}
                        />
                        <label
                          htmlFor={module.id}
                          className="text-sm font-medium cursor-pointer flex-1"
                        >
                          {module.name}
                          <span className="block text-xs text-muted-foreground font-normal">
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
                <Button onClick={handleCreateKiosk} data-testid="button-confirm-create-kiosk">
                  Crear y Generar Magic Link
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
                  "overflow-hidden transition-all hover:shadow-lg",
                  kiosk.status === "online" && "ring-1 ring-success/30"
                )}
                data-testid={`kiosk-card-${kiosk.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          kiosk.status === "online"
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">
                          {kiosk.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{kiosk.location}</p>
                      </div>
                    </div>
                    <StatusBadge status={kiosk.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-1.5">
                    {kiosk.modules.map((module) => (
                      <Badge key={module} variant="secondary" className="text-xs">
                        {module}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Última conexión</span>
                    <span className="font-medium">{kiosk.lastPing}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => generateMagicLink(kiosk.id)}
                      data-testid={`button-copy-link-${kiosk.id}`}
                    >
                      <Link2 className="w-4 h-4 mr-1" />
                      Magic Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      data-testid={`button-open-kiosk-${kiosk.id}`}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Abrir
                    </Button>
                    <Button variant="ghost" size="icon" className="w-9 h-9">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Card className="border-dashed border-2 hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer flex items-center justify-center min-h-[280px]">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="text-center p-6"
              data-testid="button-add-kiosk-card"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-muted-foreground">Agregar Kiosko</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Crea una nueva terminal
              </p>
            </button>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
