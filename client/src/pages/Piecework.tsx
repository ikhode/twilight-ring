import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { AliveValue } from "@/components/cognitive/AliveValue";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import {
    Ticket,
    Plus,
    DollarSign,
    CheckCircle2,
    Clock,
    User,
    FileText,
    Search,
    Filter,
    AlertTriangle,
    Settings,
    Edit,
    Trash
} from "lucide-react";

export default function Piecework() {
    const { session, profile } = useAuth();
    const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isManageOpen, setIsManageOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<any>(null);
    const [fraudWarning, setFraudWarning] = useState(false);
    const [activeTab, setActiveTab] = useState("all");

    // Realtime updates for new tickets
    useRealtimeSubscription({
        table: "piecework_tickets",
        event: "*",
        queryKeyToInvalidate: ["/api/piecework/tickets"]
    });

    const { data: tickets = [], isLoading } = useQuery({
        queryKey: ["/api/piecework/tickets"],
        queryFn: async () => {
            if (!session?.access_token) return [];
            const res = await fetch("/api/piecework/tickets", {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch tickets");
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
        queryKey: ["/api/piecework/tasks"],
        queryFn: async () => {
            if (!session?.access_token) return [];
            const res = await fetch("/api/piecework/tasks", {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const createMutation = useMutation({
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
            setIsCreateOpen(false);
            toast({ title: "Ticket Creado", description: "El trabajo ha sido registrado exitosamente." });
            queryClient.invalidateQueries({ queryKey: ["/api/piecework/tickets"] });
        }
    });

    const formatCurrency = (cents: number) =>
        new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100);

    const stats = {
        total: tickets.length,
        pending: tickets.filter((t: any) => t.status === 'pending').length,
        approved: tickets.filter((t: any) => t.status === 'approved').length,
        totalAmount: tickets.reduce((acc: number, curr: any) => acc + curr.totalAmount, 0)
    };

    const filteredTickets = tickets.filter((t: any) => {
        if (activeTab === "all") return true;
        return t.status === activeTab;
    });

    return (
        <AppLayout title="Control de Destajo" subtitle="Registro y validación de tareas por unidad">
            <div className="space-y-6">

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard
                        title="Tickets Totales"
                        value={<AliveValue value={stats.total} unit="" />}
                        icon={Ticket}
                        variant="primary"
                    />
                    <StatCard
                        title="Pendientes de Pago"
                        value={<AliveValue value={stats.pending} unit="" />}
                        icon={Clock}
                        variant="warning"
                    />
                    <StatCard
                        title="Aprobados"
                        value={stats.approved}
                        icon={CheckCircle2}
                        variant="success"
                    />
                    <StatCard
                        title="Monto Acumulado"
                        value={formatCurrency(stats.totalAmount)}
                        icon={DollarSign}
                        variant="default" // white
                    />
                </div>

                {/* Main Content */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="font-display">Registro de Actividades</CardTitle>
                                <CardDescription>Gestione los tickets de trabajo realizados por el personal.</CardDescription>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button variant="outline" size="icon">
                                    <Filter className="w-4 h-4" />
                                </Button>

                                {isAdmin && (
                                    <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="icon">
                                                <Settings className="w-4 h-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl">
                                            <DialogHeader>
                                                <DialogTitle>Configuración de Tareas (Pagos)</DialogTitle>
                                                <DialogDescription>Defina las tarifas y límites permitidos para el destajo.</DialogDescription>
                                            </DialogHeader>

                                            <div className="space-y-4">
                                                <div className="border rounded-lg p-4 bg-slate-900/50">
                                                    <h4 className="font-bold text-sm mb-3">{editingTask ? "Editar Tarea" : "Nueva Tarea"}</h4>
                                                    <form onSubmit={async (e) => {
                                                        e.preventDefault();
                                                        const formData = new FormData(e.currentTarget);
                                                        const payload = {
                                                            name: formData.get('name'),
                                                            unitPrice: Number(formData.get('unitPrice')) * 100,
                                                            minRate: formData.get('minRate') ? Number(formData.get('minRate')) * 100 : null,
                                                            maxRate: formData.get('maxRate') ? Number(formData.get('maxRate')) * 100 : null,
                                                            unit: formData.get('unit') || 'pza'
                                                        };

                                                        try {
                                                            const url = editingTask
                                                                ? `/api/piecework/tasks/${editingTask.id}`
                                                                : "/api/piecework/tasks";
                                                            const method = editingTask ? "PUT" : "POST";

                                                            const res = await fetch(url, {
                                                                method,
                                                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                                                                body: JSON.stringify(payload)
                                                            });

                                                            if (!res.ok) throw new Error("Error saving task");

                                                            toast({ title: "Guardado", description: "Tarea actualizada correctamente." });
                                                            queryClient.invalidateQueries({ queryKey: ["/api/piecework/tasks"] });
                                                            setEditingTask(null);
                                                            (e.target as HTMLFormElement).reset();
                                                        } catch (err) {
                                                            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la tarea." });
                                                        }
                                                    }} className="grid grid-cols-2 gap-4">
                                                        <div className="col-span-2">
                                                            <Label>Nombre de la Tarea</Label>
                                                            <Input name="name" required defaultValue={editingTask?.name} />
                                                        </div>
                                                        <div>
                                                            <Label>Pago Estándar ($)</Label>
                                                            <Input name="unitPrice" type="number" step="0.01" required defaultValue={editingTask ? editingTask.unitPrice / 100 : ""} />
                                                        </div>
                                                        <div>
                                                            <Label>Unidad</Label>
                                                            <Select name="unit" defaultValue={editingTask?.unit || "pza"}>
                                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="pza">Pieza</SelectItem>
                                                                    <SelectItem value="par">Par</SelectItem>
                                                                    <SelectItem value="kg">Kg</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <Label className="text-emerald-500">Mínimo Permitido ($)</Label>
                                                            <Input name="minRate" type="number" step="0.01" defaultValue={editingTask?.minRate ? editingTask.minRate / 100 : ""} placeholder="Opcional" />
                                                        </div>
                                                        <div>
                                                            <Label className="text-red-500">Máximo Permitido ($)</Label>
                                                            <Input name="maxRate" type="number" step="0.01" defaultValue={editingTask?.maxRate ? editingTask.maxRate / 100 : ""} placeholder="Opcional" />
                                                        </div>
                                                        <div className="col-span-2 flex justify-end gap-2 mt-2">
                                                            {editingTask && <Button type="button" variant="ghost" onClick={() => setEditingTask(null)}>Cancelar Edición</Button>}
                                                            <Button type="submit">{editingTask ? "Actualizar" : "Crear Tarea"}</Button>
                                                        </div>
                                                    </form>
                                                </div>

                                                <div className="space-y-2">
                                                    <h4 className="font-bold text-sm">Tareas Existentes</h4>
                                                    <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                                                        {tasks.map((t: any) => (
                                                            <div key={t.id} className="flex items-center justify-between p-3 bg-slate-900 border rounded-lg">
                                                                <div>
                                                                    <p className="font-bold">{t.name}</p>
                                                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                                                        <span>Std: ${t.unitPrice / 100}</span>
                                                                        {t.minRate && <span className="text-emerald-500">Min: ${t.minRate / 100}</span>}
                                                                        {t.maxRate && <span className="text-red-500">Max: ${t.maxRate / 100}</span>}
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingTask(t)}>
                                                                        <Edit className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={async () => {
                                                                        if (!confirm("¿Eliminar tarea?")) return;
                                                                        await fetch(`/api/piecework/tasks/${t.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${session?.access_token}` } });
                                                                        queryClient.invalidateQueries({ queryKey: ["/api/piecework/tasks"] });
                                                                    }}>
                                                                        <Trash className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )}

                                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="gap-2">
                                            <Plus className="w-4 h-4" />
                                            Nuevo Ticket
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Registrar Trabajo por Destajo</DialogTitle>
                                            <DialogDescription>Ingrese los detalles de la tarea realizada.</DialogDescription>
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

                                            createMutation.mutate({
                                                userId: session?.user?.id,
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
                                                <Label htmlFor="task">Tarea Realizada</Label>
                                                <Select name="task" onValueChange={(val) => {
                                                    // Auto-fill price
                                                    const t = tasks.find((t: any) => t.name === val);
                                                    if (t) {
                                                        const priceInput = document.getElementById('price') as HTMLInputElement;
                                                        if (priceInput) priceInput.value = (t.unitPrice / 100).toFixed(2);
                                                    }
                                                }}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccione tarea" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {tasks.map((t: any) => (
                                                            <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="quantity">Cantidad</Label>
                                                    <Input id="quantity" name="quantity" type="number" min="1" required defaultValue="1" onChange={() => setFraudWarning(false)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="price">Pago por Unidad ($)</Label>
                                                    <Input id="price" name="price" type="number" step="0.50" required />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="notes">Notas (Opcional)</Label>
                                                <Input id="notes" name="notes" placeholder="Detalles adicionales..." />
                                            </div>
                                            <DialogFooter>
                                                <Button type="submit" disabled={createMutation.isPending} variant={fraudWarning ? "destructive" : "default"}>
                                                    {createMutation.isPending ? "Registrando..." : fraudWarning ? "Confirmar Anomalía" : "Crear Ticket"}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                            <TabsList>
                                <TabsTrigger value="all">Todos</TabsTrigger>
                                <TabsTrigger value="pending">Pendientes</TabsTrigger>
                                <TabsTrigger value="approved">Aprobados</TabsTrigger>
                                <TabsTrigger value="paid">Pagados</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            columns={[
                                {
                                    key: "taskName",
                                    header: "Tarea",
                                    render: (item: any) => (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{item.taskName}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    )
                                },
                                {
                                    key: "quantity",
                                    header: "Cantidad",
                                    render: (item: any) => <span className="font-mono">{item.quantity} u.</span>
                                },
                                {
                                    key: "totalAmount",
                                    header: "Total",
                                    render: (item: any) => <span className="font-bold text-slate-200">{formatCurrency(item.totalAmount)}</span>
                                },
                                {
                                    key: "status",
                                    header: "Estado",
                                    render: (item: any) => <StatusBadge status={item.status} />
                                }
                            ]}
                            data={filteredTickets}
                        />
                    </CardContent>
                </Card>
            </div>
        </AppLayout >
    );
}
