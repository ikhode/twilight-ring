import { useState, useMemo, useEffect } from "react";
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
  Archive,
  BarChart3,
  CheckCircle2,
  Filter,
  Download,
  ChevronRight,
  History as HistoryIcon
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
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<any>(null);

  // Fallback to defaults if no universal categories are defined
  const categories = universalConfig.productCategories?.length > 0
    ? universalConfig.productCategories
    : ["Materia Prima", "Producto Terminado", "Subproducto"];

  const { data: dbProducts, isLoading } = useQuery({
    queryKey: ["/api/inventory/products"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/products", {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      return res.json();
    },
    enabled: !!session?.access_token
  });

  const { data: alerts = [], isLoading: isAlertsLoading } = useQuery({
    queryKey: ["/api/inventory/alerts"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/alerts", {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      return res.json();
    },
    enabled: !!session?.access_token
  });

  // Setup Realtime subscription for automatic product updates
  useSupabaseRealtime({
    table: 'products',
    queryKey: ["/api/inventory/products"],
  });

  const products = useMemo(() => {
    const list = Array.isArray(dbProducts) ? dbProducts : [];
    return list.map((p: any) => ({
      ...p,
      price: p.price / 100,
      status: p.stock < 100 ? "critical" : p.stock < 500 ? "low" : "available",
      unit: p.unit || "pza"
    }));
  }, [dbProducts]);

  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    category: categories[0],
    productType: "both", // "sale", "purchase", "internal", "both"
    stock: 0,
    unit: "pza",
    price: 0,
    cost: 0,
  });

  // Auto-generate SKU
  useEffect(() => {
    if (newProduct.name && !newProduct.sku) {
      const generatedSku = `PROD-${newProduct.name.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setNewProduct(prev => ({ ...prev, sku: generatedSku }));
    }
  }, [newProduct.name]);

  const filteredProducts = useMemo(() => {
    return products.filter(
      (p) =>
        (p.isActive !== false) &&
        (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase()))
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
      const res = await fetch("/api/inventory/products", {
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
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      setIsAddDialogOpen(false);
      toast({ title: "Producto Creado", description: "El producto se ha registrado correctamente." });
      setNewProduct({ name: "", sku: "", category: categories[0], productType: "both", stock: 0, unit: "pza", price: 0, cost: 0 });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el producto. Verifique si el SKU ya existe.",
        variant: "destructive"
      });
    }
  });

  const archiveProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(`/api/inventory/products/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ isActive: false })
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      toast({ title: "Producto Archivado", description: "El producto se ha desactivado correctamente." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo archivar el producto.", variant: "destructive" });
    }
  });

  const adjustStockMutation = useMutation({
    mutationFn: async ({ productId, stock, reason }: { productId: string, stock: number, reason?: string }) => {
      const res = await fetch(`/api/inventory/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ stock, reason })
      });
      if (!res.ok) throw new Error("Failed to update stock");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      toast({ title: "Inventario Actualizado", description: "El stock se ha ajustado correctamente." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
                      data-tour="add-product-btn"
                      intent="register_inventory"
                    >
                      <Plus className="w-4 h-4" />
                      Nuevo Producto
                    </CognitiveButton>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Alta de Nuevo Producto / Insumo</DialogTitle>
                      <DialogDescription>
                        Ingrese los detalles para registrar un nuevo item en el catálogo.
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
                        <Label htmlFor="productType" className="text-right">Tipo</Label>
                        <Select onValueChange={(v) => setNewProduct({ ...newProduct, productType: v })} defaultValue={newProduct.productType}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="both">Compra y Venta</SelectItem>
                            <SelectItem value="purchase">Materia Prima (Compra)</SelectItem>
                            <SelectItem value="sale">Producto Terminado (Venta)</SelectItem>
                            <SelectItem value="internal">Insumo Interno / Producido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {(newProduct.productType === "both" || newProduct.productType === "sale") && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="price" className="text-right">Precio Venta</Label>
                          <Input id="price" type="number" step="0.01" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })} className="col-span-3" />
                        </div>
                      )}

                      {(newProduct.productType === "both" || newProduct.productType === "purchase") && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="cost" className="text-right">Costo Unit.</Label>
                          <Input id="cost" type="number" step="0.01" value={newProduct.cost} onChange={(e) => setNewProduct({ ...newProduct, cost: parseFloat(e.target.value) || 0 })} className="col-span-3" />
                        </div>
                      )}

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unit" className="text-right">UOM</Label>
                        <Select onValueChange={(v) => setNewProduct({ ...newProduct, unit: v })} defaultValue={newProduct.unit}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pza">Pieza (pza)</SelectItem>
                            <SelectItem value="kg">Kilogramo (kg)</SelectItem>
                            <SelectItem value="lt">Litro (lt)</SelectItem>
                            <SelectItem value="g">Gramo (g)</SelectItem>
                            <SelectItem value="ml">Mililitro (ml)</SelectItem>
                            <SelectItem value="m">Metro (m)</SelectItem>
                            <SelectItem value="paq">Paquete (paq)</SelectItem>
                            <SelectItem value="caja">Caja</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stock" className="text-right">Stock Inicial</Label>
                        <Input id="stock" type="number" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })} className="col-span-3" />
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
          <CardContent data-tour="product-list">
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
                        <span className="text-[10px] text-muted-foreground">Sugerido: +{item.cognitive.suggestedOrder} {item.unit}</span>
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
                        onClick={() => {
                          setSelectedProduct(item);
                          setIsAdjustDialogOpen(true);
                        }}
                      >
                        <ArrowUpDown className="w-4 h-4 mr-1" />
                        Ajustar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm("¿Está seguro de que desea archivar este producto?")) {
                            archiveProductMutation.mutate(item.id);
                          }
                        }}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`button-history-${item.id}`}
                        onClick={() => {
                          setSelectedProductForHistory(item);
                          setIsHistoryDialogOpen(true);
                        }}
                      >
                        <HistoryIcon className="w-4 h-4" />
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

        <StockAdjustmentDialog
          isOpen={isAdjustDialogOpen}
          onOpenChange={setIsAdjustDialogOpen}
          product={selectedProduct}
          onAdjust={(stock, reason) => {
            adjustStockMutation.mutate({ productId: selectedProduct.id, stock, reason });
            setIsAdjustDialogOpen(false);
          }}
          isPending={adjustStockMutation.isPending}
        />

        <MovementHistoryDialog
          isOpen={isHistoryDialogOpen}
          onOpenChange={setIsHistoryDialogOpen}
          product={selectedProductForHistory}
        />

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
                {alerts.length > 0 ? alerts.map((product: any) => (
                  <div
                    key={product.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border border-white/5 transition-all hover:bg-white/5",
                      product.stock < 20
                        ? "bg-destructive/10 border-l-4 border-l-destructive"
                        : "bg-warning/10 border-l-4 border-l-warning"
                    )}
                    data-testid={`low-stock-${product.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        product.stock < 20 ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"
                      )}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{product.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{product.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold font-mono text-lg">
                        {product.stock.toLocaleString()} <span className="text-[10px] text-muted-foreground">{product.unit}</span>
                      </p>
                      <Badge variant="outline" className="text-[9px] uppercase border-primary/30 text-primary">
                        Sugerido: +{product.recommendedReorder}
                      </Badge>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12 rounded-xl bg-muted/20 border border-dashed border-white/5">
                    <CheckCircle2 className="w-10 h-10 text-success/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground italic font-display">Niveles de stock saludables.</p>
                  </div>
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

function StockAdjustmentDialog({ isOpen, onOpenChange, product, onAdjust, isPending }: { isOpen: boolean, onOpenChange: (v: boolean) => void, product: any, onAdjust: (stock: number, reason: string) => void, isPending: boolean }) {
  const [newStock, setNewStock] = useState<number>(0);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (product) {
      setNewStock(product.stock);
      setReason("");
    }
  }, [product, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar Inventario: {product?.name}</DialogTitle>
          <DialogDescription>
            Modifique la cantidad actual en existencia. Este cambio quedará auditado.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Stock Actual</Label>
            <div className="col-span-3 font-mono font-bold text-lg">
              {product?.stock} {product?.unit}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="adj-stock" className="text-right text-primary font-bold">Nuevo Stock</Label>
            <Input
              id="adj-stock"
              type="number"
              value={newStock}
              onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
              className="col-span-3 border-primary/50 focus:border-primary"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="adj-reason" className="text-right">Motivo</Label>
            <Input
              id="adj-reason"
              placeholder="Ej. Conteo cíclico, merma, corrección..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onAdjust(newStock, reason)} disabled={isPending}>
            {isPending ? "Guardando..." : "Confirmar Ajuste"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MovementHistoryDialog({ isOpen, onOpenChange, product }: { isOpen: boolean, onOpenChange: (v: boolean) => void, product: any }) {
  const { session } = useAuth();
  const { data: movements, isLoading } = useQuery({
    queryKey: [product?.id ? `/api/inventory/products/${product.id}/history` : null],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/products/${product.id}/history`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
    enabled: !!session?.access_token && !!product?.id && isOpen
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-primary/20 bg-slate-950">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <HistoryIcon className="w-5 h-5 text-primary animate-pulse" />
            Trazabilidad: {product?.name}
          </DialogTitle>
          <DialogDescription>
            Registro histórico de movimientos y ajustes de stock para {product?.sku}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground animate-pulse">Analizando serie de tiempo...</p>
            </div>
          ) : movements?.length > 0 ? (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {movements.map((m: any) => (
                <div key={m.id} className="group flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-white/5 hover:border-primary/20 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
                      m.type === 'in' || m.quantity > 0
                        ? "bg-success/20 text-success border border-success/30"
                        : "bg-destructive/20 text-destructive border border-destructive/30"
                    )}>
                      {m.type === 'in' || m.quantity > 0 ? <Plus className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white font-display">
                          {m.reason || (m.quantity > 0 ? 'Entrada / Compra' : 'Salida / Venta')}
                        </p>
                        <Badge variant="outline" className="text-[10px] uppercase h-4">
                          {m.type || 'ajuste'}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 font-mono">
                        <HistoryIcon className="w-3 h-3" />
                        {new Date(m.date || m.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-mono font-bold text-lg",
                      m.quantity > 0 ? "text-success" : "text-destructive"
                    )}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity} {product?.unit}
                    </p>
                    <p className="text-[10px] text-muted-foreground italic opacity-70">
                      Muelle: {m.source || 'Interno / Almacén'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 rounded-2xl bg-slate-900/30 border border-dashed border-white/10">
              <HistoryIcon className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground italic font-display">Sin registros de auditoría para este lote.</p>
            </div>
          )}
        </div>
        <DialogFooter className="border-t border-white/5 pt-4 mt-2">
          <Button variant="ghost" className="hover:bg-white/5" onClick={() => onOpenChange(false)}>
            Cerrar Expediente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
