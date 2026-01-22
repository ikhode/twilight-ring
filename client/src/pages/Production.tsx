import { useState } from "react";
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
      setIsTicketCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/piecework/tickets"] });
      toast({ title: "Ticket Creado" });
    }
  });

  useSupabaseRealtime({ table: 'processes', queryKey: ["/api/cpe/processes"] });
  useSupabaseRealtime({ table: 'piecework_tickets', queryKey: ["/api/piecework/tickets"] });

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
    totalAmount: tickets.reduce((acc, t) => acc + t.amount, 0),
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

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
                        <div className="space-y-2"><Label>Nombre</Label><Input name="name" required /></div>
                        <div className="space-y-2"><Label>Tipo</Label><Select name="type" defaultValue="production"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="production">Producción</SelectItem></SelectContent></Select></div>
                        <DialogFooter><Button type="submit">Guardar</Button></DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {processes?.map((p: any) => (
                    <Card key={p.id}>
                      <CardHeader className="pb-2"><CardTitle className="text-base">{p.name}</CardTitle></CardHeader>
                      <CardContent><p className="text-sm text-muted-foreground mb-4">{p.description}</p><Button variant="outline" size="sm" onClick={() => toast({ title: "Configuración", description: "La configuración avanzada de procesos estará disponible pronto." })}>Configurar</Button></CardContent>
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
                      <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createInstanceMutation.mutate({ processId: fd.get("processId"), metadata: { loteName: fd.get("loteName") } }); }} className="space-y-4 py-4">
                        <Select name="processId" required><SelectTrigger><SelectValue placeholder="Proceso" /></SelectTrigger><SelectContent>{processes?.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent></Select>
                        <Input name="loteName" placeholder="ID Lote" />
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
                        <div><p className="font-bold">{instance.aiContext?.loteName || `Lote #${instance.id.substring(0, 8)}`}</p><p className="text-xs text-muted-foreground">{new Date(instance.startedAt).toLocaleTimeString()}</p></div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-2"><AlertTriangle className="w-3 h-3 text-warning" />Merma</Button></DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Registrar Merma</DialogTitle></DialogHeader>
                            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); logEventMutation.mutate({ instanceId: instance.id, eventType: "anomaly", data: { mermaType: fd.get("type"), quantity: Number(fd.get("quantity")), reason: fd.get("reason") } }); }} className="space-y-4 py-4">
                              <Select name="type" defaultValue="quality"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="quality">Calidad</SelectItem><SelectItem value="mechanical">Mecánica</SelectItem></SelectContent></Select>
                              <Input name="quantity" type="number" step="0.1" placeholder="Cantidad" />
                              <Button type="submit" className="w-full">Registrar</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button size="sm" variant="secondary">Finalizar</Button>
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
              <Dialog open={isTicketCreateOpen} onOpenChange={setIsTicketCreateOpen}>
                <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Nuevo Ticket</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Registrar Trabajo</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createTicketMutation.mutate({ employeeId: fd.get('employeeId'), taskName: fd.get('task'), quantity: Number(fd.get('quantity')), unitPrice: Number(fd.get('price')) * 100, status: 'pending' }); }} className="space-y-4 py-4">
                    <Select name="employeeId" required><SelectTrigger><SelectValue placeholder="Empleado" /></SelectTrigger><SelectContent>{employees?.map((emp: any) => (<SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>))}</SelectContent></Select>
                    <div className="grid grid-cols-2 gap-4"><Input name="quantity" type="number" placeholder="Cantidad" /><Input name="price" type="number" placeholder="Precio ($)" /></div>
                    <Button type="submit" className="w-full">Guardar Ticket</Button>
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
            <Card className="mt-6"><CardContent className="pt-6"><DataTable columns={[{ key: "id", header: "ID" }, { key: "employee", header: "Empleado" }, { key: "status", header: "Estado" }, { key: "amount", header: "Monto", render: (i) => formatCurrency(i.amount) }, { key: "actions", header: "Acciones", render: (i) => i.status === 'pending' ? <Button size="sm" onClick={() => approveMutation.mutate(i.id)}>Aprobar</Button> : null }]} data={tickets} /></CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
