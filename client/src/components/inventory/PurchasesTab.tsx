import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus,
  Truck,
  CheckCircle,
  ShoppingBag,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  PackageCheck,
  FolderPlus,
  XCircle,
  Eye,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/shared/DataTable";
import { CognitiveInput, CognitiveField } from "@/components/cognitive";
import { DossierView } from "@/components/shared/DossierView";

// --- Dialogs (Extracted and slightly adapted from Purchases.tsx) ---

function BatchDetailsDialog({
  open,
  onOpenChange,
  batch,
  formatCurrency
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: any;
  formatCurrency: (v: number) => string
}) {
  if (!batch) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalles de Orden de Compra: <span className="font-mono text-primary">{batch.batchId || batch.id}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-3 gap-4 border-b border-slate-800 pb-4">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Proveedor</p>
              <p className="text-sm font-medium">{batch.supplier?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Fecha</p>
              <p className="text-sm font-medium">{new Date(batch.date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Estado Entrega</p>
              <Badge className="capitalize text-[10px]">{batch.deliveryStatus}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Artículos en la orden</p>
            <div className="border rounded-lg overflow-hidden border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/50 border-b border-slate-800">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] uppercase">Producto</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase">Cant.</th>
                    <th className="text-right px-3 py-2 text-[10px] uppercase">Costo Unit.</th>
                    <th className="text-right px-3 py-2 text-[10px] uppercase">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.items.map((item: any) => (
                    <tr key={item.id} className="border-b border-slate-800/50 last:border-0">
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span>{item.product?.name}</span>
                          {item.notes && <span className="text-[10px] text-muted-foreground italic">{item.notes}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center font-mono">{item.quantity}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency((item.totalAmount / item.quantity) / 100)}</td>
                      <td className="px-3 py-2 text-right font-bold font-mono">{formatCurrency(item.totalAmount / 100)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900/30">
                    <td colSpan={3} className="px-3 py-2 text-right font-bold text-[10px] uppercase">Total Items</td>
                    <td className="px-3 py-2 text-right font-bold text-primary">{formatCurrency(batch.totalAmount / 100)}</td>
                  </tr>
                  {batch.freightCost > 0 && (
                    <tr className="bg-slate-900/30">
                      <td colSpan={3} className="px-3 py-2 text-right font-bold text-[10px] uppercase text-blue-400">Costo Flete</td>
                      <td className="px-3 py-2 text-right font-bold text-blue-400">{formatCurrency(batch.freightCost / 100)}</td>
                    </tr>
                  )}
                  <tr className="bg-primary/5">
                    <td colSpan={3} className="px-3 py-2 text-right font-bold text-xs uppercase text-primary">Gran Total</td>
                    <td className="px-3 py-2 text-right font-bold text-lg text-primary">{formatCurrency((batch.totalAmount + (batch.freightCost || 0)) / 100)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreatePurchaseDialog({ purchases = [] }: { purchases: any[] }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [cart, setCart] = useState<{
    uniqueId: string;
    productId: string;
    name: string;
    cost: number;
    quantity: number;
    note: string;
  }[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");

  const [paymentMethod, setPaymentMethod] = useState<string>("transfer");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [logisticsMethod, setLogisticsMethod] = useState<string>("delivery");
  const [driverId, setDriverId] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [freightCost, setFreightCost] = useState<string | number>(0);

  const { data: dbProducts = [] } = useQuery({
    queryKey: ["/api/inventory/products"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/products", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/purchases/suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/purchases/suppliers", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const items = cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        cost: Math.round(item.cost * 100),
        notes: item.note || undefined,
      }));
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          items,
          supplierId: selectedSupplier,
          paymentMethod,
          bankAccountId: paymentMethod === 'transfer' ? bankAccountId : null,
          logisticsMethod,
          driverId: driverId || null,
          vehicleId: vehicleId || null,
          freightCost: Math.round(Number(freightCost) * 100),
          status: "pending",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      setOpen(false);
      setCart([]);
      setSelectedSupplier("");
      setFreightCost(0);
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      toast({
        title: "Orden Registrada",
        description: "La orden de compra ha sido creada.",
      });
    },
    onError: () =>
      toast({
        variant: "destructive",
        title: "Error",
        description: "Falló el registro.",
      }),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["/api/inventory/groups"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/groups", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const filteredItems = [
    ...groups.map((g: any) => ({ ...g, type: "group" })),
    ...(Array.isArray(dbProducts)
      ? dbProducts
        .filter((p: any) => p.isPurchasable !== false && !p.isArchived)
        .map((p: any) => ({ ...p, type: "product" }))
      : []),
  ].filter((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const addToCart = (item: any) => {
    setCart((prev) => {
      if (item.type === "group") {
        const groupProducts = dbProducts.filter(
          (p: any) => p.groupId === item.id,
        );

        if (groupProducts.length === 0) {
          toast({
            description: "El grupo está vacío.",
            variant: "destructive",
          });
          return prev;
        }

        const newItems = groupProducts.map((p: any) => ({
          uniqueId: `${p.id}-${crypto.randomUUID()}`,
          productId: p.id,
          name: p.name,
          cost: (p.cost || 0) / 100,
          quantity: 1,
          note: "",
        }));

        toast({
          description: `Agregados ${newItems.length} productos del grupo.`,
        });
        return [...prev, ...newItems];
      } else {
        return [
          ...prev,
          {
            uniqueId: `${item.id}-${crypto.randomUUID()}`,
            productId: item.id,
            name: item.name,
            cost: (item.cost || 0) / 100,
            quantity: 1,
            note: "",
          },
        ];
      }
    });
  };

  const updateItem = (uniqueId: string, field: string, val: any) => {
    setCart((prev) =>
      prev.map((i) => (i.uniqueId === uniqueId ? { ...i, [field]: val } : i)),
    );
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Nueva Orden
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Orden de Compra</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
          <div className="space-y-4 border-r pr-4">
            <CognitiveField
              label="Proveedor"
              value={selectedSupplier}
              semanticType="category"
            >
              <Select
                value={selectedSupplier}
                onValueChange={setSelectedSupplier}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CognitiveField>

            {selectedSupplier && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label className="text-xs text-muted-foreground">Autorrelleno rápido</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/purchases/supplier/${selectedSupplier}/products`, {
                          headers: { Authorization: `Bearer ${session?.access_token}` },
                        });
                        if (!res.ok) throw new Error("Failed");
                        const products = await res.json();

                        const newItems = products.map((p: any) => ({
                          uniqueId: `${p.id}-${crypto.randomUUID()}`,
                          productId: p.id,
                          name: p.name,
                          cost: (p.lastPurchasePrice || 0) / 100,
                          quantity: 1,
                          note: "",
                        }));

                        setCart((prev) => [...prev, ...newItems]);
                        toast({
                          title: "Productos agregados",
                          description: `Se agregaron ${newItems.length} productos del proveedor.`,
                        });
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "No se pudieron cargar los productos del proveedor. Verifique que tenga compras previas.",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    Historial Proveedor
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={async () => {
                      // Logic now uses product's minStock or a default threshold if not set
                      const lowStockProducts = dbProducts.filter((p: any) => {
                        const threshold = p.minStock || 10;
                        return (p.stock || 0) < threshold && p.isPurchasable !== false;
                      });

                      const newItems = lowStockProducts.map((p: any) => ({
                        uniqueId: `${p.id}-${crypto.randomUUID()}`,
                        productId: p.id,
                        name: p.name,
                        cost: (p.cost || 0) / 100,
                        quantity: 1, // Default to 1, user adjusts
                        note: "Stock Bajo",
                      }));
                      setCart((prev) => [...prev, ...newItems]);
                      toast({
                        title: "Productos agregados",
                        description: `Se agregaron ${newItems.length} productos con stock bajo.`,
                      });
                    }}
                  >
                    Stock Bajo
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Método de Logística</Label>
              <Select value={logisticsMethod} onValueChange={setLogisticsMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delivery">Entrega (Proveedor envía)</SelectItem>
                  <SelectItem value="pickup">Recolección (Nosotros vamos)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Costo de Flete (MXN)</Label>
              <Input
                type="number"
                value={freightCost}
                onChange={(e) => setFreightCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="col-span-2 flex flex-col gap-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto a comprar..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {searchQuery && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-md p-2 bg-slate-950">
                {filteredItems.slice(0, 10).map((item: any) => (
                  <Button
                    key={item.id}
                    variant="outline"
                    className="justify-start text-xs h-auto py-2"
                    onClick={() => addToCart(item)}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium truncate w-full">{item.name}</span>
                      {item.type === 'group' && <Badge variant="secondary" className="text-[10px] h-4">Grupo</Badge>}
                    </div>
                  </Button>
                ))}
              </div>
            )}

            <div className="flex-1 border rounded-md overflow-hidden bg-slate-950/50">
              <div className="p-2 text-xs font-bold bg-slate-900 border-b flex justify-between">
                <span>Items en la Orden ({cart.length})</span>
                <span>Total Estimado: {formatCurrency(cart.reduce((acc, i) => acc + (i.cost * i.quantity), 0))}</span>
              </div>
              <div className="overflow-y-auto max-h-[300px]">
                {cart.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    La orden está vacía. Busque productos para agregar.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900/50 text-xs">
                      <tr>
                        <th className="text-left p-2">Producto</th>
                        <th className="text-center p-2 w-20">Cant.</th>
                        <th className="text-right p-2 w-24">Costo</th>
                        <th className="text-right p-2 w-24">Total</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item, idx) => (
                        <tr key={item.uniqueId} className="border-b border-slate-800/50">
                          <td className="p-2">
                            <div className="font-medium">{item.name}</div>
                            <Input
                              placeholder="Notas..."
                              className="h-6 text-[10px] bg-transparent border-0 p-0 focus-visible:ring-0 text-muted-foreground"
                              value={item.note}
                              onChange={(e) => updateItem(item.uniqueId, 'note', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              className="h-8 text-center"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.uniqueId, 'quantity', Number(e.target.value))}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              className="h-8 text-right"
                              value={item.cost}
                              onChange={(e) => updateItem(item.uniqueId, 'cost', Number(e.target.value))}
                            />
                          </td>
                          <td className="p-2 text-right font-mono">
                            {formatCurrency(item.cost * item.quantity)}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))}
                            >
                              <XCircle className="w-3 h-3 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => purchaseMutation.mutate()} disabled={purchaseMutation.isPending || cart.length === 0 || !selectedSupplier}>
            {purchaseMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar Orden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Main PurchasesTab Component ---

export function PurchasesTab() {
  const { session, profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activePurchase, setActivePurchase] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["/api/purchases"],
    queryFn: async () => {
      const res = await fetch("/api/purchases", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!session?.access_token,
  });

  // Calculate Metrics
  const pendingCount = purchases.filter(
    (p: any) => p.deliveryStatus === "pending",
  ).length;
  const receivedCount = purchases.filter(
    (p: any) => p.deliveryStatus === "received",
  ).length;
  const totalSpent =
    purchases.reduce((acc: number, p: any) => acc + (p.totalAmount || 0), 0) /
    100;

  // -- Mutations for Table Actions --

  const approveMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const res = await fetch(`/api/purchases/batch/${batchId}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      toast({
        title: "Orden Aprobada",
        description: "Los insumos ahora pueden ser recibidos.",
      });
    },
  });

  const receiveBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const res = await fetch(`/api/purchases/batch/${batchId}/receive`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to receive batch");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      toast({
        title: "Lote Recibido",
        description: "El inventario ha sido actualizado.",
      });
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/purchases/${id}/receive`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to receive item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      toast({
        title: "Insumos Recibidos",
        description: "El inventario se ha actualizado.",
      });
    },
  });

  const cancelBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const res = await fetch(`/api/purchases/batch/${batchId}/cancel`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to cancel batch");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      toast({
        title: "Orden Cancelada",
        description: "La orden de compra ha sido cancelada.",
      });
    },
  });

  const groupedData = useMemo(() => {
    const groups: Record<string, any> = {};
    purchases.forEach((item: any) => {
      const bid = item.batchId || `single-${item.id}`;
      if (!groups[bid]) {
        groups[bid] = {
          ...item,
          isBatch: !!item.batchId,
          items: [],
          totalAmount: 0,
        };
      }
      groups[bid].items.push(item);
      groups[bid].totalAmount += item.totalAmount || 0;

      // Status aggregation
      if (item.deliveryStatus === "pending") groups[bid].deliveryStatus = "pending";
      if (item.paymentStatus === "pending") groups[bid].paymentStatus = "pending";
      if (!item.isApproved) groups[bid].isApproved = false;
    });
    return Object.values(groups).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchases]);

  const columns = [
    {
      key: "folio",
      header: "Folio / ID",
      render: (it: any) => (
        <div className="flex flex-col">
          <span className="font-mono text-[10px] font-bold text-primary">
            {it.batchId || "N/A"}
          </span>
          <span className="text-[9px] text-muted-foreground">
            {new Date(it.date).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      key: "supplier",
      header: "Proveedor",
      render: (it: any) => (
        <div className="flex flex-col">
          <span className="font-medium text-xs">{it.supplier?.name || "N/A"}</span>
          <span className="text-[9px] text-muted-foreground uppercase">{it.paymentMethod}</span>
        </div>
      ),
    },
    {
      key: "total",
      header: "Total",
      render: (it: any) => (
        <span className="font-bold">
          {formatCurrency((it.totalAmount || 0) / 100)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (it: any) => (
        <div className="flex flex-col gap-1">
          <Badge
            variant="outline"
            className={cn(
              "w-fit text-[10px] px-1 h-4",
              it.deliveryStatus === "received"
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : it.deliveryStatus === "cancelled"
                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                  : "bg-amber-500/10 text-amber-500 border-amber-500/20",
            )}
          >
            {it.deliveryStatus === "received" ? "Recibido" : it.deliveryStatus === "cancelled" ? "Cancelado" : "Pendiente"}
          </Badge>
          {!it.isApproved && (
            <Badge
              variant="destructive"
              className="w-fit text-[10px] px-1 h-4 animate-pulse"
            >
              <ShieldAlert className="w-2.5 h-2.5 mr-1" /> Sin Aprobar
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (it: any) => (
        <div className="flex gap-1 items-center">
          <Button
            size="sm"
            variant="ghost"
            title="Ver Detalles"
            className="h-7 w-7 p-0"
            onClick={() => {
              setActivePurchase(it);
              setIsDetailsOpen(true);
            }}
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>

          {it.deliveryStatus === "pending" && it.isApproved && (
            <Button
              size="sm"
              variant="outline"
              title="Recibir todo"
              className="h-7 w-7 p-0 bg-green-500/10 hover:bg-green-500/20 text-emerald-500 border-emerald-500/20"
              onClick={() => it.isBatch ? receiveBatchMutation.mutate(it.batchId) : receiveMutation.mutate(it.id)}
              disabled={receiveMutation.isPending || receiveBatchMutation.isPending}
            >
              <PackageCheck className="w-3.5 h-3.5" />
            </Button>
          )}

          {it.deliveryStatus === "pending" && !it.isApproved && isAdmin && (
            <Button
              size="sm"
              variant="outline"
              title="Aprobar todo"
              className="h-7 w-7 p-0 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/20"
              onClick={() => approveMutation.mutate(it.batchId || it.id)}
              disabled={approveMutation.isPending}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </Button>
          )}

          {it.deliveryStatus === "pending" && (
            <Button
              size="sm"
              variant="ghost"
              title="Cancelar Orden"
              className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => {
                if (confirm("¿Estás seguro de cancelar esta orden?")) {
                  cancelBatchMutation.mutate(it.batchId);
                }
              }}
              disabled={cancelBatchMutation.isPending}
            >
              <XCircle className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Órdenes Pendientes
              </p>
              <div className="text-2xl font-bold">{pendingCount}</div>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-full text-amber-500">
              <Truck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Recibidas / Cerradas
              </p>
              <div className="text-2xl font-bold">{receivedCount}</div>
            </div>
            <div className="p-3 bg-green-500/10 rounded-full text-green-500">
              <CheckCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Gasto Total (Histórico)
              </p>
              <div className="text-2xl font-bold">
                {formatCurrency(totalSpent)}
              </div>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Historial de Compras y Pedidos</CardTitle>
            <div className="flex gap-2">
              <CreatePurchaseDialog purchases={purchases} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={groupedData} />
        </CardContent>
      </Card>

      <BatchDetailsDialog
        open={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) setActivePurchase(null);
        }}
        batch={activePurchase}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
