import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/shared/StatCard";
import {
  Building2,
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  DollarSign,
  TrendingUp,
  Truck,
  ShoppingBag,
} from "lucide-react";
import { mockClients, mockSuppliers } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function CRM() {
  const [searchQuery, setSearchQuery] = useState("");

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);

  const clientsStats = {
    total: mockClients.length,
    active: mockClients.filter((c) => c.status === "active").length,
    totalReceivables: mockClients.reduce((acc, c) => acc + Math.max(0, c.balance), 0),
    totalDebt: mockClients.filter((c) => c.balance < 0).reduce((acc, c) => acc + Math.abs(c.balance), 0),
  };

  const suppliersStats = {
    total: mockSuppliers.length,
    totalPayables: mockSuppliers.reduce((acc, s) => acc + Math.abs(s.balance), 0),
  };

  return (
    <AppLayout title="Clientes y Proveedores" subtitle="Gestión de relaciones comerciales">
      <div className="space-y-6">
        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList>
            <TabsTrigger value="clients" data-testid="tab-clients">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="suppliers" data-testid="tab-suppliers">
              <Truck className="w-4 h-4 mr-2" />
              Proveedores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Clientes"
                value={clientsStats.total}
                icon={Users}
                variant="primary"
              />
              <StatCard
                title="Clientes Activos"
                value={clientsStats.active}
                icon={TrendingUp}
                variant="success"
              />
              <StatCard
                title="Por Cobrar"
                value={formatCurrency(clientsStats.totalReceivables)}
                icon={DollarSign}
                variant="primary"
              />
              <StatCard
                title="Adeudos"
                value={formatCurrency(clientsStats.totalDebt)}
                icon={DollarSign}
                variant="destructive"
              />
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle className="font-display">Lista de Clientes</CardTitle>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar cliente..."
                        className="pl-9 w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        data-testid="input-search-clients"
                      />
                    </div>
                    <Button className="gap-2" data-testid="button-add-client">
                      <Plus className="w-4 h-4" />
                      Agregar Cliente
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    {
                      key: "name",
                      header: "Cliente",
                      render: (item) => (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center font-semibold text-primary">
                            {item.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <Badge variant="secondary" className="text-xs mt-0.5">
                              {item.type}
                            </Badge>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "contact",
                      header: "Contacto",
                      render: (item) => (
                        <div>
                          <p className="font-medium">{item.contact}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {item.phone}
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "balance",
                      header: "Balance",
                      render: (item) => (
                        <span
                          className={cn(
                            "font-semibold font-mono",
                            item.balance >= 0 ? "text-success" : "text-destructive"
                          )}
                        >
                          {formatCurrency(item.balance)}
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
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" data-testid={`button-view-client-${item.id}`}>
                            Ver Detalle
                          </Button>
                        </div>
                      ),
                    },
                  ]}
                  data={mockClients.filter(
                    (c) =>
                      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      c.contact.toLowerCase().includes(searchQuery.toLowerCase())
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                title="Total Proveedores"
                value={suppliersStats.total}
                icon={Truck}
                variant="primary"
              />
              <StatCard
                title="Proveedores Activos"
                value={suppliersStats.total}
                icon={TrendingUp}
                variant="success"
              />
              <StatCard
                title="Por Pagar"
                value={formatCurrency(suppliersStats.totalPayables)}
                icon={DollarSign}
                variant="warning"
              />
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle className="font-display">Lista de Proveedores</CardTitle>
                  <Button className="gap-2" data-testid="button-add-supplier">
                    <Plus className="w-4 h-4" />
                    Agregar Proveedor
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    {
                      key: "name",
                      header: "Proveedor",
                      render: (item) => (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-warning/15 flex items-center justify-center font-semibold text-warning">
                            {item.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{item.name}</p>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "contact",
                      header: "Contacto",
                      render: (item) => (
                        <div>
                          <p className="font-medium">{item.contact}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {item.phone}
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "balance",
                      header: "Por Pagar",
                      render: (item) => (
                        <span className="font-semibold font-mono text-warning">
                          {formatCurrency(Math.abs(item.balance))}
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
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" data-testid={`button-view-supplier-${item.id}`}>
                            Ver Detalle
                          </Button>
                          <Button variant="outline" size="sm" data-testid={`button-pay-supplier-${item.id}`}>
                            Registrar Pago
                          </Button>
                        </div>
                      ),
                    },
                  ]}
                  data={mockSuppliers}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
