import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  History as HistoryIcon,
  Bot,
  Activity
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CognitiveButton, AliveValue, CognitiveInput, CognitiveField, CognitiveProvider, GuardianDiagnostic, GuardianSafeStatus } from "@/components/cognitive";
import { useConfiguration } from "@/context/ConfigurationContext";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { useAppStore } from "@/store/app-store";

export default function Inventory() {
  const { session } = useAuth();
  const { toast } = useToast();
  const { universalConfig, industry } = useConfiguration();
  const { productTypeLabels } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // Dynamic Placeholders
  const placeholders: Record<string, string> = {
    manufacturing: "Ej: Placa de Acero Calibre 18",
    retail: "Ej: Vestido de Noche Rojo",
    logistics: "Ej: Tarima Euro 120x80",
    restaurant: "Ej: Hamburguesa Doble con Queso",
    services: "Ej: Hora de Desarrollo Senior",
    generic: "Ej: Producto General"
  };

  const currentPlaceholder = placeholders[industry as string] || placeholders.generic;

  // Dynamic Labels
  const labels: Record<string, any> = {
    services: {
      addProductTitle: "Alta de Nuevo Servicio",
      description: "Configure los parámetros de facturación y capacidad del servicio.",
      itemName: "Nombre del Servicio",
      unitLabel: "Unidad de Facturación",
      stockLabel: "Capacidad / Horas Disp.",
      optimizationTitle: "Optimización de Recursos",
      stockStatus: "Disponibilidad Operativa"
    },
    restaurant: {
      addProductTitle: "Alta de Nuevo Platillo",
      description: "Registre los detalles del menú y control de porciones.",
      itemName: "Nombre del Platillo",
      unitLabel: "Unidad de Venta",
      stockLabel: "Porciones Disponibles",
      optimizationTitle: "Control de Mermas",
      stockStatus: "Stock en Cocina"
    },
    generic: {
      addProductTitle: "Alta de Nuevo Producto",
      description: "Complete los campos técnicos para la optimización cognitiva del inventario.",
      itemName: "Nombre del Item",
      unitLabel: "Unidad de Medida (UOM)",
      stockLabel: "Stock Inicial",
      optimizationTitle: "Optimización de Inventario",
      stockStatus: "Stock Operativo Saludable"
    }
  };

  const currentLabels = labels[industry as string] || labels.generic;

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

  const { data: categoriesList = [] } = useQuery({
    queryKey: ["/api/inventory/categories"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/categories", { headers: { Authorization: `Bearer ${session?.access_token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!session?.access_token
  });

  const { data: groupsList = [] } = useQuery({
    queryKey: ["/api/inventory/groups"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/groups", { headers: { Authorization: `Bearer ${session?.access_token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!session?.access_token
  });

  const { data: unitsList = [] } = useQuery({
    queryKey: ["/api/inventory/units"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/units", { headers: { Authorization: `Bearer ${session?.access_token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!session?.access_token
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/inventory/categories", { name }, { Authorization: `Bearer ${session?.access_token}` });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/categories"] });
      toast({ title: "Categoría Creada" });
    }
  });

  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/inventory/groups", { name }, { Authorization: `Bearer ${session?.access_token}` });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/groups"] });
      toast({ title: "Grupo Creado" });
    }
  });

  const createUnitMutation = useMutation({
    mutationFn: async ({ name, abbreviation }: { name: string, abbreviation: string }) => {
      const res = await apiRequest("POST", "/api/inventory/units", { name, abbreviation }, { Authorization: `Bearer ${session?.access_token}` });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/units"] });
      toast({ title: "Unidad Creada" });
    }
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
      cost: (p.cost || 0) / 100,
      status: p.stock < 100 ? "critical" : p.stock < 500 ? "low" : "available",
      unit: p.unit || "pza"
    }));
  }, [dbProducts]);

  const groupedProducts = useMemo(() => {
    const groups: Record<string, any> = {};
    const ungrouped: any[] = [];

    products.forEach(p => {
      if (p.groupId && p.group) {
        if (!groups[p.groupId]) {
          groups[p.groupId] = {
            id: p.groupId,
            name: p.group.name,
            sku: `GROUP-${p.groupId.slice(0, 4).toUpperCase()}`,
            category: p.category,
            stock: 0,
            price: p.price, // Use first product's price as group price for now
            status: "available",
            unit: p.unit,
            isGroup: true,
            products: []
          };
        }
        groups[p.groupId].stock += p.stock;
        groups[p.groupId].products.push(p);
      } else {
        ungrouped.push({ ...p, isGroup: false });
      }
    });

    const result = [...ungrouped, ...Object.values(groups)];
    return result.map(p => ({
      ...p,
      status: p.stock < 100 ? "critical" : p.stock < 500 ? "low" : "available"
    }));
  }, [products]);

  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    category: "",
    categoryId: "",
    groupId: "",
    productType: "both", // Legacy
    isSellable: true,
    isPurchasable: true,
    isProductionInput: false,
    isProductionOutput: false,
    stock: 0,
    unit: "pza",
    unitId: "",
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
    return groupedProducts.filter(
      (p) =>
        (p.isActive !== false) &&
        (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.category || "").toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [groupedProducts, searchQuery]);

  const stats = useMemo(() => ({
    totalProducts: products.length,
    lowStock: products.filter((p) => p.status === "low").length,
    criticalStock: products.filter((p) => p.status === "critical").length,
    totalValue: products.reduce((acc, p) => acc + p.stock * p.price, 0),
  }), [products]);

  const queryClient = useQueryClient();

  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const res = await apiRequest("POST", "/api/inventory/products", productData, {
        Authorization: `Bearer ${session?.access_token}`
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      setIsAddDialogOpen(false);
      toast({ title: "Producto Creado", description: "El producto se ha registrado correctamente." });
      resetForm();
      window.dispatchEvent(new CustomEvent('NEXUS_ONBOARDING_ACTION', { detail: 'product_created' }));
    },
    onError: (error: Error) => {
      toast({ title: "Error de Registro", description: error.message, variant: "destructive" });
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const res = await apiRequest("PATCH", `/api/inventory/products/${productData.id}`, productData, {
        Authorization: `Bearer ${session?.access_token}`
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      setIsAddDialogOpen(false);
      setIsEditing(false);
      toast({ title: "Producto Actualizado", description: "Los cambios se han guardado." });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error de Actualización", description: error.message, variant: "destructive" });
    }
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string, name: string }) => {
      const res = await apiRequest("PATCH", `/api/inventory/groups/${id}`, { name }, {
        Authorization: `Bearer ${session?.access_token}`
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/groups"] });
      setIsAddDialogOpen(false);
      setIsEditing(false);
      toast({ title: "Grupo Actualizado", description: "Los cambios se han guardado." });
      resetForm();
    }
  });

  const resetForm = () => {
    setNewProduct({
      name: "",
      sku: "",
      category: "",
      categoryId: "",
      groupId: "",
      productType: "both",
      isSellable: true,
      isPurchasable: true,
      isProductionInput: false,
      isProductionOutput: false,
      stock: 0,
      unit: "pza",
      unitId: "",
      price: 0,
      cost: 0
    });
    setIsEditing(false);
    setSelectedProduct(null);
    setEditingGroupId(null);
  };

  const archiveProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await apiRequest("PATCH", `/api/inventory/products/${productId}`, { isActive: false }, {
        Authorization: `Bearer ${session?.access_token}`
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      toast({ title: "Producto Archivado", description: "El producto se ha desactivado correctamente." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const adjustStockMutation = useMutation({
    mutationFn: async ({ productId, stock, reason }: { productId: string, stock: number, reason?: string }) => {
      const res = await apiRequest("PATCH", `/api/inventory/products/${productId}`, { stock, reason }, {
        Authorization: `Bearer ${session?.access_token}`
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      toast({ title: "Inventario Actualizado", description: "El stock se ha ajustado correctamente." });
    },
    onError: (error: Error) => {
      toast({ title: "Error de Ajuste", description: error.message, variant: "destructive" });
    }
  });

  const handleEdit = (item: any) => {
    if (item.isGroup) {
      setEditingGroupId(item.id);
      setIsEditing(true);
      setNewProduct(prev => ({ ...prev, name: item.name })); // For group, only name is editable in this view for now
    } else {
      setSelectedProduct(item);
      setIsEditing(true);
      setNewProduct({
        ...item,
        price: item.price, // already decimal
        cost: item.cost, // already decimal
        groupId: item.groupId || "",
        categoryId: item.categoryId || ""
      });
    }
    setIsAddDialogOpen(true);
  };

  const handleAddProduct = () => {
    const payload: any = { ...newProduct };
    if (!payload.categoryId) delete payload.categoryId;
    if (!payload.groupId || payload.groupId === "") delete payload.groupId;

    const data = {
      ...payload,
      unitId: payload.unitId || null,
      price: Math.round(newProduct.price * 100),
      cost: Math.round(newProduct.cost * 100)
    };

    if (isEditing) {
      if (editingGroupId) {
        updateGroupMutation.mutate({ id: editingGroupId, name: newProduct.name });
      } else if (selectedProduct) {
        updateProductMutation.mutate({ ...data, id: selectedProduct.id });
      }
    } else {
      createProductMutation.mutate(data);
    }
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Filter className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Filtrar productos</p>
                  </TooltipContent>
                </Tooltip>

                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <CognitiveButton
                      className="gap-2"
                      data-testid="button-add-product"
                      data-tour="add-product-btn"
                      intent="register_inventory"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('NEXUS_ONBOARDING_ACTION', { detail: 'modal_opened_inventory' }));
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Nuevo Producto
                    </CognitiveButton>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl bg-slate-950/95 backdrop-blur-xl border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-t-primary/20 overflow-y-auto max-h-[90vh]" data-tour="add-product-modal">
                    <CognitiveProvider>
                      <DialogHeader className="pb-4 border-b border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <DialogTitle className="text-xl font-bold tracking-tight uppercase italic">
                              {isEditing ? (editingGroupId ? "Editar Grupo" : "Editar Producto") : currentLabels.addProductTitle}
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 text-xs">
                              {isEditing ? "Modifique los detalles técnicos del item seleccionado." : currentLabels.description}
                            </DialogDescription>
                          </div>
                        </div>
                      </DialogHeader>

                      <div className="pt-4 px-1">
                        <GuardianDiagnostic />
                        <GuardianSafeStatus />
                      </div>

                      <div className="grid grid-cols-2 gap-x-8 gap-y-5 py-6">
                        {/* Row 1 */}
                        <div className="space-y-2" data-tour="product-name-field">
                          <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{currentLabels.itemName}</Label>
                          <CognitiveInput
                            id="name"
                            placeholder={currentPlaceholder}
                            value={newProduct.name}
                            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                            semanticType="name"
                            context={newProduct.category}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sku" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Referencia / SKU</Label>
                          <CognitiveInput
                            id="sku"
                            placeholder="Auto-generado si vacío"
                            value={newProduct.sku}
                            onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                            semanticType="sku"
                          />
                        </div>

                        {/* Row 2 */}
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Categoría</Label>
                          <div className="flex gap-2">
                            <Select value={newProduct.categoryId} onValueChange={(v) => setNewProduct({ ...newProduct, categoryId: v })}>
                              <SelectTrigger className="bg-slate-900/50 border-slate-800 focus:border-primary/50 transition-all flex-1">
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-950 border-slate-800 text-white">
                                {categoriesList.map((c: any) => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="outline" size="icon" onClick={() => {
                              const name = prompt("Nombre de la nueva categoría:");
                              if (name) createCategoryMutation.mutate(name);
                            }}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Grupo (Opcional)</Label>
                          <div className="flex gap-2">
                            <Select value={newProduct.groupId || 'none'} onValueChange={(v) => setNewProduct({ ...newProduct, groupId: v === 'none' ? '' : v })}>
                              <SelectTrigger className="bg-slate-900/50 border-slate-800 focus:border-primary/50 transition-all flex-1">
                                <SelectValue placeholder="Sin grupo..." />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-950 border-slate-800 text-white">
                                <SelectItem value="none">Sin grupo</SelectItem>
                                {groupsList.map((g: any) => (
                                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="outline" size="icon" onClick={() => {
                              const name = prompt("Nombre del nuevo grupo:");
                              if (name) createGroupMutation.mutate(name);
                            }}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="col-span-2 space-y-3 bg-slate-900/30 p-4 rounded-lg border border-slate-800/50">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Lógica de Operación</Label>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox id="sell" checked={newProduct.isSellable} onCheckedChange={(c) => setNewProduct({ ...newProduct, isSellable: c as boolean })} />
                              <label htmlFor="sell" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300">Se Vende</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="buy" checked={newProduct.isPurchasable} onCheckedChange={(c) => setNewProduct({ ...newProduct, isPurchasable: c as boolean })} />
                              <label htmlFor="buy" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300">Se Compra</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="input" checked={newProduct.isProductionInput} onCheckedChange={(c) => setNewProduct({ ...newProduct, isProductionInput: c as boolean })} />
                              <label htmlFor="input" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300">Insumo Prod.</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="output" checked={newProduct.isProductionOutput} onCheckedChange={(c) => setNewProduct({ ...newProduct, isProductionOutput: c as boolean })} />
                              <label htmlFor="output" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300">Producto Final</label>
                            </div>
                          </div>
                        </div>




                        {/* Financials */}
                        {newProduct.isSellable && (
                          <div className="space-y-2">
                            <Label htmlFor="price" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Precio Venta</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                              <Input id="price" type="number" step="0.01" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })} className="pl-7 bg-slate-900/50 border-slate-800 focus:border-primary/50 transition-all" />
                            </div>
                          </div>
                        )}

                        {newProduct.isPurchasable && (
                          <div className="space-y-2" data-tour="product-cost-field">
                            <Label htmlFor="cost" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Costo Unitario</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                              <Input id="cost" type="number" step="0.01" value={newProduct.cost} onChange={(e) => setNewProduct({ ...newProduct, cost: parseFloat(e.target.value) || 0 })} className="pl-7 bg-slate-900/50 border-slate-800 focus:border-primary/50 transition-all" />
                            </div>
                          </div>
                        )}

                        {/* Logistics */}
                        <div className="space-y-2">
                          <Label htmlFor="unit" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{currentLabels.unitLabel}</Label>
                          <div className="flex gap-2">
                            <Select
                              value={newProduct.unitId || newProduct.unit}
                              onValueChange={(v) => {
                                if (v === "pza" || v === "kg") {
                                  setNewProduct({ ...newProduct, unitId: "", unit: v });
                                } else {
                                  setNewProduct({ ...newProduct, unitId: v });
                                }
                              }}
                            >
                              <SelectTrigger className="bg-slate-900/50 border-slate-800 focus:border-primary/50 transition-all flex-1">
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-950 border-slate-800 text-white">
                                <SelectItem value="pza">Pieza (pza)</SelectItem>
                                <SelectItem value="kg">Kilogramo (kg)</SelectItem>
                                {unitsList.map((u: any) => (
                                  <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="outline" size="icon" onClick={() => {
                              const name = prompt("Nombre de la nueva unidad (ej. Bulto 50kg):");
                              const abb = prompt("Abreviatura (ej. b50):");
                              if (name && abb) createUnitMutation.mutate({ name, abbreviation: abb });
                            }}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="stock" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{currentLabels.stockLabel}</Label>
                          <Input id="stock" type="number" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })} className="bg-slate-900/50 border-slate-800 focus:border-primary/50 transition-all" />
                        </div>
                      </div>

                      <DialogFooter className="pt-6 border-t border-white/5" data-tour="product-save-footer">
                        <Button
                          className="bg-primary hover:bg-primary/90 text-white font-bold px-8 shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all hover:scale-105"
                          onClick={() => {
                            handleAddProduct();
                          }}
                          disabled={createProductMutation.isPending || updateProductMutation.isPending || updateGroupMutation.isPending}
                        >
                          {createProductMutation.isPending || updateProductMutation.isPending || updateGroupMutation.isPending ? "Guardando..." : (isEditing ? "Guardar Cambios" : "Confirmar Registro")}
                        </Button>
                      </DialogFooter>
                    </CognitiveProvider>
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.name}</p>
                          {item.isGroup && (
                            <Badge variant="outline" className="text-[9px] uppercase border-blue-500/30 text-blue-400 bg-blue-500/5">Grupo</Badge>
                          )}
                        </div>
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
                          Agota en {item.cognitive?.daysRemaining ?? "..."} días
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">Sugerido: +{item.cognitive?.suggestedOrder ?? 0} {item.unit}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground opacity-50 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-success" />
                        {item.cognitive ? `Stock Saludable (${item.cognitive.daysRemaining}d)` : "Calculando..."}
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
                        onClick={() => handleEdit(item)}
                      >
                        <Plus className="w-4 h-4 mr-1 rotate-45" />
                        Editar
                      </Button>
                      {!item.isGroup && (
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
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm("¿Está seguro de que desea archivar este producto?")) {
                                archiveProductMutation.mutate(item.id);
                              }
                            }}
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Archivar producto</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-history-${item.id}`}
                            onClick={() => {
                              setSelectedProductForHistory(item);
                              setIsHistoryDialogOpen(true);
                            }}
                          >
                            <HistoryIcon className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Historial de movimientos</p>
                        </TooltipContent>
                      </Tooltip>
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
    </AppLayout >
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

interface Movement {
  id: string;
  type: string;
  quantity: number;
  reason: string;
  date: string;
  createdAt: string;
  userName?: string;
  source?: string;
}

function MovementHistoryDialog({ isOpen, onOpenChange, product }: { isOpen: boolean, onOpenChange: (v: boolean) => void, product: any }) {
  const { session } = useAuth();
  const { data: movements, isLoading } = useQuery<Movement[]>({
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
          ) : movements && movements.length > 0 ? (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {movements.map((m) => (
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
                        {m.userName && (
                          <span className="ml-2 flex items-center gap-1 text-primary/80">
                            • Por: {m.userName}
                          </span>
                        )}
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
                      Muelle: {m.source ?? 'Interno / Almacén'}
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
          <Button variant="ghost" className="hover:bg-white/5" onClick={() => { onOpenChange(false); }}>
            Cerrar Expediente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
