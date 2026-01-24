import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
    ShoppingCart, Plus, Minus, Trash2, CreditCard,
    Search, Package, Truck, CheckCircle, ShoppingBag, Loader2
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

export default function Purchases() {
    const { session } = useAuth();
    const formatCurrency = (amount: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

    const { data: purchases = [], isLoading } = useQuery({
        queryKey: ["/api/purchases"],
        queryFn: async () => {
            const res = await fetch("/api/purchases", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!session?.access_token
    });

    // Calculate Metrics
    const pendingCount = purchases.filter((p: any) => p.deliveryStatus === "pending").length;
    const receivedCount = purchases.filter((p: any) => p.deliveryStatus === "received").length;
    const totalSpent = purchases.reduce((acc: number, p: any) => acc + p.totalAmount, 0) / 100; // cents to unit

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
            queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] }); // Update stock
            toast({ title: "Recepción Exitosa", description: "Inventario actualizado correctamente." });
        },
        onError: () => {
            toast({ title: "Error", description: "No se pudo procesar la recepción.", variant: "destructive" });
        }
    });

    const columns = [
        { key: "date", header: "Fecha", render: (it: any) => new Date(it.date).toLocaleDateString() },
        { key: "supplier", header: "Proveedor", render: (it: any) => it.supplier?.name || "N/A" },
        {
            key: "product", header: "Producto", render: (it: any) => (
                <div className="flex flex-col">
                    <span className="font-medium">{it.product?.name || "Desconocido"}</span>
                    <span className="text-xs text-muted-foreground">Cant: {it.quantity}</span>
                </div>
            )
        },
        { key: "total", header: "Total", render: (it: any) => formatCurrency(it.totalAmount / 100) },
        {
            key: "status", header: "Estado", render: (it: any) => (
                <div className="flex gap-2">
                    <Badge variant={it.paymentStatus === 'paid' ? 'default' : 'secondary'}>{it.paymentStatus}</Badge>
                    <Badge variant={it.deliveryStatus === 'received' ? 'success' : 'outline'} className={cn(it.deliveryStatus === 'pending' && "bg-amber-100 text-amber-700 hover:bg-amber-200")}>
                        {it.deliveryStatus}
                    </Badge>
                </div>
            )
        },
        {
            key: "actions", header: "Acciones", render: (it: any) => (
                it.deliveryStatus === 'pending' && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => receiveMutation.mutate(it.id)} disabled={receiveMutation.isPending}>
                        Recibir
                    </Button>
                )
            )
        }
    ];

    return <DataTable columns={columns} data={data} />;
}

// ... Existing CreateSupplierDialog ...
// ... Imports and other code ...

function CreateProductDialog() {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        category: "Materia Prima",
        productType: "purchase",
        stock: 0,
        unit: "pza",
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
            setFormData({ name: "", sku: "", category: "Materia Prima", productType: "purchase", stock: 0, unit: "pza", price: 0, cost: 0 });
            toast({ title: "Producto Creado", description: "El producto se ha registrado correctamente." });
        },
        onError: () => {
            toast({ title: "Error", description: "No se pudo crear el producto.", variant: "destructive" });
        }
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Nuevo Insumo
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Alta de Nuevo Insumo / Producto</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Nombre</Label>
                        <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="productType" className="text-right">Tipo</Label>
                        <Select onValueChange={(v) => setFormData({ ...formData, productType: v })} defaultValue={formData.productType}>
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
                    {(formData.productType === "both" || formData.productType === "purchase") && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="cost" className="text-right">Costo Est.</Label>
                            <Input id="cost" type="number" step="0.01" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })} className="col-span-3" />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending}>
                        {createMutation.isPending ? "Guardando..." : "Confirmar Registro"}
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
    const [formData, setFormData] = useState({ name: "", contact: "", phone: "" });

    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const res = await fetch("/api/operations/suppliers", { // Fixed endpoint to existing one
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

// Renamed and adapted to be a Dialog
function CreatePurchaseDialog() {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    // Cart logic moved inside
    const [cart, setCart] = useState<{ id: number; name: string; cost: number; quantity: number }[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSupplier, setSelectedSupplier] = useState<string>("");

    const { data: dbProducts = [] } = useQuery({
        queryKey: ["/api/inventory/products"],
        queryFn: async () => (await fetch("/api/inventory/products", { headers: { Authorization: `Bearer ${session?.access_token}` } })).json(),
        enabled: open
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ["/api/operations/suppliers"],
        queryFn: async () => (await fetch("/api/operations/suppliers", { headers: { Authorization: `Bearer ${session?.access_token}` } })).json(),
        enabled: open
    });

    const purchaseMutation = useMutation({
        mutationFn: async () => {
            const items = cart.map(item => ({
                productId: item.id,
                quantity: item.quantity,
                cost: Math.round(item.cost * 100)
            }));
            const res = await fetch("/api/purchases", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ items, supplierId: selectedSupplier, status: 'pending' })
            });
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        onSuccess: () => {
            setOpen(false);
            setCart([]);
            setSelectedSupplier("");
            queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
            toast({ title: "Orden Registrada", description: "La orden de compra ha sido creada." });
        },
        onError: () => toast({ variant: "destructive", title: "Error", description: "Falló el registro." })
    });

    const addToCart = (product: any) => {
        setCart(prev => {
            if (prev.find(i => i.id === product.id)) return prev;
            return [...prev, { id: product.id, name: product.name, cost: (product.cost || 0) / 100, quantity: 1 }];
        });
    };

    const updateItem = (id: number, field: string, val: number) => {
        setCart(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i));
    };

    const total = cart.reduce((acc, i) => acc + (i.cost * i.quantity), 0);
    const formatCurrency = (amount: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

    const filteredProducts = Array.isArray(dbProducts) ? dbProducts.filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase())) : [];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Nueva Orden</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Nueva Orden de Compra</DialogTitle></DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-4 border-r pr-4">
                        <Label>Catálogo de Insumos</Label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar..." className="pl-8" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {filteredProducts.map(p => (
                                <div key={p.id} className="flex justify-between items-center p-2 border rounded hover:bg-muted cursor-pointer" onClick={() => addToCart(p)}>
                                    <div className="text-sm font-medium">{p.name}</div>
                                    <Badge variant="outline">{p.stock}</Badge>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Proveedor</Label>
                            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                <SelectContent>{suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Items en Orden</Label>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {cart.map(item => (
                                    <div key={item.id} className="p-2 bg-muted/30 rounded border text-sm space-y-2">
                                        <div className="flex justify-between font-medium"><span>{item.name}</span> <Trash2 className="w-4 h-4 text-destructive cursor-pointer" onClick={() => setCart(c => c.filter(x => x.id !== item.id))} /></div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label className="text-[10px]">Cant.</Label>
                                                <Input type="number" className="h-7 text-xs" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value))} />
                                            </div>
                                            <div>
                                                <Label className="text-[10px]">Costo Unit.</Label>
                                                <Input type="number" className="h-7 text-xs" value={item.cost} onChange={e => updateItem(item.id, 'cost', parseFloat(e.target.value))} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between font-bold text-lg pt-2 border-t">
                                <span>Total Estimado</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={() => purchaseMutation.mutate()} disabled={purchaseMutation.isPending || cart.length === 0 || !selectedSupplier}>
                        {purchaseMutation.isPending ? "Procesando..." : "Confirmar Orden"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
