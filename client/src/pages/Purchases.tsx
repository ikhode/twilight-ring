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
    Search, Package, TrendingDown, Store
} from "lucide-react";

interface CartItem {
    id: number;
    name: string;
    cost: number;
    quantity: number;
}

export default function Purchases() {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSupplier, setSelectedSupplier] = useState<string>("");
    const [notes, setNotes] = useState("");

    const { data: dbProducts = [] } = useQuery({
        queryKey: ["/api/operations/inventory/products"],
        queryFn: async () => {
            const res = await fetch("/api/operations/inventory/products", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ["/api/operations/suppliers"],
        queryFn: async () => {
            const res = await fetch("/api/operations/suppliers", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const purchaseMutation = useMutation({
        mutationFn: async () => {
            const items = cart.map(item => ({
                productId: item.id,
                quantity: item.quantity,
                cost: Math.round(item.cost * 100) // Convert to cents
            }));

            const res = await fetch("/api/operations/purchases", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ items, supplierId: selectedSupplier, notes })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: "Failed" }));
                throw new Error(err.message || "Failed");
            }
            return res.json();
        },
        onSuccess: () => {
            setCart([]);
            setSelectedSupplier("");
            setNotes("");
            queryClient.invalidateQueries({ queryKey: ["/api/operations/inventory/products"] });
            queryClient.invalidateQueries({ queryKey: ["/api/operations/finance/summary"] });

            toast({
                title: "Compra Registrada",
                description: "Inventario actualizado y gasto registrado."
            });
        },
        onError: (err) => {
            toast({
                title: "Error",
                description: err.message || "No se pudo registrar la compra.",
                variant: "destructive"
            });
        }
    });

    const filteredProducts = Array.isArray(dbProducts) ? dbProducts.filter(
        (p: any) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    ) : [];

    const addToCart = (product: any) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.id === product.id);
            if (existing) return prev; // Don't duplicate, user should increase qty
            return [...prev, {
                id: product.id,
                name: product.name,
                cost: (product.cost || 0) / 100, // Default to system cost
                quantity: 1
            }];
        });
    };

    const updateItem = (id: number, field: keyof CartItem, value: number) => {
        setCart(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const removeFromCart = (id: number) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const total = cart.reduce((acc, item) => acc + (item.cost * item.quantity), 0);

    return (
        <AppLayout title="Compras" subtitle="Adquisición de inventario">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="font-display">Catálogo de Productos</CardTitle>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar insumo..."
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
                                        className="p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all text-left group"
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                                            <Package className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                                        </div>
                                        <p className="font-medium text-sm truncate">{product.name}</p>
                                        <p className="text-xs text-muted-foreground font-mono">Stock: {product.stock}</p>
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
                                Orden de Compra
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Proveedor</label>
                                <select
                                    className="w-full bg-background border border-border rounded-md p-2 text-sm"
                                    value={selectedSupplier}
                                    onChange={(e) => setSelectedSupplier(e.target.value)}
                                >
                                    <option value="">Seleccionar Proveedor...</option>
                                    {suppliers.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                {cart.map((item) => (
                                    <div key={item.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <span className="font-medium text-sm">{item.name}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-destructive"
                                                onClick={() => removeFromCart(item.id)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] text-muted-foreground">Cant.</label>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="outline" size="icon" className="h-6 w-6"
                                                        onClick={() => updateItem(item.id, 'quantity', Math.max(1, item.quantity - 1))}
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </Button>
                                                    <span className="text-sm font-mono w-6 text-center">{item.quantity}</span>
                                                    <Button
                                                        variant="outline" size="icon" className="h-6 w-6"
                                                        onClick={() => updateItem(item.id, 'quantity', item.quantity + 1)}
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-muted-foreground">Costo Unit.</label>
                                                <div className="relative">
                                                    <span className="absolute left-1 top-1 text-xs">$</span>
                                                    <Input
                                                        type="number"
                                                        className="h-8 pl-4 text-xs"
                                                        value={item.cost}
                                                        onChange={(e) => updateItem(item.id, 'cost', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {cart.length === 0 && (
                                    <p className="text-center text-sm text-muted-foreground py-4">Agregue productos a la orden</p>
                                )}
                            </div>

                            <Separator />
                            <div className="flex justify-between items-center font-bold text-lg">
                                <span>Total</span>
                                <span className="font-mono text-primary">
                                    {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(total)}
                                </span>
                            </div>

                            <Input
                                placeholder="Notas de compra..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />

                            <Button
                                className="w-full"
                                onClick={() => purchaseMutation.mutate()}
                                disabled={purchaseMutation.isPending || cart.length === 0}
                            >
                                <CreditCard className="w-4 h-4 mr-2" />
                                {purchaseMutation.isPending ? "Procesando..." : "Confirmar Compra"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
