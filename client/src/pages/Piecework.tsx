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
    AlertTriangle
} from "lucide-react";

export default function Piecework() {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
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
        </AppLayout>
    );
}
