import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RotateCcw, CheckCircle2, AlertTriangle, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

export function InventoryCountManager() {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedLocationId, setSelectedLocationId] = useState<string>("default");
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Data Fetching ---

    const { data: locations = [] } = useQuery({
        queryKey: ["/api/inventory/locations"],
        queryFn: async () => {
            const res = await fetch("/api/inventory/locations", {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!session?.access_token,
    });

    const { data: products = [], isLoading: isLoadingProducts } = useQuery({
        queryKey: ["/api/inventory/products"],
        queryFn: async () => {
            const headers: Record<string, string> = {
                "Authorization": `Bearer ${session?.access_token}`
            };
            const activeOrgId = localStorage.getItem("nexus_active_org");
            if (activeOrgId) headers["x-organization-id"] = activeOrgId;

            const res = await fetch("/api/inventory/products", { headers });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!session?.access_token,
    });

    // --- Computed State ---

    const inventoryDiff = useMemo(() => {
        return products.map((product: any) => {
            const currentStock = product.stock || 0;
            const countedStock = counts[product.id] !== undefined ? counts[product.id] : currentStock;
            const difference = countedStock - currentStock;
            const valueDiff = difference * (product.cost || 0) / 100;

            return {
                ...product,
                currentStock,
                countedStock,
                difference,
                valueDiff,
                status: difference === 0 ? "match" : difference > 0 ? "surplus" : "deficit"
            };
        }).filter((item: any) => item.isArchived !== true); // Hide archived items
    }, [products, counts]);

    const totalValueDiff = inventoryDiff.reduce((acc: number, item: any) => acc + item.valueDiff, 0);

    // --- Handlers ---

    const handleCountChange = (productId: string, value: string) => {
        const numValue = parseInt(value);
        if (!isNaN(numValue)) {
            setCounts(prev => ({ ...prev, [productId]: numValue }));
        }
    };

    const reconcileMutation = useMutation({
        mutationFn: async () => {
            const adjustments = inventoryDiff
                .filter((item: any) => item.difference !== 0)
                .map((item: any) => ({
                    productId: item.id,
                    counted: item.countedStock
                }));

            if (adjustments.length === 0) return;

            const res = await fetch("/api/inventory/counts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    locationId: selectedLocationId === "default" ? null : selectedLocationId,
                    items: adjustments
                })
            });

            if (!res.ok) throw new Error("Failed to submit inventory count");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
            setCounts({});
            toast({
                title: "Inventario Reconciliado",
                description: "Los stocks han sido actualizados correctamente.",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "No se pudo procesar la reconciliación.",
                variant: "destructive"
            });
        }
    });

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
        }).format(amount);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Reconciliación de Inventario</CardTitle>
                            <CardDescription>
                                Ingrese el conteo físico real para ajustar las existencias del sistema.
                            </CardDescription>
                        </div>
                        <div className="flex gap-4 items-center">
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground uppercase font-bold">Diferencia de Valor</p>
                                <p className={cn(
                                    "text-lg font-bold font-mono",
                                    totalValueDiff > 0 ? "text-emerald-500" : totalValueDiff < 0 ? "text-red-500" : "text-slate-400"
                                )}>
                                    {totalValueDiff > 0 ? "+" : ""}{formatCurrency(totalValueDiff)}
                                </p>
                            </div>
                            <Button
                                onClick={() => reconcileMutation.mutate()}
                                disabled={reconcileMutation.isPending || inventoryDiff.every((i: any) => i.difference === 0)}
                            >
                                {reconcileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" />
                                Aplicar Ajustes
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 mb-6">
                        <div className="w-[300px]">
                            <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar Ubicación" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">Almacén Principal (Default)</SelectItem>
                                    {locations.map((loc: any) => (
                                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="outline" onClick={() => setCounts({})}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reiniciar Conteo
                        </Button>
                    </div>

                    <div className="rounded-md border border-slate-800">
                        <Table>
                            <TableHeader className="bg-slate-900/50">
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead className="text-center">Stock Sistema</TableHead>
                                    <TableHead className="text-center w-[150px]">Conteo Físico</TableHead>
                                    <TableHead className="text-center">Diferencia</TableHead>
                                    <TableHead className="text-right">Impacto ($)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingProducts ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : inventoryDiff.map((item: any) => (
                                    <TableRow key={item.id} className={cn(
                                        item.difference !== 0 ? "bg-slate-900/20" : ""
                                    )}>
                                        <TableCell className="font-medium">
                                            {item.name}
                                            {item.category && <p className="text-[10px] text-muted-foreground">{item.category}</p>}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                                        <TableCell className="text-center font-mono">{item.currentStock}</TableCell>
                                        <TableCell className="p-2">
                                            <Input
                                                type="number"
                                                className={cn(
                                                    "text-center font-bold",
                                                    item.difference !== 0 ? "border-amber-500/50 bg-amber-500/10 text-amber-500" : ""
                                                )}
                                                value={counts[item.id] !== undefined ? counts[item.id] : item.currentStock}
                                                onChange={(e) => handleCountChange(item.id, e.target.value)}
                                                onFocus={(e) => e.target.select()}
                                            />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {item.difference === 0 ? (
                                                <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Exacto
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className={cn(
                                                    "font-mono",
                                                    item.difference > 0 ? "text-blue-400 border-blue-400/20 bg-blue-400/10" : "text-red-400 border-red-400/20 bg-red-400/10"
                                                )}>
                                                    {item.difference > 0 ? "+" : ""}{item.difference}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {item.valueDiff !== 0 && (
                                                <span className={item.valueDiff > 0 ? "text-emerald-500" : "text-red-500"}>
                                                    {formatCurrency(item.valueDiff)}
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
