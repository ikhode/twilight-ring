import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
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
  Activity,
  Trash2,
  Upload,
  RefreshCw,
  MoreVertical,
  Edit,
  XCircle,
  ArrowRight,
  TrendingUp,
  Info,
  Settings,
  Settings2,
  Loader2,
  Pencil,
  BrainCircuit,
  Sparkles,
  Truck,
  Database,
  FileSpreadsheet,
  FileSpreadsheet,
  Printer,
  PieChart,
  Tag,
  Percent,
  Calculator
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CognitiveButton, AliveValue, CognitiveInput, CognitiveField, CognitiveProvider, GuardianDiagnostic, GuardianSafeStatus } from "@/components/cognitive";
import { useConfiguration } from "@/context/ConfigurationContext";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { useAppStore } from "@/store/app-store";
import { ProductionImpactDialog } from "@/components/inventory/ProductionImpactDialog";
import { ReasoningChatDialog } from "@/components/inventory/ReasoningChatDialog";
import { DossierView } from "@/components/shared/DossierView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationsManager } from "@/components/inventory/LocationsManager";
import { TransfersManager } from "@/components/inventory/TransfersManager";
import { BulkImportManager } from "@/components/inventory/BulkImportManager";
import { LabelsManager } from "@/components/inventory/LabelsManager";
import { ValuationReport } from "@/components/inventory/ValuationReport";
import { ModifiersManager } from "@/components/inventory/ModifiersManager";
import { DiscountsManager } from "@/components/inventory/DiscountsManager";
import { PurchasesTab } from "@/components/inventory/PurchasesTab";
import { InventoryCountManager } from "@/components/inventory/InventoryCountManager";



export default function Inventory() {
  const { session, profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';
  const { toast } = useToast();
  const { universalConfig, industry, enabledModules } = useConfiguration();
  const { productTypeLabels } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [decisionMode, setDecisionMode] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isImpactDialogOpen, setIsImpactDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<any>(null);
  const [selectedImpactProductId, setSelectedImpactProductId] = useState<string | null>(null);
  const [isReasoningChatOpen, setIsReasoningChatOpen] = useState(false);
  const [selectedReasoningProduct, setSelectedReasoningProduct] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = searchParams.get("tab") || "products";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab with URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (activeTab !== "products") {
      params.set("tab", activeTab);
    } else {
      params.delete("tab");
    }
    const newUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
    window.history.replaceState({}, "", newUrl);
  }, [activeTab]);

  // Popover form states for inline creation
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [groupPopoverOpen, setGroupPopoverOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [unitPopoverOpen, setUnitPopoverOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitAbbreviation, setNewUnitAbbreviation] = useState("");

  // Edit popover states
  const [editCategoryPopoverOpen, setEditCategoryPopoverOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);
  const [editGroupPopoverOpen, setEditGroupPopoverOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{ id: string; name: string } | null>(null);
  const [editUnitPopoverOpen, setEditUnitPopoverOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<{ id: string; name: string; abbreviation: string } | null>(null);

  // Dynamic Placeholders
  const placeholders: Record<string, string> = {
    manufacturing: "Ej: Placa de Acero Calibre 18",
    retail: "Ej: Vestido de Noche Rojo",
    logistics: "Ej: Tarima Euro 120x80",
    hospitality: "Ej: Hamburguesa Doble con Queso",
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
    hospitality: {
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
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${session?.access_token}`
      };
      const activeOrgId = localStorage.getItem("nexus_active_org");
      if (activeOrgId) headers["x-organization-id"] = activeOrgId;

      const res = await fetch("/api/inventory/products", { headers });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
    enabled: !!session?.access_token
  });

  // Realtime subscriptions for Inventory
  useSupabaseRealtime({ table: 'products', queryKey: ["/api/inventory/products"] });
  useSupabaseRealtime({ table: 'notifications', queryKey: ["/api/inventory/alerts"] });
  useSupabaseRealtime({ table: 'inventory_movements', queryKey: ["/api/inventory/products"] });
  // Realtime for metadata tables
  useSupabaseRealtime({ table: 'product_categories', queryKey: ["/api/inventory/categories"] });
  useSupabaseRealtime({ table: 'product_groups', queryKey: ["/api/inventory/groups"] });
  useSupabaseRealtime({ table: 'product_units', queryKey: ["/api/inventory/units"] });

  const { data: alerts = [], isLoading: isAlertsLoading } = useQuery({
    queryKey: ["/api/inventory/alerts"],
    queryFn: async () => {
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${session?.access_token}`
      };
      const activeOrgId = localStorage.getItem("nexus_active_org");
      if (activeOrgId) headers["x-organization-id"] = activeOrgId;

      const res = await fetch("/api/inventory/alerts", { headers });
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return res.json();
    },
    enabled: !!session?.access_token
  });

  const { data: categoriesList = [] } = useQuery({
    queryKey: ["/api/inventory/categories"],
    queryFn: async () => {
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${session?.access_token}`
      };
      const activeOrgId = localStorage.getItem("nexus_active_org");
      if (activeOrgId) headers["x-organization-id"] = activeOrgId;

      const res = await fetch("/api/inventory/categories", { headers });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!session?.access_token
  });

  const { data: groupsList = [] } = useQuery({
    queryKey: ["/api/inventory/groups"],
    queryFn: async () => {
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${session?.access_token}`
      };
      const activeOrgId = localStorage.getItem("nexus_active_org");
      if (activeOrgId) headers["x-organization-id"] = activeOrgId;

      const res = await fetch("/api/inventory/groups", { headers });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!session?.access_token
  });

  const { data: unitsList = [] } = useQuery({
    queryKey: ["/api/inventory/units"],
    queryFn: async () => {
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${session?.access_token}`
      };
      const activeOrgId = localStorage.getItem("nexus_active_org");
      if (activeOrgId) headers["x-organization-id"] = activeOrgId;

      const res = await fetch("/api/inventory/units", { headers });
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
      setCategoryPopoverOpen(false);
      setNewCategoryName("");
      toast({ title: "Categoría Creada", description: "La categoría se ha registrado correctamente." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const createGroupMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string, description?: string }) => {
      const res = await apiRequest("POST", "/api/inventory/groups", { name, description });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/groups"] });
      setGroupPopoverOpen(false);
      setNewGroupName("");
      toast({ title: "Familia Creada", description: "La familia/grupo se ha registrado correctamente." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const createUnitMutation = useMutation({
    mutationFn: async ({ name, abbreviation }: { name: string, abbreviation: string }) => {
      const res = await apiRequest("POST", "/api/inventory/units", { name, abbreviation });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/units"] });
      setUnitPopoverOpen(false);
      setNewUnitName("");
      setNewUnitAbbreviation("");
      toast({ title: "Unidad Creada", description: "La unidad de medida se ha registrado correctamente." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Update mutations for editing existing items
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await apiRequest("PATCH", `/api/inventory/categories/${id}`, { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/categories"] });
      setEditCategoryPopoverOpen(false);
      setEditingCategory(null);
      toast({ title: "Categoría Actualizada" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateUnitMutation = useMutation({
    mutationFn: async ({ id, name, abbreviation }: { id: string; name: string; abbreviation: string }) => {
      const res = await apiRequest("PATCH", `/api/inventory/units/${id}`, { name, abbreviation });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/units"] });
      setEditUnitPopoverOpen(false);
      setEditingUnit(null);
      toast({ title: "Unidad Actualizada" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      status: p.isArchived ? "archived" : (p.stock <= 0 ? "critical" : p.stock < 100 ? "low" : "available"),
      // Fix unit display: Prioritize abbreviation, then name, then legacy unit, then default
      unit: p.unitRef?.abbreviation || p.unitRef?.name || p.unit || "pza",
      // Flag for negative stock to show in UI
      isNegativeStock: p.stock < 0
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
    minPurchasePrice: 0,
    maxPurchasePrice: 0,
    // Master/Variant Logic
    masterProductId: "",
    expectedYield: 0,
    demandVariability: "stable",
    reorderPointDays: 7,
    criticalityLevel: "medium"
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
      // (p.isActive !== false) && // Allow archived/inactive to show in search
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category || "").toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [groupedProducts, searchQuery]);

  const stats = useMemo(() => ({
    totalValue: products.reduce((acc, p) => acc + p.stock * p.price, 0),
    healthyStock: products.filter((p) => p.status === "available").length,
    lowStock: products.filter((p) => p.status === "low").length,
    criticalStock: products.filter((p) => p.status === "critical").length,
    totalProducts: products.length,
    stockHealthScore: products.length > 0
      ? Math.round((products.filter((p) => p.status === "available").length / products.length) * 100)
      : 100
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
      cost: 0,
      minPurchasePrice: 0,
      maxPurchasePrice: 0,
      masterProductId: "",
      expectedYield: 0,
      demandVariability: "stable",
      reorderPointDays: 7,
      criticalityLevel: "medium"
    });
    setIsEditing(false);
    setSelectedProduct(null);
    setEditingGroupId(null);
  };

  const archiveProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await apiRequest("PATCH", `/api/inventory/products/${productId}`, { isArchived: true, isActive: false }, {
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

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await apiRequest("DELETE", `/api/inventory/products/${productId}`, undefined, {
        Authorization: `Bearer ${session?.access_token}`
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      toast({ title: "Producto Eliminado", description: "El producto ha sido eliminado permanentemente del listado activo." });
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
        categoryId: item.categoryId || item.category?.id || "",
        masterProductId: item.masterProductId || "",
        expectedYield: item.expectedYield || 0,
        unitId: item.unitId || item.unitRef?.id || "",
        minPurchasePrice: item.minPurchasePrice || 0,
        maxPurchasePrice: item.maxPurchasePrice || 0,
        demandVariability: item.demandVariability || "stable",
        reorderPointDays: item.reorderPointDays || 7,
        criticalityLevel: item.criticalityLevel || "medium"
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
      cost: Math.round(newProduct.cost * 100),
      masterProductId: payload.masterProductId || null,
      expectedYield: payload.expectedYield || 0,
      minPurchasePrice: payload.minPurchasePrice || 0,
      maxPurchasePrice: payload.maxPurchasePrice || 0,
      demandVariability: payload.demandVariability || "stable",
      reorderPointDays: parseInt(String(payload.reorderPointDays)) || 7,
      criticalityLevel: payload.criticalityLevel || "medium"
    };

    if (isEditing) {
      if (editingGroupId) {
        updateGroupMutation.mutate({ id: editingGroupId, name: newProduct.name });
      } else if (selectedProduct && selectedProduct.id) {
        updateProductMutation.mutate({ ...data, id: selectedProduct.id });
      } else {
        toast({ title: "Error Crítico", description: "No se encontró el ID del producto a editar. Refresque la página.", variant: "destructive" });
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
    <AppLayout title="Inventario Unificado" subtitle="Gestión integral de productos, existencias y movimientos.">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto p-1 bg-muted/50 rounded-xl">
            <TabsTrigger value="products" className="gap-2 py-3">
              <Package className="h-4 w-4" /> Productos
            </TabsTrigger>
            <TabsTrigger value="purchases" className="gap-2 py-3">
              <DollarSign className="h-4 w-4" /> Compras
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-2 py-3">
              <Database className="h-4 w-4" /> Ubicaciones
            </TabsTrigger>
            <TabsTrigger value="counts" className="gap-2 py-3">
              <RefreshCw className="h-4 w-4" /> Recuentos
            </TabsTrigger>
            <TabsTrigger value="transfers" className="gap-2 py-3">
              <Truck className="h-4 w-4" /> Transferencias
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2 py-3">
              <FileSpreadsheet className="h-4 w-4" /> Importar
            </TabsTrigger>
            <TabsTrigger value="labels" className="gap-2 py-3">
              <Printer className="h-4 w-4" /> Etiquetas
            </TabsTrigger>
            <TabsTrigger value="modifiers" className="gap-2 py-3">
              <Tag className="h-4 w-4" /> Modificadores
            </TabsTrigger>
            <TabsTrigger value="discounts" className="gap-2 py-3">
              <Percent className="h-4 w-4" /> Promociones
            </TabsTrigger>
            <TabsTrigger value="counts" className="gap-2 py-3">
              <Calculator className="h-4 w-4" /> Conteo Físico
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 py-3">
              <BarChart3 className="h-4 w-4" /> Valoración
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="space-y-6">
            <PurchasesTab />
          </TabsContent>

          <TabsContent value="counts" className="space-y-6">
            <InventoryCountManager />
          </TabsContent>

          <TabsContent value="counts" className="space-y-6">
            <InventoryCountManager />
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <StatCard
                        title="Items en Inventario"
                        value={<AliveValue value={stats.totalProducts} unit="" />}
                        icon={Package}
                        variant="primary"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                    <p className="font-bold text-primary uppercase tracking-widest text-[9px] mb-1">Catálogo Activo</p>
                    <p>Número total de referencias únicas registradas en el sistema que no han sido archivadas.</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <StatCard
                        title="Salud de Stock"
                        value={`${stats.stockHealthScore}%`}
                        icon={CheckCircle2}
                        variant={stats.stockHealthScore > 90 ? "success" : stats.stockHealthScore > 70 ? "warning" : "destructive"}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                    <p className="font-bold text-emerald-500 uppercase tracking-widest text-[9px] mb-1">Disponibilidad Óptima</p>
                    <div className="space-y-1 my-2">
                      <div className="flex justify-between">
                        <span>Saludable:</span>
                        <span className="font-bold text-emerald-500">{stats.healthyStock}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Stock Bajo:</span>
                        <span className="font-bold text-amber-500">{stats.lowStock}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Crítico:</span>
                        <span className="font-bold text-red-500">{stats.criticalStock}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 border-t border-white/5 pt-1 italic">
                      Calculado como porcentaje de productos con stock suficiente vs total.
                    </p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <StatCard
                        title="Stock Bajo"
                        value={<AliveValue value={stats.lowStock} unit="" allowTrend />}
                        icon={TrendingDown}
                        variant="warning"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                    <p className="font-bold text-amber-500 uppercase tracking-widest text-[9px] mb-1">Alerta de Reabastecimiento</p>
                    <p>Productos con existencias por debajo del umbral seguro (100 unidades). Requieren compra próxima.</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <StatCard
                        title="Stock Crítico"
                        value={<AliveValue value={stats.criticalStock} unit="" allowTrend />}
                        icon={AlertTriangle}
                        variant="destructive"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                    <p className="font-bold text-red-500 uppercase tracking-widest text-[9px] mb-1">Riesgo de Quiebre</p>
                    <p>Productos agotados o casi agotados (0 unidades). Afectan inmediatamente la capacidad de producción.</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <StatCard
                        title="Valor Total"
                        value={formatCurrency(stats.totalValue)}
                        icon={DollarSign}
                        variant="success"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                    <p className="font-bold text-emerald-500 uppercase tracking-widest text-[9px] mb-1">Capital Inmovilizado</p>
                    <p>Valor monetario total del inventario actual, calculado a precio de costo promedio.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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

                    <div className="flex items-center space-x-2 bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                      <Switch id="decision-mode" checked={decisionMode} onCheckedChange={setDecisionMode} />
                      <Label htmlFor="decision-mode" className={cn("text-xs font-bold cursor-pointer transition-colors", decisionMode ? "text-purple-400" : "text-slate-500")}>
                        Modo Decisión (IA)
                      </Label>
                    </div>

                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                      <DialogTrigger asChild>
                        <CognitiveButton
                          className="gap-2"
                          data-testid="button-add-product"
                          data-tour="add-product-btn"
                          intent="register_inventory"
                          onClick={() => {
                            resetForm();
                            window.dispatchEvent(new CustomEvent('NEXUS_ONBOARDING_ACTION', { detail: 'modal_opened_inventory' }));
                          }}
                        >
                          <Plus className="w-4 h-4" />
                          Nuevo Producto
                        </CognitiveButton>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl bg-slate-950/95 backdrop-blur-xl border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-t-primary/20 overflow-y-auto max-h-[90vh]" data-tour="add-product-modal">
                        <DialogTitle className="sr-only">Añadir Nuevo Producto</DialogTitle>
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
                                <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="icon">
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80 bg-slate-950 border-slate-800 p-4" align="start">
                                    <div className="space-y-3">
                                      <div className="space-y-1">
                                        <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nueva Categoría</Label>
                                        <p className="text-[10px] text-slate-500">Crea una nueva categoría para clasificar productos.</p>
                                      </div>
                                      <Input
                                        placeholder="Ej: Materia Prima, Producto Terminado..."
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        className="bg-slate-900/50 border-slate-700 focus:border-primary/50"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && newCategoryName.trim()) {
                                            createCategoryMutation.mutate(newCategoryName.trim());
                                          }
                                        }}
                                      />
                                      <div className="flex gap-2 justify-end">
                                        <Button variant="ghost" size="sm" onClick={() => { setCategoryPopoverOpen(false); setNewCategoryName(""); }}>
                                          Cancelar
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => newCategoryName.trim() && createCategoryMutation.mutate(newCategoryName.trim())}
                                          disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                                        >
                                          {createCategoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear"}
                                        </Button>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                {/* Edit Category Button */}
                                {newProduct.categoryId && (
                                  <Popover open={editCategoryPopoverOpen} onOpenChange={setEditCategoryPopoverOpen}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                          const cat = categoriesList.find((c: any) => c.id === newProduct.categoryId);
                                          if (cat) setEditingCategory({ id: cat.id, name: cat.name });
                                        }}
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 bg-slate-950 border-slate-800 p-4" align="start">
                                      <div className="space-y-3">
                                        <div className="space-y-1">
                                          <Label className="text-xs font-bold text-amber-400 uppercase tracking-wider">Editar Categoría</Label>
                                          <p className="text-[10px] text-slate-500">Modifica el nombre de la categoría seleccionada.</p>
                                        </div>
                                        <Input
                                          placeholder="Nuevo nombre..."
                                          value={editingCategory?.name || ""}
                                          onChange={(e) => setEditingCategory(prev => prev ? { ...prev, name: e.target.value } : null)}
                                          className="bg-slate-900/50 border-slate-700 focus:border-amber-500/50"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && editingCategory?.name.trim()) {
                                              updateCategoryMutation.mutate({ id: editingCategory.id, name: editingCategory.name.trim() });
                                            }
                                          }}
                                        />
                                        <div className="flex gap-2 justify-end">
                                          <Button variant="ghost" size="sm" onClick={() => { setEditCategoryPopoverOpen(false); setEditingCategory(null); }}>
                                            Cancelar
                                          </Button>
                                          <Button
                                            size="sm"
                                            className="bg-amber-600 hover:bg-amber-700"
                                            onClick={() => editingCategory?.name.trim() && updateCategoryMutation.mutate({ id: editingCategory.id, name: editingCategory.name.trim() })}
                                            disabled={!editingCategory?.name.trim() || updateCategoryMutation.isPending}
                                          >
                                            {updateCategoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
                                          </Button>
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
                            </div>

                            {/* Row 2 */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Familia del Producto</Label>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="w-3 h-3 text-slate-500 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs bg-slate-900 border-slate-700 text-white">
                                      <p className="font-bold text-xs mb-1">¿Para qué sirve la Familia?</p>
                                      <p className="text-xs">
                                        Agrupa productos similares para <strong>reportes financieros</strong>.
                                        <br /><br />
                                        Ejemplo: "Familia Cocos" agrupa "Coco Unidad", "Bulto de Coco" y "Coco Pelado" para saber cuánto gastaste en total en cocos, sin importar su presentación.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <div className="flex gap-2">
                                <Select value={newProduct.groupId || 'none'} onValueChange={(v) => setNewProduct({ ...newProduct, groupId: v === 'none' ? '' : v })}>
                                  <SelectTrigger className="bg-slate-900/50 border-slate-800 focus:border-primary/50 transition-all flex-1">
                                    <SelectValue placeholder="Sin familia asignada" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-950 border-slate-800 text-white">
                                    <SelectItem value="none">-- Sin familia --</SelectItem>
                                    {groupsList.map((g: any) => (
                                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Popover open={groupPopoverOpen} onOpenChange={setGroupPopoverOpen}>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="icon">
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80 bg-slate-950 border-slate-800 p-4" align="start">
                                    <div className="space-y-3">
                                      <div className="space-y-1">
                                        <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nueva Familia</Label>
                                        <p className="text-[10px] text-slate-500">Agrupa productos similares para reportes financieros consolidados.</p>
                                      </div>
                                      <Input
                                        placeholder="Ej: Familia Cocos, Familia Lácteos..."
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        className="bg-slate-900/50 border-slate-700 focus:border-primary/50"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && newGroupName.trim()) {
                                            createGroupMutation.mutate({ name: newGroupName.trim(), description: "" });
                                          }
                                        }}
                                      />
                                      <div className="flex gap-2 justify-end">
                                        <Button variant="ghost" size="sm" onClick={() => { setGroupPopoverOpen(false); setNewGroupName(""); }}>
                                          Cancelar
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => newGroupName.trim() && createGroupMutation.mutate({ name: newGroupName.trim(), description: "" })}
                                          disabled={!newGroupName.trim() || createGroupMutation.isPending}
                                        >
                                          {createGroupMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear"}
                                        </Button>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                {/* Edit Group Button - Show when a group is selected */}
                                {newProduct.groupId && newProduct.groupId !== 'none' && (
                                  <Popover open={editGroupPopoverOpen} onOpenChange={setEditGroupPopoverOpen}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                          const grp = groupsList.find((g: any) => g.id === newProduct.groupId);
                                          if (grp) setEditingGroup({ id: grp.id, name: grp.name });
                                        }}
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 bg-slate-950 border-slate-800 p-4" align="start">
                                      <div className="space-y-3">
                                        <div className="space-y-1">
                                          <Label className="text-xs font-bold text-amber-400 uppercase tracking-wider">Editar Familia</Label>
                                          <p className="text-[10px] text-slate-500">Modifica el nombre de la familia seleccionada.</p>
                                        </div>
                                        <Input
                                          placeholder="Nuevo nombre..."
                                          value={editingGroup?.name || ""}
                                          onChange={(e) => setEditingGroup(prev => prev ? { ...prev, name: e.target.value } : null)}
                                          className="bg-slate-900/50 border-slate-700 focus:border-amber-500/50"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && editingGroup?.name.trim()) {
                                              updateGroupMutation.mutate({ id: editingGroup.id, name: editingGroup.name.trim() });
                                              setEditGroupPopoverOpen(false);
                                              setEditingGroup(null);
                                            }
                                          }}
                                        />
                                        <div className="flex gap-2 justify-end">
                                          <Button variant="ghost" size="sm" onClick={() => { setEditGroupPopoverOpen(false); setEditingGroup(null); }}>
                                            Cancelar
                                          </Button>
                                          <Button
                                            size="sm"
                                            className="bg-amber-600 hover:bg-amber-700"
                                            onClick={() => {
                                              if (editingGroup?.name.trim()) {
                                                updateGroupMutation.mutate({ id: editingGroup.id, name: editingGroup.name.trim() });
                                                setEditGroupPopoverOpen(false);
                                                setEditingGroup(null);
                                              }
                                            }}
                                            disabled={!editingGroup?.name.trim() || updateGroupMutation.isPending}
                                          >
                                            {updateGroupMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
                                          </Button>
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
                            </div>


                            {/* Operation Logic - Manufacturing Only */}
                            {enabledModules.includes("production") && (
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
                            )}

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
                              <div className="space-y-4 border-l-2 border-slate-800 pl-4">
                                <div className="space-y-2" data-tour="product-cost-field">
                                  <Label htmlFor="cost" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Costo Unitario</Label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                                    <Input id="cost" type="number" step="0.01" value={newProduct.cost} onChange={(e) => setNewProduct({ ...newProduct, cost: parseFloat(e.target.value) || 0 })} className="pl-7 bg-slate-900/50 border-slate-800 focus:border-primary/50 transition-all" />
                                  </div>
                                </div>

                                {/* Purchase Control - Admin Only */}
                                {isAdmin && (
                                  <div className="bg-slate-900/40 p-3 rounded-lg border border-indigo-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Label className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Control de Compras</Label>
                                      <Badge variant="outline" className="text-[9px] h-4 border-indigo-500/30 text-indigo-400">Admin</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <Label htmlFor="minPrice" className="text-[9px] text-slate-500">Mínimo</Label>
                                        <div className="relative">
                                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">$</span>
                                          <Input id="minPrice" type="number" step="0.01" value={newProduct.minPurchasePrice} onChange={(e) => setNewProduct({ ...newProduct, minPurchasePrice: parseFloat(e.target.value) || 0 })} className="pl-5 h-8 text-xs bg-slate-950 border-slate-800" />
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <Label htmlFor="maxPrice" className="text-[9px] text-slate-500">Máximo</Label>
                                        <div className="relative">
                                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">$</span>
                                          <Input id="maxPrice" type="number" step="0.01" value={newProduct.maxPurchasePrice} onChange={(e) => setNewProduct({ ...newProduct, maxPurchasePrice: parseFloat(e.target.value) || 0 })} className="pl-5 h-8 text-xs bg-slate-950 border-slate-800" />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Logistics */}
                            <div className="space-y-2">
                              <Label htmlFor="unit" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{currentLabels.unitLabel}</Label>
                              <div className="flex gap-2">
                                <Select
                                  value={newProduct.unitId}
                                  onValueChange={(v) => setNewProduct({ ...newProduct, unitId: v })}
                                >
                                  <SelectTrigger className="bg-slate-900/50 border-slate-800 focus:border-primary/50 transition-all flex-1">
                                    <SelectValue placeholder="Unidad..." />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-950 border-slate-800 text-white">
                                    {unitsList.map((u: any) => (
                                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Popover open={unitPopoverOpen} onOpenChange={setUnitPopoverOpen}>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="icon">
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80 bg-slate-950 border-slate-800 p-4" align="start">
                                    <div className="space-y-3">
                                      <div className="space-y-1">
                                        <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nueva Unidad de Medida</Label>
                                        <p className="text-[10px] text-slate-500">Define cómo se mide este tipo de producto.</p>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <Label className="text-[9px] text-slate-500">Nombre</Label>
                                          <Input
                                            placeholder="Ej: Bulto 50kg"
                                            value={newUnitName}
                                            onChange={(e) => setNewUnitName(e.target.value)}
                                            className="bg-slate-900/50 border-slate-700 focus:border-primary/50 text-sm"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-[9px] text-slate-500">Abreviatura</Label>
                                          <Input
                                            placeholder="Ej: b50"
                                            value={newUnitAbbreviation}
                                            onChange={(e) => setNewUnitAbbreviation(e.target.value)}
                                            className="bg-slate-900/50 border-slate-700 focus:border-primary/50 text-sm"
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' && newUnitName.trim() && newUnitAbbreviation.trim()) {
                                                createUnitMutation.mutate({ name: newUnitName.trim(), abbreviation: newUnitAbbreviation.trim() });
                                              }
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <div className="flex gap-2 justify-end">
                                        <Button variant="ghost" size="sm" onClick={() => { setUnitPopoverOpen(false); setNewUnitName(""); setNewUnitAbbreviation(""); }}>
                                          Cancelar
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => newUnitName.trim() && newUnitAbbreviation.trim() && createUnitMutation.mutate({ name: newUnitName.trim(), abbreviation: newUnitAbbreviation.trim() })}
                                          disabled={!newUnitName.trim() || !newUnitAbbreviation.trim() || createUnitMutation.isPending}
                                        >
                                          {createUnitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear"}
                                        </Button>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                {/* Edit Unit Button */}
                                {newProduct.unitId && (
                                  <Popover open={editUnitPopoverOpen} onOpenChange={setEditUnitPopoverOpen}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                          const unit = unitsList.find((u: any) => u.id === newProduct.unitId);
                                          if (unit) setEditingUnit({ id: unit.id, name: unit.name, abbreviation: unit.abbreviation || "" });
                                        }}
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 bg-slate-950 border-slate-800 p-4" align="start">
                                      <div className="space-y-3">
                                        <div className="space-y-1">
                                          <Label className="text-xs font-bold text-amber-400 uppercase tracking-wider">Editar Unidad</Label>
                                          <p className="text-[10px] text-slate-500">Modifica el nombre y abreviatura de la unidad.</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                            <Label className="text-[9px] text-slate-500">Nombre</Label>
                                            <Input
                                              placeholder="Ej: Bulto 50kg"
                                              value={editingUnit?.name || ""}
                                              onChange={(e) => setEditingUnit(prev => prev ? { ...prev, name: e.target.value } : null)}
                                              className="bg-slate-900/50 border-slate-700 focus:border-amber-500/50 text-sm"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-[9px] text-slate-500">Abreviatura</Label>
                                            <Input
                                              placeholder="Ej: b50"
                                              value={editingUnit?.abbreviation || ""}
                                              onChange={(e) => setEditingUnit(prev => prev ? { ...prev, abbreviation: e.target.value } : null)}
                                              className="bg-slate-900/50 border-slate-700 focus:border-amber-500/50 text-sm"
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' && editingUnit?.name.trim() && editingUnit?.abbreviation.trim()) {
                                                  updateUnitMutation.mutate({ id: editingUnit.id, name: editingUnit.name.trim(), abbreviation: editingUnit.abbreviation.trim() });
                                                }
                                              }}
                                            />
                                          </div>
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                          <Button variant="ghost" size="sm" onClick={() => { setEditUnitPopoverOpen(false); setEditingUnit(null); }}>
                                            Cancelar
                                          </Button>
                                          <Button
                                            size="sm"
                                            className="bg-amber-600 hover:bg-amber-700"
                                            onClick={() => editingUnit?.name.trim() && editingUnit?.abbreviation.trim() && updateUnitMutation.mutate({ id: editingUnit.id, name: editingUnit.name.trim(), abbreviation: editingUnit.abbreviation.trim() })}
                                            disabled={!editingUnit?.name.trim() || !editingUnit?.abbreviation.trim() || updateUnitMutation.isPending}
                                          >
                                            {updateUnitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
                                          </Button>
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="stock" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{currentLabels.stockLabel}</Label>
                              <Input id="stock" type="number" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })} className="bg-slate-900/50 border-slate-800 focus:border-primary/50 transition-all" />
                            </div>

                            {/* Master/Variant Yield Config - Manufacturing Only */}
                            {enabledModules.includes("production") && (
                              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-4">
                                <div className="flex items-center gap-2 border-b border-blue-500/20 pb-2 mb-2">
                                  <Settings2 className="w-4 h-4 text-blue-400" />
                                  <Label className="text-xs font-bold uppercase text-blue-400">Equivalencia y Rendimiento</Label>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="w-3 h-3 text-blue-400 cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-sm bg-slate-900 border-slate-700 text-white">
                                        <p className="font-bold text-xs mb-1 text-blue-400">Control de Inventario Unificado</p>
                                        <p className="text-xs">
                                          Esta sección conecta productos que son lo mismo pero en diferentes presentaciones.
                                          <br /><br />
                                          <strong>Ejemplo Clave:</strong>
                                          <br />
                                          Si compras por "Camión" o "Bulto", pero vendes o procesas por "Pieza":
                                          <ul className="list-disc pl-4 mt-1 space-y-1">
                                            <li>Crea "Coco (Pieza)" como producto base.</li>
                                            <li>Crea "Bulto de Coco" y selecciona a "Coco (Pieza)" como Maestro.</li>
                                            <li>Define que 1 Bulto = 50 Piezas.</li>
                                          </ul>
                                          <br />
                                          Al comprar 1 Bulto, el sistema sumará automáticamente 50 Piezas a tu inventario.
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Producto Maestro (Base)</Label>
                                    <Select value={newProduct.masterProductId} onValueChange={(v) => setNewProduct({ ...newProduct, masterProductId: v === "none" ? "" : v })}>
                                      <SelectTrigger className="bg-slate-900/50 border-slate-800 focus:border-blue-500/50 transition-all">
                                        <SelectValue placeholder="Seleccionar Base..." />
                                      </SelectTrigger>
                                      <SelectContent className="bg-slate-950 border-slate-800 text-white">
                                        <SelectItem value="none">-- Es Producto Maestro --</SelectItem>
                                        {products.filter((p: any) => !p.masterProductId && p.id !== selectedProduct?.id).map((p: any) => (
                                          <SelectItem key={p.id} value={p.id}>{p.name} ({p.unit})</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <p className="text-[9px] text-slate-500 italic">Si este item es una presentación alternativa (ej. Bulto), selecciona su unidad base.</p>
                                  </div>

                                  {newProduct.masterProductId && (
                                    <div className="space-y-2">
                                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Factor de Conversión</Label>
                                      <div className="relative">
                                        <Input
                                          type="number"
                                          placeholder="Ej. 100"
                                          value={newProduct.expectedYield}
                                          onChange={(e) => setNewProduct({ ...newProduct, expectedYield: parseFloat(e.target.value) || 0 })}
                                          className="bg-slate-900/50 border-slate-800 focus:border-blue-500/50 transition-all font-mono text-blue-400 font-bold pr-12"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-500/60 uppercase">
                                          {products.find(p => p.id === newProduct.masterProductId)?.unit || 'u'}
                                        </span>
                                      </div>
                                      <p className="text-[9px] text-slate-500">¿Cuántas unidades base contiene esta presentación?</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* AI / Expected Behavior Config */}
                            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-4">
                              <div className="flex items-center gap-2 border-b border-purple-500/20 pb-2 mb-2">
                                <BrainCircuit className="w-4 h-4 text-purple-400" />
                                <Label className="text-xs font-bold uppercase text-purple-400">Comportamiento Esperado (IA)</Label>
                              </div>

                              <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Variabilidad Demanda</Label>
                                  <Select value={newProduct.demandVariability} onValueChange={(v) => setNewProduct({ ...newProduct, demandVariability: v })}>
                                    <SelectTrigger className="bg-slate-900/50 border-slate-800 focus:border-purple-500/50">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-950 border-slate-800 text-white">
                                      <SelectItem value="stable">Estable</SelectItem>
                                      <SelectItem value="variable">Variable</SelectItem>
                                      <SelectItem value="seasonal">Estacional</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Días Reorden</Label>
                                  <Input type="number" value={newProduct.reorderPointDays} onChange={(e) => setNewProduct({ ...newProduct, reorderPointDays: parseInt(e.target.value) || 0 })} className="bg-slate-900/50 border-slate-800 focus:border-purple-500/50" />
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Criticidad</Label>
                                  <Select value={newProduct.criticalityLevel} onValueChange={(v) => setNewProduct({ ...newProduct, criticalityLevel: v })}>
                                    <SelectTrigger className="bg-slate-900/50 border-slate-800 focus:border-red-500/50">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-950 border-slate-800 text-white">
                                      <SelectItem value="low">Baja</SelectItem>
                                      <SelectItem value="medium">Media</SelectItem>
                                      <SelectItem value="high">Alta</SelectItem>
                                      <SelectItem value="critical">Crítica</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
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
                      header: (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1 cursor-help">
                              {decisionMode ? "Análisis Neuronal" : "IA Insight"}
                              <Sparkles className="w-3 h-3 text-purple-400" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-2 max-w-xs">
                            {decisionMode
                              ? "Razonamiento detallado sobre por qué se recomienda esta acción."
                              : "Predicción basada en patrones históricos de demanda y stock actual."}
                          </TooltipContent>
                        </Tooltip>
                      ) as any,
                      render: (item: any) => decisionMode ? (
                        <div className="flex flex-col gap-2 min-w-[220px]">
                          <div className="flex items-center gap-2">
                            {item.cognitive?.riskFactor === 'High' ? (
                              <motion.div
                                animate={{ opacity: [0.7, 1, 0.7] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-tighter bg-red-500/10 border-red-500/30 text-red-400">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Riesgo Crítico
                                </Badge>
                              </motion.div>
                            ) : (
                              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter border-emerald-500/20 text-emerald-400 bg-emerald-500/5">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Estable
                              </Badge>
                            )}
                            <span className="text-[10px] uppercase font-black text-slate-500/50 tracking-widest">
                              {item.cognitive?.demandVariability === 'seasonal' ? 'Estacional' : item.cognitive?.demandVariability === 'variable' ? 'Variable' : 'Estable'}
                            </span>
                          </div>
                          <div className="text-xs pt-2 border-t border-white/5">
                            <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                              <span className="text-purple-400/80 font-bold uppercase tracking-tighter mr-1">Recomendación:</span>
                              {item.cognitive?.reasoning?.recommendation || "Analizando patrones..."}
                            </p>
                            <Button
                              variant="ghost"
                              className="h-7 w-full mt-2 justify-between text-[10px] font-bold text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 border border-purple-500/10 rounded-lg group"
                              onClick={() => {
                                setSelectedReasoningProduct(item);
                                setIsReasoningChatOpen(true);
                              }}
                            >
                              <span>ABRIR RAZONAMIENTO</span>
                              <BrainCircuit className="w-3.5 h-3.5 transition-transform group-hover:scale-125" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        item.cognitive?.shouldRestock ? (
                          <div className="flex flex-col items-start gap-1.5">
                            <motion.div
                              animate={{ x: [0, 2, 0] }}
                              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                            >
                              <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/5 text-[10px] uppercase font-black tracking-widest px-2 py-0.5">
                                <RefreshCw className="w-3 h-3 mr-1 animate-spin-slow" />
                                Agota en {item.cognitive?.daysRemaining ?? "..."}d
                              </Badge>
                            </motion.div>
                            <span className="text-[10px] font-bold text-slate-500/80 bg-slate-800/50 px-2 py-0.5 rounded border border-white/5">
                              SUGERIDO: <span className="text-white">+{item.cognitive?.suggestedOrder ?? 0}</span> {item.unit || "uds"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Saludable
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">
                              Autonomía: {item.cognitive?.daysRemaining || "30+"} días
                            </span>
                          </div>
                        )
                      ),
                    },
                    {
                      key: "category",
                      header: (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">Categoría</span>
                          </TooltipTrigger>
                          <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-2">
                            Clasificación organizativa del producto.
                          </TooltipContent>
                        </Tooltip>
                      ) as any,
                      render: (item) => (
                        <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700">{item.category || "Sin Categoría"}</Badge>
                      ),
                    },
                    {
                      key: "stock",
                      header: (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">Existencias</span>
                          </TooltipTrigger>
                          <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-2">
                            Cantidad física disponible en almacén.
                          </TooltipContent>
                        </Tooltip>
                      ) as any,
                      render: (item) => {
                        const maxStock = 20000;
                        const percentage = Math.min((item.stock / maxStock) * 100, 100);
                        return (
                          <div className="space-y-1.5 min-w-32">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold font-mono">
                                {item.stock.toLocaleString()} {item.unit || "units"}
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
                      header: (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">Precio Público</span>
                          </TooltipTrigger>
                          <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-2">
                            Precio de venta actual para el cliente final.
                          </TooltipContent>
                        </Tooltip>
                      ) as any,
                      render: (item) => (
                        <span className="font-mono font-bold text-white">
                          {formatCurrency(item.price)}
                        </span>
                      ),
                    },
                    {
                      key: "value",
                      header: (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">Valor Activo</span>
                          </TooltipTrigger>
                          <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-2">
                            Valor bursátil de las existencias (Stock x Precio).
                          </TooltipContent>
                        </Tooltip>
                      ) as any,
                      render: (item) => (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-mono text-emerald-400 capitalize cursor-help underline decoration-dotted decoration-emerald-500/30">
                              {formatCurrency(item.stock * item.price)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-2">
                            <p>Capital inmovilizado en este producto.</p>
                          </TooltipContent>
                        </Tooltip>
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
                          <DossierView
                            entityType="transaction"
                            entityId={item.id}
                            entityName={item.name}
                          />
                          {item.isProductionInput && enabledModules.includes("production") && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                                  onClick={() => {
                                    setSelectedImpactProductId(item.id);
                                    setIsImpactDialogOpen(true);
                                  }}
                                >
                                  <Activity className="w-4 h-4 mr-1" />
                                  Impacto
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Analizar impacto en cadena de producción</p></TooltipContent>
                            </Tooltip>
                          )}
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
                                className="text-destructive/70 hover:text-destructive hover:bg-destructive/20 border border-transparent hover:border-destructive/30"
                                onClick={() => {
                                  if (confirm("¿ELIMINAR PERMANENTEMENTE?\n\nEsta acción ocultará el producto de todas las operaciones futuras.\nEl historial se mantendrá intacto para auditoría.\n\n¿Confirmar eliminación segura?")) {
                                    deleteProductMutation.mutate(item.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Eliminar permanentemente (Safe Delete)</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-white hover:bg-white/10"
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
                          <DossierView
                            entityType="product"
                            entityId={item.id}
                            entityName={item.name}
                          />
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

            <ProductionImpactDialog
              isOpen={isImpactDialogOpen}
              onOpenChange={setIsImpactDialogOpen}
              productId={selectedImpactProductId}
            />

            <ReasoningChatDialog
              isOpen={isReasoningChatOpen}
              onOpenChange={setIsReasoningChatOpen}
              product={selectedReasoningProduct}
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
          </TabsContent>

          <TabsContent value="locations">
            <LocationsManager />
          </TabsContent>

          <TabsContent value="transfers">
            <TransfersManager />
          </TabsContent>

          <TabsContent value="import">
            <BulkImportManager />
          </TabsContent>

          <TabsContent value="labels">
            <LabelsManager />
          </TabsContent>

          <TabsContent value="modifiers">
            <ModifiersManager />
          </TabsContent>

          <TabsContent value="discounts">
            <DiscountsManager />
          </TabsContent>

          <TabsContent value="reports">
            <ValuationReport products={products} />
          </TabsContent>

        </Tabs>
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
        <DialogTitle>Detalles del Movimiento</DialogTitle>
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
            <Select
              value={reason}
              onValueChange={setReason}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccionar motivo..." />
              </SelectTrigger>
              <SelectContent>
                {(newStock > (product?.stock || 0)) ? (
                  <>
                    <SelectItem value="Compra / Reabastecimiento">Compra / Reabastecimiento</SelectItem>
                    <SelectItem value="Producción / Rendimiento">Producción / Rendimiento</SelectItem>
                    <SelectItem value="Devolución de Cliente">Devolución de Cliente</SelectItem>
                    <SelectItem value="Ajuste de Inventario (+)">Ajuste de Inventario (+)</SelectItem>
                  </>
                ) : (newStock < (product?.stock || 0)) ? (
                  <>
                    <SelectItem value="Venta / Salida">Venta / Salida</SelectItem>
                    <SelectItem value="Merma / Desperdicio">Merma / Desperdicio</SelectItem>
                    <SelectItem value="Uso Interno / Consumo">Uso Interno / Consumo</SelectItem>
                    <SelectItem value="Robo / Extravío">Robo / Extravío</SelectItem>
                    <SelectItem value="Ajuste de Inventario (-)">Ajuste de Inventario (-)</SelectItem>
                  </>
                ) : (
                  <SelectItem value="Sin cambios" disabled>Modifique el stock primero...</SelectItem>
                )}
              </SelectContent>
            </Select>
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
  const { session, profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';
  const [filterReason, setFilterReason] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const { data: movements, isLoading } = useQuery<Movement[]>({
    queryKey: [product?.id ? `/api/inventory/products/${product.id}/history` : null],
    queryFn: async () => {
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${session?.access_token}`
      };
      const activeOrgId = localStorage.getItem("nexus_active_org");
      if (activeOrgId) headers["x-organization-id"] = activeOrgId;

      const res = await fetch(`/api/inventory/products/${product.id}/history`, { headers });
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
    enabled: !!session?.access_token && !!product?.id && isOpen
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-primary/20 bg-slate-950">
        <DialogTitle>Análisis de Optimización de Stock por IA</DialogTitle>
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
            <>
              <div className="flex gap-2 mb-4">
                <Select onValueChange={(v) => setFilterReason(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por Motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Motivos</SelectItem>
                    {Array.from(new Set(movements?.map(m => m.reason))).filter(Boolean).map(reason => (
                      <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={(v) => setFilterSource(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por Origen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Orígenes</SelectItem>
                    {Array.from(new Set(movements?.map(m => m.source))).filter(Boolean).map(source => (
                      <SelectItem key={source} value={source}>{source}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {movements
                  .filter(m => (!filterReason || m.reason === filterReason) && (!filterSource || m.source === filterSource))
                  .map((m) => (
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
            </>
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
