import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/shared/StatCard";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Receipt,
  Search,
  Package,
  DollarSign,
  TrendingUp,
  Clock,
  Printer,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export default function Sales() {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");

  const payMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const res = await fetch("/api/operations/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ items, driverId: selectedDriver, vehicleId: selectedVehicle, status: "paid" })
      });
      if (!res.ok) throw new Error("Payment failed");
      return res.json();
    },
    onSuccess: (data) => {
      setCart([]);
      setSelectedDriver("");
      setSelectedVehicle("");
      queryClient.invalidateQueries({ queryKey: ["/api/operations/inventory/products"] });
      // Also invalidate finance summary as sales affect it
      queryClient.invalidateQueries({ queryKey: ["/api/operations/finance/summary"] });

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
    // Map cart to expected payload { productId, quantity, price }
    const items = cart.map(item => ({
      productId: item.id, // Assuming CartItem.id matches Product.id
      quantity: item.quantity,
      price: Math.round(item.price * 100) // Convert back to cents for API
    }));
    payMutation.mutate(items);
  };

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

  // Setup Realtime subscription for automatic product updates
  useSupabaseRealtime({
    table: 'products',
    queryKey: ["/api/operations/inventory/products"],
  });

  const products = useMemo(() => {
    const list = Array.isArray(dbProducts) ? dbProducts : [];
    return list.map((p: any) => ({
      ...p,
      price: p.price / 100, // Convert from cents
      status: p.stock < 100 ? "critical" : p.stock < 500 ? "low" : "available"
    }));
  }, [dbProducts]);

  const filteredProducts = products.filter(
    (p: any) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);

  return (
    <AppLayout title="Punto de Venta" subtitle="Ventas y facturación">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Ventas Hoy"
              value={formatCurrency(125000)}
              icon={DollarSign}
              trend={12.5}
              variant="success"
            />
            <StatCard
              title="Transacciones"
              value="45"
              icon={Receipt}
              variant="primary"
            />
            <StatCard
              title="Ticket Promedio"
              value={formatCurrency(2778)}
              icon={TrendingUp}
              trend={5.2}
            />
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
                    data-testid="input-search-pos"
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
                    data-testid={`product-tile-${product.id}`}
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
              <CardTitle className="font-display flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Carrito
                {cart.length > 0 && (
                  <Badge className="ml-2">{cart.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length > 0 && (
                <div className="space-y-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Conductor</label>
                    <select
                      className="w-full bg-background border border-border rounded-md p-2 text-sm"
                      value={selectedDriver}
                      onChange={(e) => setSelectedDriver(e.target.value)}
                    >
                      <option value="">Sin asignar</option>
                      {drivers.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Vehículo</label>
                    <select
                      className="w-full bg-background border border-border rounded-md p-2 text-sm"
                      value={selectedVehicle}
                      onChange={(e) => setSelectedVehicle(e.target.value)}
                    >
                      <option value="">Sin asignar</option>
                      {vehicles.map((v: any) => (
                        <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Carrito vacío</p>
                  <p className="text-sm text-muted-foreground/70">
                    Seleccione productos para agregar
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                        data-testid={`cart-item-${item.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {formatCurrency(item.price)} x {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-7 h-7"
                            onClick={() => updateQuantity(item.id, -1)}
                            data-testid={`button-decrease-${item.id}`}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center font-mono font-semibold">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-7 h-7"
                            onClick={() => updateQuantity(item.id, 1)}
                            data-testid={`button-increase-${item.id}`}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-destructive hover:text-destructive"
                            onClick={() => removeFromCart(item.id)}
                            data-testid={`button-remove-${item.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="font-semibold font-mono min-w-20 text-right">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-mono">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA (16%)</span>
                      <span className="font-mono">{formatCurrency(tax)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="font-mono text-primary">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-14"
                      data-testid="button-pay-cash"
                      onClick={handlePay}
                      disabled={payMutation.isPending}
                    >
                      <Banknote className="w-5 h-5 mr-2" />
                      {payMutation.isPending ? "Procesando..." : "Efectivo"}
                    </Button>
                    <Button
                      className="h-14"
                      data-testid="button-pay-card"
                      onClick={handlePay}
                      disabled={payMutation.isPending}
                    >
                      <CreditCard className="w-5 h-5 mr-2" />
                      {payMutation.isPending ? "Procesando..." : "Tarjeta"}
                    </Button>
                  </div>

                  <Button variant="outline" className="w-full" data-testid="button-print-receipt">
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir Ticket
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* COGNITIVE UPSELL LAYER */}
        {cart.length > 0 && (
          <div className="lg:col-span-1">
            <UpsellSuggestion cart={cart} allProducts={products} onAdd={addToCart} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function UpsellSuggestion({ cart, allProducts, onAdd }: { cart: CartItem[], allProducts: any[], onAdd: (p: any) => void }) {
  // Simple "Cognitive" Logic: Find product in same category or just random related one not in cart
  const suggestion = useMemo(() => {
    if (cart.length === 0) return null;
    const lastItem = cart[cart.length - 1];
    // Find item with same category (mock check as we might not have category in CartItem, checking allProducts)
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
