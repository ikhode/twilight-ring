import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  Camera
} from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Employee } from "../../../shared/schema";
import { supabase } from "@/lib/supabase";
import { useCognitiveEngine } from "@/lib/cognitive/engine";
import { FaceEnrollmentDialog } from "@/components/hr/FaceEnrollmentDialog";


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
                name: formData.get("name") as string,
                email: formData.get("email") as string,
                role: formData.get("role") as string,
                department: formData.get("department") as string,
                salary: Number(formData.get("salary")) * 100,
                status: formData.get("status") as any,
              });
            }} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input name="name" defaultValue={employee.name} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
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
                  <Label>Salario (Mensual)</Label>
                  <Input name="salary" type="number" defaultValue={(employee.salary || 0) / 100} />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
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

              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar Cambios
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
      </DialogContent>
    </Dialog>
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
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-6">
              <AliveValue label="Activos Ahora" value={stats.active} trend="up" explanation="98% de asistencia hoy" />
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
                    <CognitiveButton intent="create_employee" title="Registrar nuevo talento">
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
                        status: "active"
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

                      <div className="space-y-2">
                        <Label htmlFor="salary">Salario Mensual (MXN)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="salary" name="salary" type="number" className="pl-9" placeholder="0.00" />
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
                      <div className="flex items-center gap-3">
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
                              Dar de Baja
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
