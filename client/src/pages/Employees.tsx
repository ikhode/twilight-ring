import { useState } from "react";
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
import { StatCard } from "@/components/shared/StatCard";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Calendar,
  Camera,
  UserCheck,
  UserX,
  Clock,
  DollarSign,
  FileText,
  MoreVertical,
} from "lucide-react";
import { mockEmployees } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Employees() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState(mockEmployees);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<typeof mockEmployees[0] | null>(null);

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: employees.length,
    active: employees.filter((e) => e.status === "active").length,
    onBreak: employees.filter((e) => e.status === "break").length,
    away: employees.filter((e) => e.status === "away").length,
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <AppLayout title="Empleados" subtitle="Gestión de personal y recursos humanos">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Empleados"
            value={stats.total}
            icon={Users}
            variant="primary"
          />
          <StatCard
            title="Activos Ahora"
            value={stats.active}
            icon={UserCheck}
            variant="success"
          />
          <StatCard
            title="En Descanso"
            value={stats.onBreak}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Ausentes"
            value={stats.away}
            icon={UserX}
          />
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="font-display">Lista de Empleados</CardTitle>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar empleado..."
                    className="pl-9 w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-employees"
                  />
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" data-testid="button-add-employee">
                      <Plus className="w-4 h-4" />
                      Agregar Empleado
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="font-display">Nuevo Empleado</DialogTitle>
                      <DialogDescription>
                        Registre un nuevo empleado y configure su Face ID
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="flex justify-center">
                        <div className="relative">
                          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                            <Camera className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <Button
                            size="icon"
                            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">Nombre</Label>
                          <Input id="firstName" placeholder="Juan" data-testid="input-first-name" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Apellido</Label>
                          <Input id="lastName" placeholder="Pérez" data-testid="input-last-name" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="juan@empresa.com"
                          data-testid="input-email"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="department">Departamento</Label>
                          <Select>
                            <SelectTrigger data-testid="select-department">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administración</SelectItem>
                              <SelectItem value="production">Producción</SelectItem>
                              <SelectItem value="sales">Ventas</SelectItem>
                              <SelectItem value="logistics">Logística</SelectItem>
                              <SelectItem value="finance">Finanzas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role">Puesto</Label>
                          <Input id="role" placeholder="Operador" data-testid="input-role" />
                        </div>
                      </div>

                      <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Camera className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">Configurar Face ID</p>
                            <p className="text-xs text-muted-foreground">
                              Capture el rostro del empleado para el reloj checador
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            Escanear
                          </Button>
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => {
                          setIsCreateOpen(false);
                          toast({
                            title: "Empleado creado",
                            description: "El empleado ha sido registrado exitosamente",
                          });
                        }}
                        data-testid="button-confirm-add-employee"
                      >
                        Guardar Empleado
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                {
                  key: "name",
                  header: "Empleado",
                  render: (item) => (
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-primary/15 text-primary font-semibold">
                          {getInitials(item.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.email}</p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "role",
                  header: "Puesto",
                  render: (item) => (
                    <div>
                      <p className="font-medium">{item.role}</p>
                      <p className="text-xs text-muted-foreground">{item.department}</p>
                    </div>
                  ),
                },
                {
                  key: "status",
                  header: "Estado",
                  render: (item) => <StatusBadge status={item.status} />,
                },
                {
                  key: "lastClock",
                  header: "Última Entrada",
                  render: (item) => (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono">{item.lastClock}</span>
                    </div>
                  ),
                },
                {
                  key: "actions",
                  header: "",
                  render: (item) => (
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" data-testid={`button-payroll-${item.id}`}>
                        <DollarSign className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" data-testid={`button-details-${item.id}`}>
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  ),
                  className: "text-right",
                },
              ]}
              data={filteredEmployees}
              onRowClick={(item) => setSelectedEmployee(item)}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
