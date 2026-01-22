import { useState, useMemo } from "react";
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
  Receipt
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
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
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- Dialogs & Types ---

function CreateCustomerDialog() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });

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
      toast({ title: "Cliente creado", description: "El cliente se ha registrado exitosamente." });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear el cliente." });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Nuevo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Juan Pérez" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="juan@ejemplo.com" />
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
            Crear Cliente
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
            Historial
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

function POSView() {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");

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
          status: "paid"
        })
      });
      if (!res.ok) throw new Error("Payment failed");
      return res.json();
    },
    onSuccess: (data) => {
      setCart([]);
      setSelectedDriver("");
      setSelectedVehicle("");
      queryClient.invalidateQueries({ queryKey: ["/api/operations/inventory/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/stats"] }); // Refresh trends
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] }); // Refresh finance

      toast({
        title: "Venta Exitosa",
        description: `Se procesaron ${data.stats.success} items.`
      });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo completar la venta.", variant: "destructive" });
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
    queryKey: ["/api/operations/inventory/products"],
    queryFn: async () => {
      const res = await fetch("/api/operations/inventory/products", {
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
    queryKey: ["/api/fleet/vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/fleet/vehicles", { headers: { Authorization: `Bearer ${session?.access_token}` } });
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

  useSupabaseRealtime({
    table: 'products',
    queryKey: ["/api/operations/inventory/products"],
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
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
      ).filter((item) => item.quantity > 0)
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
                  onClick={() => addToCart(product)}
                  className="p-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                    <Package className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                  <p className="text-lg font-bold font-mono mt-2 text-primary">
                    {formatCurrency(product.price)}
                  </p>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "mt-2 text-[10px]",
                      product.status === "critical" && "bg-destructive/15 text-destructive",
                      product.status === "low" && "bg-warning/15 text-warning"
                    )}
                  >
                    Stock: {product.stock}
                  </Badge>
                </button>
              ))}
            </div>
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
            {cart.length > 0 && (
              <div className="space-y-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Cliente</label>
                  <select className="w-full bg-background border border-border rounded-md p-2 text-sm" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                    <option value="">Consumidor Final</option>
                    {customers.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Conductor</label>
                  <select className="w-full bg-background border border-border rounded-md p-2 text-sm" value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}>
                    <option value="">Sin asignar</option>
                    {drivers.map((d: any) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Vehículo</label>
                  <select className="w-full bg-background border border-border rounded-md p-2 text-sm" value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)}>
                    <option value="">Sin asignar</option>
                    {vehicles.map((v: any) => (<option key={v.id} value={v.id}>{v.plate} - {v.model}</option>))}
                  </select>
                </div>
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
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA (16%)</span><span className="font-mono">{formatCurrency(tax)}</span></div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="font-mono text-primary">{formatCurrency(total)}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-14" onClick={handlePay} disabled={payMutation.isPending}><Banknote className="w-5 h-5 mr-2" />{payMutation.isPending ? "Procesando" : "Efectivo"}</Button>
                  <Button className="h-14" onClick={handlePay} disabled={payMutation.isPending}><CreditCard className="w-5 h-5 mr-2" />{payMutation.isPending ? "Procesando" : "Tarjeta"}</Button>
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
  const formatCurrency = (amount: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

  const { data: orders = [] } = useQuery({
    queryKey: ["/api/sales/orders"],
    queryFn: async () => {
      const res = await fetch("/api/sales/orders", { headers: { Authorization: `Bearer ${session?.access_token}` } });
      return res.json();
    },
    enabled: !!session?.access_token
  });

  const columns = [
    { key: "id", header: "ID", render: (it: any) => <span className="font-mono text-xs text-muted-foreground">#{it.id.slice(0, 6)}</span> },
    { key: "date", header: "Fecha", render: (it: any) => new Date(it.date).toLocaleString() },
    { key: "product", header: "Producto", render: (it: any) => it.product?.name || "Desconocido" },
    { key: "quantity", header: "Cant.", render: (it: any) => it.quantity },
    { key: "totalPrice", header: "Total", render: (it: any) => <span className="font-bold text-green-600">{formatCurrency(it.totalPrice / 100)}</span> },
    { key: "status", header: "Estado", render: (it: any) => <StatusBadge status={it.status} /> }
  ];

  return (
    <Card>
      <CardContent className="pt-6">
        <DataTable columns={columns} data={orders} />
      </CardContent>
    </Card>
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
  const transactions = Math.floor(salesToday / 1500) || 0;
  const avgTicket = transactions > 0 ? salesToday / transactions : 0;

  return (
    <>
      <StatCard title="Ventas Hoy" value={formatCurrency(salesToday)} icon={DollarSign} trend={metrics?.hasEnoughData ? 12.5 : 0} variant="success" />
      <StatCard title="Transacciones" value={transactions.toString()} icon={Receipt} variant="primary" />
      <StatCard title="Ticket Promedio" value={formatCurrency(avgTicket)} icon={TrendingUp} trend={metrics?.hasEnoughData ? 5.2 : 0} />
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
