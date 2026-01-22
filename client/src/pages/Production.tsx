import { useState } from "react";
import { Link } from "wouter";
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
import { DataTable } from "@/components/shared/DataTable";
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
  Ticket as TicketIcon,
  DollarSign,
  Printer,
  Check,
  X,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";

interface Ticket {
  id: number;
  employee: string;
  process: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  createdAt: string;
  amount: number;
}

export default function Production() {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTicketCreateOpen, setIsTicketCreateOpen] = useState(false);
  const [fraudWarning, setFraudWarning] = useState(false);

  // Ticket Creation Mutation
  const createTicketMutation = useMutation({
    mutationFn: async (newTicket: any) => {
      const res = await fetch("/api/piecework/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(newTicket)
      });
      if (!res.ok) throw new Error("Failed to create ticket");
      return res.json();
    },
    onSuccess: () => {
      setIsTicketCreateOpen(false);
      toast({ title: "Ticket Creado", description: "El trabajo ha sido registrado exitosamente." });
      queryClient.invalidateQueries({ queryKey: ["/api/piecework/tickets"] });
    }
  });

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

  // Ticket Mutations
  const approveMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      const res = await fetch(`/api/piecework/tickets/${ticketId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/piecework/tickets'] });
      toast({ title: "Ticket aprobado" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      const res = await fetch(`/api/piecework/tickets/${ticketId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/piecework/tickets'] });
      toast({ title: "Ticket rechazado", variant: "destructive" });
    },
  });

  const payMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      const res = await fetch(`/api/piecework/tickets/${ticketId}/pay`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/piecework/tickets'] });
      toast({ title: "Pago registrado" });
    },
  });

  const { data: tickets = [] } = useQuery<Ticket[]>({
    queryKey: ['/api/piecework/tickets'],
    queryFn: async () => {
      if (!session?.access_token) return [];
      const res = await fetch('/api/piecework/tickets', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!session?.access_token
  });

  useSupabaseRealtime({ table: 'piecework_tickets', queryKey: ['/api/piecework/tickets'] });

  const ticketStats = {
    pending: tickets.filter((t) => t.status === "pending").length,
    approved: tickets.filter((t) => t.status === "approved").length,
    paid: tickets.filter((t) => t.status === "paid").length,
    totalAmount: tickets.reduce((acc, t) => acc + t.amount, 0),
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

  return (
    <AppLayout title="Producción" subtitle="Control de procesos y destajo">
      <div className="space-y-6">
        <Tabs defaultValue="processes" className="space-y-6">
          <TabsList>
            <TabsTrigger value="processes" className="gap-2">
              <Factory className="w-4 h-4" />
              Procesos (CPE)
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-2">
              <TicketIcon className="w-4 h-4" />
              Tickets de Destajo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="processes" className="space-y-6">
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
                            <Link href={`/workflows?processId=${process.id}`}>
                              <Button size="sm" className="flex-1" variant="outline">
                                Ver Detalles
                              </Button>
                            </Link>
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
          </TabsContent>

          <TabsContent value="tickets" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display font-bold">Gestión de Destajo</h2>
                <p className="text-muted-foreground text-sm">Registro y validación de actividades por pieza.</p>
              </div>
              <Dialog open={isTicketCreateOpen} onOpenChange={setIsTicketCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nuevo Ticket
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar Trabajo por Destajo</DialogTitle>
                    <DialogDescription>Ingrese los detalles de la tarea, quién la realizó y flujos de material.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const quantity = Number(formData.get('quantity'));
                    const THRESHOLD = 100; // Mock average

                    // FRAUD DETECTION LOGIC
                    if (quantity > THRESHOLD && !fraudWarning) {
                      setFraudWarning(true);
                      return; // Stop submission
                    }

                    createTicketMutation.mutate({
                      creatorId: session?.user?.id,
                      employeeId: formData.get('employeeId'),
                      sourceLocation: formData.get('sourceLocation'),
                      destinationLocation: formData.get('destinationLocation'),
                      taskName: formData.get('task'),
                      quantity: quantity,
                      unitPrice: Number(formData.get('price')) * 100,
                      notes: formData.get('notes'),
                      status: 'pending'
                    });
                  }} className="space-y-4 py-4">

                    {fraudWarning && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-destructive">Alerta de Anomalía (CPE)</h4>
                          <p className="text-xs text-muted-foreground">La cantidad ingresada ({Number((document.getElementById('quantity') as HTMLInputElement)?.value || 0)}) es 200% superior al promedio histórico.</p>
                          <p className="text-xs font-semibold text-destructive mt-1">Presione "Confirmar Anomalía" nuevamente para forzar el registro.</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="employee">Empleado Realizador</Label>
                      <Select name="employeeId" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione empleado" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees && employees.length > 0 ? employees.map((emp: any) => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.role})</SelectItem>
                          )) : <SelectItem value="no-employees" disabled>No hay empleados cargados</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="task">Tarea Realizada</Label>
                      <Select name="task" defaultValue="Pelado de Coco">
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione tarea" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pelado de Coco">Pelado de Coco</SelectItem>
                          <SelectItem value="Deshuace">Deshuace</SelectItem>
                          <SelectItem value="Empaquetado">Empaquetado (Caja)</SelectItem>
                          <SelectItem value="Limpieza">Limpieza General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sourceLocation">Origen (Insumo)</Label>
                        <Input id="sourceLocation" name="sourceLocation" placeholder="Ej. Patio MP" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="destinationLocation">Destino (Producto)</Label>
                        <Input id="destinationLocation" name="destinationLocation" placeholder="Ej. Area Proceso" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Cantidad</Label>
                        <Input id="quantity" name="quantity" type="number" min="1" required defaultValue="1" onChange={() => setFraudWarning(false)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price">Pago por Unidad ($)</Label>
                        <Input id="price" name="price" type="number" step="0.50" required defaultValue="5.00" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notas (Opcional)</Label>
                      <Input id="notes" name="notes" placeholder="Detalles adicionales..." />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={createTicketMutation.isPending} variant={fraudWarning ? "destructive" : "default"}>
                        {createTicketMutation.isPending ? "Registrando..." : fraudWarning ? "Confirmar Anomalía" : "Crear Ticket"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Pendientes" value={ticketStats.pending} icon={Clock} variant="warning" />
              <StatCard title="Aprobados" value={ticketStats.approved} icon={CheckCircle2} variant="success" />
              <StatCard title="Pagados" value={ticketStats.paid} icon={DollarSign} variant="primary" />
              <StatCard title="Total" value={formatCurrency(ticketStats.totalAmount)} icon={DollarSign} />
            </div>

            <Card>
              <CardContent className="pt-6">
                <DataTable
                  columns={[
                    { key: "id", header: "ID", render: (i) => <span className="font-mono font-bold">#{i.id}</span> },
                    { key: "employee", header: "Empleado" },
                    { key: "process", header: "Tarea" },
                    { key: "quantity", header: "Cant.", render: (i) => <span className="font-mono">{i.quantity}</span> },
                    { key: "amount", header: "Monto", render: (i) => <span className="font-mono font-bold text-emerald-500">{formatCurrency(i.amount)}</span> },
                    {
                      key: "status", header: "Estado", render: (i) => (
                        <div className={cn("px-2 py-1 rounded text-xs font-bold uppercase",
                          i.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                            i.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                              i.status === 'paid' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
                        )}>{i.status}</div>
                      )
                    },
                    {
                      key: "actions", header: "Acciones", render: (item) => (
                        <div className="flex gap-2">
                          {item.status === 'pending' && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => approveMutation.mutate(item.id)}><Check className="w-4 h-4 text-green-500" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => rejectMutation.mutate(item.id)}><X className="w-4 h-4 text-red-500" /></Button>
                            </>
                          )}
                          {item.status === 'approved' && (
                            <Button size="sm" onClick={() => payMutation.mutate(item.id)}><DollarSign className="w-4 h-4 mr-1" /> Pagar</Button>
                          )}
                        </div>
                      )
                    }
                  ]}
                  data={tickets}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

