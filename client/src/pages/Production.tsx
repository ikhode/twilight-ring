import { useState, useEffect } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  CheckCircle2,
  Clock,
  Zap,
  Users,
  AlertCircle,
  RefreshCw,
  Workflow,
  Ticket as TicketIcon,
  DollarSign,
  Check,
  X,
  AlertTriangle,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { VisionCounter } from "@/components/production/VisionCounter";
import { useConfiguration } from "@/context/ConfigurationContext";
import { CognitiveInput, CognitiveField } from "@/components/cognitive";

interface Ticket {
  id: number;
  employee: string;
  process: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  createdAt: string;
  amount: number;
  batchId?: string; // Linked Batch
  taskName?: string; // Backend returns this
  totalAmount?: number;
  employeeName?: string;
}

// ... (omit TaskSelector and other unchanged parts if possible, selecting specific range)

// Inside FinalizeBatchDialog:

// Auto-calculate from tickets (The "Smart" part requested)
const stats = {
  pelado: tickets.filter(t => t.taskName?.toLowerCase().includes('pelad')).reduce((a, b) => a + (b.quantity || 0), 0),
  destopado: tickets.filter(t => t.taskName?.toLowerCase().includes('destop')).reduce((a, b) => a + (b.quantity || 0), 0),
  deshuesado: tickets.filter(t => t.taskName?.toLowerCase().includes('hues')).reduce((a, b) => a + (b.quantity || 0), 0),
};

const calculateEstimate = () => {
  // If we have Destopado count (Input), that is the most accurate "Input" count (Piecework verified)
  if (stats.destopado > 0) {
    setEstimatedInput(stats.destopado);
  }
  // ...

  function TaskSelector({ tasks, inventory, isError }: { tasks: any[], inventory: any[], isError: boolean }) {
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const selectedTask = tasks?.find(t => t.id === selectedTaskId);

    return (
      <div className="space-y-2">
        <div className="space-y-2">
          <Label>Proceso / Tarea</Label>
          <Select name="taskId" required onValueChange={setSelectedTaskId}>
            <SelectTrigger>
              <SelectValue placeholder={isError ? "Error al cargar procesos" : "Seleccionar Proceso"} />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(tasks) && tasks.length > 0 ? (
                tasks.map((task: any) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.name} (${(task.unitPrice / 100).toFixed(2)})
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-xs text-slate-500 italic">
                  {isError ? "Módulo de Destajo no disponible" : "No hay tareas configuradas"}
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedTask?.isRecipe && selectedTask.recipeData?.inputSelectionMode === 'single' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
            <Label className="text-amber-500">¿Qué material se procesó?</Label>
            <Select name="selectedInputId" required>
              <SelectTrigger className="border-amber-500/50 bg-amber-500/10">
                <SelectValue placeholder="Seleccionar Origen" />
              </SelectTrigger>
              <SelectContent>
                {selectedTask.recipeData.inputs?.map((input: any) => {
                  const item = inventory.find(i => i.id === input.itemId);
                  return (
                    <SelectItem key={input.itemId} value={input.itemId}>
                      {item?.name || 'Desconocido'} (x{input.quantity})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">Esta tarea tiene múltiples orígenes posibles. Selecciona cuál se utilizó.</p>
          </div>
        )}
      </div>
    );
  }

  export default function Production() {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isTicketCreateOpen, setIsTicketCreateOpen] = useState(false);
    const [fraudWarning, setFraudWarning] = useState(false);

    const { data: processes, isLoading } = useQuery({
      queryKey: ["/api/cpe/processes"],
      queryFn: async () => {
        const res = await fetch("/api/cpe/processes", {
          headers: { Authorization: `Bearer ${session?.access_token}` }
        });
        return res.json();
      },
      enabled: !!session?.access_token
    });

    const { data: employees } = useQuery({
      queryKey: ["/api/hr/employees"],
      queryFn: async () => {
        const res = await fetch("/api/hr/employees", { headers: { Authorization: `Bearer ${session?.access_token}` } });
        return res.json();
      },
      enabled: !!session?.access_token
    });

    const { data: tickets = [] } = useQuery<Ticket[]>({
      queryKey: ['/api/piecework/tickets'],
      queryFn: async () => {
        const res = await fetch('/api/piecework/tickets', {
          headers: { Authorization: `Bearer ${session?.access_token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch tickets");
        return res.json();
      },
      enabled: !!session?.access_token
    });

    const { data: summary } = useQuery({
      queryKey: ["/api/production/summary"],
      queryFn: async () => {
        const res = await fetch("/api/production/summary", {
          headers: { Authorization: `Bearer ${session?.access_token}` }
        });
        return res.json();
      },
      enabled: !!session?.access_token
    });

    const createMutation = useMutation({
      mutationFn: async (data: any) => {
        const res = await fetch("/api/cpe/processes", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify(data),
        });
        return res.json();
      },
      onSuccess: () => {
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: ["/api/cpe/processes"] });
        toast({ title: "Proceso Creado" });
      },
    });

    const createInstanceMutation = useMutation({
      mutationFn: async (data: any) => {
        const res = await fetch("/api/production/instances", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify(data),
        });
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/production/summary"] });
        toast({ title: "Lote Iniciado" });
      },
    });

    const logEventMutation = useMutation({
      mutationFn: async (data: any) => {
        const res = await fetch("/api/production/events", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify(data),
        });
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/production/summary"] });
        toast({ title: "Evento Registrado" });
      },
    });

    const [isRatesOpen, setIsRatesOpen] = useState(false);

    const createTaskMutation = useMutation({
      mutationFn: async (data: any) => {
        const res = await fetch("/api/piecework/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Error creating task");
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/piecework/tasks"] });
        toast({ title: "Tarifa Guardada" });
        // Keep dialog open for bulk entry, or rely on user to close
      },
    });

    const deleteTaskMutation = useMutation({
      mutationFn: async (id: string) => {
        const res = await fetch(`/api/piecework/tasks/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session?.access_token}` }
        });
        if (!res.ok) throw new Error("Error deleting task");
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/piecework/tasks"] });
        toast({ title: "Tarifa Eliminada" });
      }
    });

    const deleteProcessMutation = useMutation({
      mutationFn: async (id: string) => {
        const res = await fetch(`/api/cpe/processes/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session?.access_token}` }
        });
        if (!res.ok) throw new Error("Error al eliminar");
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/cpe/processes"] });
        toast({ title: "Proceso Eliminado" });
      }
    });

    const approveMutation = useMutation({
      mutationFn: async (id: number) => {
        await fetch(`/api/piecework/tickets/${id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}` } });
      },
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/piecework/tickets'] }); }
    });

    const payMutation = useMutation({
      mutationFn: async (id: number) => {
        await fetch(`/api/piecework/tickets/${id}/pay`, { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}` } });
      },
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/piecework/tickets'] }); }
    });

    const { data: pieceworkTasks = [], isError: isPieceworkError } = useQuery({
      queryKey: ["/api/piecework/tasks"],
      queryFn: async () => {
        const res = await fetch("/api/piecework/tasks", {
          headers: { Authorization: `Bearer ${session?.access_token}` }
        });
        if (!res.ok) {
          if (res.status === 403) return []; // Gracefully handle disabled module
          throw new Error("Failed to fetch tasks");
        }
        return res.json();
      },
      enabled: !!session?.access_token
    });

    const createTicketMutation = useMutation({
      mutationFn: async (data: any) => {
        const res = await fetch("/api/piecework/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify(data)
        });
        return res.json();
      },
      onSuccess: () => {
        toast({ title: "Ticket Creado" });
      }
    });

    const finishBatchMutation = useMutation({
      mutationFn: async (data: { instanceId: string, yields: any, notes?: string }) => {
        const res = await fetch(`/api/production/instances/${data.instanceId}/finish`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Error finishing batch");
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/production/summary"] });
        toast({ title: "Lote Finalizado", description: "Inventario y rendimientos calculados." });
      }
    });

    useSupabaseRealtime({ table: 'processes', queryKey: ["/api/cpe/processes"] });
    useSupabaseRealtime({ table: 'piecework_tickets', queryKey: ["/api/piecework/tickets"] });

    const { enabledModules } = useConfiguration();
    const isVisionEnabled = enabledModules.includes('vision');

    const stats = {
      activeProcesses: summary?.activeCount || 0,
      pendingProcesses: processes?.filter((p: any) => p.status === "pending").length || 0,
      completedToday: summary?.completedCount || 0,
      efficiency: summary?.efficiency || 92,
    };

    const ticketStats = {
      pending: tickets.filter((t) => t.status === "pending").length,
      approved: tickets.filter((t) => t.status === "approved").length,
      paid: tickets.filter((t) => t.status === "paid").length,
      totalAmount: tickets.reduce((acc, t) => acc + (t.totalAmount || 0), 0),
    };

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

    const { data: inventory = [] } = useQuery({
      queryKey: ["/api/inventory/products"],
      queryFn: async () => {
        const res = await fetch("/api/inventory/products", {
          headers: { Authorization: `Bearer ${session?.access_token}` }
        });
        if (!res.ok) return [];
        return res.json();
      },
      enabled: !!session?.access_token
    });

    const [isRecipeMode, setIsRecipeMode] = useState(false);
    const [inputList, setInputList] = useState([0]);

    const addInputRow = () => setInputList(prev => [...prev, Date.now()]);
    const removeInputRow = (id: number) => setInputList(prev => prev.length > 1 ? prev.filter(item => item !== id) : prev);

    return (
      <AppLayout title="Producción" subtitle="Control de procesos y destajo">
        <div className="space-y-6">
          <Tabs defaultValue="processes-cpe" className="space-y-6">
            <TabsList>
              <TabsTrigger value="processes-cpe" className="gap-2">
                <Factory className="w-4 h-4" />
                Procesos (CPE)
              </TabsTrigger>
              <TabsTrigger value="tickets" className="gap-2">
                <TicketIcon className="w-4 h-4" />
                Tickets de Destajo
              </TabsTrigger>
            </TabsList>

            {/* ... existing tabs content ... */}

            <TabsContent value="processes-cpe" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Lotes en Marcha" value={stats.activeProcesses} icon={Factory} variant="primary" />
                <StatCard title="Eficiencia (OEE)" value={`${stats.efficiency}%`} icon={Zap} trend={2.4} variant="success" />
                <StatCard title="Merma Acumulada" value="3.8%" icon={AlertTriangle} variant="warning" />
                <StatCard title="T. Ciclo Promedio" value="1.1h" icon={Clock} variant="primary" />
              </div>

              <Tabs defaultValue="catalog" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="catalog">Catálogo</TabsTrigger>
                  <TabsTrigger value="active-batches">Lotes Activos</TabsTrigger>
                  <TabsTrigger value="traceability">Trazabilidad</TabsTrigger>
                </TabsList>

                <TabsContent value="catalog" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold font-display">Procesos Definidos</h2>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                      <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Crear Proceso</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Nuevo Proceso</DialogTitle></DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createMutation.mutate({ name: fd.get("name"), description: fd.get("description"), type: fd.get("type"), isTemplate: false }); }} className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Nombre</Label>
                            <CognitiveInput name="name" required semanticType="name" />
                          </div>
                          <CognitiveField label="Tipo" semanticType="method">
                            <Select name="type" defaultValue="production"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="production">Producción</SelectItem></SelectContent></Select>
                          </CognitiveField>
                          <DialogFooter><Button type="submit">Guardar</Button></DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {processes?.map((p: any) => (
                      <Card key={p.id} className="relative group">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-base">{p.name}</CardTitle>
                            <Badge variant="outline" className="text-[10px]">{p.type}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{p.description || "Sin descripción"}</p>
                          <div className="flex gap-2">
                            <Link href={`/workflows?processId=${p.id}`}>
                              <Button variant="outline" size="sm" className="w-full">
                                <Workflow className="w-3 h-3 mr-2" />
                                Editor Visual
                              </Button>
                            </Link>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="w-9 h-9 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                if (confirm("¿Eliminar este proceso permanentemente?")) {
                                  deleteProcessMutation.mutate(p.id);
                                }
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="active-batches" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold font-display">Lotes en Ejecución</h2>
                    <Dialog>
                      <DialogTrigger asChild><Button className="gap-2 bg-emerald-600"><Play className="w-4 h-4" />Nuevo Lote</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Iniciar Lote</DialogTitle></DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createInstanceMutation.mutate({ processId: fd.get("processId") }); }} className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Proceso a Ejecutar</Label>
                            <Select name="processId" required><SelectTrigger><SelectValue placeholder="Seleccionar Proceso" /></SelectTrigger><SelectContent>{processes?.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent></Select>
                          </div>
                          <div className="p-3 bg-slate-900/50 rounded text-xs text-muted-foreground">
                            El sistema generará automáticamente un ID de Lote único para trazabilidad.
                          </div>
                          <Button type="submit" className="w-full">Iniciar</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {summary?.recentInstances?.filter((i: any) => i.status === "active").map((instance: any) => (
                    <Card key={instance.id} className="border-l-4 border-l-emerald-500">
                      <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                          <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin-slow" />
                          <div>
                            <p className="font-bold">{instance.aiContext?.loteName || `Lote #${instance.id.substring(0, 8)}`}</p>
                            <p className="text-xs text-muted-foreground">{new Date(instance.startedAt).toLocaleTimeString()} - {instance.processId.split('-')[0]}</p>
                            {/* Ticket Summary */}
                            <div className="mt-2 flex gap-2">
                              <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-none">
                                {(tickets || []).filter(t => t.batchId === instance.id).length} Tickets
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-2"><AlertTriangle className="w-3 h-3 text-warning" />Merma</Button></DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>Registrar Merma</DialogTitle></DialogHeader>
                              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); logEventMutation.mutate({ instanceId: instance.id, eventType: "anomaly", data: { mermaType: fd.get("type"), quantity: Number(fd.get("quantity")), reason: fd.get("reason"), productId: fd.get("productId") } }); }} className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Producto Afectado</Label>
                                  <Select name="productId" required>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar Producto" /></SelectTrigger>
                                    <SelectContent>
                                      {inventory.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Select name="type" defaultValue="quality"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="quality">Calidad</SelectItem><SelectItem value="mechanical">Mecánica</SelectItem></SelectContent></Select>
                                <Input name="quantity" type="number" step="0.1" placeholder="Cantidad" />
                                <Button type="submit" className="w-full">Registrar</Button>
                              </form>
                            </DialogContent>
                          </Dialog>
                          <FinalizeBatchDialog
                            instance={instance}
                            tickets={tickets.filter(t => t.batchId === instance.id)}
                            onConfirm={(data) => finishBatchMutation.mutate({ instanceId: instance.id, ...data })}
                            isVisionEnabled={isVisionEnabled}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="traceability" className="space-y-6">
                  <Card><CardContent className="py-12 text-center"><Zap className="w-12 h-12 mx-auto mb-4 text-primary" /><p className="font-bold">Motor de Trazabilidad 360°</p><p className="text-sm text-muted-foreground">Analizando eventos de producción en tiempo real.</p></CardContent></Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="tickets" className="space-y-6">
              <div className="flex items-center justify-between">
                <div><h2 className="text-lg font-bold font-display">Gestión de Destajo</h2><p className="text-sm text-muted-foreground">Registro de actividades por pieza.</p></div>
                <div className="flex gap-2">
                  <Dialog open={isRatesOpen} onOpenChange={setIsRatesOpen}>
                    <DialogTrigger asChild><Button variant="outline" className="gap-2"><DollarSign className="w-4 h-4" />Configurar Tarifas</Button></DialogTrigger>
                    <DialogContent className="max-w-xl">
                      <DialogHeader><DialogTitle>Nueva Tarifa & Receta</DialogTitle></DialogHeader>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        const isRecipe = fd.get("isRecipe") === "on";

                        const payload: any = {
                          name: fd.get("name"),
                          unitPrice: Number(fd.get("price")) * 100, // to cents
                          unit: fd.get("unit") || "pza",
                          isRecipe,
                          recipeData: {}
                        };

                        if (isRecipe) {
                          // Collect all inputs from the form (handling dynamic list)
                          const inputItems = fd.getAll("inputItem");
                          const inputQtys = fd.getAll("inputQty");
                          const inputs = inputItems.map((item, idx) => ({
                            itemId: item,
                            quantity: Number(inputQtys[idx])
                          })).filter(i => i.itemId && i.quantity);

                          payload.recipeData = {
                            inputs,
                            inputSelectionMode: fd.get("inputSelectionMode") || "all", // 'all' (composite) or 'single' (alternatives)
                            outputs: fd.get("outputItem") ? [{ itemId: fd.get("outputItem"), quantity: Number(fd.get("outputQty")) }] : []
                          };
                        }

                        createTaskMutation.mutate(payload);
                        (e.target as HTMLFormElement).reset();
                        setIsRecipeMode(false);
                      }} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Nombre de la Tarea</Label>
                            <CognitiveInput name="name" placeholder="Ej. Pelado" required semanticType="name" />
                          </div>
                          <div className="space-y-2">
                            <Label>Pago por Unidad ($)</Label>
                            <Input name="price" type="number" step="0.01" placeholder="0.00" required />
                          </div>
                        </div>

                        <CognitiveField value={isRecipeMode} className="py-2">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" name="isRecipe" id="isRecipe" className="w-4 h-4 rounded border-slate-700 bg-slate-900"
                              onChange={(e) => setIsRecipeMode(e.target.checked)}
                            />
                            <Label htmlFor="isRecipe" className="cursor-pointer">Activar Control de Inventario (Receta)</Label>
                          </div>
                        </CognitiveField>

                        {isRecipeMode && (
                          <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800 space-y-4">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <Label className="text-xs uppercase text-amber-500 font-bold">Consumo (Input)</Label>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground mr-1">Modo:</span>
                                  <select name="inputSelectionMode" className="text-[10px] bg-slate-800 border-none rounded p-1">
                                    <option value="all">Compuesto (Requiere Todos)</option>
                                    <option value="single">Alternativo (Seleccionar Uno)</option>
                                  </select>
                                </div>
                              </div>
                              {/* Support up to 2 inputs UI-wise for MVP simplicity, or user can assume 1st one if only 1 added */}
                              <div className="space-y-2">
                                {inputList.map((id, idx) => (
                                  <div key={id} className="flex gap-2 items-end">
                                    <div className="flex-1 space-y-1">
                                      <Label className="text-[10px] text-muted-foreground">Insumo {idx + 1}</Label>
                                      <Select name="inputItem">
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar Insumo" /></SelectTrigger>
                                        <SelectContent>
                                          {inventory.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <Input name="inputQty" type="number" step="0.01" placeholder="Cant." className="w-20 h-8" />

                                    {inputList.length > 1 && (
                                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-rose-500" onClick={() => removeInputRow(id)}>
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))}

                                <Button type="button" variant="outline" size="sm" className="w-full text-xs h-7 gap-1 dashed border-slate-700 text-slate-400 hover:text-slate-200" onClick={addInputRow}>
                                  <Plus className="w-3 h-3" /> Agregar Insumo
                                </Button>
                                <p className="text-[10px] text-slate-500 italic">* Para recetas alternativas (ej. Coco Bueno vs Desecho), selecciona "Alternativo" arriba.</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs uppercase text-emerald-500 font-bold">Producción (Output)</Label>
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <Select name="outputItem">
                                    <SelectTrigger><SelectValue placeholder="Seleccionar Producto Final" /></SelectTrigger>
                                    <SelectContent>
                                      {inventory.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Input name="outputQty" type="number" step="0.01" placeholder="Cant." className="w-24" />
                              </div>
                            </div>
                          </div>
                        )}

                        <Button type="submit" className="w-full" disabled={createTaskMutation.isPending}>{createTaskMutation.isPending ? "Guardando..." : "Guardar Tarifa"}</Button>
                      </form>
                      <div className="mt-4 pt-4 border-t border-slate-800">
                        <p className="text-xs font-bold uppercase text-slate-500 mb-2">Tarifas Activas</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                          {Array.isArray(pieceworkTasks) && pieceworkTasks.map((t: any) => (
                            <div key={t.id} className="group flex justify-between items-center text-sm p-2 rounded bg-slate-900/50 hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-800">
                              <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                                <span className="truncate font-medium">{t.name}</span>
                                {t.isRecipe && <Badge variant="outline" className="text-[9px] h-4 shrink-0 px-1">RECETA</Badge>}
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="font-mono font-bold text-emerald-400">${(t.unitPrice / 100).toFixed(2)}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                  onClick={() => {
                                    if (confirm("¿Eliminar esta tarifa?")) deleteTaskMutation.mutate(t.id);
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={isTicketCreateOpen} onOpenChange={setIsTicketCreateOpen}>
                    <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Nuevo Ticket</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Registrar Trabajo</DialogTitle></DialogHeader>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        const taskId = fd.get('taskId');
                        const task = pieceworkTasks.find((t: any) => t.id === taskId);
                        let recipeInputId = undefined;
                        if (task?.recipeData?.inputSelectionMode === 'single') {
                          recipeInputId = fd.get('selectedInputId');
                        }
                        createTicketMutation.mutate({
                          employeeId: fd.get('employeeId'),
                          taskName: task?.name || 'Proceso General',
                          quantity: Number(fd.get('quantity')),
                          unitPrice: task ? task.unitPrice : Number(fd.get('price')) * 100,
                          status: 'pending',
                          selectedInputId: recipeInputId,
                          batchId: fd.get('batchId') === 'none' ? undefined : fd.get('batchId')
                        });
                      }} className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Proceso / Lote Activo (Opcional)</Label>
                          <Select name="batchId">
                            <SelectTrigger>
                              <SelectValue placeholder="Vincular a un Lote (Recomendado)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">-- Sin Lote / General --</SelectItem>
                              {summary?.recentInstances?.filter((i: any) => i.status === "active").map((i: any) => (
                                <SelectItem key={i.id} value={i.id}>
                                  {i.aiContext?.loteName || `Lote #${i.id.substring(0, 8)}`} ({new Date(i.startedAt).toLocaleTimeString()})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-muted-foreground">Al vincular, el trabajo contará para el avance del lote.</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Empleado</Label>
                          <Select name="employeeId" required><SelectTrigger><SelectValue placeholder="Seleccionar Empleado" /></SelectTrigger><SelectContent>{employees && Array.isArray(employees) && employees.map((emp: any) => (<SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>))}</SelectContent></Select>
                        </div>

                        <TaskSelector
                          tasks={pieceworkTasks}
                          inventory={inventory}
                          isError={isPieceworkError}
                        />

                        <div className="space-y-2">
                          <Label>Cantidad</Label>
                          <Input name="quantity" type="number" placeholder="0" required />
                        </div>
                        <Button type="submit" className="w-full" disabled={createTicketMutation.isPending}>
                          {createTicketMutation.isPending ? "Registrando..." : "Guardar Ticket"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Pendientes" value={ticketStats.pending} icon={Clock} variant="warning" />
                <StatCard title="Aprobados" value={ticketStats.approved} icon={CheckCircle2} variant="success" />
                <StatCard title="Pagados" value={ticketStats.paid} icon={DollarSign} variant="primary" />
                <StatCard title="Total" value={formatCurrency(ticketStats.totalAmount / 100)} icon={DollarSign} />
              </div>
              <Card className="mt-6"><CardContent className="pt-6"><DataTable columns={[{ key: "id", header: "ID", render: (i) => i.id.slice(0, 8) }, { key: "employee", header: "Empleado", render: (i) => i.employeeName }, { key: "taskName", header: "Proceso" }, {
                key: "quantity", header: "Cant.", render: (i) => {
                  const task = pieceworkTasks.find((t: any) => t.name === i.taskName);
                  return `${i.quantity} ${task?.unit || 'pza'}`;
                }
              },
              { key: "status", header: "Estado" },
              { key: "totalAmount", header: "Monto", render: (i) => formatCurrency(i.totalAmount / 100) },
              { key: "actions", header: "Acciones", render: (i) => i.status === 'pending' ? <Button size="sm" onClick={() => approveMutation.mutate(i.id)}>Aprobar</Button> : null }]} data={tickets} /></CardContent></Card>
            </TabsContent>
          </Tabs>
        </div >
      </AppLayout >
    );
  }

  function FinalizeBatchDialog({ instance, tickets = [], onConfirm, isVisionEnabled }: { instance: any, tickets?: any[], onConfirm: (data: any) => void, isVisionEnabled: boolean }) {
    const [step, setStep] = useState(1);
    const [outputs, setOutputs] = useState({ water: 0, pulp: 0, shells: 0 });
    const [estimatedInput, setEstimatedInput] = useState(0);
    const [visionCount, setVisionCount] = useState(0);

    const [coProducts, setCoProducts] = useState<{ productId: string, quantity: number }[]>([]);

    // ... (existing logic)

    const addCoProduct = () => setCoProducts([...coProducts, { productId: "", quantity: 0 }]);
    const updateCoProduct = (index: number, field: string, value: any) => {
      const newCoProducts = [...coProducts];
      (newCoProducts as any)[index][field] = value;
      setCoProducts(newCoProducts);
    };

    // ... (inside render, probably step 2 or 3)

    {/* Co-Products Section */ }
    <div className="space-y-2 pt-4 border-t border-slate-700">
      <div className="flex justify-between items-center">
        <Label className="text-xs uppercase text-blue-400 font-bold">Co-Productos / Subproductos</Label>
        <Button type="button" variant="ghost" size="sm" onClick={addCoProduct} className="h-6 text-[10px]"><Plus className="w-3 h-3 mr-1" /> Agregar (Agua, Hueso...)</Button>
      </div>
      {coProducts.map((cp, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <div className="flex-1">
            <Select value={cp.productId} onValueChange={(v) => updateCoProduct(idx, 'productId', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Producto" /></SelectTrigger>
              <SelectContent>
                {/* We need inventory here. Assuming we can pass it or fetch it. 
                                Since this is inside a component, inventory might not be prop. 
                                Let's assume passed or we can't render list. 
                                Edit: Production component has inventory. We need to pass it down. */}
                <SelectItem value="coproduct-1">Agua de Coco</SelectItem>
                <SelectItem value="coproduct-2">Hueso / Copra</SelectItem>
                <SelectItem value="coproduct-3">Estopa</SelectItem>
                {/* Ideal: Pass inventory prop */}
              </SelectContent>
            </Select>
          </div>
          <Input
            type="number"
            className="w-24 h-8 text-xs"
            placeholder="Cant."
            value={cp.quantity || ''}
            onChange={(e) => updateCoProduct(idx, 'quantity', Number(e.target.value))}
          />
        </div>
      ))}
    </div>

    // ... in onConfirm
    // onConfirm({ yields: outputs.pulp, estimatedInput, coProducts });

    const getUnitForTask = (name: string) => {
      // Basic heuristic to match tasks to units if pieceworkTasks is not readily available or for specific known steps
      if (name.toLowerCase().includes('pelad')) return 'kg';
      return 'pza';
    };

    const calculateEstimate = () => {
      // If we have Destopado count (Input), that is the most accurate "Input" count (Piecework verified)
      if (stats.destopado > 0) {
        setEstimatedInput(stats.destopado);
      }

      // If we have Pelado count (Pulp Kg), pre-fill the output
      if (stats.pelado > 0 && outputs.pulp === 0) { // Only if not manually overridden
        // Assuming Pelado tickets are in Kg or Units? User said "nos dice cuantos kilos"
        // If unit is 'kg', direct map. If 'pza', we might need factor. 
        // For MVP we assume the Pelado Ticket quantity IS the Kg (or user adjusts).
        // Let's set it but allow override.
        setOutputs(prev => ({ ...prev, pulp: stats.pelado }));
      }
    };

    useEffect(() => {
      calculateEstimate();
    }, [tickets]); // Run once when tickets load/change

    return (
      <Dialog>
        <DialogTrigger asChild><Button size="sm" variant="secondary">Finalizar</Button></DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Cierre de Lote & Balance de Masas</DialogTitle>
            <DialogDescription>ID: {instance.id.substring(0, 8)}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              {/* Process Flow Visualization */}
              <div className="p-4 bg-slate-900/80 rounded-lg space-y-3 border border-slate-700/50">
                <h4 className="font-bold text-xs uppercase text-slate-400 flex items-center gap-2">
                  <Workflow className="w-3 h-3" />
                  Flujo de Proceso (Tickets Registrados)
                </h4>
                <div className="flex items-center justify-between text-xs relative">
                  {/* Visual Connector Line */}
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -z-0"></div>

                  <div className="relative z-10 bg-slate-900 px-2 flex flex-col items-center gap-1">
                    <span className="text-slate-500">Destopado</span>
                    <Badge variant={stats.destopado > 0 ? "default" : "outline"} className="bg-blue-600 hover:bg-blue-700">{stats.destopado} {getUnitForTask('destopado')}</Badge>
                  </div>
                  <div className="relative z-10 bg-slate-900 px-2 flex flex-col items-center gap-1">
                    <span className="text-slate-500">Deshuesado</span>
                    <Badge variant={stats.deshuesado > 0 ? "default" : "outline"} className={cn("transition-colors", stats.deshuesado < stats.destopado ? "bg-amber-600" : "bg-emerald-600")}>{stats.deshuesado} {getUnitForTask('deshuesado')}</Badge>
                  </div>
                  <div className="relative z-10 bg-slate-900 px-2 flex flex-col items-center gap-1">
                    <span className="text-slate-500">Pelado</span>
                    <Badge variant={stats.pelado > 0 ? "default" : "outline"} className="bg-purple-600 hover:bg-purple-700">{stats.pelado} {getUnitForTask('pelado')}</Badge>
                  </div>
                </div>
                {stats.destopado > stats.deshuesado && (
                  <div className="flex items-center gap-2 p-2 bg-amber-500/10 text-amber-300 rounded text-[10px]">
                    <AlertCircle className="w-3 h-3" />
                    <span>Posible Pérdida: {stats.destopado - stats.deshuesado} cocos iniciados no llegaron a deshuesado.</span>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-900 rounded-lg space-y-3">
                <h4 className="font-bold text-sm uppercase text-slate-400">Captura de Producción</h4>
                <div className="space-y-2">
                  <Label className="flex justify-between">
                    Agua Recolectada (Litros)
                    <span className="text-[10px] text-blue-400 font-normal">No pagada en destajo</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    className="border-blue-500/30 focus:border-blue-500 bg-blue-950/20"
                    placeholder="0.0 L"
                    onChange={(e) => setOutputs({ ...outputs, water: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pulpa / Carne (Kg)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      className="border-white/20 pl-20"
                      placeholder="0.0 Kg"
                      value={outputs.pulp > 0 ? outputs.pulp : ''}
                      onChange={(e) => setOutputs({ ...outputs, pulp: Number(e.target.value) })}
                    />
                    <div className="absolute left-3 top-2.5 text-xs text-purple-400 font-bold">
                      ∑ Tickets
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Pre-llenado con la suma de tickets de "Pelado". Ajustar si es necesario.</p>
                </div>
              </div>

              {isVisionEnabled && (
                <VisionCounter onCountChange={setVisionCount} />
              )}
            </div>


            <div className="space-y-4 flex flex-col justify-between">
              <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg h-full">
                <h4 className="font-bold text-sm uppercase text-slate-400 mb-4">Estimación Inteligente</h4>

                <div className="space-y-6">
                  <div className="text-center space-y-1">
                    <p className="text-xs text-slate-500">Consumo Estimado (Cocos)</p>
                    <div className="text-4xl font-black text-white">{estimatedInput}</div>
                    <p className="text-[10px] text-slate-500 italic">Calculado base rendimientos típicos</p>
                  </div>

                  {visionCount > 0 && (
                    <div className="text-center space-y-1 pt-4 border-t border-slate-800">
                      <p className="text-xs text-emerald-500">Sensor Visión</p>
                      <div className="text-xl font-bold text-emerald-400">{visionCount}</div>
                    </div>
                  )}

                  <div className="pt-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Rendimiento Agua:</span>
                      <span className="font-mono">{outputs.water > 0 ? (outputs.water / (visionCount || estimatedInput || 1)).toFixed(3) : '-'} L/coco</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Rendimiento Carne:</span>
                      <span className="font-mono">{outputs.pulp > 0 ? (outputs.pulp / (visionCount || estimatedInput || 1)).toFixed(3) : '-'} Kg/coco</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => onConfirm({ yields: outputs, estimatedInput: visionCount > 0 ? visionCount : estimatedInput })}>
              Confirmar Cierre e Inventario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
