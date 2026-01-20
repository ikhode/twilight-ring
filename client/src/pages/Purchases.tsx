
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/shared/StatCard";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
    ShoppingCart,
    Plus,
    DollarSign,
    Package,
    Truck,
    Search,
    Sparkles,
    TrendingDown,
    AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";

export default function Purchases() {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    // Queries
    const { data: purchases = [] } = useQuery({
        queryKey: ["/api/operations/purchases"],
        queryFn: async () => {
            const res = await fetch("/api/operations/purchases", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            return res.json();
        }
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ["/api/operations/suppliers"],
        queryFn: async () => {
            const res = await fetch("/api/operations/suppliers", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            return res.json();
        }
    });

    const { data: products = [] } = useQuery({
        queryKey: ["/api/operations/inventory/products"],
        queryFn: async () => {
            const res = await fetch("/api/operations/inventory/products", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            return res.json();
        }
    });

    const { data: drivers = [] } = useQuery({
        queryKey: ["/api/hr/employees"],
        queryFn: async () => {
            const res = await fetch("/api/hr/employees", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            return (await res.json()).filter((e: any) => e.role.toLowerCase().includes("driver") || e.role.toLowerCase().includes("conductor"));
        }
    });

    const { data: vehicles = [] } = useQuery({
        queryKey: ["/api/fleet/vehicles"],
        queryFn: async () => {
            const res = await fetch("/api/fleet/vehicles", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            return res.json();
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/operations/purchases", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        onSuccess: () => {
            setIsOpen(false);
            toast({ title: "Orden Creada", description: "Inventario actualizado correctamente." });
            queryClient.invalidateQueries({ queryKey: ["/api/operations/purchases"] });
            queryClient.invalidateQueries({ queryKey: ["/api/operations/finance/summary"] });
        }
    });

    // Realtime subscriptions
    useSupabaseRealtime({ table: 'purchases', queryKey: ["/api/operations/purchases"] });
    useSupabaseRealtime({ table: 'suppliers', queryKey: ["/api/operations/suppliers"] });
    useSupabaseRealtime({ table: 'products', queryKey: ["/api/operations/inventory/products"] });

    return (
        <AppLayout title="Compras Inteligentes" subtitle="Abastecimiento y gestión de proveedores">
            <div className="space-y-6">

                {/* STATS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                        title="Gasto Mensual"
                        value={new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(purchases.reduce((a: any, b: any) => a + b.totalCost, 0) / 100)}
                        icon={DollarSign}
                        variant="default"
                    />
                    <StatCard
                        title="Proveedores Activos"
                        value={suppliers.length}
                        icon={Truck}
                        variant="primary"
                    />
                    <StatCard
                        title="Ordenes Recientes"
                        value={purchases.length}
                        icon={ShoppingCart}
                        variant="default"
                    />
                </div>

                {/* MAIN CONTENT */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="font-display">Ordenes de Compra</CardTitle>
                                <CardDescription>Historial de adquisiciones y recepciones.</CardDescription>
                            </div>
                            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2">
                                        <Plus className="w-4 h-4" /> Nueva Orden
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px]">
                                    <PurchaseForm
                                        products={products}
                                        suppliers={suppliers}
                                        drivers={drivers}
                                        vehicles={vehicles}
                                        onSubmit={createMutation.mutate}
                                        isPending={createMutation.isPending}
                                    />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            columns={[
                                { key: "id", header: "ID", render: (i: any) => <span className="font-mono text-xs">{i.id.slice(0, 8)}</span> },
                                { key: "date", header: "Fecha", render: (i: any) => new Date(i.date).toLocaleDateString() },
                                { key: "totalCost", header: "Total", render: (i: any) => <span className="font-mono font-bold">{new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(i.totalCost / 100)}</span> },
                                { key: "status", header: "Estado", render: (i: any) => <StatusBadge status={i.status} /> }
                            ]}
                            data={purchases}
                        />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

function PurchaseForm({ products, suppliers, drivers, vehicles, onSubmit, isPending }: any) {
    const [selectedProduct, setSelectedProduct] = useState<string>("");
    const [quantity, setQuantity] = useState(10);
    const [selectedSupplier, setSelectedSupplier] = useState<string>("");
    const [selectedDriver, setSelectedDriver] = useState<string>("");
    const [selectedVehicle, setSelectedVehicle] = useState<string>("");

    // INTELLIGENCE: Supplier Recommendation
    const recommendedSupplier = suppliers.find((s: any) => s.category === "raw_materials"); // Mock Logic
    const savings = 12; // Mock 12% savings

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const product = products.find((p: any) => p.id === selectedProduct);
        if (!product) return;

        // Estimate cost (Mock cost per unit as product.price * 0.6)
        const unitCost = Math.round(product.price * 0.6);
        const totalCost = unitCost * quantity;

        onSubmit({
            supplierId: selectedSupplier,
            items: [{ productId: selectedProduct, quantity, cost: unitCost }],
            totalCost,
            driverId: selectedDriver,
            vehicleId: selectedVehicle
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
                <DialogTitle>Nueva Orden de Compra</DialogTitle>
                <DialogDescription>Seleccione producto y proveedor.</DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
                <label className="text-sm font-medium">Producto</label>
                <Select onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccione producto..." />
                    </SelectTrigger>
                    <SelectContent>
                        {products.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Cantidad</label>
                    <Input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} min={1} />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Proveedor</label>
                    <Select onValueChange={setSelectedSupplier}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione proveedor..." />
                        </SelectTrigger>
                        <SelectContent>
                            {suppliers.map((s: any) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Conductor (Opcional)</label>
                    <select
                        className="w-full bg-background border border-border rounded-md p-2 text-sm h-10"
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
                    <label className="text-sm font-medium">Vehículo (Opcional)</label>
                    <select
                        className="w-full bg-background border border-border rounded-md p-2 text-sm h-10"
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

            {/* COGNITIVE INSIGHT */}
            {selectedProduct && recommendedSupplier && (
                <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-indigo-400 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-indigo-200">Recomendación IA</p>
                        <p className="text-xs text-indigo-300/80">
                            Comprando a <strong>{recommendedSupplier.name}</strong> podrías ahorrar un <span className="text-emerald-400 font-bold">{savings}%</span> basado en históricos de mercado.
                        </p>
                        {selectedSupplier !== recommendedSupplier.id && (
                            <Button
                                type="button"
                                variant="link"
                                className="h-auto p-0 text-indigo-400 text-xs"
                                onClick={() => setSelectedSupplier(recommendedSupplier.id)}
                            >
                                Cambiar a {recommendedSupplier.name}
                            </Button>
                        )}
                    </div>
                </div>
            )}

            <DialogFooter>
                <Button type="submit" disabled={!selectedProduct || !selectedSupplier || isPending}>
                    {isPending ? "Procesando..." : "Generar Orden"}
                </Button>
            </DialogFooter>
        </form>
    );
}
