import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, Plus, Trash2, Settings2, Workflow, Save, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function BOMBuilder() {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [header, setHeader] = useState({
        productId: "",
        name: "",
        version: "1.0.0",
        isDefault: true
    });

    const [items, setItems] = useState<any[]>([]);
    const [routings, setRoutings] = useState<any[]>([]);

    const { data: products = [] } = useQuery<any[]>({
        queryKey: ["/api/inventory/products"],
        enabled: !!session?.access_token
    });

    const { data: workCenters = [] } = useQuery<any[]>({
        queryKey: ["/api/manufacturing/work-centers"],
        enabled: !!session?.access_token
    });

    const createMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await fetch("/api/manufacturing/bom", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Error saving BOM");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/bom"] });
            toast({ title: "BOM Guardado Correctamente", description: `${header.name} v${header.version} ya está disponible.` });
            // Reset form
            setItems([]);
            setRoutings([]);
            setHeader({ productId: "", name: "", version: "1.0.0", isDefault: true });
        }
    });

    const addItem = () => setItems([...items, { itemId: "", quantity: 1, scrapFactor: 0 }]);
    const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

    const addRouting = () => setRoutings([...routings, { stepName: "", workCenterId: "", orderIndex: routings.length + 1, estimatedDurationMinutes: 10 }]);
    const removeRouting = (idx: number) => setRoutings(routings.filter((_, i) => i !== idx));

    const handleSave = () => {
        if (!header.productId || !header.name) {
            toast({ variant: "destructive", title: "Datos Incompletos", description: "El producto y nombre son obligatorios." });
            return;
        }
        createMutation.mutate({ header, items, routings });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-slate-950 border-slate-800 shadow-xl">
                <CardHeader className="border-b border-slate-900">
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <Settings2 className="w-5 h-5" />
                        Configuración Maestra (BOM)
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                        <Label>Producto Final</Label>
                        <Select onValueChange={(v) => setHeader({ ...header, productId: v })} value={header.productId}>
                            <SelectTrigger className="bg-slate-900 border-slate-800">
                                <SelectValue placeholder="Seleccionar producto a fabricar..." />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-950 border-slate-800">
                                {products.map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>{p.name} (SKU: {p.sku || 'N/A'})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label>Nombre de Estructura</Label>
                            <Input
                                placeholder="Ej: Standard v2"
                                className="bg-slate-900 border-slate-800"
                                value={header.name}
                                onChange={(e) => setHeader({ ...header, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Versión</Label>
                            <Input
                                placeholder="1.0.0"
                                className="bg-slate-900 border-slate-800"
                                value={header.version}
                                onChange={(e) => setHeader({ ...header, version: e.target.value })}
                            />
                        </div>
                    </div>

                    <Tabs defaultValue="items" className="pt-4">
                        <TabsList className="bg-slate-900/50 p-1">
                            <TabsTrigger value="items" className="gap-2"><Layers className="w-4 h-4" /> Materiales</TabsTrigger>
                            <TabsTrigger value="routing" className="gap-2"><Workflow className="w-4 h-4" /> Pasos de Proceso</TabsTrigger>
                        </TabsList>

                        <TabsContent value="items" className="space-y-4 pt-4">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-xs font-bold text-slate-500 uppercase">Lista de Materiales</h4>
                                <Button size="sm" variant="ghost" className="h-7 text-[10px] text-primary" onClick={addItem}>
                                    <Plus className="w-3 h-3 mr-1" /> AGREGAR INSUMO
                                </Button>
                            </div>
                            {items.map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-end group animate-in slide-in-from-right-2">
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-[10px]">Insumo</Label>
                                        <Select
                                            value={item.itemId}
                                            onValueChange={(v) => {
                                                const newItems = [...items];
                                                newItems[idx].itemId = v;
                                                setItems(newItems);
                                            }}
                                        >
                                            <SelectTrigger className="bg-slate-900/50 border-slate-800 h-9">
                                                <SelectValue placeholder="SKU / Nombre" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-950 border-slate-800">
                                                {products.map((p: any) => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <Label className="text-[10px]">Cant. Base</Label>
                                        <Input
                                            type="number"
                                            className="h-9 bg-slate-900/50 border-slate-800"
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const newItems = [...items];
                                                newItems[idx].quantity = Number(e.target.value);
                                                setItems(newItems);
                                            }}
                                        />
                                    </div>
                                    <div className="w-20 space-y-1">
                                        <Label className="text-[10px]">Scrap %</Label>
                                        <Input
                                            type="number"
                                            className="h-9 bg-slate-900/50 border-slate-800"
                                            value={item.scrapFactor * 100}
                                            onChange={(e) => {
                                                const newItems = [...items];
                                                newItems[idx].scrapFactor = Number(e.target.value) / 100;
                                                setItems(newItems);
                                            }}
                                        />
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-500 hover:text-red-500" onClick={() => removeItem(idx)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            {items.length === 0 && (
                                <div className="py-12 border border-dashed border-slate-800 rounded-lg text-center text-slate-600">
                                    <p className="text-xs">Usa "Agregar Insumo" para construir la receta.</p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="routing" className="space-y-4 pt-4">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-xs font-bold text-slate-500 uppercase">Flujo de Producción</h4>
                                <Button size="sm" variant="ghost" className="h-7 text-[10px] text-primary" onClick={addRouting}>
                                    <Plus className="w-3 h-3 mr-1" /> AGREGAR ESTACIÓN
                                </Button>
                            </div>
                            <div className="space-y-3 relative">
                                {routings.map((r, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <Badge variant="outline" className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 border-primary/20 text-primary">{idx + 1}</Badge>
                                        <div className="flex-1 grid grid-cols-2 gap-2 bg-slate-900/30 p-3 rounded-lg border border-slate-800 group relative">
                                            <div className="space-y-1">
                                                <Label className="text-[10px]">Operación</Label>
                                                <Input
                                                    placeholder="Ej: Ensamblado"
                                                    className="h-8 bg-slate-950 border-slate-800 text-xs"
                                                    value={r.stepName}
                                                    onChange={(e) => {
                                                        const newR = [...routings];
                                                        newR[idx].stepName = e.target.value;
                                                        setRoutings(newR);
                                                    }}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px]">Work Center / Línea</Label>
                                                <Select
                                                    value={r.workCenterId}
                                                    onValueChange={(v) => {
                                                        const newR = [...routings];
                                                        newR[idx].workCenterId = v;
                                                        setRoutings(newR);
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 bg-slate-950 border-slate-800 text-xs">
                                                        <SelectValue placeholder="Máquina / Mesa" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-950 border-slate-800">
                                                        {workCenters.map((wc: any) => (
                                                            <SelectItem key={wc.id} value={wc.id}>{wc.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Button size="icon" variant="ghost" className="absolute -right-10 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-600 hover:text-red-500" onClick={() => removeRouting(idx)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>

                    <Button className="w-full h-12 gap-2 bg-primary hover:bg-primary/90 text-white font-bold" onClick={handleSave} disabled={createMutation.isPending}>
                        <Save className="w-5 h-5" /> GUARDAR ESTRUCTURA MAESTRA
                    </Button>
                </CardContent>
            </Card>

            <Card className="bg-slate-950 border-slate-800 flex flex-col items-center justify-center p-12 text-center text-slate-500 border-dashed border-2">
                <Workflow className="w-16 h-16 mb-6 opacity-10" />
                <h3 className="text-lg font-bold text-slate-400 mb-2">Visualización de Proceso</h3>
                <p className="max-w-xs text-xs leading-relaxed">
                    Define la estructura y los pasos a la izquierda para generar automáticamente el diagrama de flujo y cálculo de costos estimados.
                </p>
                {routings.length > 0 && (
                    <div className="mt-12 w-full space-y-6">
                        {routings.map((r, i) => (
                            <div key={i} className="flex flex-col items-center gap-4">
                                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm flex items-center justify-between text-left">
                                    <div>
                                        <p className="text-[10px] font-bold text-primary uppercase">Paso {i + 1}</p>
                                        <p className="text-sm font-bold text-slate-200">{r.stepName || 'Sin Nombre'}</p>
                                        <p className="text-[10px] text-slate-500">Center: {workCenters.find((w: any) => w.id === r.workCenterId)?.name || 'N/A'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-300">{r.estimatedDurationMinutes}min</p>
                                        <p className="text-[10px] text-slate-600">Est. Time</p>
                                    </div>
                                </div>
                                {i < routings.length - 1 && <ArrowRight className="w-6 h-6 text-slate-800 rotate-90" />}
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
