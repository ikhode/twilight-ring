import { useState, useMemo } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  CheckCircle2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AliveValue } from "@/components/cognitive/AliveValue";
import { CognitiveButton } from "@/components/cognitive/CognitiveButton";
import { useConfiguration } from "@/context/ConfigurationContext";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";

export default function Inventory() {
  const { session } = useAuth();
  const { toast } = useToast();
  const { universalConfig } = useConfiguration();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Fallback to defaults if no universal categories are defined
  const categories = universalConfig.productCategories?.length > 0
    ? universalConfig.productCategories
    : ["Materia Prima", "Producto Terminado", "Subproducto"];

  const { data: dbProducts, isLoading } = useQuery({
    queryKey: ["/api/operations/inventory/products"],
    queryFn: async () => {
      const res = await fetch("/api/operations/inventory/products", {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      return res.json();
    },
    enabled: !!session?.access_token
  });

  // Setup Realtime subscription for automatic product updates
  useSupabaseRealtime({
    table: 'products',
    queryKey: ["/api/operations/inventory/products"],
  });

  const products = useMemo(() => {
    const list = Array.isArray(dbProducts) ? dbProducts : [];
    return list.map((p: any) => ({
      ...p,
      price: p.price / 100,
      status: p.stock < 100 ? "critical" : p.stock < 500 ? "low" : "available",
      unit: "pza"
    }));
  }, [dbProducts]);

  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    category: categories[0],
    stock: 0,
    unit: "pza",
    price: 0,
    cost: 0,
  });

  const filteredProducts = useMemo(() => {
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const stats = useMemo(() => ({
    totalProducts: products.length,
    lowStock: products.filter((p) => p.status === "low").length,
    criticalStock: products.filter((p) => p.status === "critical").length,
    totalValue: products.reduce((acc, p) => acc + p.stock * p.price, 0),
  }), [products]);

  const queryClient = useQueryClient();

  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const res = await fetch("/api/operations/inventory/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(productData)
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operations/inventory/products"] });
      setIsAddDialogOpen(false);
      toast({ title: "Producto Creado", description: "El producto se ha registrado correctamente." });
      setNewProduct({ name: "", sku: "", category: categories[0], stock: 0, unit: "pza", price: 0, cost: 0 });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear el producto.", variant: "destructive" });
    }
  });

  const handleAddProduct = () => {
    createProductMutation.mutate({
      ...newProduct,
      price: Math.round(newProduct.price * 100), // to cents
      cost: Math.round(newProduct.cost * 100) // to cents
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);

  return (
    <AppLayout title="Inventario Inteligente" subtitle="Gestión predictiva de materia prima y producto terminado">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Items en Inventario"
            value={<AliveValue value={stats.totalProducts} unit="" />}
            icon={Package}
            variant="primary"
          />
          <StatCard
            title="Stock Bajo"
            value={<AliveValue value={stats.lowStock} unit="" allowTrend />}
            icon={TrendingDown}
            variant="warning"
          />
          <StatCard
            title="Stock Crítico"
            value={<AliveValue value={stats.criticalStock} unit="" allowTrend />}
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
              <CardTitle className="font-display">Inventario General</CardTitle>
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

                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <CognitiveButton
                      className="gap-2"
                      data-testid="button-add-product"
                      intent="register_inventory"
                    >
                      <Plus className="w-4 h-4" />
                      Registrar Entrada
                    </CognitiveButton>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nueva Entrada de Inventario</DialogTitle>
                      <DialogDescription>
                        Registre el ingreso utilizando las categorías definidas.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Nombre</Label>
                        <Input id="name" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="sku" className="text-right">SKU</Label>
                        <Input id="sku" value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">Categoría</Label>
                        <Select onValueChange={(v) => setNewProduct({ ...newProduct, category: v })} defaultValue={newProduct.category}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stock" className="text-right">Cantidad</Label>
                        <Input id="stock" type="number" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })} className="col-span-3" />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-right">Precio Venta</Label>
                        <Input id="price" type="number" step="0.01" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="cost" className="text-right">Costo Unit.</Label>
                        <Input id="cost" type="number" step="0.01" value={newProduct.cost} onChange={(e) => setNewProduct({ ...newProduct, cost: parseFloat(e.target.value) || 0 })} className="col-span-3" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddProduct} disabled={createProductMutation.isPending}>
                        {createProductMutation.isPending ? "Guardando..." : "Confirmar Registro"}
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
                  key: "cognitive",
                  header: "IA Insight",
                  render: (item: any) => (
                    item.cognitive?.shouldRestock ? (
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant="outline" className="border-warning text-warning bg-warning/5 text-[10px] uppercase font-bold tracking-wider">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Agota en {item.cognitive.daysRemaining} días
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">Sugerido: +{item.cognitive.suggestedOrder} pza</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground opacity-50 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-success" />
                        Stock Saludable ({item.cognitive.daysRemaining}d)
                      </span>
                    )
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
                    const maxStock = 20000;
                    const percentage = Math.min((item.stock / maxStock) * 100, 100);
                    return (
                      <div className="space-y-1.5 min-w-32">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold font-mono">
                            {item.stock.toLocaleString()} {item.unit}
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
                          {product.stock.toLocaleString()} {product.unit}
                        </p>
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                          Reordenar
                        </Button>
                      </div>
                    </div>
                  ))}
                {products.filter((p) => p.status === "low" || p.status === "critical").length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay productos con stock bajo.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Categorías de Producto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categories.map((category) => {
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
