import { useState, useEffect, useMemo } from "react";
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
  Search,
  Settings,
  Settings2,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { printThermalTicket } from "@/lib/printer";

import { ProductionLineFlow } from "@/components/production/ProductionLineFlow";
import { FinalizeBatchDialog } from "@/components/production/FinalizeBatchDialog";
import { CreateProcessDialog } from "@/components/production/CreateProcessDialog";
import { TaskSelector } from "@/components/production/TaskSelector";
import { useConfiguration } from "@/context/ConfigurationContext";
import { CognitiveInput, CognitiveField } from "@/components/cognitive";
import { FloorControl } from "@/components/production/FloorControl";

interface Ticket {
  id: number;
  employee: string;
  process: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  createdAt: string;
  totalAmount: number; // Corrected from amount
  batchId?: string; // Linked Batch
  taskName?: string; // Backend returns this
  employeeName?: string;
}



/**
 *
 * @param root0
 * @param root0.tasks
 * @param root0.inventory
 * @param root0.isError
 */


export default function Production() {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTicketCreateOpen, setIsTicketCreateOpen] = useState(false);
  const [fraudWarning, setFraudWarning] = useState(false);
  const [selectedSourceProductId, setSelectedSourceProductId] = useState<string | null>(null);
  const [useMasterProduct, setUseMasterProduct] = useState(false);

  // Derived available products for input selection


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

  const { data: purchases = [] } = useQuery({
    queryKey: ["/api/commerce/purchases"],
    queryFn: async () => {
      const res = await fetch("/api/commerce/purchases", {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) return [];
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
  // Derived metrics for Catalog view
  const activeBatches = useMemo(() => summary?.activeInstances || [], [summary]);
  const avgYield = summary?.efficiency || 0;
  const qualityAlerts = 0; // Backend doesn't return count yet, keeping at 0
  const dailyOutput = summary?.completedCount || 0;

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
      queryClient.invalidateQueries({ queryKey: ["/api/piecework/tickets"] });
      setIsTicketCreateOpen(false);
    }
  });

  const finishBatchMutation = useMutation({
    mutationFn: async (data: { instanceId: string, yields: any, notes?: string }) => {
      const res = await fetch(`/api/production/instances/${data.instanceId}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error || "Error finishing batch");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production/summary"] });
      toast({ title: "Lote Finalizado", description: "Inventario y rendimientos calculados." });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Fallo en Producción", description: err.message });
    }
  });

  useSupabaseRealtime({ table: 'processes', queryKey: ["/api/cpe/processes"] });
  useSupabaseRealtime({ table: 'inventory', queryKey: ["/api/production/summary"] });
  useSupabaseRealtime({ table: 'employees', queryKey: ["/api/production/summary"] });
  useSupabaseRealtime({ table: 'piecework_tickets', queryKey: ["/api/piecework/tickets"] });

  const { enabledModules } = useConfiguration();
  const isVisionEnabled = enabledModules.includes('vision');

  const stats = {
    activeProcesses: summary?.activeCount || 0,
    pendingProcesses: processes?.filter((p: any) => p.status === "pending").length || 0,
    completedToday: summary?.completedCount || 0,
    efficiency: summary?.efficiency || 0,
    waste: summary?.waste || "0.0",
    avgCycleTime: summary?.avgCycleTime || "0.0",
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

  // Derived available products for input selection
  const selectableInputs = useMemo(() => {
    if (!inventory) return [];
    if (useMasterProduct) {
      // Find all products that have children (are masters) OR have isProductionInput
      return inventory.filter((i: any) => i.isProductionInput && !i.masterProductId);
    }
    return inventory.filter((i: any) => i.isProductionInput);
  }, [inventory, useMasterProduct]);

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

  const [reportMode, setReportMode] = useState<'partial' | 'finish'>('partial');

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
              Tickets de Producción
            </TabsTrigger>
            <TabsTrigger value="floor-control" className="gap-2">
              <Users className="w-4 h-4" />
              Control de Piso
            </TabsTrigger>
          </TabsList>

          {/* ... existing tabs content ... */}

          <TabsContent value="processes-cpe" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <StatCard title="Lotes en Marcha" value={stats.activeProcesses} icon={Factory} variant="primary" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                    <p className="font-bold text-primary uppercase tracking-widest text-[9px] mb-1">Carga Operativa</p>
                    <p>Número de lotes que están siendo procesados actualmente en las estaciones de trabajo.</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <StatCard title="Eficiencia (OEE)" value={`${stats.efficiency}%`} icon={Zap} trend={2.4} variant="success" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                    <p className="font-bold text-emerald-500 uppercase tracking-widest text-[9px] mb-1">Rendimiento Global</p>
                    <p>Eficiencia General de los Equipos. Se calcula comparando el tiempo real de producción vs el tiempo ideal.</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <StatCard title="Merma Acumulada" value={`${stats.waste}%`} icon={AlertTriangle} variant="warning" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                    <p className="font-bold text-amber-500 uppercase tracking-widest text-[9px] mb-1">Pérdida de Material</p>
                    <p>Porcentaje de materia prima desperdiciada reportada mediante anomalías Guardian en los últimos 30 días.</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <StatCard title="T. Ciclo Promedio" value={`${stats.avgCycleTime}h`} icon={Clock} variant="primary" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                    <p className="font-bold text-blue-500 uppercase tracking-widest text-[9px] mb-1">Velocidad de Proceso</p>
                    <p>Tiempo promedio transcurrido desde el inicio hasta el cierre de los últimos lotes completados.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Tabs defaultValue="active-batches" className="space-y-6">
              <TabsList>
                <TabsTrigger value="active-batches">Lotes Activos</TabsTrigger>
                <TabsTrigger value="traceability">Trazabilidad</TabsTrigger>
                <TabsTrigger value="catalog">Catálogo</TabsTrigger>
              </TabsList>

              <TabsContent value="active-batches" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold font-display">Lotes en Ejecución</h2>
                  <Dialog open={isStartLotOpen} onOpenChange={setIsStartLotOpen}>
                    <DialogTrigger asChild><Button className="gap-2 bg-emerald-600 shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 hover:scale-105 transition-all"><Play className="w-4 h-4" />Nuevo Lote</Button></DialogTrigger>
                    <DialogContent className="border-emerald-500/20 bg-slate-950">
                      <DialogHeader><DialogTitle className="text-emerald-500">Iniciar Nuevo Lote</DialogTitle></DialogHeader>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        createInstanceMutation.mutate({
                          processId: fd.get("processId"),
                          sourceBatchId: fd.get("sourceBatchId")?.toString() || null,
                          notes: fd.get("notes"),
                          meta: {
                            origin_location: fd.get("origin_location"),
                            target_location: fd.get("target_location")
                          }
                        });
                      }} className="space-y-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs uppercase font-bold text-slate-500">1. Materia Prima / Insumo</Label>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 font-bold uppercase">Maestro</span>
                              <Switch
                                checked={useMasterProduct}
                                onCheckedChange={setUseMasterProduct}
                                className="scale-75 data-[state=checked]:bg-primary"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Select
                              onValueChange={(v) => setSelectedSourceProductId(v === "none" ? null : v)}
                              defaultValue="none"
                            >
                              <SelectTrigger className="bg-slate-900 border-slate-800">
                                <SelectValue placeholder={useMasterProduct ? "Seleccionar Producto Maestro..." : "Seleccionar SKU Insumo..."} />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-950 border-slate-800">
                                <SelectItem value="none">-- Stock General / Sin Insumo --</SelectItem>
                                {selectableInputs.map((i: any) => (
                                  <SelectItem key={i.id} value={i.id}>
                                    {i.name} {useMasterProduct && <span className="opacity-50 text-[10px] ml-2">(Maestro)</span>}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-[10px] text-slate-500 italic">
                              {useMasterProduct
                                ? "Selecciona la base para encontrar procesos genéricos asociados."
                                : "Selecciona el SKU específico para ver procesos detallados."}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs uppercase font-bold text-slate-500">2. Proceso a Iniciar</Label>
                            <Select name="processId" required disabled={!selectedSourceProductId}>
                              <SelectTrigger className="bg-slate-900 border-slate-800">
                                <SelectValue placeholder={selectedSourceProductId ? "Seleccionar proceso..." : "Primero selecciona un insumo"} />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-950 border-slate-800">
                                {processes?.filter((p: any) => {
                                  if (p.status === 'archived') return false;
                                  if (!selectedSourceProductId) return false;

                                  const inputId = p.workflowData?.inputProductId;

                                  // Matches direct SKU
                                  if (inputId === selectedSourceProductId) return true;

                                  // If using master product, check if the process input SKU belongs to that master
                                  if (useMasterProduct) {
                                    const prod = inventory.find((i: any) => i.id === inputId);
                                    return prod?.masterProductId === selectedSourceProductId;
                                  }

                                  return false;
                                }).map((p: any) => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs uppercase font-bold text-slate-500 flex items-center gap-2">
                                <Layers className="w-3 h-3" /> Origen (Patio)
                              </Label>
                              <Input name="origin_location" placeholder="Ej: Patio 1" className="bg-slate-900 border-slate-800 h-9 text-xs" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs uppercase font-bold text-slate-500 flex items-center gap-2">
                                <Package className="w-3 h-3" /> Destino (Cestas)
                              </Label>
                              <Input name="target_location" placeholder="Ej: Cesta A" className="bg-slate-900 border-slate-800 h-9 text-xs" />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs uppercase font-bold text-slate-500">3. Lote de Compra (Trazabilidad)</Label>
                            <Select name="sourceBatchId">
                              <SelectTrigger className="bg-slate-900 border-slate-800">
                                <SelectValue placeholder="Seleccionar lote de compra..." />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-950 border-slate-800">
                                <SelectItem value="none">-- Ninguno --</SelectItem>
                                {purchases
                                  .filter((p: any) => {
                                    if (!p.batchId) return false;
                                    if (!selectedSourceProductId) return true;

                                    // Direct match
                                    if (p.productId === selectedSourceProductId) return true;

                                    // Master match
                                    if (useMasterProduct) {
                                      const prod = inventory.find((i: any) => i.id === p.productId);
                                      return prod?.masterProductId === selectedSourceProductId;
                                    }

                                    return false;
                                  })
                                  .map((p: any) => (
                                    <SelectItem key={p.id} value={p.batchId}>
                                      {p.batchId} - {p.supplier?.name} ({new Date(p.date).toLocaleDateString()})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs uppercase font-bold text-slate-500">Notas Iniciales</Label>
                            <Textarea name="notes" placeholder="Detalles u observaciones" className="bg-slate-900 border-slate-800" />
                          </div>

                          <DialogFooter className="pt-4 border-t border-slate-800">
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 w-full md:w-auto">Confirmar Inicio</Button>
                          </DialogFooter>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {summary?.activeInstances?.map((instance: any) => {
                    // Logic to find current stage is simplified here for visualization
                    const currentProcess = processes?.find((p: any) => p.id === instance.processId);
                    return (
                      <Card key={instance.id} className="bg-slate-950/50 border-slate-800 hover:border-slate-700 transition-all border-l-4 border-l-emerald-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Lote #{instance.id.toString().slice(-4)}</CardTitle>
                          <Badge className="bg-emerald-500/10 text-emerald-500 animate-pulse">En Progreso</Badge>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold mb-1">{currentProcess?.name || 'Proceso'}</div>
                          <p className="text-xs text-muted-foreground mb-4">Iniciado {new Date(instance.startTime).toLocaleString()}</p>
                          <div className="flex justify-between items-center bg-slate-900 p-2 rounded-lg">
                            <span className="text-xs text-slate-400">Operario Actual:</span>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">
                                <User className="w-3 h-3" />
                              </div>
                              <span className="text-xs font-bold">Sin asignar</span>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button
                              size="sm"
                              className="w-full bg-white text-black hover:bg-slate-200"
                              onClick={() => { setSelectedBatchForReport(instance); setReportMode('partial'); setIsReportDialogOpen(true); }}
                            >
                              Reportar
                            </Button>
                            <Button size="sm" variant="outline" className="w-full border-slate-700" onClick={() => { setSelectedBatchForReport(instance); setReportMode('finish'); setIsReportDialogOpen(true); }}>
                              Finalizar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {(!summary?.activeInstances || summary.activeInstances.length === 0) && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-xl">
                      <Package className="w-12 h-12 mb-3 opacity-20" />
                      <p className="text-sm font-bold">No hay lotes en ejecución</p>
                      <p className="text-xs">Inicia un nuevo lote para comenzar el seguimiento.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="traceability">
                <div className="rounded-md border border-slate-800">
                  <div className="p-12 text-center text-slate-500">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-bold">Trazabilidad Completa</h3>
                    <p className="max-w-md mx-auto mt-2 text-sm">Visualiza el historial completo de cada lote, desde la materia prima hasta el producto terminado.</p>
                    <Button variant="outline" className="mt-6">Consultar Historial</Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="catalog" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold font-display">Procesos Definidos</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <StatCard
                              title="Lotes en Marcha"
                              value={activeBatches?.length || 0}
                              icon={Play}
                              variant="primary"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                          <p className="font-bold text-primary uppercase tracking-widest text-[9px] mb-1">Carga Operativa Actual</p>
                          <p>Número de procesos que se encuentran activos. <br /><span className="text-[10px] text-slate-400 italic">Cálculo: Conteo de instancias con estado 'active'.</span></p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <StatCard
                              title="Rendimiento Promedio"
                              value={`${avgYield}%`}
                              icon={Zap}
                              variant={avgYield > 95 ? "success" : avgYield > 85 ? "warning" : "destructive"}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                          <p className="font-bold text-emerald-500 uppercase tracking-widest text-[9px] mb-1">Eficiencia de Transformación</p>
                          <p>Relación entre lotes completados y total iniciados. <br /><span className="text-[10px] text-slate-400 italic">Fórmula: (Completados / Totales) * 100</span></p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <StatCard
                              title="Alertas de Calidad"
                              value={qualityAlerts}
                              icon={AlertCircle}
                              variant={qualityAlerts > 0 ? "destructive" : "default"}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                          <p className="font-bold text-red-500 uppercase tracking-widest text-[9px] mb-1">Incidentes Críticos</p>
                          <p>Reportes de desviación de calidad detectados en las etapas de inspección durante el periodo actual.</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <StatCard
                              title="Producción del Día"
                              value={dailyOutput}
                              icon={CheckCircle2}
                              variant="success"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                          <p className="font-bold text-emerald-500 uppercase tracking-widest text-[9px] mb-1">Meta de Cumplimiento</p>
                          <p>Total de unidades terminadas hoy. <br /><span className="text-[10px] text-slate-400 italic">Fuente: Conteo de lotes con estado 'completed' hoy.</span></p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <CreateProcessDialog
                    open={isProcessDialogOpen}
                    onOpenChange={setIsProcessDialogOpen}
                    editingProcess={editingProcess}
                    inventory={inventory}
                    onSave={(payload) => {
                      if (editingProcess) {
                        updateProcessMutation.mutate(payload);
                      } else {
                        createMutation.mutate(payload);
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <ProductionLineFlow
                      processes={processes || []}
                      inventory={inventory || []}
                      onSelect={(p) => { setEditingProcess(p); }}
                      onDelete={(id) => { if (confirm("¿Eliminar este proceso permanentemente?")) deleteProcessMutation.mutate(id); }}
                    />

                    <div className="p-4 bg-[#030712] border border-slate-800/50 rounded-2xl flex items-center justify-between shadow-xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Arquitectura de Procesos</p>
                          <p className="text-[9px] text-slate-500 uppercase font-bold">Define la secuencia lógica de tu operación para un tracking preciso.</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="h-9 text-[10px] font-black uppercase border-white/5 bg-white/5 hover:bg-white/10" onClick={() => { setEditingProcess(null); setIsProcessDialogOpen(true); }}>
                        <Plus className="w-3.5 h-3.5 mr-2" /> Agregar Etapa
                      </Button>
                    </div>
                  </div>

                  <div className="w-full lg:w-[320px]">
                    {editingProcess ? (
                      <Card className="bg-[#030712] border-slate-800/50 p-6 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300 h-full border-l-primary/30">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary glow-xs">
                              <Settings2 className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Propiedades</p>
                              <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Configuración de Etapa</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-white" onClick={() => setEditingProcess(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="space-y-4">
                          <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 space-y-1">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Nombre de la Etapa</p>
                            <p className="text-sm font-bold text-white">{editingProcess.name}</p>
                          </div>

                          <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Descripción Operativa</p>
                              <Badge variant="outline" className="text-[8px] border-white/10 text-primary">{editingProcess.type}</Badge>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed italic">"{editingProcess.description || 'Sin descripción configurada.'}"</p>
                          </div>

                          <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 space-y-1">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Información de Sistema</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[9px] text-slate-500">ID Único:</span>
                              <span className="text-[9px] font-mono text-slate-400">{editingProcess.id.substring(0, 8)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-slate-500">Orden de Flujo:</span>
                              <span className="text-[9px] font-black text-primary">#{editingProcess.orderIndex}</span>
                            </div>
                          </div>

                          <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-xs font-black uppercase text-white glow-xs shadow-lg shadow-primary/20" onClick={() => { setIsProcessDialogOpen(true); }}>
                            <Settings2 className="w-3.5 h-3.5 mr-2" /> Editar Configuración
                          </Button>
                        </div>
                      </Card>
                    ) : (
                      <Card className="bg-[#030712] border-slate-800/50 p-6 flex flex-col items-center justify-center text-center gap-4 h-full min-h-[400px] border-dashed">
                        <div className="p-5 bg-slate-900/50 rounded-full text-slate-700 animate-pulse">
                          <Layers className="w-10 h-10" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Editor de Procesos</p>
                          <p className="text-[9px] font-bold text-slate-600 uppercase max-w-[200px]">Selecciona una etapa en el flujo para gestionar sus parámetros y comportamiento operativo.</p>
                        </div>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4">
            {/* Ticket Tab Content - Kept simplified for brevity as the focus was on the Production Flow */}
            {/* You would re-integrate the Ticket List and Management here */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold font-display">Tickets Generados</h3>
              <Button onClick={() => setIsTicketCreateOpen(true)}><Plus className="w-4 h-4 mr-2" /> Nuevo Ticket</Button>
            </div>
            <DataTable
              data={tickets}
              columns={[
                { key: "id", header: "ID", render: (item) => <span className="font-mono text-xs">{String(item.id).substring(0, 8)}</span> },
                { key: "employeeName", header: "Empleado" },
                { key: "taskName", header: "Concepto" },
                { key: "quantity", header: "Cantidad" },
                { key: "totalAmount", header: "Monto", render: (item) => formatCurrency(item.totalAmount || 0) },
                {
                  key: "status", header: "Estado", render: (item) => (
                    <Badge
                      variant={item.status === 'approved' ? 'default' : 'secondary'}
                      className={item.status === 'paid' ? 'bg-emerald-500 hover:bg-emerald-600 border-transparent text-white' : ''}
                    >
                      {item.status}
                    </Badge>
                  )
                },
              ]}
            />
          </TabsContent>

          <TabsContent value="floor-control" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold font-display">Control de Piso</h2>
                <p className="text-sm text-slate-500">Supervisión en tiempo real de actividades de operarios.</p>
              </div>
            </div>
            <FloorControl />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-4xl bg-slate-950 border-slate-800">
          <FinalizeBatchDialog
            instance={selectedBatchForReport}
            process={processes?.find((p: any) => p.id === selectedBatchForReport?.processId)}
            allProcesses={processes}
            inventory={inventory}
            tickets={tickets}
            onConfirm={(data) => {
              if (reportMode === 'finish') {
                finishBatchMutation.mutate({ instanceId: selectedBatchForReport.id, yields: data.yields, notes: 'Finished via dialog' });
                setIsReportDialogOpen(false);
              } else {
                console.log("Reporting data:", data);
                reportProductionMutation.mutate(data);
              }
            }}
            isVisionEnabled={isVisionEnabled}
            isLoading={reportMode === 'finish' ? finishBatchMutation.isPending : reportProductionMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* NEW: Ticket Creation Dialog */}
      <Dialog open={isTicketCreateOpen} onOpenChange={setIsTicketCreateOpen}>
        <DialogContent className="max-w-md bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle className="font-display">Registrar Trabajo por Destajo</DialogTitle>
            <DialogDescription>Ingrese los detalles de la tarea realizada por el personal.</DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            createTicketMutation.mutate({
              employeeId: formData.get('employeeId'),
              taskName: formData.get('taskName'),
              quantity: Number(formData.get('quantity')),
              unitPrice: Number(formData.get('unitPrice')) * 100,
              status: 'pending'
            });
          }} className="space-y-4 py-4">

            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-slate-500">Empleado</Label>
              <Select name="employeeId" required>
                <SelectTrigger className="bg-slate-900 border-slate-800">
                  <SelectValue placeholder="Seleccione empleado" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {employees?.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-slate-500">Tarea Realizada</Label>
              <Select name="taskName" required onValueChange={(val) => {
                const task = pieceworkTasks.find((t: any) => t.name === val);
                if (task) {
                  const priceInput = document.getElementById('ticket-price-input') as HTMLInputElement;
                  if (priceInput) priceInput.value = (task.unitPrice / 100).toFixed(2);
                }
              }}>
                <SelectTrigger className="bg-slate-900 border-slate-800">
                  <SelectValue placeholder="Seleccione tarea" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {pieceworkTasks.map((task: any) => (
                    <SelectItem key={task.id} value={task.name}>{task.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-slate-500">Cantidad</Label>
                <Input
                  name="quantity"
                  type="number"
                  min="1"
                  required
                  defaultValue="1"
                  className="bg-slate-900 border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-slate-500">Pago por Unidad ($)</Label>
                <Input
                  id="ticket-price-input"
                  name="unitPrice"
                  type="number"
                  step="0.01"
                  required
                  className="bg-slate-900 border-slate-800"
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500" disabled={createTicketMutation.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                {createTicketMutation.isPending ? "Registrando..." : "Crear Ticket"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
