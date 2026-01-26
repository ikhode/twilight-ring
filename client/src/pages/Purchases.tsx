import { useState } from "react";
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
    Plus, Trash2,
    Search, Truck, CheckCircle, ShoppingBag, Loader2,
    Activity
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/shared/DataTable";
import { CognitiveInput, CognitiveField } from "@/components/cognitive";

export default function Purchases() {
    const { session } = useAuth();
    const formatCurrency = (amount: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

    const { data: purchases = [], isLoading } = useQuery({
        queryKey: ["/api/purchases"],
        queryFn: async () => {
            const res = await fetch("/api/purchases", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        },
        enabled: !!session?.access_token
    });

    // Calculate Metrics
    const pendingCount = purchases.filter((p: any) => p.deliveryStatus === "pending").length;
    const receivedCount = purchases.filter((p: any) => p.deliveryStatus === "received").length;
    const totalSpent = purchases.reduce((acc: number, p: any) => acc + (p.totalAmount || 0), 0) / 100;

    return (
        <AppLayout title="Compras" subtitle="Gestión de abastecimiento y proveedores">
            <div className="space-y-6">
                {/* Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Órdenes Pendientes</p>
                                <div className="text-2xl font-bold">{pendingCount}</div>
                            </div>
                            <div className="p-3 bg-amber-500/10 rounded-full text-amber-500"><Truck className="w-6 h-6" /></div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Recibidas / Cerradas</p>
                                <div className="text-2xl font-bold">{receivedCount}</div>
                            </div>
                            <div className="p-3 bg-green-500/10 rounded-full text-green-500"><CheckCircle className="w-6 h-6" /></div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Gasto Total (Histórico)</p>
                                <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
                            </div>
                            <div className="p-3 bg-blue-500/10 rounded-full text-blue-500"><ShoppingBag className="w-6 h-6" /></div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Órdenes de Compra</CardTitle>
                            <div className="flex gap-2">
                                <CreateProductDialog />
                                <CreateSupplierDialog />
                                <CreatePurchaseDialog />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <PurchasesTable data={purchases} />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

function PurchasesTable({ data }: { data: any[] }) {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const formatCurrency = (amount: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

    const receiveMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/purchases/${id}/receive`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to receive item");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
            queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
            toast({ title: "Insumos Recibidos", description: "El inventario se ha actualizado." });
        },
        onError: () => toast({ title: "Error", description: "No se pudo recibir.", variant: "destructive" })
    });

    const payMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/purchases/${id}/pay`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to pay");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
            queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
            toast({ title: "Pago Registrado", description: "El gasto se ha reflejado en finanzas." });
        },
        onError: () => toast({ title: "Error", description: "No se pudo registrar el pago.", variant: "destructive" })
    });

    const columns = [
        { key: "date", header: "Fecha", render: (it: any) => new Date(it.date).toLocaleDateString() },
        { key: "supplier", header: "Proveedor", render: (it: any) => it.supplier?.name || "N/A" },
        {
            key: "product", header: "Insumo / Cant.", render: (it: any) => (
                <div className="flex flex-col">
                    <span className="font-medium">{it.product?.name || "Desconocido"}</span>
                    <span className="text-xs text-muted-foreground">{it.quantity} {it.product?.unit || 'u.'}</span>
                </div>
            )
        },
        {
            key: "logistics", header: "Logística", render: (it: any) => (
                <div className="flex flex-col text-xs">
                    <span className="capitalize font-medium">{it.logisticsMethod === 'pickup' ? 'Recolección' : 'Entrega'}</span>
                    {it.driver && <span className="text-muted-foreground">Cond: {it.driver.name}</span>}
                    {it.vehicle && <span className="text-muted-foreground">Veh: {it.vehicle.plate}</span>}
                    {it.freightCost > 0 && <span className="text-blue-600 font-bold">Flete: {formatCurrency(it.freightCost / 100)}</span>}
                </div>
            )
        },
        { key: "total", header: "Total", render: (it: any) => <span className="font-bold">{formatCurrency((it.totalAmount || 0) / 100)}</span> },
        {
            key: "status", header: "Estado", render: (it: any) => (
                <div className="flex flex-col gap-1">
                    <Badge variant={it.paymentStatus === 'paid' ? 'default' : 'secondary'} className="w-fit text-[10px] px-1 h-4">
                        {it.paymentStatus === 'paid' ? 'Pagado' : 'Por Pagar'}
                    </Badge>
                    <Badge
                        variant="outline"
                        className={cn(
                            "w-fit text-[10px] px-1 h-4",
                            it.deliveryStatus === 'received' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}
                    >
                        {it.deliveryStatus === 'received' ? 'Recibido' : 'Pendiente'}
                    </Badge>
                </div>
            )
        },
        {
            key: "actions", header: "", render: (it: any) => (
                <div className="flex gap-1">
                    {it.deliveryStatus === 'pending' && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200" onClick={() => receiveMutation.mutate(it.id)} disabled={receiveMutation.isPending}>
                            Recibir
                        </Button>
                    )}
                    {it.paymentStatus === 'pending' && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200" onClick={() => payMutation.mutate(it.id)} disabled={payMutation.isPending}>
                            Pagar
                        </Button>
                    )}
                    <EditLogisticsDialog purchase={it} />
                </div>
            )
        }
    ];

    return <DataTable columns={columns} data={data} />;
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
        category: "Materia Prima",
        productType: "purchase", // Default
        stock: 0,
        unit: "",
        price: 0,
        cost: 0,
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/inventory/products", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    ...data,
                    productType: hasInventory ? "purchase" : "service_cost", // Tag as service if no inventory
                    price: Math.round(data.price * 100),
                    cost: Math.round(data.cost * 100)
                })
            });
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
            setOpen(false);
            toast({ title: hasInventory ? "Producto creado" : "Concepto creado", description: "Listo para usar en compras." });
            setFormData({ name: "", sku: "", category: "Materia Prima", productType: "purchase", stock: 0, unit: "pza", price: 0, cost: 0 });
        },
        onError: () => toast({ title: "Error", variant: "destructive" })
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
                    <DialogTitle>{hasInventory ? "Alta de Producto" : "Alta de Concepto"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Nombre / Descripción</Label>
                        <CognitiveInput
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ej. Papel Bond o Servicio Limpieza"
                            semanticType="name"
                        />
                    </div>
                    {hasInventory && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>SKU</Label>
                                <CognitiveInput
                                    value={formData.sku}
                                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                    semanticType="sku"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Unidad</Label>
                                <Input value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} />
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Costo Unitario (MXN)</Label>
                            <CognitiveInput
                                type="number"
                                value={formData.cost}
                                onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                                semanticType="price"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Precio Venta (MXN)</Label>
                            <CognitiveInput
                                type="number"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                semanticType="price"
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending}>{createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Guardar</Button>
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
    const [formData, setFormData] = useState({ name: "", contact: "", phone: "" });

    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const res = await fetch("/api/operations/suppliers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    name: data.name,
                    contactInfo: { contact: data.contact },
                })
            });
            if (!res.ok) throw new Error("Failed to create supplier");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/operations/suppliers"] });
            setOpen(false);
            setFormData({ name: "", contact: "", phone: "" });
            toast({ title: "Proveedor creado", description: "El proveedor se ha registrado exitosamente." });
        },
        onError: () => {
            toast({ variant: "destructive", title: "Error", description: "No se pudo crear el proveedor." });
        }
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
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
                        <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Distribuidora S.A." />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending}>
                        {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Crear Proveedor
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function CreatePurchaseDialog() {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    // Cart State with Unique ID for multiples
    const [cart, setCart] = useState<{
        uniqueId: string;
        productId: string;
        name: string;
        cost: number;
        quantity: number;
        note: string
    }[]>([]);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSupplier, setSelectedSupplier] = useState<string>("");

    const [paymentMethod, setPaymentMethod] = useState<string>("transfer");
    const [logisticsMethod, setLogisticsMethod] = useState<string>("delivery");
    const [driverId, setDriverId] = useState<string>("");
    const [vehicleId, setVehicleId] = useState<string>("");
    const [freightCost, setFreightCost] = useState<number>(0);

    const { data: dbProducts = [] } = useQuery({
        queryKey: ["/api/inventory/products"],
        queryFn: async () => {
            const res = await fetch("/api/inventory/products", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: open
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ["/api/operations/suppliers"],
        queryFn: async () => {
            const res = await fetch("/api/operations/suppliers", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: open
    });

    const { data: drivers = [] } = useQuery({
        queryKey: ["/api/hr/employees"],
        queryFn: async () => {
            const res = await fetch("/api/hr/employees", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: open && logisticsMethod === "pickup"
    });

    const { data: vehicles = [] } = useQuery({
        queryKey: ["/api/logistics/fleet/vehicles"],
        queryFn: async () => {
            const res = await fetch("/api/logistics/fleet/vehicles", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: open && logisticsMethod === "pickup"
    });

    const purchaseMutation = useMutation({
        mutationFn: async () => {
            const items = cart.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                cost: Math.round(item.cost * 100),
                notes: item.note || undefined
            }));
            const res = await fetch("/api/purchases", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({
                    items,
                    supplierId: selectedSupplier,
                    paymentMethod,
                    logisticsMethod,
                    driverId: driverId || null,
                    vehicleId: vehicleId || null,
                    freightCost: Math.round(freightCost * 100),
                    status: 'pending'
                })
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
            toast({ title: "Orden Registrada", description: "La orden de compra ha sido creada." });
        },
        onError: () => toast({ variant: "destructive", title: "Error", description: "Falló el registro." })
    });

    const addToCart = (product: any) => {
        setCart(prev => {
            // Allow multiple!
            return [...prev, {
                uniqueId: `${product.id}-${Date.now()}`,
                productId: product.id,
                name: product.name,
                cost: (product.cost || 0) / 100,
                quantity: 1,
                note: ""
            }];
        });
    };

    const updateItem = (uniqueId: string, field: string, val: any) => {
        setCart(prev => prev.map(i => i.uniqueId === uniqueId ? { ...i, [field]: val } : i));
    };

    const cartTotal = cart.reduce((acc, i) => acc + (i.cost * i.quantity), 0);
    const totalWithFreight = cartTotal + freightCost;
    const formatCurrency = (amount: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

    const filteredProducts = Array.isArray(dbProducts) ? dbProducts.filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase())) : [];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Nueva Orden</Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Nueva Orden de Compra</DialogTitle></DialogHeader>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
                    {/* Catalog */}
                    <div className="space-y-4 border-r pr-4">
                        <Label>Catálogo de Insumos</Label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar..." className="pl-8" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                            {filteredProducts.map(p => (
                                <div key={p.id} className="flex justify-between items-center p-2 border rounded hover:bg-muted cursor-pointer group" onClick={() => addToCart(p)}>
                                    <div className="text-sm font-medium">{p.name}</div>
                                    <Badge variant="outline" className="group-hover:bg-primary group-hover:text-primary-foreground">Agg</Badge>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Order Details */}
                    <div className="space-y-4 border-r pr-4">
                        <CognitiveField label="Proveedor" value={selectedSupplier} semanticType="category">
                            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                <SelectContent>{suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </CognitiveField>

                        <div className="grid grid-cols-2 gap-4">
                            <CognitiveField label="Método de Pago" value={paymentMethod} semanticType="method">
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="transfer">Transferencia</SelectItem>
                                        <SelectItem value="cash">Efectivo</SelectItem>
                                        <SelectItem value="credit">Crédito</SelectItem>
                                    </SelectContent>
                                </Select>
                            </CognitiveField>
                            <CognitiveField label="Logística" value={logisticsMethod} semanticType="method">
                                <Select value={logisticsMethod} onValueChange={setLogisticsMethod}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="delivery">Entrega Puerta</SelectItem>
                                        <SelectItem value="pickup">Recoger Parcela</SelectItem>
                                    </SelectContent>
                                </Select>
                            </CognitiveField>
                        </div>

                        {logisticsMethod === 'pickup' && (
                            <div className="p-3 bg-muted/50 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2">
                                <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Datos de Recolección</p>
                                <div className="space-y-2">
                                    <Label className="text-xs">Conductor</Label>
                                    <Select value={driverId} onValueChange={setDriverId}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Elegir..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Ninguno</SelectItem>
                                            {drivers.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Vehículo</Label>
                                    <Select value={vehicleId} onValueChange={setVehicleId}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Elegir..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Ninguno</SelectItem>
                                            {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate} - {v.model}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Costo Flete (Opcional)</Label>
                                    <Input type="number" className="h-8 text-xs" value={freightCost} onChange={e => setFreightCost(parseFloat(e.target.value) || 0)} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Cart Summary */}
                    <div className="space-y-4">
                        <Label>Items en Orden</Label>
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                            {cart.length === 0 && <p className="text-sm text-muted-foreground text-center py-10 italic">Carrito vacío</p>}
                            {cart.map(item => (
                                <div key={item.uniqueId} className="p-2 bg-muted/30 rounded border text-sm space-y-2">
                                    <div className="flex justify-between font-medium">
                                        <span>{item.name}</span>
                                        <Trash2 className="w-4 h-4 text-destructive cursor-pointer opacity-50 hover:opacity-100" onClick={() => setCart(c => c.filter(x => x.uniqueId !== item.uniqueId))} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label className="text-[10px]">Cant.</Label>
                                            <Input type="number" className="h-7 text-xs" value={item.quantity} onChange={e => updateItem(item.uniqueId, 'quantity', parseInt(e.target.value) || 1)} />
                                        </div>
                                        <div>
                                            <Label className="text-[10px]">Costo Unit.</Label>
                                            <Input type="number" className="h-7 text-xs" value={item.cost} onChange={e => updateItem(item.uniqueId, 'cost', parseFloat(e.target.value) || 0)} />
                                        </div>
                                    </div>
                                    <div>
                                        <Input
                                            className="h-7 text-xs border-dashed"
                                            placeholder="Variante / Nota (ej. Calidad A)"
                                            value={item.note}
                                            onChange={e => updateItem(item.uniqueId, 'note', e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-1 pt-2 border-t font-mono text-sm">
                            <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(cartTotal)}</span></div>
                            {freightCost > 0 && <div className="flex justify-between text-muted-foreground"><span>Flete (Logística):</span><span>{formatCurrency(freightCost)}</span></div>}
                            <div className="flex justify-between font-bold text-lg pt-1 border-t text-primary mt-1">
                                <span>TOTAL</span>
                                <span>{formatCurrency(totalWithFreight)}</span>
                            </div>
                        </div>

                        {/* Operational Insight for Purchases */}
                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 space-y-2 animate-in fade-in zoom-in-95">
                            <div className="flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Optimización de Abastecimiento</span>
                            </div>
                            <div className="space-y-1.5 text-[10px] text-slate-400">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-blue-500" />
                                    <p>Impacto programado: <span className="text-slate-200">-{formatCurrency(totalWithFreight)}</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={() => purchaseMutation.mutate()} disabled={purchaseMutation.isPending || cart.length === 0 || !selectedSupplier} className="w-full lg:w-auto h-11 px-8">
                        {purchaseMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</> : "Confirmar Orden de Compra"}
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

    const [logisticsMethod, setLogisticsMethod] = useState<string>(purchase.logisticsMethod || "delivery");
    const [driverId, setDriverId] = useState<string>(purchase.driverId || "");
    const [vehicleId, setVehicleId] = useState<string>(purchase.vehicleId || "");
    const [freightCost, setFreightCost] = useState<number>(purchase.freightCost / 100 || 0);

    const { data: drivers = [] } = useQuery({
        queryKey: ["/api/hr/employees"],
        queryFn: async () => {
            const res = await fetch("/api/hr/employees", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: open
    });

    const { data: vehicles = [] } = useQuery({
        queryKey: ["/api/logistics/fleet/vehicles"],
        queryFn: async () => {
            const res = await fetch("/api/logistics/fleet/vehicles", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: open
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/purchases/${purchase.id}/logistics`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({
                    logisticsMethod,
                    driverId: driverId === "none" ? null : (driverId || null),
                    vehicleId: vehicleId === "none" ? null : (vehicleId || null),
                    freightCost: Math.round(freightCost * 100),
                })
            });
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        onSuccess: () => {
            setOpen(false);
            queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
            toast({ title: "Logística Actualizada", description: "Los datos de envío se han guardado." });
        },
        onError: () => toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la logística." })
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2">
                    Editar
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
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="delivery">Entrega Puerta</SelectItem>
                                <SelectItem value="pickup">Recoger Parcela</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Conductor</Label>
                        <Select value={driverId} onValueChange={setDriverId}>
                            <SelectTrigger><SelectValue placeholder="Elegir..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Ninguno</SelectItem>
                                {drivers.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Vehículo</Label>
                        <Select value={vehicleId} onValueChange={setVehicleId}>
                            <SelectTrigger><SelectValue placeholder="Elegir..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Ninguno</SelectItem>
                                {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate} - {v.model}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Costo Flete (Opcional)</Label>
                        <Input type="number" value={freightCost} onChange={e => setFreightCost(parseFloat(e.target.value) || 0)} />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                        {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
