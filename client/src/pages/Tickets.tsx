import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/shared/StatCard";
import {
  ClipboardList,
  Plus,
  Clock,
  CheckCircle2,
  DollarSign,
  Users,
  Factory,
  Printer,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
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

export default function Tickets() {
  const { toast } = useToast();
  const { session } = useAuth();
  const queryClient = useQueryClient();

  // Fetch tickets from API
  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ['/api/piecework/tickets'],
    queryFn: async () => {
      const res = await fetch('/api/piecework/tickets', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch tickets');
      return res.json();
    },
    enabled: !!session?.access_token,
  });

  // Setup Realtime subscription for automatic updates
  useSupabaseRealtime({
    table: 'piecework_tickets',
    queryKey: ['/api/piecework/tickets'],
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);

  const stats = {
    pending: tickets.filter((t) => t.status === "pending").length,
    approved: tickets.filter((t) => t.status === "approved").length,
    paid: tickets.filter((t) => t.status === "paid").length,
    totalAmount: tickets.reduce((acc, t) => acc + t.amount, 0),
  };

  // Mutation for approving tickets
  const approveMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      const res = await fetch(`/api/piecework/tickets/${ticketId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to approve ticket');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/piecework/tickets'] });
      toast({
        title: "Ticket aprobado",
        description: "El empleado puede pasar a cobrar",
      });
    },
  });

  // Mutation for rejecting tickets
  const rejectMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      const res = await fetch(`/api/piecework/tickets/${ticketId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to reject ticket');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/piecework/tickets'] });
      toast({
        title: "Ticket rechazado",
        variant: "destructive",
      });
    },
  });

  // Mutation for paying tickets
  const payMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      const res = await fetch(`/api/piecework/tickets/${ticketId}/pay`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to pay ticket');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/piecework/tickets'] });
      toast({
        title: "Pago registrado",
        description: "El ticket ha sido marcado como pagado",
      });
    },
  });

  const handleApprove = (ticketId: number) => approveMutation.mutate(ticketId);
  const handleReject = (ticketId: number) => rejectMutation.mutate(ticketId);
  const handlePay = (ticketId: number) => payMutation.mutate(ticketId);

  return (
    <AppLayout title="Tickets de Producción" subtitle="Gestión de tickets para pago a empleados">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Pendientes"
            value={stats.pending}
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
            title="Pagados Hoy"
            value={stats.paid}
            icon={DollarSign}
            variant="primary"
          />
          <StatCard
            title="Monto Total"
            value={formatCurrency(stats.totalAmount)}
            icon={DollarSign}
          />
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-semibold">Tickets Activos</h2>
          <Button className="gap-2" data-testid="button-create-ticket">
            <Plus className="w-4 h-4" />
            Crear Ticket
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <DataTable
              columns={[
                {
                  key: "id",
                  header: "ID",
                  render: (item) => (
                    <span className="font-mono font-semibold text-primary">
                      #{item.id.toString().padStart(4, "0")}
                    </span>
                  ),
                },
                {
                  key: "employee",
                  header: "Empleado",
                  render: (item) => (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center font-semibold text-primary">
                        {item.employee.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <span className="font-medium">{item.employee}</span>
                    </div>
                  ),
                },
                {
                  key: "process",
                  header: "Proceso",
                  render: (item) => (
                    <div className="flex items-center gap-2">
                      <Factory className="w-4 h-4 text-muted-foreground" />
                      <span>{item.process}</span>
                    </div>
                  ),
                },
                {
                  key: "quantity",
                  header: "Cantidad",
                  render: (item) => (
                    <span className="font-mono font-semibold">{item.quantity} unidades</span>
                  ),
                },
                {
                  key: "amount",
                  header: "Monto",
                  render: (item) => (
                    <span className="font-mono font-bold text-success">
                      {formatCurrency(item.amount)}
                    </span>
                  ),
                },
                {
                  key: "createdAt",
                  header: "Fecha",
                  render: (item) => (
                    <span className="text-sm text-muted-foreground font-mono">
                      {item.createdAt}
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
                  header: "Acciones",
                  render: (item) => (
                    <div className="flex items-center gap-2">
                      {item.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success border-success/30 hover:bg-success/10"
                            onClick={() => handleApprove(item.id)}
                            data-testid={`button-approve-${item.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => handleReject(item.id)}
                            data-testid={`button-reject-${item.id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Rechazar
                          </Button>
                        </>
                      )}
                      {(item.status === "approved" || item.status === "pending") && (
                        <Button
                          size="sm"
                          onClick={() => handlePay(item.id)}
                          data-testid={`button-pay-${item.id}`}
                          className={cn(item.status === "pending" && "text-success border-success/30 hover:bg-success/10")}
                          variant={item.status === "pending" ? "outline" : "default"}
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Pagar
                        </Button>
                      )}
                      {item.status === "paid" && (
                        <Button size="sm" variant="ghost" data-testid={`button-print-${item.id}`}>
                          <Printer className="w-4 h-4 mr-1" />
                          Recibo
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]}
              data={tickets}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Resumen por Empleado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from(new Set(tickets.map(t => t.employee))).map((employee, index) => {
                  const employeeTickets = tickets.filter((t) => t.employee === employee);
                  const total = employeeTickets.reduce((acc, t) => acc + t.amount, 0);
                  const pending = employeeTickets.filter((t) => t.status === "pending" || t.status === "approved").length;

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center font-semibold text-primary">
                          {employee.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="font-medium">{employee}</p>
                          <p className="text-xs text-muted-foreground">
                            {employeeTickets.length} tickets | {pending} pendientes
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold font-mono text-success">
                          {formatCurrency(total)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total generado</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Factory className="w-5 h-5 text-primary" />
                Resumen por Proceso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from(new Set(tickets.map(t => t.process))).map((process, index) => {
                  const processTickets = tickets.filter((t) => t.process === process);
                  const totalQuantity = processTickets.reduce((acc, t) => acc + t.quantity, 0);
                  const totalAmount = processTickets.reduce((acc, t) => acc + t.amount, 0);

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
                          <Factory className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium">{process}</p>
                          <p className="text-xs text-muted-foreground">
                            {processTickets.length} tickets
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold font-mono">{totalQuantity} unidades</p>
                        <p className="text-sm text-success font-mono">
                          {formatCurrency(totalAmount)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
