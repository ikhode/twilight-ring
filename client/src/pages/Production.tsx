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
  AlertTriangle,
  Trash2,
  Sparkles,
  Info,
  User,
  Loader2,
  Package,
  Layers,
  ArrowRight,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { VisionCounter } from "@/components/production/VisionCounter";
import { printThermalTicket } from "@/lib/printer";

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



/**
 *
 * @param root0
 * @param root0.tasks
 * @param root0.inventory
 * @param root0.isError
 */
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

/**
 *
 */
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
      setIsStartLotOpen(false);
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

  const [editingProcess, setEditingProcess] = useState<any>(null); // Process being edited
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);

  // Local state for visual selection in dialog
  const [localOutputIds, setLocalOutputIds] = useState<string[]>([]);
  const [localInputId, setLocalInputId] = useState<string | null>(null);

  // Sync state when opening dialog
  useEffect(() => {
    if (isProcessDialogOpen) {
      if (editingProcess) {
        setLocalOutputIds(editingProcess.workflowData?.outputProductIds || []);
        setLocalInputId(editingProcess.workflowData?.inputProductId || null);
      } else {
        setLocalOutputIds([]);
        setLocalInputId(null);
      }
    }
  }, [isProcessDialogOpen, editingProcess]);

  const updateProcessMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/cpe/processes/${editingProcess.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error updating process");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cpe/processes"] });
      setIsProcessDialogOpen(false);
      setEditingProcess(null);
      toast({ title: "Proceso Actualizado" });
    },
  });

  const [isRatesOpen, setIsRatesOpen] = useState(false);
  const [isStartLotOpen, setIsStartLotOpen] = useState(false);

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

  /* ----------------------------------------------------------------------------------
   *  LOGIC FOR REPORTING PRODUCTION & GENERATING TICKETS
   * ---------------------------------------------------------------------------------- */
  const [selectedBatchForReport, setSelectedBatchForReport] = useState<any>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);



  const reportProductionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/production/report", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to report production");
      return res.json();
    },
    onSuccess: (data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/production/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/piecework/tickets"] });
      setIsReportDialogOpen(false);

      // Auto-print ticket logic
      const processName = processes?.find((p: any) => p.id === selectedBatchForReport?.processId)?.name;
      const employee = employees?.find((e: any) => e.id === variables.employeeId);
      const employeeName = employee ? (employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()) : "Empleado";

      printThermalTicket({
        id: data.id || Date.now(),
        employeeName,
        batchId: selectedBatchForReport?.id,
        concept: processName,
        quantity: variables.quantity,
        amount: data.totalAmount, // Backend returns totalAmount
        unitPrice: data.unitPrice,
        unit: variables.unit
      });

      setSelectedBatchForReport(null);
      toast({ title: "Ticket Generado", description: "Se ha enviado a la impresora térmica." });
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

  /**
   *
   * @param amount
   */
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

  /**
   *
   */
  const addInputRow = () => { setInputList(prev => [...prev, Date.now()]); };
  /**
   *
   * @param id
   */
  const removeInputRow = (id: number) => { setInputList(prev => prev.length > 1 ? prev.filter(item => item !== id) : prev); };

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
                  <Button className="gap-2" onClick={() => { setEditingProcess(null); setIsProcessDialogOpen(true); }}>
                    <Plus className="w-4 h-4" /> Crear Proceso
                  </Button>

                  <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
                    <DialogContent className="max-w-2xl bg-slate-950 border-slate-800">
                      <DialogHeader><DialogTitle>{editingProcess ? "Configuración del Proceso" : "Nuevo Proceso"}</DialogTitle></DialogHeader>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);

                        const payload = {
                          name: fd.get("name"),
                          description: fd.get("description"),
                          type: fd.get("type"),
                          workflowData: {
                            ...(editingProcess?.workflowData || {}),
                            inputProductId: localInputId,
                            outputProductIds: localOutputIds,
                            outputProductId: localOutputIds.length > 0 ? localOutputIds[0] : null,
                            piecework: {
                              enabled: fd.get("piecework_enabled") === "on",
                              rate: Math.round(Number(fd.get("rate") || 0) * 100),
                              unit: fd.get("unit"),
                              basis: fd.get("basis")
                            }
                          }
                        };

                        if (editingProcess) {
                          updateProcessMutation.mutate(payload);
                        } else {
                          createMutation.mutate(payload);
                        }
                      }} className="py-4">

                        <Tabs defaultValue="general" className="w-full">
                          <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-900/50 p-1 rounded-lg">
                            <TabsTrigger value="general" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-xs">Información General</TabsTrigger>
                            <TabsTrigger value="transform" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-xs">Transformación</TabsTrigger>
                            <TabsTrigger value="payment" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-xs">Pago / Destajo</TabsTrigger>
                          </TabsList>

                          <TabsContent value="general" className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="space-y-2">
                              <Label className="text-xs uppercase text-slate-500 font-bold">Nombre del Proceso</Label>
                              <Input name="name" defaultValue={editingProcess?.name} required placeholder="Ej. Destopado Manual" className="bg-slate-900 border-slate-700 h-11 text-lg" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs uppercase text-slate-500 font-bold">Descripción Operativa</Label>
                              <Textarea name="description" defaultValue={editingProcess?.description} placeholder="Instrucciones para el operario..." className="bg-slate-900 border-slate-700 resize-none min-h-[100px]" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs uppercase text-slate-500 font-bold">Tipo de Control</Label>
                              <Select name="type" defaultValue={editingProcess?.type || "production"}>
                                <SelectTrigger className="bg-slate-900 border-slate-700 h-11"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="production">Producción Estándar</SelectItem>
                                  <SelectItem value="quality">Inspección de Calidad</SelectItem>
                                  <SelectItem value="logistics">Movimiento Logístico</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TabsContent>

                          <TabsContent value="transform" className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="w-4 h-4 text-emerald-400" />
                                <Label className="text-xs font-black uppercase text-slate-400">Productos Resultantes (Output)</Label>
                              </div>
                              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {inventory.map((i: any) => {
                                  const isSelected = localOutputIds.includes(i.id);
                                  return (
                                    <div
                                      key={i.id}
                                      onClick={() => setLocalOutputIds(prev => prev.includes(i.id) ? prev.filter(x => x !== i.id) : [...prev, i.id])}
                                      className={cn(
                                        "relative p-3 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] flex items-center justify-between group",
                                        isSelected
                                          ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]"
                                          : "bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                                      )}
                                    >
                                      <span className={cn("text-xs font-medium", isSelected ? "text-emerald-300" : "text-slate-400")}>{i.name}</span>
                                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                    </div>
                                  )
                                })}
                              </div>
                              <p className="text-[10px] text-slate-500 flex items-center gap-2">
                                <Info className="w-3 h-3" />
                                Al finalizar un lote, se incrementará el inventario de los productos seleccionados.
                              </p>
                            </div>

                            <div className="relative">
                              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                              <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-950 px-2 text-slate-600 font-bold">Consume (Opcional)</span></div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Layers className="w-4 h-4 text-blue-400" />
                                <Label className="text-xs font-black uppercase text-slate-400">Materia Prima (Input)</Label>
                              </div>
                              <Select value={localInputId || "none"} onValueChange={(v) => setLocalInputId(v === "none" ? null : v)}>
                                <SelectTrigger className="bg-slate-900 border-slate-800 h-11">
                                  <SelectValue placeholder="Seleccionar insumo..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-- Sin consumo de inventario --</SelectItem>
                                  {inventory.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </TabsContent>

                          <TabsContent value="payment" className="space-y-6 pt-2 animate-in fade-in zoom-in-95 duration-300">
                            <div className="bg-slate-900/30 border border-emerald-500/20 rounded-xl p-5 space-y-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-emerald-500" />
                                    Habilitar Pago a Destajo
                                  </h4>
                                  <p className="text-[10px] text-slate-400 mt-1">Generar tickets de pago automáticamente al reportar producción.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input type="checkbox" name="piecework_enabled" className="w-5 h-5 accent-emerald-500 rounded cursor-pointer" defaultChecked={editingProcess?.workflowData?.piecework?.enabled} />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-[10px] uppercase font-bold text-slate-500">Tarifa por Unidad ($)</Label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                    <Input name="rate" type="number" step="0.01" defaultValue={(editingProcess?.workflowData?.piecework?.rate || 0) / 100} placeholder="0.00" className="pl-6 bg-slate-950 border-slate-800" />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[10px] uppercase font-bold text-slate-500">Unidad de Medida</Label>
                                  <Select name="unit" defaultValue={editingProcess?.workflowData?.piecework?.unit || "pza"}>
                                    <SelectTrigger className="bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pza">Pieza (Unitario)</SelectItem>
                                      <SelectItem value="kg">Kilogramo (Kg)</SelectItem>
                                      <SelectItem value="100u">Ciento (100 u)</SelectItem>
                                      <SelectItem value="1000u">Millar (1000 u)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="space-y-2 pt-2 border-t border-white/5">
                                <Label className="text-[10px] uppercase font-bold text-slate-500">Base de Cálculo</Label>
                                <div className="grid grid-cols-2 gap-3">
                                  <label className="cursor-pointer">
                                    <input type="radio" name="basis" value="output" className="peer sr-only" defaultChecked={!editingProcess || editingProcess?.workflowData?.piecework?.basis === 'output'} />
                                    <div className="p-3 rounded-lg border border-slate-800 bg-slate-950 peer-checked:border-emerald-500 peer-checked:bg-emerald-500/10 transition-all text-center">
                                      <span className="block text-xs font-bold text-white mb-1">Output</span>
                                      <span className="block text-[10px] text-slate-500">Pagar por lo producido</span>
                                    </div>
                                  </label>
                                  <label className="cursor-pointer">
                                    <input type="radio" name="basis" value="input" className="peer sr-only" defaultChecked={editingProcess?.workflowData?.piecework?.basis === 'input'} />
                                    <div className="p-3 rounded-lg border border-slate-800 bg-slate-950 peer-checked:border-blue-500 peer-checked:bg-blue-500/10 transition-all text-center">
                                      <span className="block text-xs font-bold text-white mb-1">Input</span>
                                      <span className="block text-[10px] text-slate-500">Pagar por lo consumido</span>
                                    </div>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>

                        <DialogFooter className="mt-6 border-t border-slate-800 pt-4">
                          <Button type="button" variant="ghost" onClick={() => setIsProcessDialogOpen(false)}>Cancelar</Button>
                          <Button type="submit" className="bg-white text-black hover:bg-slate-200 font-bold" disabled={updateProcessMutation.isPending || createMutation.isPending}>
                            {updateProcessMutation.isPending || createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Guardar Configuración"}
                          </Button>
                        </DialogFooter>
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
                          <Button variant="outline" size="sm" className="w-full bg-slate-900/50 hover:bg-slate-800 border-dashed border-slate-700" onClick={() => { setEditingProcess(p); setIsProcessDialogOpen(true); }}>
                            <Workflow className="w-3 h-3 mr-2 text-slate-500" />
                            Configurar / Editar
                          </Button>
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
                  <Dialog open={isStartLotOpen} onOpenChange={setIsStartLotOpen}>
                    <DialogTrigger asChild><Button className="gap-2 bg-emerald-600 shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 hover:scale-105 transition-all"><Play className="w-4 h-4" />Nuevo Lote</Button></DialogTrigger>
                    <DialogContent className="border-emerald-500/20 bg-slate-950">
                      <DialogHeader><DialogTitle className="text-emerald-500">Iniciar Nuevo Lote</DialogTitle></DialogHeader>
                      <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createInstanceMutation.mutate({ processId: fd.get("processId") }); }} className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Proceso a Ejecutar</Label>
                          <Select name="processId" required><SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue placeholder="Seleccionar Proceso" /></SelectTrigger><SelectContent>{processes?.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent></Select>
                        </div>
                        <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded text-xs text-emerald-200/70 flex gap-2">
                          <Info className="w-4 h-4 text-emerald-500 shrink-0" />
                          El sistema generará automáticamente un ID de Lote único y comenzará el tracking de tiempo real.
                        </div>
                        <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500" disabled={createInstanceMutation.isPending}>
                          {createInstanceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Iniciar Producción"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {summary?.recentInstances?.filter((i: any) => i.status === "active").map((instance: any) => {
                    const activeTickets = tickets.filter(t => t.batchId === instance.id);
                    const uniqueWorkers = new Set(activeTickets.map(t => t.employeeName)).size;
                    const processName = processes?.find((p: any) => p.id === instance.processId)?.name || 'Proceso';

                    return (
                      <Card key={instance.id} className="border-l-4 border-l-emerald-500 bg-slate-900/40 hover:bg-slate-900/60 transition-all group overflow-hidden relative">
                        {/* Background Progress Hint */}
                        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500/5 to-transparent w-[30%] -skew-x-12 opacity-50 z-0 pointer-events-none" />

                        <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between py-6 relative z-10 gap-6">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-emerald-500/10 rounded-xl relative">
                              <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin-slow" />
                              <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-lg text-white tracking-tight">{instance.aiContext?.loteName || `Lote #${instance.id.substring(0, 8)}`}</h3>
                                <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400 bg-emerald-500/5 uppercase tracking-wider">{processName}</Badge>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(instance.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="flex items-center gap-1"><Factory className="w-3 h-3" /> {instance.processId.split('-')[0]}</span>
                              </div>

                              {/* Live Metrics */}
                              <div className="flex items-center gap-2 mt-3">
                                <div className="flex -space-x-2">
                                  {/* Mock Avatars for active workers */}
                                  {activeTickets.length > 0 ? (
                                    Array.from({ length: Math.min(3, uniqueWorkers) }).map((_, i) => (
                                      <div key={i} className="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold text-slate-400">
                                        <User className="w-3 h-3" />
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-slate-600 italic">Esperando operarios...</span>
                                  )}
                                  {uniqueWorkers > 3 && <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold text-slate-400">+{uniqueWorkers - 3}</div>}
                                </div>
                                {activeTickets.length > 0 && <span className="text-[10px] text-emerald-400/80 font-bold ml-1">{activeTickets.length} Piezas procesadas</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full md:w-auto">
                            <Dialog>
                              <DialogTrigger asChild><Button variant="ghost" size="sm" className="gap-2 text-warning hover:text-warning hover:bg-warning/10"><AlertTriangle className="w-4 h-4" /> Reportar Merma</Button></DialogTrigger>
                              <DialogContent className="bg-slate-950 border-warning/20">
                                <DialogHeader><DialogTitle className="text-warning">Registrar Merma / Incidencia</DialogTitle></DialogHeader>
                                <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); logEventMutation.mutate({ instanceId: instance.id, eventType: "anomaly", data: { mermaType: fd.get("type"), quantity: Number(fd.get("quantity")), reason: fd.get("reason"), productId: fd.get("productId") } }); }} className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Producto Afectado</Label>
                                    <Select name="productId" required>
                                      <SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue placeholder="Seleccionar Producto" /></SelectTrigger>
                                      <SelectContent>
                                        {inventory.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <CognitiveField label="Tipo" semanticType="category">
                                      <Select name="type" defaultValue="quality"><SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="quality">Calidad</SelectItem><SelectItem value="mechanical">Mecánica</SelectItem></SelectContent></Select>
                                    </CognitiveField>
                                    <div className="space-y-2">
                                      <Label>Cantidad</Label>
                                      <Input name="quantity" type="number" step="0.1" placeholder="0.0" className="bg-slate-900 border-slate-800" />
                                    </div>
                                  </div>
                                  <Input name="reason" placeholder="Razón / Observaciones" className="bg-slate-900 border-slate-800" />
                                  <Button type="submit" className="w-full bg-warning hover:bg-warning/90 text-black font-bold">Registrar Incidencia</Button>
                                </form>
                              </DialogContent>
                            </Dialog>

                            <div className="h-8 w-px bg-white/10 hidden md:block" />

                            <Button
                              size="sm"
                              className="gap-2 bg-emerald-600/20 text-emerald-400 border border-emerald-600/50 hover:bg-emerald-600 hover:text-white"
                              onClick={() => { setSelectedBatchForReport(instance); setIsReportDialogOpen(true); }}
                            >
                              <Users className="w-4 h-4" /> Reportar Avance
                            </Button>

                            <div className="h-8 w-px bg-white/10 hidden md:block" />

                            <FinalizeBatchDialog
                              instance={instance}
                              process={processes?.find((p: any) => p.id === instance.processId)}
                              inventory={inventory}
                              tickets={tickets.filter(t => t.batchId === instance.id)}
                              onConfirm={(data) => { finishBatchMutation.mutate({ instanceId: instance.id, ...data }); }}
                              isVisionEnabled={isVisionEnabled}
                              isLoading={finishBatchMutation.isPending}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                  <DialogContent className="max-w-md bg-slate-950 border-emerald-500/20">
                    <DialogHeader>
                      <DialogTitle className="text-emerald-500 flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Reportar Producción (Destajo)
                      </DialogTitle>
                    </DialogHeader>
                    {selectedBatchForReport && (
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        reportProductionMutation.mutate({
                          instanceId: selectedBatchForReport.id,
                          employeeId: fd.get("employeeId"),
                          quantity: Number(fd.get("quantity")),
                          unit: "pza" // Should come from process config
                        });
                      }} className="space-y-4 py-2">
                        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 mb-2">
                          <div className="text-xs text-slate-500 uppercase font-bold mb-1">Lote Activo</div>
                          <div className="font-mono text-sm text-white">{selectedBatchForReport.aiContext?.loteName || selectedBatchForReport.id.substring(0, 8)}</div>
                          {(() => {
                            const proc = processes?.find((p: any) => p.id === selectedBatchForReport.processId);
                            const rate = proc?.workflowData?.piecework?.rate || 0;
                            const unit = proc?.workflowData?.piecework?.unit || 'u';
                            return (
                              <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                Tarifa Configurada: <b>${(rate / 100).toFixed(2)} / {unit}</b>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="space-y-2">
                          <Label>Empleado</Label>
                          <Select name="employeeId" required>
                            <SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue placeholder="Seleccionar Operario" /></SelectTrigger>
                            <SelectContent>
                              {employees?.map((emp: any) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Sin Nombre'}
                                </SelectItem>
                              ))}
                              {(!employees || employees.length === 0) && <div className="p-2 text-xs text-muted-foreground text-center">No hay empleados registrados</div>}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Cantidad Procesada</Label>
                          <div className="flex items-center gap-3">
                            <Input
                              name="quantity"
                              type="number"
                              step="1"
                              placeholder="0"
                              required
                              className="bg-slate-900 border-slate-800 text-lg font-bold"
                              onChange={(e) => {
                                // Live estimate logic can be improved with separate state, using simple DOM viz for now is tricky in React without state
                                // Assuming user trusts the configured rate displayed above
                              }}
                            />
                            <span className="text-sm font-bold text-slate-500">
                              {processes?.find((p: any) => p.id === selectedBatchForReport.processId)?.workflowData?.piecework?.unit || 'pza'}
                            </span>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold" disabled={reportProductionMutation.isPending}>
                            {reportProductionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar & Generar Ticket"}
                          </Button>
                        </DialogFooter>
                      </form>
                    )}
                  </DialogContent>
                </Dialog>
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

              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Pendientes" value={ticketStats.pending} icon={Clock} variant="warning" />
              <StatCard title="Aprobados" value={ticketStats.approved} icon={CheckCircle2} variant="success" />
              <StatCard title="Pagados" value={ticketStats.paid} icon={DollarSign} variant="primary" />
              <StatCard title="Total" value={formatCurrency(ticketStats.totalAmount / 100)} icon={DollarSign} />
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 overflow-hidden mt-6">
              <DataTable
                data={tickets || []}
                columns={[
                  { key: "id", header: "Folio", render: (item: any) => <span className="font-mono text-xs text-slate-500">#{item.id.toString().substring(0, 8)}</span> },
                  { key: "createdAt", header: "Fecha", render: (item: any) => <div className="flex flex-col"><span className="text-xs text-white">{new Date(item.createdAt).toLocaleDateString()}</span><span className="text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div> },
                  {
                    key: "employeeId",
                    header: "Empleado",
                    render: (item: any) => {
                      const emp = employees?.find((e: any) => e.id === item.employeeId);
                      return <span className="font-bold text-white text-sm">{emp ? (emp.name || `${emp.firstName} ${emp.lastName}`) : 'Desconocido'}</span>;
                    }
                  },
                  { key: "taskName", header: "Concepto", render: (item: any) => <span className="text-xs text-slate-300">{item.taskName || "Producción"}</span> },
                  { key: "quantity", header: "Cantidad", render: (item: any) => <span className="font-mono font-bold text-white">{item.quantity} <span className="text-slate-500 text-[10px] font-normal">{item.unit || 'pza'}</span></span> },
                  { key: "totalAmount", header: "Monto", render: (item: any) => <span className="text-emerald-400 font-bold">${((item.totalAmount || 0) / 100).toFixed(2)}</span> },
                  { key: "status", header: "Estado", render: (item: any) => <Badge variant="outline" className={cn("text-[10px] uppercase", item.status === "paid" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20")}>{item.status === "paid" ? "PAGADO" : "PENDIENTE"}</Badge> },
                  {
                    key: "actions",
                    header: "Acciones",
                    render: (item: any) => (
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-800" title="Imprimir Ticket" onClick={() => {
                          const emp = employees?.find((e: any) => e.id === item.employeeId);
                          const empName = emp ? (emp.name || `${emp.firstName} ${emp.lastName}`) : 'Desconocido';
                          printThermalTicket({ ...item, employeeName: empName });
                        }}><TicketIcon className="w-4 h-4 text-slate-400" /></Button>
                        {item.status !== 'paid' && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-500 hover:bg-emerald-950" title="Pagar Ticket" onClick={() => {
                            if (confirm("¿Marcar este ticket como PAGADO?")) payMutation.mutate(item.id);
                          }}><DollarSign className="w-4 h-4" /></Button>
                        )}
                      </div>
                    )
                  }
                ]}
              />
            </div>
          </TabsContent >
        </Tabs >
      </div >
    </AppLayout >
  );
}

/**
 *
 * @param root0
 * @param root0.instance
 * @param root0.tickets
 * @param root0.onConfirm
 * @param root0.isVisionEnabled
 * @param root0.isLoading
 */
function FinalizeBatchDialog({ instance, process, inventory = [], tickets = [], onConfirm, isVisionEnabled, isLoading }: { instance: any, process: any, inventory: any[], tickets?: any[], onConfirm: (data: any) => void, isVisionEnabled: boolean, isLoading?: boolean }) {
  const [outputs, setOutputs] = useState<Record<string, number>>({});
  const [estimatedInput, setEstimatedInput] = useState(0);
  const [visionCount, setVisionCount] = useState(0);

  const [coProducts, setCoProducts] = useState<{ productId: string, quantity: number }[]>([]);

  const addCoProduct = () => { setCoProducts([...coProducts, { productId: "", quantity: 0 }]); };
  const updateCoProduct = (index: number, field: string, value: any) => {
    const newCoProducts = [...coProducts];
    (newCoProducts as any)[index][field] = value;
    setCoProducts(newCoProducts);
  };

  const outputProducts = process?.workflowData?.outputProductIds || [];

  const stats = {
    totalPieces: tickets.reduce((a, b) => a + (b.quantity || 0), 0),
    // Heuristic: sum of tickets where task name matches common output stages
    mainOutputQty: tickets.filter(t => t.taskName?.toLowerCase().includes('pela') || t.taskName?.toLowerCase().includes('termina')).reduce((a, b) => a + (b.quantity || 0), 0),
  };

  const getUnitForTask = (name: string) => {
    if (name.toLowerCase().includes('pelad')) return 'kg';
    return 'pza';
  };

  /**
   *
   */
  const calculateEstimate = () => {
    // Estimado de entrada: Mayor volumen de piezas reportado en tickets iniciales
    const initialTask = tickets.find(t => t.taskName?.toLowerCase().includes('destop') || t.taskName?.toLowerCase().includes('inici'));
    if (initialTask) setEstimatedInput(initialTask.quantity);

    // Si no hay valores manuales, pre-llenar con la suma de tickets de la etapa final
    if (outputProducts.length > 0 && Object.keys(outputs).length === 0) {
      setOutputs({ [outputProducts[0]]: stats.mainOutputQty });
    }
  };

  useEffect(() => {
    calculateEstimate();
  }, [tickets, process]);

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
              <h4 className="font-bold text-sm uppercase text-slate-400 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-500" />
                Captura de Producción Final
              </h4>

              <div className="space-y-4">
                {outputProducts.map((pid: string) => {
                  const product = inventory.find(p => p.id === pid);
                  return (
                    <div key={pid} className="space-y-2">
                      <Label className="text-xs font-bold text-slate-300 uppercase">
                        {product?.name || 'Producto'} ({product?.unit || 'u'})
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          className="bg-slate-950 border-slate-800 pl-20"
                          value={outputs[pid] || ''}
                          onChange={(e) => setOutputs({ ...outputs, [pid]: Number(e.target.value) })}
                          placeholder="0.00"
                        />
                        <div className="absolute left-3 top-2.5 text-[10px] text-purple-400 font-bold uppercase">
                          ∑ Tickets
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 italic">Sugerencia basada en tickets: {stats.mainOutputQty} {product?.unit || 'u'}</p>
                    </div>
                  );
                })}

                {(!outputProducts || outputProducts.length === 0) && (
                  <div className="p-4 border border-dashed border-slate-800 rounded text-center text-xs text-slate-500">
                    No hay productos de salida definidos en este proceso.
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-xs uppercase text-blue-400 font-bold">Subproductos Adicionales</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addCoProduct} className="h-6 text-[10px]"><Plus className="w-3 h-3 mr-1" /> Agregar</Button>
                </div>
                {coProducts.map((cp, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Select value={cp.productId} onValueChange={(v) => { updateCoProduct(idx, 'productId', v); }}>
                        <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-800"><SelectValue placeholder="Producto" /></SelectTrigger>
                        <SelectContent>
                          {inventory.filter(p => !outputProducts.includes(p.id)).map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      type="number"
                      className="w-24 h-8 text-xs bg-slate-950 border-slate-800"
                      placeholder="Cant."
                      value={cp.quantity || ''}
                      onChange={(e) => { updateCoProduct(idx, 'quantity', Number(e.target.value)); }}
                    />
                  </div>
                ))}
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
                  {outputProducts.map((pid: string) => {
                    const product = inventory.find(p => p.id === pid);
                    const qty = outputs[pid] || 0;
                    return (
                      <div key={pid} className="flex justify-between text-xs">
                        <span className="text-slate-400">Rendimiento {product?.name}:</span>
                        <span className="font-mono text-emerald-400">
                          {qty > 0 ? (qty / (visionCount || estimatedInput || 1)).toFixed(3) : '-'} {product?.unit || 'u'}/in
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => { onConfirm({ yields: outputs, estimatedInput: visionCount > 0 ? visionCount : estimatedInput, coProducts }); }} isLoading={isLoading}>
            Confirmar Cierre e Inventario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
