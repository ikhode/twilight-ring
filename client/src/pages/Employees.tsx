import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AliveValue, CognitiveButton } from "@/components/cognitive";
import {
  Plus,
  Search,
  DollarSign,
  FileText,
  MoreVertical,
  Briefcase,
  Activity,
  Loader2,
  Edit,
  Trash2,
  Camera,

  Copy,
  Target,
  Clock
} from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Employee } from "../../../shared/schema";
import { supabase } from "@/lib/supabase";
import { useCognitiveEngine } from "@/lib/cognitive/engine";
import { FaceEnrollmentDialog } from "@/components/hr/FaceEnrollmentDialog";
import { DossierView } from "@/components/shared/DossierView";


function InviteDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/hr/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to invite");
      return res.json();
    },
    onSuccess: () => {
      setIsOpen(false);
      toast({ title: "Invitación Enviada", description: "El usuario recibirá un correo con instrucciones." });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
          <Briefcase className="w-4 h-4 mr-2" />
          Invitar Socio/Admin
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar Usuario al Dashboard</DialogTitle>
          <DialogDescription>Envía una invitación por correo para acceder a la plataforma.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          inviteMutation.mutate({
            name: formData.get("name"),
            email: formData.get("email"),
            role: formData.get("role")
          });
        }} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input name="name" required placeholder="Nombre del socio" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input name="email" type="email" required placeholder="socio@empresa.com" />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select name="role" defaultValue="admin">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador (Dueño)</SelectItem>
                <SelectItem value="manager">Gerente (Acceso Limitado)</SelectItem>
                <SelectItem value="viewer">Solo Lectura</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
              Enviar Invitación
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { EntityDossier } from "@/components/documents/EntityDossier";

function EditEmployeeDialog({ employee, open, onOpenChange }: { employee: Employee | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (userData: Partial<Employee>) => {
      const res = await fetch(`/api/hr/employees/${employee?.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(userData)
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
      onOpenChange(false);
      toast({ title: "Datos Actualizados", description: "La información se ha guardado correctamente." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Expediente de {employee.name}</DialogTitle>
          <DialogDescription>Gestión de información y documentos.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
          {/* Form Column */}
          <div className="overflow-y-auto pr-2">
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateMutation.mutate({
                birthDate: formData.get("birthDate") as string,
                gender: formData.get("gender") as string,
                maritalStatus: formData.get("maritalStatus") as string,
                personalEmail: formData.get("personalEmail") as string,
                bankName: formData.get("bankName") as string,
                bankAccountNumber: formData.get("bankAccountNumber") as string,
                bankClabe: formData.get("bankClabe") as string,
                emergencyContactName: formData.get("emergencyContactName") as string,
                emergencyContactPhone: formData.get("emergencyContactPhone") as string,
                notes: formData.get("notes") as string,
              });
            }} className="space-y-4 py-4">
              {/* ID Display for Kiosk */}
              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2">
                <Label className="text-xs text-muted-foreground">ID de Empleado (Para Kiosco)</Label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 font-mono text-xs flex items-center">{employee.id}</code>
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(employee.id); toast({ title: "ID Copiado", description: "Listo para pegar en el Kiosco." }); }}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="financial">Financiero</TabsTrigger>
                  <TabsTrigger value="emergency">Emergencia</TabsTrigger>
                  <TabsTrigger value="performance">Rendimiento</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre Completo</Label>
                      <Input name="name" defaultValue={employee.name} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Corporativo</Label>
                      <Input name="email" defaultValue={employee.email || ""} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Puesto</Label>
                      <Input name="role" defaultValue={employee.role} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Departamento</Label>
                      <Select name="department" defaultValue={employee.department || "operations"}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administración</SelectItem>
                          <SelectItem value="operations">Operaciones</SelectItem>
                          <SelectItem value="sales">Comercial</SelectItem>
                          <SelectItem value="logistics">Logística</SelectItem>
                          <SelectItem value="it">Tecnología</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input name="phone" defaultValue={employee.phone || ""} placeholder="55-1234-5678" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Personal</Label>
                      <Input name="personalEmail" defaultValue={employee.personalEmail || ""} placeholder="personal@example.com" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fecha de Nacimiento</Label>
                      <Input name="birthDate" type="date" defaultValue={employee.birthDate || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label>Género</Label>
                      <Select name="gender" defaultValue={employee.gender || ""}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Masculino</SelectItem>
                          <SelectItem value="female">Femenino</SelectItem>
                          <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Estado Civil</Label>
                      <Select name="maritalStatus" defaultValue={employee.maritalStatus || ""}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Soltero(a)</SelectItem>
                          <SelectItem value="married">Casado(a)</SelectItem>
                          <SelectItem value="divorced">Divorciado(a)</SelectItem>
                          <SelectItem value="widowed">Viudo(a)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Estado Laboral</Label>
                      <Select name="status" defaultValue={employee.status || "active"}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Activo</SelectItem>
                          <SelectItem value="on_leave">En Permiso</SelectItem>
                          <SelectItem value="inactive">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Dirección</Label>
                    <Input name="address" defaultValue={employee.address || ""} placeholder="Dirección completa" />
                  </div>
                </TabsContent>

                <TabsContent value="financial" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label>Salario Mensual (MXN)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input name="salary" type="number" step="0.01" className="pl-9" defaultValue={employee.salary ? (employee.salary / 100).toString() : ""} placeholder="0.00" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <h4 className="text-sm font-semibold text-primary/80">Información Bancaria</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>Banco</Label>
                        <Input name="bankName" defaultValue={employee.bankName || ""} placeholder="Ej. BBVA, Santander" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Número de Cuenta</Label>
                          <Input name="bankAccountNumber" defaultValue={employee.bankAccountNumber || ""} placeholder="10 dígitos" />
                        </div>
                        <div className="space-y-2">
                          <Label>CLABE Interbancaria</Label>
                          <Input name="bankClabe" defaultValue={employee.bankClabe || ""} placeholder="18 dígitos" />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="emergency" className="space-y-4">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-primary/80">Contacto de Emergencia</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nombre de Contacto</Label>
                        <Input name="emergencyContactName" defaultValue={employee.emergencyContactName || ""} placeholder="Nombre completo" />
                      </div>
                      <div className="space-y-2">
                        <Label>Teléfono de Emergencia</Label>
                        <Input name="emergencyContactPhone" defaultValue={employee.emergencyContactPhone || ""} placeholder="55-1234-5678" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label>Notas y Observaciones</Label>
                    <textarea
                      name="notes"
                      defaultValue={employee.notes || ""}
                      className="flex min-h-[120px] w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Información adicional relevante del colaborador..."
                    />
                  </div>
                </TabsContent>

                <TabsContent value="performance" className="space-y-4">
                  <StaffPerformance />
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar Expediente
                </Button>
              </DialogFooter>
            </form>
          </div>

          {/* Dossier Column */}
          <div className="h-full min-h-[400px]">
            <EntityDossier
              entityId={employee.id}
              entityType="employee"
              label="Documentos del Colaborador"
              className="border-slate-800 bg-slate-900/50"
            />
          </div>
        </div>
      </DialogContent >
    </Dialog >
  );
}

function StaffPerformance() {
  const { session } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/analytics/staff/performance"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/staff/performance", {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch performance");
      return res.json();
    },
    enabled: !!session?.access_token
  });

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!data) return <div className="p-8 text-center text-muted-foreground">No hay datos de rendimiento disponibles.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Ranking de Ventas (Mes Actual)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.ranking.map((user: any, i: number) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                    i === 0 ? "bg-amber-500 text-white" : i === 1 ? "bg-slate-400 text-white" : i === 2 ? "bg-orange-700 text-white" : "bg-slate-800 text-slate-400"
                  )}>
                    #{i + 1}
                  </div>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.salesCount} operaciones</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-500">
                    {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(user.salesVolume / 100)}
                  </p>
                  <p className="text-xs text-muted-foreground">Ticket Prom: ${Math.round(user.efficiency / 100)}</p>
                </div>
              </div>
            ))}
            {data.ranking.length === 0 && <p className="text-center text-muted-foreground py-4">Sin datos de ventas este mes.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Intensidad Operativa (Por Hora)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.activityHeatmap}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                <XAxis
                  dataKey="hour"
                  tickFormatter={(h) => `${h}:00`}
                  fontSize={12}
                  stroke="#888888"
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", color: "#f8fafc" }}
                  labelFormatter={(h) => `${h}:00 - ${h}:59`}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Operaciones" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Distribución de ventas y operaciones registradas por hora del día.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Employees() {
  const { session } = useAuth();
  // ...

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [enrollingFaceEmployee, setEnrollingFaceEmployee] = useState<Employee | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/hr/employees/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      setDeletingEmployee(null);
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
      toast({ title: "Empleado Eliminado", description: "Se ha dado de baja del sistema." });
    }
  });

  // Cognitive Engine
  const { setIntent, setMode, setConfidence } = useCognitiveEngine();

  useEffect(() => {
    setIntent("Gestión de Recursos Humanos");
    setMode("analysis");
    setConfidence(96);
    return () => { setIntent(undefined as any); setMode("observation"); };
  }, [setIntent, setMode, setConfidence]);

  // --- REALTIME ---
  useEffect(() => {
    const channel = supabase
      .channel('hr-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
        toast({
          title: "Personal Actualizado",
          description: "La IA ha procesado cambios en la plantilla.",
          duration: 2000
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient, toast]);

  // --- QUERIES ---
  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/hr/employees"],
    queryFn: async () => {
      if (!session?.access_token) return [];
      const res = await fetch("/api/hr/employees", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!res.ok) throw new Error("Fetch failed");
      return res.json();
    },
    enabled: !!session?.access_token
  });

  const createMutation = useMutation({
    mutationFn: async (newEmployee: Partial<Employee>) => {
      const res = await fetch("/api/hr/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(newEmployee)
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
      setIsCreateOpen(false);
      toast({ title: "Empleado Registrado", description: "Se ha añadido al sistema exitosamente." });
    }
  });

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.department || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: employees.length,
    active: employees.filter((e) => e.status === "active").length,
    leaves: employees.filter((e) => e.status === "on_leave").length,
    payroll: employees.reduce((acc, curr) => acc + (curr.salary || 0), 0)
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatCurrency = (amount: number = 0) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount / 100);

  return (
    <AppLayout title="Capital Humano" subtitle="Gestión de talento y nómina inteligente">
      <div className="space-y-6">
        {/* Cognitive Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-6">
              <AliveValue label="Total Empleados" value={stats.total} trend="neutral" />
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800" data-tour="attendance-section">
            <CardContent className="pt-6">
              <AliveValue
                label="Activos Ahora"
                value={stats.active}
                trend="up"
                explanation={`Asistencia del ${Math.round((stats.active / (stats.total || 1)) * 100)}% hoy. Objetivo de disponibilidad operacional: 95%.`}
              />
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-6">
              <AliveValue label="En Permiso / Baja" value={stats.leaves} trend="neutral" className="text-warning" />
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-6">
              <AliveValue label="Nómina Mensual" value={formatCurrency(stats.payroll)} trend="up" className="text-slate-200" unit="MXN" />
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-800 bg-slate-900/30">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CardTitle className="font-display">Directorio de Talento</CardTitle>
                {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Activity className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">Realtime HR</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar colaborador..."
                    className="pl-9 w-64 bg-slate-950/50 border-slate-800"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <CognitiveButton intent="create_employee" title="Registrar nuevo talento" data-tour="add-employee-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Empleado
                    </CognitiveButton>
                  </DialogTrigger>
                  {/* ... Existing DialogContent ... */}
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="font-display">Nuevo Talento (Interno)</DialogTitle>
                      <DialogDescription>
                        Registra un empleado operativo para uso interno (Face ID). Para acceso al dashboard, usa "Invitar Socio".
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      createMutation.mutate({
                        name: formData.get("name") as string,
                        email: formData.get("email") as string,
                        role: formData.get("role") as string,
                        department: formData.get("department") as string,
                        salary: Number(formData.get("salary")) * 100, // store in cents
                        status: "active",
                        phone: formData.get("phone") as string,
                        address: formData.get("address") as string,
                      });
                    }} className="space-y-4 py-4">

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nombre Completo</Label>
                          <Input id="name" name="name" required placeholder="Juan Pérez" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email (Opcional)</Label>
                          <Input id="email" name="email" type="email" placeholder="juan@empresa.com" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="department">Departamento</Label>
                          <Select name="department" defaultValue="operations">
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administración</SelectItem>
                              <SelectItem value="operations">Operaciones</SelectItem>
                              <SelectItem value="sales">Comercial</SelectItem>
                              <SelectItem value="logistics">Logística</SelectItem>
                              <SelectItem value="it">Tecnología</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role">Cargo / Puesto</Label>
                          <Input id="role" name="role" required placeholder="Ej. Operador Senior" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Teléfono</Label>
                          <Input id="phone" name="phone" placeholder="55-1234-5678" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address">Dirección</Label>
                          <Input id="address" name="address" placeholder="Dirección completa" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="salary">Salario Mensual (MXN)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="salary" name="salary" type="number" step="0.01" className="pl-9" placeholder="0.00" defaultValue="" />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                          {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Registrar
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Invite Dialog */}
                <InviteDialog />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-slate-800 overflow-hidden">
              <DataTable
                columns={[
                  {
                    key: "name",
                    header: "Colaborador",
                    render: (item) => (
                      <div className={cn("flex items-center gap-3", item.isArchived && "opacity-50 grayscale line-through")}>
                        <Avatar className="w-9 h-9 border border-slate-700">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {getInitials(item.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm text-slate-200">{item.name}</p>
                          <p className="text-[11px] text-muted-foreground">{item.email || "Sin email"}</p>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "role",
                    header: "Rol",
                    render: (item) => (
                      <div>
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-3 h-3 text-slate-500" />
                          <span className="text-sm font-medium text-slate-300">{item.role}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 pl-5 capitalize">{item.department}</p>
                      </div>
                    ),
                  },
                  {
                    key: "salary",
                    header: "Nómina",
                    render: (item) => (
                      <span className="font-mono text-xs text-slate-400">
                        {formatCurrency(item.salary || 0)}
                      </span>
                    )
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
                      <div className="flex items-center justify-end gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-800">
                              <MoreVertical className="w-4 h-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <DossierView
                                entityType="employee"
                                entityId={item.id}
                                entityName={item.name}
                                trigger={<div className="flex items-center w-full cursor-pointer"><Search className="w-4 h-4 mr-2" /> Ver Expediente</div>}
                              />
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingEmployee(item)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEnrollingFaceEmployee(item)}>
                              <Camera className="w-4 h-4 mr-2" />
                              Enrolar Rostro (FaceID)
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={() => setDeletingEmployee(item)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              {item.isArchived ? "Restaurar" : "Dar de Baja"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ),
                    className: "text-right",
                  },
                ]}
                data={filteredEmployees}
              />
            </div>
          </CardContent>
        </Card>


        {/* Edit Dialog */}
        <EditEmployeeDialog
          employee={editingEmployee}
          open={!!editingEmployee}
          onOpenChange={(open) => !open && setEditingEmployee(null)}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingEmployee} onOpenChange={(open) => !open && setDeletingEmployee(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Dar de baja a {deletingEmployee?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción marcará al empleado como inactivo y restringirá su acceso. Para eliminarlo permanentemente, contacte a soporte TI.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600"
                onClick={() => deletingEmployee && deleteMutation.mutate(deletingEmployee.id)}
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Baja"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* FaceID Enrollment */}
        <FaceEnrollmentDialog
          employee={enrollingFaceEmployee}
          open={!!enrollingFaceEmployee}
          onOpenChange={(open) => !open && setEnrollingFaceEmployee(null)}
        />
      </div>
    </AppLayout >
  );
}
