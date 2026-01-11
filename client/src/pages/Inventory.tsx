import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/shared/StatCard";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  TrendingDown,
  Layers,
  DollarSign,
  ArrowUpDown,
  Filter,
  Download,
  BarChart3,
} from "lucide-react";
import { mockProducts } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [products] = useState(mockProducts);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalProducts: products.length,
    lowStock: products.filter((p) => p.status === "low").length,
    criticalStock: products.filter((p) => p.status === "critical").length,
    totalValue: products.reduce((acc, p) => acc + p.stock * p.price, 0),
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);

  return (
    <AppLayout title="Inventario" subtitle="Control de productos y existencias">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Productos"
            value={stats.totalProducts}
            icon={Package}
            variant="primary"
          />
          <StatCard
            title="Stock Bajo"
            value={stats.lowStock}
            icon={TrendingDown}
            variant="warning"
          />
          <StatCard
            title="Stock Crítico"
            value={stats.criticalStock}
            icon={AlertTriangle}
            variant="destructive"
          />
          <StatCard
            title="Valor Total"
            value={formatCurrency(stats.totalValue)}
            icon={DollarSign}
            variant="success"
          />
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="font-display">Productos</CardTitle>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar producto..."
                    className="pl-9 w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-products"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Download className="w-4 h-4" />
                </Button>
                <Button className="gap-2" data-testid="button-add-product">
                  <Plus className="w-4 h-4" />
                  Agregar Producto
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                {
                  key: "name",
                  header: "Producto",
                  render: (item) => (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "category",
                  header: "Categoría",
                  render: (item) => (
                    <Badge variant="secondary">{item.category}</Badge>
                  ),
                },
                {
                  key: "stock",
                  header: "Stock",
                  render: (item) => {
                    const maxStock = 500;
                    const percentage = Math.min((item.stock / maxStock) * 100, 100);
                    return (
                      <div className="space-y-1.5 min-w-32">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold font-mono">
                            {item.stock} {item.unit}
                          </span>
                          <StatusBadge status={item.status} />
                        </div>
                        <Progress
                          value={percentage}
                          className={cn(
                            "h-1.5",
                            item.status === "critical" && "[&>div]:bg-destructive",
                            item.status === "low" && "[&>div]:bg-warning"
                          )}
                        />
                      </div>
                    );
                  },
                },
                {
                  key: "price",
                  header: "Precio",
                  render: (item) => (
                    <span className="font-mono font-semibold">
                      {formatCurrency(item.price)}
                    </span>
                  ),
                },
                {
                  key: "value",
                  header: "Valor Total",
                  render: (item) => (
                    <span className="font-mono text-muted-foreground">
                      {formatCurrency(item.stock * item.price)}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  header: "",
                  render: (item) => (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-adjust-stock-${item.id}`}
                      >
                        <ArrowUpDown className="w-4 h-4 mr-1" />
                        Ajustar
                      </Button>
                      <Button variant="ghost" size="sm" data-testid={`button-history-${item.id}`}>
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                    </div>
                  ),
                  className: "text-right",
                },
              ]}
              data={filteredProducts}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Productos con Stock Bajo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {products
                  .filter((p) => p.status === "low" || p.status === "critical")
                  .map((product) => (
                    <div
                      key={product.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border-l-4",
                        product.status === "critical"
                          ? "bg-destructive/10 border-destructive"
                          : "bg-warning/10 border-warning"
                      )}
                      data-testid={`low-stock-${product.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Package
                          className={cn(
                            "w-5 h-5",
                            product.status === "critical"
                              ? "text-destructive"
                              : "text-warning"
                          )}
                        />
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.sku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold font-mono">
                          {product.stock} {product.unit}
                        </p>
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                          Reordenar
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Categorías
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {["Materia Prima", "Producto Terminado"].map((category) => {
                  const categoryProducts = products.filter((p) => p.category === category);
                  const totalValue = categoryProducts.reduce(
                    (acc, p) => acc + p.stock * p.price,
                    0
                  );
                  return (
                    <div
                      key={category}
                      className="p-4 rounded-lg bg-muted/50"
                      data-testid={`category-${category.toLowerCase().replace(" ", "-")}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{category}</span>
                        <Badge variant="secondary">{categoryProducts.length} productos</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Valor en inventario</span>
                        <span className="font-mono font-semibold">{formatCurrency(totalValue)}</span>
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
