import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/shared/StatCard";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  Factory,
  Plus,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  ArrowRight,
  Package,
  Zap,
  Users,
  AlertCircle,
  RefreshCw,
  Eye,
  Workflow,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";

export default function Production() {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/cpe/processes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create process");
      return res.json();
    },
    onSuccess: () => {
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/cpe/processes"] });
      toast({ title: "Proceso Creado", description: "El proceso ha sido definido exitosamente." });
    },
  });

  const { data: processes, isLoading } = useQuery({
    queryKey: ["/api/cpe/processes"],
    queryFn: async () => {
      if (!session?.access_token) return [];
      const res = await fetch("/api/cpe/processes", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!session?.access_token
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/hr/employees"],
    queryFn: async () => {
      const res = await fetch("/api/hr/employees", { headers: { Authorization: `Bearer ${session?.access_token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!session?.access_token
  });

  // Realtime subscription for processes
  useSupabaseRealtime({ table: 'processes', queryKey: ["/api/cpe/processes"] });
  useSupabaseRealtime({ table: 'employees', queryKey: ["/api/hr/employees"] });

  const stats = {
    activeProcesses: processes?.filter((p: any) => p.status === "active").length || 0,
    pendingProcesses: processes?.filter((p: any) => p.status === "pending").length || 0,
    completedToday: 0, // Placeholder until we have completedAt field logic
    efficiency: 100, // Default to 100 or calculate based on non-existent metrics
  };

  return (
    <AppLayout title="Procesamiento de Coco" subtitle="Control de deshuace, pelado y secado">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Procesos Activos"
            value={stats.activeProcesses}
            icon={Factory}
            variant="primary"
          />
          <StatCard
            title="En Espera"
            value={stats.pendingProcesses}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Completados Hoy"
            value={stats.completedToday}
            icon={CheckCircle2}
            variant="success"
          />
          <StatCard
            title="Eficiencia"
            value={`${stats.efficiency}%`}
            icon={Zap}
            trend={5.2}
            trendLabel="vs ayer"
          />
        </div>

        <Tabs defaultValue="processes" className="space-y-6">
          <TabsList>
            <TabsTrigger value="processes" data-testid="tab-processes">Procesos</TabsTrigger>
            <TabsTrigger value="flow" data-testid="tab-flow">Flujo de Producción</TabsTrigger>
            <TabsTrigger value="traceability" data-testid="tab-traceability">Trazabilidad</TabsTrigger>
          </TabsList>

          <TabsContent value="processes" className="space-y-6">

            {/* 
            <Card className="bg-slate-900 border-indigo-500/30 overflow-hidden relative">
               <div className="hidden">PLACEHOLDER FOR OPTICAL SUGGESTION</div>
            </Card> 
            */}

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold">Procesos Definidos</h2>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" data-testid="button-create-process">
                    <Plus className="w-4 h-4" />
                    Crear Proceso
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Proceso</DialogTitle>
                    <DialogDescription>Defina un nuevo flujo de producción.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    createMutation.mutate({
                      name: formData.get("name"),
                      description: formData.get("description"),
                      type: formData.get("type"),
                      isTemplate: false,
                    });
                  }} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre del Proceso</Label>
                      <Input id="name" name="name" required placeholder="Ej. Procesamiento de Coco" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Tipo</Label>
                      <Select name="type" defaultValue="production">
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="production">Producción</SelectItem>
                          <SelectItem value="logistics">Logística</SelectItem>
                          <SelectItem value="quality">Calidad</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea id="description" name="description" placeholder="Detalles del proceso..." />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending ? "Creando..." : "Crear Proceso"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {isLoading ? (
                <div className="col-span-2 text-center py-12 text-muted-foreground">
                  Cargando procesos...
                </div>
              ) : processes?.length === 0 ? (
                <div className="col-span-2 text-center py-12">
                  <p className="text-muted-foreground">No hay procesos definidos.</p>
                </div>
              ) : (
                processes?.map((process: any) => (
                  <Card
                    key={process.id}
                    className={cn(
                      "overflow-hidden transition-all hover:border-primary/50",
                      process.status === "active" && "ring-1 ring-primary/30"
                    )}
                    data-testid={`process-card-${process.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center",
                              "bg-primary/10 text-primary"
                            )}
                          >
                            <Factory className="w-6 h-6" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{process.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {process.duration || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge variant={process.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                          {process.status || 'Definición'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Removed hardcoded Inputs/Outputs until we have that data model connected */}
                      <p className="text-sm text-muted-foreground">{process.description || "Sin descripción"}</p>

                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" variant="outline">
                          Ver Detalles
                        </Button>
                        <Button size="icon" variant="ghost">
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )))}
            </div>
          </TabsContent>

          <TabsContent value="flow" className="space-y-6">
            <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
              <Workflow className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>La visualización de flujo en tiempo real requiere datos de sensores activos.</p>
              <Button variant="outline" className="mt-4">Configurar Sensores</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Personal Disponible
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {employees?.length > 0 ? (
                      employees.map((worker: any) => (
                        <div
                          key={worker.id}
                          className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center font-semibold text-primary">
                            {worker.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2)}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{worker.name}</p>
                            <p className="text-xs text-muted-foreground">{worker.role || "Operario"}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className={cn(
                              "text-[10px]",
                              worker.status === 'active' ? "border-green-500 text-green-500" : "text-muted-foreground"
                            )}>
                              {worker.status === 'active' ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </div>
                        </div>
                      ))) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No hay empleados registrados.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-warning" />
                    Alertas de Producción
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-center py-6 text-muted-foreground text-sm">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-50" />
                    <p>Sin alertas activas.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="traceability" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Trazabilidad Completa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Sistema de Trazabilidad IA</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Cada producto, proceso y movimiento queda registrado para análisis con TensorFlow.
                    Detección de anomalías, predicciones y resolución automática de problemas.
                  </p>
                  <Button className="mt-6 gap-2" data-testid="button-view-analytics">
                    <Zap className="w-4 h-4" />
                    Ver Analítica IA
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
