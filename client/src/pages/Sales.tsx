import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, LineChart, History } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useConfiguration } from "@/context/ConfigurationContext";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";

// Components
import { ProductGrid } from "@/components/pos/ProductGrid";
import { Cart } from "@/components/pos/Cart";
import { OrderTypeSelector } from "@/components/pos/OrderTypeSelector";
import { OpenOrdersDialog } from "@/components/pos/OpenOrdersDialog";
import { CreateCustomerDialog } from "@/components/pos/CreateCustomerDialog";
import { SalesMetrics } from "@/components/pos/SalesMetrics";
import { SalesTrends } from "@/components/pos/SalesTrends";
import { SalesHistory } from "@/components/pos/SalesHistory";
import { UpsellSuggestion } from "@/components/pos/UpsellSuggestion";

import { CashCountDialog } from "@/components/pos/CashCountDialog";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
}

export default function Sales() {
  const [activeTab, setActiveTab] = useState("pos");
  const [openSaleId, setOpenSaleId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const saleId = params.get("openSaleId");
    if (saleId) {
      setActiveTab("history");
      setOpenSaleId(saleId);
      window.history.replaceState({}, '', '/sales');
    }
  }, []);

  return (
    <AppLayout title="Punto de Venta" subtitle="Ventas y facturación">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
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
            <CashCountDialog />
          </div>

          <TabsContent value="pos">
            <POSView />
          </TabsContent>

          <TabsContent value="trends">
            <SalesTrends />
          </TabsContent>

          <TabsContent value="history">
            <SalesHistory openSaleId={openSaleId} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
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

  // States moved from Sales.tsx
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [isRecallOpen, setIsRecallOpen] = useState(false);

  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer">("cash");
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Restaurant / POS States
  const [orderType, setOrderType] = useState<"dine-in" | "takeout" | "delivery">("takeout");
  const [tableNumber, setTableNumber] = useState("");
  const [pax, setPax] = useState(1);

  useEffect(() => {
    const handleOnline = () => { setIsOffline(false); toast({ title: "Conexión Restaurada", description: "Sincronizando ventas offline..." }); syncOfflineSales(); };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineSales = async () => {
    const stored = localStorage.getItem("offline_sales");
    if (stored) {
      const sales = JSON.parse(stored);
      for (const sale of sales) {
        try {
          await fetch("/api/sales", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({ ...sale, isOfflineSync: true })
          });
        } catch (e) { console.error("Sync failed", e); }
      }
      localStorage.removeItem("offline_sales");
      toast({ title: "Sincronización Completa", description: `${sales.length} ventas offline subidas.` });
    }
  };

  // Industry Labels
  const labels: Record<string, any> = {
    healthcare: { client: "Paciente", default: "Paciente Externo", insight: "historial clínico", anonymous: "paciente sin expediente" },
    hospitality: { client: "Comensal", default: "Cliente de Barra/Mesa", insight: "preferencias de consumo", anonymous: "comensal casual" },
    services: { client: "Cliente", default: "Cliente General", insight: "historial de servicios", anonymous: "cliente sin contrato" },
    generic: { client: "Cliente", default: "Público en General", insight: "historial de crédito", anonymous: "público general" }
  };
  const currentLabels = labels[industry as string] || labels.generic;

  // Functions (Cart)
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


  // Pay Mutation
  const payMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const payload = {
        items,
        driverId: selectedDriver || null,
        vehicleId: selectedVehicle || null,
        customerId: selectedCustomer || null,
        paymentStatus: paymentMethod === 'cash' ? "paid" : "pending",
        paymentMethod: paymentMethod,
        bankAccountId: selectedBankId || null,
        status: "paid",
        orderType,
        tableNumber: orderType === 'dine-in' ? tableNumber : null,
        pax: orderType === 'dine-in' ? pax : 1,
        date: new Date(),
        isOfflineSync: false
      };

      if (isOffline) {
        const stored = JSON.parse(localStorage.getItem("offline_sales") || "[]");
        stored.push(payload);
        localStorage.setItem("offline_sales", JSON.stringify(stored));
        return { stats: { success: items.length }, offline: true };
      }

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(payload)
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
      queryClient.invalidateQueries({ queryKey: ["/api/sales/orders", "/api/sales/stats", "/api/finance/summary"] });
      window.dispatchEvent(new CustomEvent('NEXUS_ONBOARDING_ACTION', { detail: 'sale_completed' }));
      toast({
        title: data.offline ? "Venta Offline Guardada" : "Venta Exitosa",
        description: data.offline ? "Se sincronizará cuando haya conexión." : `Se procesaron ${data.stats.success} items.`
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

  const handleHoldOrder = async () => {
    if (cart.length === 0) {
      toast({ title: "Carrito vacío", description: "Agrega productos antes de guardar la orden.", variant: "destructive" });
      return;
    }
    const items = cart.map(item => ({
      productId: item.id,
      quantity: item.quantity,
      price: Math.round(item.price * 100)
    }));
    try {
      const payload = {
        items,
        customerId: selectedCustomer || null,
        paymentStatus: "pending",
        status: "draft",
        orderType,
        tableNumber: orderType === 'dine-in' ? tableNumber : null,
        pax: orderType === 'dine-in' ? pax : 1,
        date: new Date()
      };
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to hold order");
      toast({ title: "Orden Guardada", description: "La orden se ha guardado en cuentas abiertas." });
      setCart([]);
      setTableNumber("");
      setPax(1);
      setSelectedCustomer("");
    } catch (e) {
      toast({ title: "Error", description: "No se pudo guardar la orden.", variant: "destructive" });
    }
  };

  // Queries
  const { data: dbProducts } = useQuery({
    queryKey: ["/api/inventory/products"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/products", { headers: { Authorization: `Bearer ${session?.access_token}` } });
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

  useSupabaseRealtime({ table: 'products', queryKey: ["/api/inventory/products"] });
  useSupabaseRealtime({ table: 'sales', queryKey: ["/api/sales/orders", "/api/sales/stats", "/api/finance/summary"] });
  useSupabaseRealtime({ table: 'customers', queryKey: ["/api/crm/customers"] });
  useSupabaseRealtime({ table: 'bank_accounts', queryKey: ["/api/finance/accounts"] });

  const products = useMemo(() => {
    const list = Array.isArray(dbProducts) ? dbProducts : [];
    return list
      .filter((p: any) => p.isSellable !== false && p.isActive !== false)
      .map((p: any) => ({
        ...p,
        price: p.price / 100,
        status: p.stock < 100 ? "critical" : p.stock < 500 ? "low" : "available"
      }));
  }, [dbProducts]);

  const filteredProducts = products.filter(
    (p: any) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        return prev.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1, maxStock }];
    });
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SalesMetrics />
        </div>

        <OrderTypeSelector
          orderType={orderType}
          setOrderType={setOrderType}
          tableNumber={tableNumber}
          setTableNumber={setTableNumber}
          pax={pax}
          setPax={setPax}
        />

        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <CreateCustomerDialog />
          </div>

          <ProductGrid
            products={filteredProducts}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            addToCart={addToCart}
            onScan={(code) => setSearchQuery(code)}
          />
        </div>

        <OpenOrdersDialog open={isRecallOpen} onOpenChange={setIsRecallOpen} />
      </div>

      <div className="space-y-6">
        <Cart
          cart={cart}
          setCart={setCart}
          updateQuantity={updateQuantity}
          removeFromCart={removeFromCart}
          handleHoldOrder={handleHoldOrder}
          setIsRecallOpen={setIsRecallOpen}
          // Context
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          customers={customers}
          currentLabels={currentLabels}
          selectedDriver={selectedDriver}
          setSelectedDriver={setSelectedDriver}
          drivers={drivers}
          selectedVehicle={selectedVehicle}
          setSelectedVehicle={setSelectedVehicle}
          vehicles={vehicles}
          // Pay
          isPayDialogOpen={isPayDialogOpen}
          setIsPayDialogOpen={setIsPayDialogOpen}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          selectedBankId={selectedBankId}
          setSelectedBankId={setSelectedBankId}
          bankAccounts={bankAccounts}
          handlePay={handlePay}
          isPayPending={payMutation.isPending}
          formatCurrency={formatCurrency}
        />
        {cart.length > 0 && <UpsellSuggestion cart={cart} allProducts={products} onAdd={addToCart} />}
      </div>
    </div>
  );
}
