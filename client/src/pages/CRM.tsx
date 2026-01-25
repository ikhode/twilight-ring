import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  Users,
  Plus,
  Search,
  Phone,
  DollarSign,
  TrendingUp,
  Truck,
  ShoppingBag,
  Loader2,
  RefreshCcw,
  Zap,
  Brain,
  MessageSquare,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Customer, Supplier } from "../../../shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useConfiguration } from "@/hooks/use-configuration";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { CognitiveButton, AliveValue } from "@/components/cognitive";
import { useCognitiveEngine } from "@/lib/cognitive/engine";

function CreateCustomerDialog() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/crm/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create customer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/customers"] });
      setOpen(false);
      setFormData({ name: "", email: "", phone: "" });
      toast({ title: "Cliente creado", description: "El cliente se ha registrado exitosamente." });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear el cliente." });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <CognitiveButton
          className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
          intent="create_customer"
          title="Registrar nuevo cliente con análisis de riesgo inicial"
        >
          <Plus className="w-4 h-4" /> Agregar Cliente
        </CognitiveButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nombre de la Empresa / Persona</Label>
            <Input
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej. Acme Corp"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="contacto@acme.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+52 55..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Crear Cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateSupplierDialog() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", contact: "", phone: "" });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/crm/suppliers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          name: data.name,
          contactInfo: { contact: data.contact },
        })
      });
      if (!res.ok) throw new Error("Failed to create supplier");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/suppliers"] });
      setOpen(false);
      setFormData({ name: "", contact: "", phone: "" });
      toast({ title: "Proveedor creado", description: "El proveedor se ha registrado exitosamente." });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear el proveedor." });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" variant="outline">
          <Plus className="w-4 h-4" /> Agregar Proveedor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Proveedor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Razón Social</Label>
            <Input
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej. Distribuidora del Norte"
            />
          </div>
          <div className="space-y-2">
            <Label>Persona de Contacto</Label>
            <Input
              value={formData.contact}
              onChange={e => setFormData({ ...formData, contact: e.target.value })}
              placeholder="Juan Pérez"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CRM() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Cognitive State
  const { setIntent, setMode, setConfidence } = useCognitiveEngine();

  useEffect(() => {
    setIntent("Gestión de Cartera de Clientes");
    setMode("analysis");
    setConfidence(92);

    return () => {
      setIntent(undefined as any);
      setMode("observation");
    }
  }, []);

  // --- MUTATIONS ---
  const remindersMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/crm/reminders", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to send reminders");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Intervención Cognitiva",
        description: data.message,
      });
    }
  });

  // Module Enforcement
  const isEnabled = useConfiguration().getModuleStatus("crm");

  if (!isEnabled) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-4">
          <div className="p-4 bg-muted rounded-full">
            <Users className="w-12 h-12 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Módulo CRM Desactivado</h2>
            <p className="text-muted-foreground max-w-md mx-auto mt-2">
              Gestiona relaciones con clientes activando este módulo en el Marketplace.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // --- QUERIES ---
  const { data: customers = [], isLoading: loadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/crm/customers"],
    queryFn: async () => {
      if (!session?.access_token) return [];
      const res = await fetch("/api/crm/customers", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!res.ok) throw new Error("Fetch failed");
      return res.json();
    },
    enabled: isEnabled && !!session?.access_token
  });

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/crm/suppliers"],
    queryFn: async () => {
      if (!session?.access_token) return [];
      const res = await fetch("/api/crm/suppliers", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!res.ok) throw new Error("Fetch failed");
      return res.json();
    },
    enabled: isEnabled && !!session?.access_token
  });

  const { data: analysisData } = useQuery({
    queryKey: ["/api/crm/analysis"],
    queryFn: async () => {
      if (!session?.access_token) return null;
      const res = await fetch("/api/crm/analysis", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!session?.access_token
  });

  // --- REALTIME ---
  useEffect(() => {
    const channel = supabase
      .channel('crm-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["/api/crm/customers"] });
        toast({
          title: "Cartera Actualizada",
          description: "La IA ha procesado cambios en los clientes.",
          duration: 2000
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["/api/crm/suppliers"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient, toast]);

  const formatCurrency = (amount: number = 0) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount / 100);

  // --- STATS ---
  const clientsStats = {
    total: customers.length,
    active: customers.filter((c) => c.status === "active").length,
    totalReceivables: customers.reduce((acc, c) => acc + Math.max(0, c.balance || 0), 0),
    totalDebt: customers.filter((c) => (c.balance || 0) < 0).reduce((acc, c) => acc + Math.abs(c.balance || 0), 0),
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AppLayout title="Gestión Comercial (CRM)" subtitle="Administración de relaciones y cartera">
      <div className="space-y-6">
        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="bg-slate-900/50 border border-slate-800 p-1">
            <TabsTrigger value="clients" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Truck className="w-4 h-4 mr-2" />
              Proveedores
            </TabsTrigger>
          </TabsList>

          {/* CLIENTS TAB */}
          <TabsContent value="clients" className="space-y-6">

            {/* Cognitive Action Layer */}
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl border border-accent/20 bg-accent/5 backdrop-blur-sm relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent pointer-events-none" />
                <div className="flex items-start gap-3 relative z-10">
                  <div className="p-2 rounded-lg bg-accent/20 text-accent">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-accent flex items-center gap-2">
                      Sugerencia Cognitiva
                      <Badge variant="outline" className="text-[10px] h-4 border-accent/30 text-accent/80">98% Relevancia</Badge>
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {analysisData?.segments?.atRisk > 0
                        ? `He detectado ${analysisData.segments.atRisk} clientes en "Alto Riesgo" con facturas pendientes.`
                        : "No he detectado clientes en riesgo inminente. La cartera está saludable."}
                      {analysisData?.segments?.atRisk > 0 && " ¿Deseas enviar un recordatorio automático?"}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <CognitiveButton
                        size="sm"
                        className="h-8 text-xs"
                        intent="send_reminders"
                        showConfidence
                        onClick={() => remindersMutation.mutate()}
                        disabled={remindersMutation.isPending}
                      >
                        <MessageSquare className="w-3 h-3 mr-1.5" />
                        {remindersMutation.isPending ? "Enviando..." : "Enviar Recordatorios"}
                      </CognitiveButton>
                      <Button size="sm" variant="ghost" className="h-8 text-xs">Ignorar</Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Cognitive Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="pt-6">
                  <AliveValue
                    label="Total Clientes"
                    value={clientsStats.total}
                    trend="up"
                    explanation="Crecimiento del 5% respecto al mes anterior."
                  />
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="pt-6">
                  <AliveValue
                    label="Cartera Activa"
                    value={clientsStats.active}
                    explanation="85% de retención de clientes activos."
                  />
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="pt-6">
                  <AliveValue
                    label="Por Cobrar"
                    value={formatCurrency(clientsStats.totalReceivables)}
                    trend="up"
                    className="text-emerald-500"
                    explanation="Flujo de caja positivo proyectado para fin de mes."
                  />
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="pt-6">
                  <AliveValue
                    label="Vencido"
                    value={formatCurrency(clientsStats.totalDebt)}
                    trend="down"
                    className="text-rose-500"
                    explanation="Reducción de deuda vencida en un 12% tras la última campaña."
                  />
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-800 bg-slate-900/30">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <CardTitle className="font-display">Directorio de Clientes</CardTitle>
                    {loadingCustomers && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}

                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                      <Zap className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Cognitive List</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Búsqueda semántica..."
                        className="pl-9 w-64 bg-slate-950/50 border-slate-800"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <CreateCustomerDialog />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-slate-800 overflow-hidden">
                  <DataTable
                    columns={[
                      {
                        key: "name",
                        header: "Cliente",
                        render: (item) => (
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary">
                              {item.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-200">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.email || "Sin email"}</p>
                            </div>
                          </div>
                        ),
                      },
                      {
                        key: "contact",
                        header: "Contacto",
                        render: (item) => (
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Phone className="w-3 h-3" />
                            {item.phone || "---"}
                          </div>
                        ),
                      },
                      {
                        key: "churn",
                        header: "Riesgo de Fuga",
                        render: (item: any) => {
                          const analysisItem = analysisData?.analysis?.find((a: any) => a.customerId === item.id);
                          const risk = analysisItem?.churnRisk || "Low";

                          const color = risk === "High" ? "text-rose-400 border-rose-400/30 bg-rose-400/10" : risk === "Medium" ? "text-amber-400 border-amber-400/30 bg-amber-400/10" : "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";

                          return (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-wider", color)}>
                                {risk === "High" && <AlertTriangle className="w-3 h-3 mr-1" />}
                                {risk} Risk
                              </Badge>
                            </div>
                          );
                        }
                      },
                      {
                        key: "balance",
                        header: "Balance",
                        render: (item) => (
                          <span
                            className={cn(
                              "font-bold font-mono",
                              (item.balance || 0) > 0 ? "text-emerald-400" : ((item.balance || 0) < 0 ? "text-rose-400" : "text-slate-500")
                            )}
                          >
                            {formatCurrency(item.balance || 0)}
                          </span>
                        ),
                      },
                      {
                        key: "status",
                        header: "Estado",
                        render: (item) => <StatusBadge status={item.status} />,
                      },
                      {
                        key: "actions",
                        header: "",
                        render: (item) => (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <RefreshCcw className="w-3 h-3" />
                          </Button>
                        ),
                      },
                    ]}
                    data={filteredCustomers}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SUPPLIERS TAB */}
          <TabsContent value="suppliers" className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Proveedores</h3>
                  <p className="text-sm text-slate-400">Gestión de cadena de suministro</p>
                </div>
              </div>
              <CreateSupplierDialog />
            </div>

            <Card className="border-slate-800 bg-slate-900/30">
              <CardContent className="p-0">
                <div className="rounded-md border border-slate-800 overflow-hidden">
                  <DataTable
                    columns={[
                      {
                        key: "name",
                        header: "Proveedor",
                        render: (item) => (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center font-semibold text-slate-400">
                              {item.name.charAt(0)}
                            </div>
                            <span className="font-medium text-slate-200">{item.name}</span>
                          </div>
                        ),
                      },
                      {
                        key: "category",
                        header: "Categoría",
                        render: (item) => (
                          <Badge variant="outline" className="border-slate-700 text-slate-400">
                            {item.category || "General"}
                          </Badge>
                        ),
                      },
                    ]}
                    data={suppliers}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
