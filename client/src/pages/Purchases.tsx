import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useConfiguration } from "@/context/ConfigurationContext";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Search,
  Truck,
  CheckCircle,
  ShoppingBag,
  Loader2,
  Activity,
  ShieldAlert,
  CheckCircle2,
  PackageCheck,
  FolderPlus,
  AlertTriangle,
  History,
  TrendingDown,
  Eye,
  XCircle,
  FileText,
  Settings,
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

export default function Purchases() {
  const { session } = useAuth();
  const search = window.location.search; // Simple access since wouter useSearch might need verify
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

  // Deep Linking Logic
  useEffect(() => {
    const params = new URLSearchParams(search);
    const openBatchId = params.get("openBatchId");
    if (openBatchId && purchases.length > 0) {
      const target = purchases.find((p: any) => p.id === openBatchId);
      if (target) {
        setActivePurchase(target);
        setIsDetailsOpen(true);
        // Clean URL without reload
        window.history.replaceState({}, '', '/purchases');
      }
    }
  }, [search, purchases]);

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

  return (
    <AppLayout
      title="Compras"
      subtitle="Gestión de abastecimiento y proveedores"
    >
      <div className="space-y-6">
        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
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
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                <p className="font-bold text-amber-500 uppercase tracking-widest text-[9px] mb-1">Logística de Entrada</p>
                <p>Órdenes de compra autorizadas que aún no han sido recibidas físicamente en el almacén.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
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
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                <p className="font-bold text-emerald-500 uppercase tracking-widest text-[9px] mb-1">Confirmación de Stock</p>
                <p>Insumos que ya han pasado el control de calidad y se encuentran disponibles en el inventario operativo.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
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
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                <p className="font-bold text-blue-500 uppercase tracking-widest text-[9px] mb-1">Flujo de Capital</p>
                <p>Inversión total acumulada en abastecimiento. Refleja tanto facturas pagadas como compromisos por liquidar.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Órdenes de Compra</CardTitle>
              <div className="flex gap-2">
                <CreateGroupDialog />
                <CreateProductDialog />
                <CreateSupplierDialog />
                <CreatePurchaseDialog purchases={purchases} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <PurchasesTable
              data={purchases}
              onView={(p) => {
                setActivePurchase(p);
                setIsDetailsOpen(true);
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Global Dialog for Details (Deep Linking Support) */}
      <BatchDetailsDialog
        open={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) setActivePurchase(null);
        }}
        batch={activePurchase}
        formatCurrency={formatCurrency}
      />
    </AppLayout>
  );
}

function PurchasesTable({ data, onView }: { data: any[], onView: (batch: any) => void }) {
  const { session, profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);

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
    onError: () =>
      toast({
        title: "Error",
        description: "No se pudo recibir.",
        variant: "destructive",
      }),
  });

  const payMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/purchases/${id}/pay`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to pay");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      toast({
        title: "Pago Registrado",
        description: "El gasto se ha reflejado en finanzas.",
      });
    },
    onError: (err: any) =>
      toast({
        title: "Error de Pago",
        description: err.message || "No se pudo registrar el pago.",
        variant: "destructive",
      }),
  });

  const payBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const res = await fetch(`/api/purchases/batch/${batchId}/pay`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ paymentMethod: "transfer" }), // Default or can be dynamic
      });
      if (!res.ok) throw new Error("Failed to pay batch");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      toast({
        title: "Lote Pagado",
        description: "El pago del lote se ha registrado.",
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
    data.forEach((item: any) => {
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

      // Status aggregation: if any item is pending, batch is pending
      if (item.deliveryStatus === "pending") groups[bid].deliveryStatus = "pending";
      if (item.paymentStatus === "pending") groups[bid].paymentStatus = "pending";
      if (!item.isApproved) groups[bid].isApproved = false;
    });
    return Object.values(groups).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data]);

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
      key: "product",
      header: "Items",
      render: (it: any) => (
        <div className="flex flex-col gap-1">
          {it.items.map((sub: any, idx: number) => (
            <div key={sub.id} className={cn("flex flex-col", idx > 0 && "border-t border-slate-800 pt-1")}>
              <span className="font-medium text-xs">
                {sub.product?.name || "Insumo"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {sub.quantity} {sub.product?.unit || "u."} @ {formatCurrency(sub.totalAmount / (sub.quantity * 100))}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "logistics",
      header: "Logística",
      render: (it: any) => (
        <div className="flex flex-col text-[10px]">
          <span className="capitalize font-medium">
            {it.logisticsMethod === "pickup" ? "Recolección" : "Entrega"}
          </span>
          {it.driver && (
            <span className="text-muted-foreground truncate max-w-[100px]">
              {it.driver.name}
            </span>
          )}
          {it.vehicle && (
            <span className="text-muted-foreground">
              {it.vehicle.plate}
            </span>
          )}
          {it.freightCost > 0 && (
            <span className="text-blue-500 font-bold">
              Flete: {formatCurrency(it.freightCost / 100)}
            </span>
          )}
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
      header: "Estado / Lote",
      render: (it: any) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Badge
              variant={it.paymentStatus === "paid" ? "default" : "secondary"}
              className="w-fit text-[10px] px-1 h-4"
            >
              {it.paymentStatus === "paid" ? "Pagado" : "Por Pagar"}
            </Badge>
            {it.batchId && (
              <span className="text-[10px] font-mono text-muted-foreground">
                {it.batchId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
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
            {it.isApproved && it.deliveryStatus !== "received" && (
              <Badge
                variant="outline"
                className="w-fit text-[10px] px-1 h-4 bg-blue-500/10 text-blue-500 border-blue-500/20"
              >
                <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Aprobado
              </Badge>
            )}
          </div>
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
            onClick={() => onView(it)}
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

          {it.paymentStatus === "pending" && it.isApproved && it.deliveryStatus !== "cancelled" && (
            <PurchasePaymentDialog purchase={it} />
          )}

          {it.deliveryStatus === "pending" && (
            <EditLogisticsDialog purchase={it} />
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

  return <DataTable columns={columns} data={groupedData} />;
}

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
          {/* Summary Header */}
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

          {/* Items Table */}
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
            <Button variant="outline" onClick={() => (document.querySelector('[data-state="open"]') as any)?.click()}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateGroupDialog() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/inventory/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create group");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/groups"] });
      setOpen(false);
      setFormData({ name: "", description: "" });
      toast({
        title: "Grupo creado",
        description: "Ahora puedes asignar productos a este grupo.",
      });
    },
    onError: () =>
      toast({
        title: "Error",
        description: "No se pudo crear el grupo.",
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FolderPlus className="w-4 h-4" /> Nuevo Grupo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Grupo de Productos</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Los grupos permiten agrupar variantes de un mismo producto (ej. "Coco
          Bueno kg", "Coco Desecho pza") bajo un nombre común para reportes y
          producción.
        </p>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nombre del Grupo</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ej. Coco, Leche, Madera"
            />
          </div>
          <div className="space-y-2">
            <Label>Descripción (opcional)</Label>
            <Input
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Ej. Todas las variantes de coco para procesamiento"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => createMutation.mutate(formData)}
            disabled={createMutation.isPending || !formData.name.trim()}
          >
            {createMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Crear Grupo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateProductDialog() {
  const { session } = useAuth();
  const { enabledModules } = useConfiguration();
  const hasInventory = enabledModules.includes("inventory");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    categoryId: "",
    groupId: "",
    unitId: "",
    productType: "purchase",
    stock: "",
    unit: "pza",
    price: "",
    cost: "",
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/inventory/categories"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/categories", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
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

  const { data: units = [] } = useQuery({
    queryKey: ["/api/inventory/units"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/units", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/inventory/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ name }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/inventory/categories"],
      });
      toast({ title: "Categoría creada" });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/inventory/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ name }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/groups"] });
      toast({ title: "Grupo creado" });
    },
  });

  const createUnitMutation = useMutation({
    mutationFn: async ({
      name,
      abbreviation,
    }: {
      name: string;
      abbreviation: string;
    }) => {
      const res = await fetch("/api/inventory/units", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ name, abbreviation }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/units"] });
      toast({ title: "Unidad creada" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/inventory/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          ...data,
          categoryId: data.categoryId || null,
          groupId: data.groupId || null,
          unitId: data.unitId || null,
          productType: hasInventory ? "purchase" : "service_cost",
          price: Math.round(data.price * 100),
          cost: Math.round(data.cost * 100),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      setOpen(false);
      toast({
        title: hasInventory ? "Producto creado" : "Concepto creado",
        description: "Listo para usar en compras.",
      });
      setFormData({
        name: "",
        sku: "",
        categoryId: "",
        groupId: "",
        unitId: "",
        productType: "purchase",
        stock: "",
        unit: "pza",
        price: "",
        cost: "",
      });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          {hasInventory ? "Nuevo Producto" : "Nuevo Concepto/Gasto"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {hasInventory ? "Alta de Producto" : "Alta de Concepto"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nombre / Descripción</Label>
            <CognitiveInput
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ej. Coco Bueno (kg) o Servicio Limpieza"
              semanticType="name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.categoryId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, categoryId: v })
                  }
                >
                  <SelectTrigger className="flex-1 bg-slate-900/50 border-slate-800">
                    <SelectValue placeholder="Elegir..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-800 text-white">
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const name = prompt("Nombre de la nueva categoría:");
                    if (name) createCategoryMutation.mutate(name);
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Grupo (Opcional)</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.groupId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, groupId: v === "none" ? "" : v })
                  }
                >
                  <SelectTrigger className="flex-1 bg-slate-900/50 border-slate-800">
                    <SelectValue placeholder="Elegir..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-800 text-white">
                    <SelectItem value="none">Ninguno</SelectItem>
                    {groups.map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const name = prompt("Nombre del nuevo grupo:");
                    if (name) createGroupMutation.mutate(name);
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          {hasInventory && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU</Label>
                <CognitiveInput
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  semanticType="sku"
                />
              </div>
              <div className="space-y-2">
                <Label>Unidad</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.unitId || formData.unit}
                    onValueChange={(v) => {
                      if (v === "pza" || v === "kg") {
                        setFormData({ ...formData, unitId: "", unit: v });
                      } else {
                        setFormData({ ...formData, unitId: v });
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1 bg-slate-900/50 border-slate-800">
                      <SelectValue placeholder="Elegir..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-800 text-white">
                      <SelectItem value="pza">Pieza (pza)</SelectItem>
                      <SelectItem value="kg">Kilogramo (kg)</SelectItem>
                      {units.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.abbreviation})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const name = prompt("Nombre de la nueva unidad:");
                      const abbreviation = prompt("Abreviatura:");
                      if (name && abbreviation)
                        createUnitMutation.mutate({ name, abbreviation });
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Costo Unitario (MXN)</Label>
              <CognitiveInput
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) =>
                  setFormData({ ...formData, cost: e.target.value })
                }
                semanticType="price"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Precio Venta (MXN)</Label>
              <CognitiveInput
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                semanticType="price"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => createMutation.mutate(formData)}
            disabled={createMutation.isPending || !formData.name.trim()}
          >
            {createMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}{" "}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateSupplierDialog() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    phone: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/operations/suppliers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          name: data.name,
          contactInfo: { contact: data.contact },
        }),
      });
      if (!res.ok) throw new Error("Failed to create supplier");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/operations/suppliers"],
      });
      setOpen(false);
      setFormData({ name: "", contact: "", phone: "" });
      toast({
        title: "Proveedor creado",
        description: "El proveedor se ha registrado exitosamente.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el proveedor.",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          data-tour="suppliers-section"
        >
          <Plus className="w-4 h-4" /> Nuevo Proveedor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Proveedor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Razón Social</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ej. Distribuidora S.A."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => createMutation.mutate(formData)}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Crear Proveedor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreatePurchaseDialog({ purchases = [] }: { purchases: any[] }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Cart State with Unique ID for multiples
  const [cart, setCart] = useState<
    {
      uniqueId: string;
      productId: string;
      name: string;
      cost: number;
      quantity: number;
      note: string;
    }[]
  >([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");

  const [paymentMethod, setPaymentMethod] = useState<string>("transfer");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [logisticsMethod, setLogisticsMethod] = useState<string>("delivery");
  const [driverId, setDriverId] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [freightCost, setFreightCost] = useState<string | number>(0);

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["/api/finance/bank-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/finance/bank-accounts", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

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
    queryKey: ["/api/operations/suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/operations/suppliers", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["/api/hr/employees"],
    queryFn: async () => {
      const res = await fetch("/api/hr/employees", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open && logisticsMethod === "pickup",
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["/api/logistics/fleet/vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/logistics/fleet/vehicles", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open && logisticsMethod === "pickup",
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
        // Find all products in this group
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

        // Add all of them
        const newItems = groupProducts.map((p: any) => ({
          uniqueId: `${p.id}-${Date.now()}-${Math.random()}`,
          productId: p.id,
          name: p.name,
          cost: (p.cost || 0) / 100, // Cost is stored in cents
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
            uniqueId: `${item.id}-${Date.now()}`,
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

  const cartTotal = (cart as any[]).reduce((acc: number, i: any) => acc + (i.cost || 0) * (i.quantity || 0), 0);
  const totalWithFreight = cartTotal + (Number(freightCost) || 0);
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-tour="new-purchase-btn">
          <Plus className="w-4 h-4 mr-2" /> Nueva Orden
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Orden de Compra</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
          {/* Order Details */}
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

            <div className="grid grid-cols-2 gap-4">
              <CognitiveField
                label="Método de Pago"
                value={paymentMethod}
                semanticType="method"
              >
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="credit">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </CognitiveField>
              <CognitiveField
                label="Logística"
                value={logisticsMethod}
                semanticType="method"
              >
                <Select
                  value={logisticsMethod}
                  onValueChange={setLogisticsMethod}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="delivery">Entrega Puerta</SelectItem>
                    <SelectItem value="pickup">Recoger Parcela</SelectItem>
                  </SelectContent>
                </Select>
              </CognitiveField>
            </div>

            {paymentMethod === 'transfer' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label>Cuenta Bancaria (Origen)</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar Cuenta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((acc: any) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.bankName} - {acc.accountNumber.slice(-4)} ({new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(acc.balance / 100)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {logisticsMethod === "pickup" && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2">
                <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                  Datos de Recolección
                </p>
                <div className="space-y-2">
                  <Label className="text-xs">Conductor</Label>
                  <Select value={driverId} onValueChange={setDriverId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Elegir..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguno</SelectItem>
                      {drivers.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Vehículo</Label>
                  <Select value={vehicleId} onValueChange={setVehicleId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Elegir..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguno</SelectItem>
                      {vehicles.map((v: any) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.plate} - {v.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Costo Flete (Opcional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    className="h-8 text-xs"
                    value={freightCost}
                    onChange={(e) => setFreightCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cart Summary */}
          <div className="space-y-4 border-r pr-4">
            <Label>Items en Orden</Label>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {cart.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-10 italic">
                  Carrito vacío
                </p>
              )}
              {cart.map((item) => (
                <div
                  key={item.uniqueId}
                  className="p-2 bg-muted/30 rounded border text-sm space-y-2"
                >
                  <div className="flex justify-between font-medium">
                    <span>{item.name}</span>
                    <Trash2
                      className="w-4 h-4 text-destructive cursor-pointer opacity-50 hover:opacity-100"
                      onClick={() =>
                        setCart((c) =>
                          c.filter((x) => x.uniqueId !== item.uniqueId),
                        )
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Cant.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-7 text-xs"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.uniqueId, "quantity", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] flex items-center gap-1">
                        Costo Unit.
                        {Number(item.cost) === 0 && (
                          <span className="text-amber-500 font-bold animate-pulse">
                            ⚠️
                          </span>
                        )}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        className={cn(
                          "h-7 text-xs",
                          Number(item.cost) === 0 && "border-amber-500 bg-amber-500/5"
                        )}
                        value={item.cost}
                        onChange={(e) =>
                          updateItem(item.uniqueId, "cost", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Label className="text-[10px]">Variante / Nota</Label>
                      <span className="text-[8px] text-muted-foreground italic">(Calidad afecta rendimiento)</span>
                    </div>
                    <Input
                      className="h-7 text-xs border-dashed"
                      placeholder="ej. Calidad A, Extra maduro"
                      value={item.note}
                      onChange={(e) =>
                        updateItem(item.uniqueId, "note", e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1 pt-2 border-t font-mono text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>
              {Number(freightCost) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Flete (Logística):</span>
                  <span>{formatCurrency(Number(freightCost))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-1 border-t text-primary mt-1">
                <span>TOTAL</span>
                <span>{formatCurrency(totalWithFreight)}</span>
              </div>
            </div>

            {/* Operational Insight for Purchases */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 space-y-2 animate-in fade-in zoom-in-95 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                    Optimización de Abastecimiento
                  </span>
                </div>
                {cart.some(i => i.cost > 0 && dbProducts.find(p => p.id === i.productId)?.cost > (i.cost * 100)) && (
                  <Badge variant="outline" className="text-[8px] h-4 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    Oportunidad detectada
                  </Badge>
                )}
              </div>
              <div className="space-y-1.5 text-[10px] text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-blue-500" />
                  <p>
                    Impacto en caja:{" "}
                    <span className="text-slate-200">
                      -{formatCurrency(totalWithFreight)}
                    </span>
                  </p>
                </div>
                {cart.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                    <p>
                      Ahorro vs histórico:{" "}
                      <span className="text-emerald-400 font-bold">
                        {formatCurrency(cart.reduce((acc, i) => {
                          const p = dbProducts.find(prod => prod.id === i.productId);
                          const histCost = (p?.cost || 0) / 100;
                          return acc + (histCost > i.cost ? (histCost - i.cost) * i.quantity : 0);
                        }, 0))}
                      </span>
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-amber-500" />
                  <p>
                    Inventario proyectado:{" "}
                    <span className="text-slate-200">
                      +{Math.round(cart.reduce((acc, i) => acc + Number(i.quantity), 0) / 10 || 3)} días de operación
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Cognitive Summary Checklist */}
            {cart.length > 0 && (
              <div className="mt-6 p-4 bg-slate-900/40 rounded-xl border border-slate-800 space-y-3">
                <p className="text-xs font-bold uppercase tracking-tight text-muted-foreground flex items-center justify-between">
                  Resumen de la orden
                  {cart.some(i => Number(i.cost) === 0) && (
                    <Badge variant="destructive" className="h-4 text-[8px] animate-pulse">
                      Riesgo detectado
                    </Badge>
                  )}
                </p>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div className="text-muted-foreground">Proveedor:</div>
                  <div className="font-medium text-right truncate">
                    {suppliers.find(s => s.id === selectedSupplier)?.name || "No seleccionado"}
                  </div>
                  <div className="text-muted-foreground">Ítems:</div>
                  <div className="font-medium text-right">{cart.length}</div>
                  <div className="text-muted-foreground">Logística:</div>
                  <div className="font-medium text-right capitalize">
                    {logisticsMethod === "pickup" ? "Recolección" : "Entrega"}
                  </div>
                  <div className="text-muted-foreground font-bold">Total Final:</div>
                  <div className="font-bold text-right text-primary">
                    {formatCurrency(totalWithFreight)}
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800 flex gap-2 overflow-x-auto pb-1">
                  <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-[9px]", selectedSupplier ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-800 text-slate-500")}>
                    {selectedSupplier ? "✓ Proveedor OK" : "○ Sin proveedor"}
                  </div>
                  <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-[9px]", cart.length > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-800 text-slate-500")}>
                    {cart.length > 0 ? "✓ Items OK" : "○ Sin items"}
                  </div>
                  {cart.some(i => Number(i.cost) === 0) && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[9px]">
                      ⚠ Costo 0
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Catalog */}
          <div className="space-y-4">
            <Label>Catálogo de Insumos</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {filteredItems.map((item: any) => {
                const isLowStock = item.type === "product" && item.stock <= (item.minStock || 0);
                const isFrequent = item.type === "product" && (purchases as any[]).filter((p: any) => p.productId === item.id).length > 2;
                const avgPrice = item.type === "product" ? (item.cost || 0) : 0;
                const isGoodPrice = item.type === "product" && avgPrice > 0 && (purchases as any[]).some((p: any) => p.productId === item.id && (p.totalAmount / p.quantity) > avgPrice);

                return (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-2 border rounded hover:bg-muted cursor-pointer group"
                    onClick={() => addToCart(item)}
                  >
                    <div className="flex flex-col flex-1">
                      <div className="text-sm font-medium flex items-center gap-2">
                        {item.type === "group" && (
                          <PackageCheck className="w-3 h-3 text-blue-400" />
                        )}
                        {item.name}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.type === "group" && (
                          <span className="text-[10px] text-muted-foreground italic">
                            Grupo de items
                          </span>
                        )}
                        {item.type === "product" && (
                          <span className="text-[10px] text-muted-foreground">
                            {item.sku}
                          </span>
                        )}
                        {isLowStock && (
                          <Badge variant="outline" className="text-[8px] h-4 bg-red-500/10 text-red-500 border-red-500/20">
                            Stock bajo
                          </Badge>
                        )}
                        {isFrequent && (
                          <Badge variant="outline" className="text-[8px] h-4 bg-amber-500/10 text-amber-500 border-amber-500/20">
                            Compra frecuente
                          </Badge>
                        )}
                        {isGoodPrice && (
                          <Badge variant="outline" className="text-[8px] h-4 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                            Precio ↓
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "group-hover:bg-primary group-hover:text-primary-foreground shrink-0",
                        item.type === "group"
                          ? "border-blue-500/50 text-blue-500"
                          : "",
                      )}
                    >
                      {item.type === "group" ? "Agg. Grupo" : "Agg"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => purchaseMutation.mutate()}
            disabled={
              purchaseMutation.isPending ||
              cart.length === 0 ||
              !selectedSupplier
            }
            className="w-full lg:w-auto h-11 px-8"
          >
            {purchaseMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...
              </>
            ) : (
              "Confirmar Orden de Compra"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditLogisticsDialog({ purchase }: { purchase: any }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [logisticsMethod, setLogisticsMethod] = useState<string>(
    purchase.logisticsMethod || "delivery",
  );
  const [driverId, setDriverId] = useState<string>(purchase.driverId || "");
  const [vehicleId, setVehicleId] = useState<string>(purchase.vehicleId || "");
  const [freightCost, setFreightCost] = useState<string | number>(
    purchase.freightCost / 100 || 0,
  );

  const { data: drivers = [] } = useQuery({
    queryKey: ["/api/hr/employees"],
    queryFn: async () => {
      const res = await fetch("/api/hr/employees", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["/api/logistics/fleet/vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/logistics/fleet/vehicles", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const url = purchase.isBatch
        ? `/api/purchases/batch/${purchase.batchId}/logistics`
        : `/api/purchases/${purchase.id}/logistics`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          logisticsMethod,
          driverId: driverId === "none" ? null : driverId || null,
          vehicleId: vehicleId === "none" ? null : vehicleId || null,
          freightCost: Math.round(Number(freightCost) * 100),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      toast({
        title: "Logística Actualizada",
        description: "Los datos de envío se han guardado.",
      });
    },
    onError: () =>
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la logística.",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Modificar Logística" className="h-7 w-7 p-0">
          <Settings className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Logística de Compra</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Método de Logística</Label>
            <Select value={logisticsMethod} onValueChange={setLogisticsMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="delivery">Entrega Puerta</SelectItem>
                <SelectItem value="pickup">Recoger Parcela</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Conductor</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Elegir..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguno</SelectItem>
                {drivers.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Vehículo</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Elegir..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguno</SelectItem>
                {vehicles.map((v: any) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.plate} - {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Costo Flete (Opcional)</Label>
            <Input
              type="number"
              step="0.01"
              value={freightCost}
              onChange={(e) => setFreightCost(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>


        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PurchasePaymentDialog({ purchase }: { purchase: any }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<string>("transfer");
  const [bankAccountId, setBankAccountId] = useState<string>("");

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["/api/finance/bank-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/finance/bank-accounts", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      const url = purchase.isBatch
        ? `/api/purchases/batch/${purchase.batchId}/pay`
        : `/api/purchases/${purchase.id}/pay`;

      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          paymentMethod: method,
          bankAccountId: method === 'transfer' ? bankAccountId : null
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to pay");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/cash-registers"] });
      setOpen(false);
      toast({
        title: "Pago Registrado",
        description: "El gasto se ha reflejado en finanzas y los fondos han sido descontados.",
      });
    },
    onError: (err: any) =>
      toast({
        title: "Error de Pago",
        description: err.message || "No se pudo registrar el pago.",
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          title="Pagar"
          className="h-7 w-7 p-0 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border-blue-500/20"
        >
          <FileText className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pago de Compra</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Se registrará el egreso financiero y se descontarán los fondos del activo seleccionado.
          </p>

          <div className="space-y-2">
            <Label>Método de Pago</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transfer">Transferencia / Depósito</SelectItem>
                <SelectItem value="cash">Efectivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {method === 'transfer' && (
            <div className="space-y-2">
              <Label>Cuenta de Origen</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar Cuenta Bancaria" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((acc: any) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.bankName} - {acc.accountNumber.slice(-4)} ({new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(acc.balance / 100)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="pt-2">
            <div className="flex justify-between text-sm font-bold">
              <span>Total a Pagar:</span>
              <span>{new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(purchase.totalAmount / 100)}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => payMutation.mutate()}
            disabled={payMutation.isPending || (method === 'transfer' && !bankAccountId)}
          >
            {payMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
