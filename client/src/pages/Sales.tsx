import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/shared/DataTable";
import { StatCard } from "@/components/shared/StatCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Search,
  Package,
  DollarSign,
  TrendingUp,
  Clock,
  Printer,
  ShoppingBag,
  LineChart,
  History,
  Receipt,
  Building2,
  ArrowUpRight,
  Activity,
  CheckCircle2,
  Check,
  ChevronsUpDown
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useConfiguration } from "@/context/ConfigurationContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CognitiveInput, CognitiveField, CognitiveProvider, GuardianDiagnostic, GuardianSafeStatus } from "@/components/cognitive";

// --- Dialogs & Types ---

function CreateCustomerDialog() {
  const { session } = useAuth();
  const { industry } = useConfiguration();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });

  const labels: Record<string, any> = {
    services: { title: "Nuevo Cliente", nameLabel: "Empresa / Razón Social", namePlaceholder: "Ej. Acme Corp", emailLabel: "Email de Contacto" },
    healthcare: { title: "Nuevo Paciente", nameLabel: "Nombre del Paciente", namePlaceholder: "Ej. Juan Pérez", emailLabel: "Email Personal" },
    restaurant: { title: "Nuevo Comensal", nameLabel: "Nombre", namePlaceholder: "Ej. María González", emailLabel: "Email" },
    generic: { title: "Nuevo Cliente", nameLabel: "Nombre", namePlaceholder: "Ej. Juan Pérez", emailLabel: "Email" }
  };

  const currentLabels = labels[industry as string] || labels.generic;

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/crm/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create customer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/customers"] });
      setOpen(false);
      setFormData({ name: "", email: "", phone: "" });
      toast({ title: "Registro Exitoso", description: "Se ha guardado correctamente." });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear el registro." });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> {currentLabels.title}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{currentLabels.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{currentLabels.nameLabel}</Label>
            <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder={currentLabels.namePlaceholder} />
          </div>
          <div className="space-y-2">
            <Label>{currentLabels.emailLabel}</Label>
            <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="contacto@ejemplo.com" />
          </div>
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="5512345678" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
}

// --- Main Components ---

export default function Sales() {
  return (
    <AppLayout title="Punto de Venta" subtitle="Ventas y facturación">
      <Tabs defaultValue="pos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pos" className="gap-2">
            <ShoppingBag className="w-4 h-4" />
            Terminal POS
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <LineChart className="w-4 h-4" />
            Tendencias
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Ventas & Seguimiento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pos">
          <POSView />
        </TabsContent>

        <TabsContent value="trends">
          <SalesTrends />
        </TabsContent>

        <TabsContent value="history">
          <SalesHistory />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function CustomerCombobox({
  value,
  setValue,
  customers,
  labels
}: {
  value: string,
  setValue: (val: string) => void,
  customers: any[],
  labels: any
}) {
  const [open, setOpen] = useState(false);

  // Find selected name
  const selectedName = value
    ? customers.find((c) => c.id === value)?.name
    : labels.default;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal bg-background border-input hover:bg-accent hover:text-accent-foreground h-10 px-3 py-2"
        >
          <div className="flex flex-col items-start truncate">
            <span className="truncate">{value ? selectedName : labels.default}</span>
            {!value && <span className="text-[10px] text-muted-foreground opacity-70">RFC: XAXX010101000</span>}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Buscar ${labels.client.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No se encontró.</CommandEmpty>
            <CommandGroup heading="Opciones Rápidas">
              <CommandItem
                value="generic"
                onSelect={() => {
                  setValue("");
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === "" ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span>{labels.default}</span>
                  <span className="text-[10px] text-muted-foreground">XAXX010101000</span>
                </div>
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Registrados">
              {customers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.name}
                  onSelect={() => {
                    setValue(customer.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === customer.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {customer.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function POSView() {
  const { session } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { enabledModules, industry } = useConfiguration();
  const hasInventory = enabledModules.includes("inventory");
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");

  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer">("cash");
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);

  // Industry Labels
  const labels: Record<string, any> = {
    healthcare: { client: "Paciente", default: "Paciente Externo", insight: "historial clínico", anonymous: "paciente sin expediente" },
    restaurant: { client: "Comensal", default: "Cliente de Barra/Mesa", insight: "preferencias de consumo", anonymous: "comensal casual" },
    services: { client: "Cliente", default: "Cliente General", insight: "historial de servicios", anonymous: "cliente sin contrato" },
    generic: { client: "Cliente", default: "Público en General", insight: "historial de crédito", anonymous: "público general" }
  };
  const currentLabels = labels[industry as string] || labels.generic;
  // Fallback for "Público General" text to make sure it mentions the RFC as requested
  if (currentLabels.default === "Público en General" || currentLabels.default === "Cliente General") {
    // Ensure specificity or leave as is since component handles RFC display
  }

  // Pay Mutation
  const payMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          items,
          driverId: selectedDriver || null,
          vehicleId: selectedVehicle || null,
          customerId: selectedCustomer || null,
          paymentStatus: paymentMethod === 'cash' ? "paid" : "pending",
          paymentMethod: paymentMethod,
          bankAccountId: selectedBankId || null,
          status: "paid"
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Payment failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setCart([]);
      setSelectedDriver("");
      setSelectedVehicle("");
      setIsPayDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });

      toast({
        title: "Venta Exitosa",
        description: `Se procesaron ${data.stats.success} items.`
      });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "No se pudo completar la venta.", variant: "destructive" });
    }
  });

  const handlePay = () => {
    if (cart.length === 0) return;
    const items = cart.map(item => ({
      productId: item.id,
      quantity: item.quantity,
      price: Math.round(item.price * 100)
    }));
    payMutation.mutate(items);
  };

  // Queries
  const { data: dbProducts } = useQuery({
    queryKey: ["/api/inventory/products"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/products", {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      return res.json();
    },
    enabled: !!session?.access_token
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["/api/hr/employees"],
    queryFn: async () => {
      const res = await fetch("/api/hr/employees", { headers: { Authorization: `Bearer ${session?.access_token}` } });
      return (await res.json()).filter((e: any) => e.role.toLowerCase().includes("driver") || e.role.toLowerCase().includes("conductor"));
    },
    enabled: !!session?.access_token
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["/api/logistics/fleet/vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/logistics/fleet/vehicles", { headers: { Authorization: `Bearer ${session?.access_token}` } });
      return res.json();
    },
    enabled: !!session?.access_token
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/crm/customers"],
    queryFn: async () => {
      const res = await fetch("/api/crm/customers", { headers: { Authorization: `Bearer ${session?.access_token}` } });
      return res.json();
    },
    enabled: !!session?.access_token
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["/api/finance/accounts"],
    queryFn: async () => {
      const res = await fetch("/api/finance/accounts", { headers: { Authorization: `Bearer ${session?.access_token}` } });
      return res.json();
    },
    enabled: !!session?.access_token
  });

  useSupabaseRealtime({
    table: 'products',
    queryKey: ["/api/inventory/products"],
  });

  const products = useMemo(() => {
    const list = Array.isArray(dbProducts) ? dbProducts : [];
    return list
      .filter((p: any) => p.productType === "sale" || p.productType === "both")
      .map((p: any) => ({
        ...p,
        price: p.price / 100,
        status: p.stock < 100 ? "critical" : p.stock < 500 ? "low" : "available"
      }));
  }, [dbProducts]);

  const filteredProducts = products.filter(
    (p: any) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Cart Functions
  const addToCart = (product: any) => {
    if (hasInventory && product.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      const maxStock = hasInventory ? product.stock : 999999;

      if (existing) {
        if (existing.quantity >= maxStock) {
          toast({ title: "Límite de Stock", description: "No hay más unidades disponibles.", variant: "destructive" });
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1, maxStock }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newQty = item.quantity + delta;

        if (delta > 0 && newQty > item.maxStock) {
          toast({ title: "Límite de Stock", description: "No puedes agregar más de lo disponible.", variant: "destructive" });
          return item;
        }

        return { ...item, quantity: Math.max(0, newQty) };
      }).filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;
  const formatCurrency = (amount: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SalesMetrics />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display">Productos</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto..."
                  className="pl-9 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  disabled={hasInventory && product.stock <= 0}
                  onClick={() => addToCart(product)}
                  className={cn(
                    "p-4 rounded-xl border border-border bg-card transition-all text-left group relative overflow-hidden",
                    hasInventory && product.stock <= 0 ? "opacity-60 cursor-not-allowed grayscale bg-muted/20" : "hover:bg-muted/50 hover:border-primary/50"
                  )}
                >
                  {hasInventory && product.stock <= 0 && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                      <span className="bg-muted text-muted-foreground text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest transform -rotate-12 border border-border">
                        Sin Stock
                      </span>
                    </div>
                  )}
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                    <Package className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                  <p className="text-lg font-bold font-mono mt-2 text-primary">
                    {formatCurrency(product.price)}
                  </p>
                  {hasInventory && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "mt-2 text-[10px]",
                        product.stock <= 0 && "bg-muted text-muted-foreground",
                        product.stock > 0 && product.status === "critical" && "bg-destructive/15 text-destructive",
                        product.stock > 0 && product.status === "low" && "bg-warning/15 text-warning"
                      )}
                    >
                      {product.stock <= 0 ? "Agotado" : `Stock: ${product.stock}`}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 bg-muted/20 rounded-xl border border-dashed border-border mt-6 text-center">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold mb-2">No se encontraron productos</h3>
                <p className="text-muted-foreground max-w-sm mb-6">
                  {searchQuery ? "Intenta con otros términos de búsqueda." : "El inventario está vacío. Comienza creando tus productos."}
                </p>
                <Button onClick={() => setLocation('/inventory')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Nuevo Producto
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="sticky top-20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Carrito
                {cart.length > 0 && <Badge className="ml-2">{cart.length}</Badge>}
              </CardTitle>
              <CreateCustomerDialog />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <CognitiveProvider>
              <GuardianDiagnostic />
              <GuardianSafeStatus />

              {cart.length > 0 && (
                <div className="space-y-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <CognitiveField label={currentLabels.client} value={selectedCustomer} semanticType="category" options={customers.map((c: any) => c.name)}>
                    <CustomerCombobox
                      value={selectedCustomer}
                      setValue={setSelectedCustomer}
                      customers={customers}
                      labels={currentLabels}
                    />
                  </CognitiveField>
                  <CognitiveField label="Conductor" value={selectedDriver} semanticType="method">
                    <select className="w-full bg-background border border-border rounded-md p-2 text-sm" value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}>
                      <option value="">Sin asignar</option>
                      {drivers.map((d: any) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                    </select>
                  </CognitiveField>
                  <CognitiveField label="Vehículo" value={selectedVehicle} semanticType="method">
                    <select className="w-full bg-background border border-border rounded-md p-2 text-sm" value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)}>
                      <option value="">Sin asignar</option>
                      {vehicles.map((v: any) => (<option key={v.id} value={v.id}>{v.plate} - {v.model}</option>))}
                    </select>
                  </CognitiveField>
                </div>
              )}

              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Carrito vacío</p>
                  <p className="text-sm text-muted-foreground/70">Seleccione productos para agregar</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{formatCurrency(item.price)} x {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => updateQuantity(item.id, -1)}><Minus className="w-3 h-3" /></Button>
                          <span className="w-8 text-center font-mono font-semibold">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => updateQuantity(item.id, 1)}><Plus className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => removeFromCart(item.id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                        <p className="font-semibold font-mono min-w-20 text-right">{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{formatCurrency(subtotal)}</span></div>
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">IVA (16%)</span>
                        <span className="text-[10px] text-muted-foreground/50 italic px-1 bg-muted rounded">Fiscal</span>
                      </div>
                      <span className="font-mono">{formatCurrency(tax)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="font-mono text-primary">{formatCurrency(total)}</span></div>
                  </div>

                  {/* Operational Insight Pattern - Results Oriented */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Optimización Comercial</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                        <p className="text-[10px] text-slate-400">
                          {cart.length} items listos para <span className="text-slate-200">reserva de inventario</span>.
                        </p>
                      </div>
                      {selectedCustomer ? (
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-emerald-500" />
                          <p className="text-[10px] text-slate-400">
                            Afectando <span className="text-slate-200">{currentLabels.insight}</span> del {currentLabels.client.toLowerCase()} seleccionado.
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-amber-500" />
                          <p className="text-[10px] text-slate-400 font-medium italic">
                            Venta sin registro: se registrará como <span className="text-amber-200/80">{currentLabels.anonymous}</span>.
                          </p>
                        </div>
                      )}
                      {(selectedDriver || selectedVehicle) && (
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-blue-500" />
                          <p className="text-[10px] text-slate-400">
                            Despacho logístico <span className="text-blue-200">auditado</span> habilitado.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="h-16 text-lg font-bold" disabled={cart.length === 0}>
                          <CreditCard className="w-6 h-6 mr-2" />
                          Finalizar Venta
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirmar Pago</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                            <span className="text-lg font-medium">Total a Pagar:</span>
                            <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
                          </div>

                          <CognitiveField label="Método de Pago" value={paymentMethod} semanticType="method">
                            <div className="grid grid-cols-2 gap-3">
                              <Button
                                type="button"
                                variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                                className="h-12"
                                onClick={() => setPaymentMethod('cash')}
                              >
                                <Banknote className="w-4 h-4 mr-2" /> Efectivo
                              </Button>
                              <Button
                                type="button"
                                variant={paymentMethod === 'transfer' ? 'default' : 'outline'}
                                className="h-12"
                                onClick={() => setPaymentMethod('transfer')}
                              >
                                <Building2 className="w-4 h-4 mr-2" /> Transferencia
                              </Button>
                            </div>
                          </CognitiveField>

                          {paymentMethod === 'transfer' && (
                            <CognitiveField label="Cuenta Bancaria de Destino" value={selectedBankId} semanticType="category">
                              <select
                                className="w-full bg-background border border-border rounded-md p-2 text-sm"
                                value={selectedBankId}
                                onChange={(e) => setSelectedBankId(e.target.value)}
                              >
                                <option value="">Seleccione cuenta...</option>
                                {bankAccounts.map((a: any) => (
                                  <option key={a.id} value={a.id}>{a.name} ({a.bankName})</option>
                                ))}
                              </select>
                            </CognitiveField>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsPayDialogOpen(false)}>Cancelar</Button>
                          <Button
                            onClick={handlePay}
                            disabled={payMutation.isPending || (paymentMethod === 'transfer' && !selectedBankId)}
                          >
                            {payMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Confirmar Venta
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => {
                    const win = window.open('', '', 'width=300,height=600');
                    win?.document.write(`
                    <html>
                      <head><title>Ticket de Venta</title><style>body { font-family: monospace; padding: 20px; }</style></head>
                      <body>
                        <h3 style="text-align:center;">Nexus ERP</h3>
                        <p style="text-align:center;">Ticket de Venta</p>
                        <hr/>
                        ${cart.map(i => `<div style="display:flex; justify-content:space-between;"><span>${i.name} x${i.quantity}</span><span>${formatCurrency(i.price * i.quantity)}</span></div>`).join('')}
                        <hr/>
                        <div style="display:flex; justify-content:space-between; font-weight:bold;"><span>TOTAL</span><span>${formatCurrency(total)}</span></div>
                        <p style="text-align:center; margin-top:20px;">¡Gracias por su compra!</p>
                      </body>
                    </html>`);
                    win?.print();
                    win?.close();
                  }}>
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir Ticket
                  </Button>
                </>
              )}
            </CognitiveProvider>
          </CardContent>
        </Card>
      </div>

      {cart.length > 0 && <div className="lg:col-span-1"><UpsellSuggestion cart={cart} allProducts={products} onAdd={addToCart} /></div>}
    </div>
  );
}

function SalesTrends() {
  const { session } = useAuth();
  const formatCurrency = (amount: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

  const { data: stats } = useQuery({
    queryKey: ["/api/sales/stats"],
    queryFn: async () => {
      const res = await fetch("/api/sales/stats", { headers: { Authorization: `Bearer ${session?.access_token}` } });
      return res.json();
    },
    enabled: !!session?.access_token
  });

  if (!stats) return <div className="py-20 text-center text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />Cargando tendencias...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Ventas (Últimos 30 días)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.days}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" fontSize={12} tickFormatter={(val) => new Date(val).getDate().toString()} />
              <YAxis fontSize={12} tickFormatter={(val) => `$${val}`} />
              <Tooltip formatter={(val: number) => formatCurrency(val)} labelFormatter={(val) => new Date(val).toLocaleDateString()} />
              <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Productos Más Vendidos</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.topProducts?.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="w-6 h-6 flex items-center justify-center rounded-full p-0">#{i + 1}</Badge>
                  <p className="font-medium">{p.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(p.revenue)}</p>
                  <p className="text-xs text-muted-foreground">{p.quantity} unidades</p>
                </div>
              </div>
            ))}
            {(!stats.topProducts || stats.topProducts.length === 0) && <p className="text-center text-muted-foreground">Sin datos suficientes</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Proyección de Demanda</CardTitle></CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center py-8">
          <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">IA Analizando patrones de compra...</p>
          <p className="text-sm text-balance">Actualmente recolectando datos históricos suficientes para generar predicciones precisas.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SalesHistory() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const formatCurrency = (amount: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

  const { data: orders = [] } = useQuery({
    queryKey: ["/api/sales/orders"],
    queryFn: async () => {
      const res = await fetch("/api/sales/orders", { headers: { Authorization: `Bearer ${session?.access_token}` } });
      return res.json();
    },
    enabled: !!session?.access_token
  });

  const updateDeliveryMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const res = await fetch(`/api/sales/${id}/delivery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ status })
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales/orders"] });
      toast({ title: "Estado de entrega actualizado" });
    }
  });

  const columns = [
    { key: "id", header: "ID", render: (it: any) => <span className="font-mono text-xs text-muted-foreground">#{it.id.slice(0, 6)}</span> },
    { key: "date", header: "Fecha", render: (it: any) => new Date(it.date).toLocaleString() },
    { key: "product", header: "Producto", render: (it: any) => it.product?.name || "Desconocido" },
    { key: "quantity", header: "Cant.", render: (it: any) => it.quantity },
    { key: "totalPrice", header: "Total", render: (it: any) => <span className="font-bold text-green-600">{formatCurrency(it.totalPrice / 100)}</span> },
    {
      key: "deliveryStatus",
      header: "Entrega",
      render: (it: any) => (
        <Badge variant={it.deliveryStatus === "delivered" ? "default" : "secondary"} className={cn(it.deliveryStatus === "pending" && "bg-amber-100 text-amber-700")}>
          {it.deliveryStatus === "delivered" ? "Entregado" : it.deliveryStatus === "shipped" ? "En Camino" : "Pendiente"}
        </Badge>
      )
    },
    {
      key: "paymentStatus",
      header: "Pago",
      render: (it: any) => (
        <div className="flex flex-col gap-1">
          <Badge variant={it.paymentStatus === "paid" ? "outline" : "secondary"} className={cn(it.paymentStatus === "paid" ? "border-green-500 text-green-600" : "bg-red-100 text-red-700")}>
            {it.paymentStatus === "paid" ? "Pagado" : "Pendiente"}
          </Badge>
          {it.paymentMethod && <span className="text-[10px] opacity-70 uppercase">{it.paymentMethod}</span>}
        </div>
      )
    },
    {
      key: "actions",
      header: "Acciones",
      render: (it: any) => (
        <div className="flex gap-1">
          {it.paymentStatus !== "paid" && <PaySaleDialog sale={it} />}
          {it.deliveryStatus !== "delivered" && (
            <Button size="sm" variant="outline" onClick={() => updateDeliveryMutation.mutate({ id: it.id, status: "delivered" })}>
              <Package className="w-3 h-3 mr-1" /> Entregar
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <Card>
      <CardContent className="pt-6">
        <DataTable columns={columns} data={orders} />
      </CardContent>
    </Card>
  );
}

function PaySaleDialog({ sale }: { sale: any }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  const [bankId, setBankId] = useState("");

  const { data: accounts = [] } = useQuery({
    queryKey: ["/api/finance/accounts"],
    queryFn: async () => {
      const res = await fetch("/api/finance/accounts", { headers: { Authorization: `Bearer ${session?.access_token}` } });
      return res.json();
    },
    enabled: open
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sales/${sale.id}/pay`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ paymentMethod: method, bankAccountId: bankId || null })
      });
      if (!res.ok) throw new Error("Payment failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      setOpen(false);
      toast({ title: "Pago registrado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo registrar el pago", variant: "destructive" });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700">
          <DollarSign className="w-3 h-3 mr-1" /> Cobrar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar Pago: #{sale.id.slice(0, 6)}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
            <span className="font-medium">Monto a Cobrar:</span>
            <span className="text-xl font-bold font-mono text-green-600">
              {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(sale.totalPrice / 100)}
            </span>
          </div>
          <div className="space-y-2">
            <Label>Método</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={method === 'cash' ? 'default' : 'outline'} onClick={() => setMethod('cash')}>Efectivo</Button>
              <Button variant={method === 'transfer' ? 'default' : 'outline'} onClick={() => setMethod('transfer')}>Transferencia</Button>
            </div>
          </div>
          {method === 'transfer' && (
            <div className="space-y-2">
              <Label>Cuenta Destino</Label>
              <select className="w-full bg-background border border-border rounded-md p-2 text-sm" value={bankId} onChange={(e) => setBankId(e.target.value)}>
                <option value="">Seleccione cuenta...</option>
                {accounts.map((a: any) => (<option key={a.id} value={a.id}>{a.name} ({a.bankName})</option>))}
              </select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => payMutation.mutate()} disabled={payMutation.isPending || (method === 'transfer' && !bankId)}>
            Confirmar Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SalesMetrics() {
  const { session } = useAuth();
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

  const { data: metrics } = useQuery({
    queryKey: ["/api/analytics/dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/dashboard", { headers: { Authorization: `Bearer ${session?.access_token}` }, });
      return res.json();
    },
    enabled: !!session?.access_token,
  });

  const salesToday = metrics?.metrics?.length > 0 ? metrics.metrics[metrics.metrics.length - 1].value : 0;
  const transactionCount = metrics?.metrics?.length > 0 ? (metrics.metrics[metrics.metrics.length - 1].tags?.count || 0) : 0;
  const avgTicket = transactionCount > 0 ? salesToday / transactionCount : 0;

  return (
    <>
      <StatCard title="Ventas Hoy" value={formatCurrency(salesToday / 100)} icon={DollarSign} trend={metrics?.hasEnoughData ? 12.5 : 0} variant="success" />
      <StatCard title="Transacciones" value={transactionCount.toString()} icon={Receipt} variant="primary" />
      <StatCard title="Ticket Promedio" value={formatCurrency(avgTicket / 100)} icon={TrendingUp} trend={metrics?.hasEnoughData ? 5.2 : 0} />
    </>
  );
}

function UpsellSuggestion({ cart, allProducts, onAdd }: { cart: CartItem[], allProducts: any[], onAdd: (p: any) => void }) {
  const suggestion = useMemo(() => {
    if (cart.length === 0) return null;
    const lastItem = cart[cart.length - 1];
    const fullLastItem = allProducts.find(p => p.id === lastItem.id);
    if (!fullLastItem) return null;

    return allProducts.find(p =>
      p.id !== lastItem.id &&
      !cart.find(c => c.id === p.id) &&
      p.category === fullLastItem.category
    );
  }, [cart, allProducts]);

  if (!suggestion) return null;

  return (
    <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-400">
          <Package className="w-4 h-4" />
          Sugerencia Inteligente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-indigo-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-indigo-100">{suggestion.name}</p>
            <p className="text-xs text-indigo-300/70">Clientes suelen llevar esto junto.</p>
          </div>
          <Button size="sm" variant="secondary" className="h-8" onClick={() => onAdd(suggestion)}>
            <Plus className="w-3 h-3 mr-1" />
            Agg
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
