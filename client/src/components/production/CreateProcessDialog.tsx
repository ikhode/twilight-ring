
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Package,
    Layers,
    Info,
    CheckCircle2,
    DollarSign,
    Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateProcessDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingProcess?: any | null;
    inventory: any[];
    onSave: (process: any) => void;
}

export function CreateProcessDialog({ open, onOpenChange, editingProcess, inventory, onSave }: CreateProcessDialogProps) {
    // Form State
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState("production");
    const [orderIndex, setOrderIndex] = useState(0);

    const [localInputId, setLocalInputId] = useState<string | null>(null);
    const [localOutputIds, setLocalOutputIds] = useState<string[]>([]);

    // Piecework State
    const [pieceworkEnabled, setPieceworkEnabled] = useState(false);
    const [pieceworkRate, setPieceworkRate] = useState<string>("0");
    const [pieceworkUnit, setPieceworkUnit] = useState("pza");
    const [paymentBasis, setPaymentBasis] = useState<"input" | "output">("output");

    // Location State
    const [originLocation, setOriginLocation] = useState("");
    const [targetLocation, setTargetLocation] = useState("");

    useEffect(() => {
        if (open) {
            if (editingProcess) {
                setName(editingProcess.name || "");
                setDescription(editingProcess.description || "");
                setType(editingProcess.type || "production");
                setOrderIndex(editingProcess.orderIndex || 0);

                setLocalInputId(editingProcess.workflowData?.inputProductId || null);
                setLocalOutputIds(editingProcess.workflowData?.outputProductIds || [editingProcess.workflowData?.outputProductId].filter(Boolean));

                setPieceworkEnabled(editingProcess.workflowData?.piecework?.enabled || false);
                setPieceworkRate(editingProcess.workflowData?.piecework?.rate ? (editingProcess.workflowData.piecework.rate / 100).toString() : "0");
                setPieceworkUnit(editingProcess.workflowData?.piecework?.unit || "pza");
                setPaymentBasis(editingProcess.workflowData?.piecework?.basis || "output");
                setOriginLocation(editingProcess.workflowData?.meta?.origin_location || "");
                setTargetLocation(editingProcess.workflowData?.meta?.target_location || "");
            } else {
                // Reset for new
                setName("");
                setDescription("");
                setType("production");
                setOrderIndex(0);
                setLocalInputId(null);
                setLocalOutputIds([]);
                setPieceworkEnabled(false);
                setPieceworkRate("0");
                setPieceworkUnit("pza");
                setPaymentBasis("output");
                setOriginLocation("");
                setTargetLocation("");
            }
        }
    }, [open, editingProcess]);

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        const payload = {
            id: editingProcess?.id,
            name,
            description,
            type,
            orderIndex: Number(orderIndex),
            workflowData: {
                ...(editingProcess?.workflowData || {}),
                inputProductId: localInputId,
                outputProductIds: localOutputIds,
                outputProductId: localOutputIds.length > 0 ? localOutputIds[0] : null,
                piecework: {
                    enabled: pieceworkEnabled,
                    rate: Math.round(Number(pieceworkRate || 0) * 100), // Convert back to cents
                    unit: pieceworkUnit,
                    basis: paymentBasis
                },
                meta: {
                    ...(editingProcess?.workflowData?.meta || {}),
                    origin_location: originLocation,
                    target_location: targetLocation
                }
            }
        };

        onSave(payload);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl bg-[#0b1121] border-slate-800 p-0 overflow-hidden gap-0">
                <div className="bg-slate-950/50 border-b border-slate-800 p-6">
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        {editingProcess ? <Settings2 className="w-5 h-5 text-blue-500" /> : <Package className="w-5 h-5 text-emerald-500" />}
                        {editingProcess ? `Configuración de ${editingProcess.name}` : "Definir Nuevo Proceso"}
                    </DialogTitle>
                </div>

                <div className="flex flex-col">
                    <div className="p-6">
                        <Tabs defaultValue="general" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-900 border border-slate-800 p-1.5 h-12 rounded-xl">
                                <TabsTrigger value="general" className="rounded-lg data-[state=active]:bg-slate-800 data-[state=active]:text-white text-xs font-bold uppercase tracking-wide">
                                    1. Información General
                                </TabsTrigger>
                                <TabsTrigger value="transform" className="rounded-lg data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 text-xs font-bold uppercase tracking-wide">
                                    2. Transformación
                                </TabsTrigger>
                                <TabsTrigger value="payment" className="rounded-lg data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-xs font-bold uppercase tracking-wide">
                                    3. Control & Pago
                                </TabsTrigger>
                            </TabsList>

                            {/* TAB: GENERAL */}
                            <TabsContent value="general" className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300 focus-visible:ring-0">
                                <div className="grid grid-cols-12 gap-6">
                                    <div className="col-span-8 space-y-2">
                                        <Label className="text-xs uppercase text-slate-500 font-bold">Nombre del Proceso</Label>
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            placeholder="Ej. Pelado Manual, Empaque, etc."
                                            className="bg-slate-950 border-slate-800 h-11 text-base font-medium focus:border-primary/50 transition-colors"
                                        />
                                    </div>
                                    <div className="col-span-4 space-y-2">
                                        <Label className="text-xs uppercase text-slate-500 font-bold">Orden (1, 2, 3...)</Label>
                                        <Input
                                            type="number"
                                            value={orderIndex}
                                            onChange={(e) => setOrderIndex(Number(e.target.value))}
                                            className="bg-slate-950 border-slate-800 h-11"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-slate-500 font-bold">Tipo de Operación</Label>
                                    <Select value={type} onValueChange={setType}>
                                        <SelectTrigger className="bg-slate-950 border-slate-800 h-11">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="production">Producción / Transformación</SelectItem>
                                            <SelectItem value="quality">Inspección de Calidad</SelectItem>
                                            <SelectItem value="logistics">Recepción / Despacho</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-slate-500 font-bold">Instrucciones Operativas</Label>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Detalla los pasos clave para el operario..."
                                        className="bg-slate-950 border-slate-800 resize-none min-h-[120px] leading-relaxed"
                                    />
                                </div>
                            </TabsContent>

                            {/* TAB: TRANSFORMATION */}
                            <TabsContent value="transform" className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300 focus-visible:ring-0">
                                {/* CONSUME */}
                                <div className="bg-slate-900/30 rounded-xl border border-dashed border-slate-800 p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-blue-500" />
                                        <Label className="text-xs font-black uppercase text-slate-400">Consume Inventario (Input)</Label>
                                    </div>
                                    <Select value={localInputId || "none"} onValueChange={(v) => setLocalInputId(v === "none" ? null : v)}>
                                        <SelectTrigger className="bg-slate-950 border-slate-800 h-11">
                                            <SelectValue placeholder="Seleccionar insumo..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">-- Sin consumo directo --</SelectItem>
                                            {inventory
                                                .filter((i: any) => i.isProductionInput === true)
                                                .map((i: any) => (
                                                    <SelectItem key={i.id} value={i.id}>
                                                        {i.name}
                                                        {i.category && <span className="text-[10px] opacity-50 ml-2">({i.category?.name || i.category})</span>}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* PRODUCE */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-emerald-500" />
                                            <Label className="text-xs font-black uppercase text-slate-400">Genera Inventario (Output)</Label>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] border-slate-800 text-slate-500">Selección Múltiple</Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                                        {inventory
                                            .filter((i: any) => i.isProductionOutput === true)
                                            .map((i: any) => {
                                                const isSelected = localOutputIds.includes(i.id);
                                                return (
                                                    <div
                                                        key={i.id}
                                                        onClick={() => setLocalOutputIds(prev => prev.includes(i.id) ? prev.filter(x => x !== i.id) : [...prev, i.id])}
                                                        className={cn(
                                                            "relative p-3 rounded-xl border cursor-pointer transition-all hover:translate-x-1 flex items-center justify-between group",
                                                            isSelected
                                                                ? "bg-emerald-950/20 border-emerald-500/50 shadow-[0_0_15px_-5px_rgba(16,185,129,0.1)]"
                                                                : "bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                                                        )}
                                                    >
                                                        <span className={cn("text-xs font-medium transition-colors", isSelected ? "text-emerald-300" : "text-slate-400 group-hover:text-slate-200")}>{i.name}</span>
                                                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                                    </div>
                                                )
                                            })}
                                    </div>
                                </div>

                                {/* LOCATIONS */}
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/50">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-2">
                                            <Layers className="w-3 h-3 text-blue-500" /> Ubicación Origen (Sugerida)
                                        </Label>
                                        <Input
                                            value={originLocation}
                                            onChange={(e) => setOriginLocation(e.target.value)}
                                            placeholder="Ej: Patio de Recepción"
                                            className="bg-slate-950 border-slate-800 h-10 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-2">
                                            <Package className="w-3 h-3 text-emerald-500" /> Ubicación Destino (Sugerida)
                                        </Label>
                                        <Input
                                            value={targetLocation}
                                            onChange={(e) => setTargetLocation(e.target.value)}
                                            placeholder="Ej: Cestas de Producción"
                                            className="bg-slate-950 border-slate-800 h-10 text-xs"
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* TAB: PAYMENT & SETTINGS */}
                            <TabsContent value="payment" className="space-y-6 pt-1 animate-in fade-in zoom-in-95 duration-300 focus-visible:ring-0">
                                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6 relative overflow-hidden">
                                    {/* Visual Accent */}
                                    <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                                    {/* Header Switch */}
                                    <div className="flex items-start justify-between relative z-10">
                                        <div className="space-y-1">
                                            <Label className="flex items-center gap-2 text-sm font-bold text-white">
                                                <DollarSign className="w-4 h-4 text-emerald-500" />
                                                Pago por Destajo / Rendimiento
                                            </Label>
                                            <p className="text-xs text-slate-400 max-w-[80%]">
                                                Habilita la generación automática de tickets de pago para empleados basados en la producción reportada.
                                            </p>
                                        </div>
                                        <Switch checked={pieceworkEnabled} onCheckedChange={setPieceworkEnabled} className="data-[state=checked]:bg-emerald-500" />
                                    </div>

                                    {pieceworkEnabled && (
                                        <div className="space-y-6 animate-in slide-in-from-top-2 duration-300 pt-4 border-t border-slate-800/50">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase font-bold text-slate-500">Tarifa por Unidad ($)</Label>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={pieceworkRate}
                                                            onChange={(e) => setPieceworkRate(e.target.value)}
                                                            className="bg-slate-950 border-slate-800 pl-8 text-lg font-mono text-emerald-400"
                                                        />
                                                        <span className="absolute left-3 top-3 text-emerald-600 font-bold">$</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase font-bold text-slate-500">Unidad de Medida</Label>
                                                    <Select value={pieceworkUnit} onValueChange={setPieceworkUnit}>
                                                        <SelectTrigger className="bg-slate-950 border-slate-800 h-11 font-medium">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="pza">Pieza (Unitario)</SelectItem>
                                                            <SelectItem value="kg">Kilogramo (Peso)</SelectItem>
                                                            <SelectItem value="lote">Lote Completo</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-[10px] uppercase font-bold text-slate-500">Base del Cálculo (Gatillo)</Label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div
                                                        onClick={() => setPaymentBasis("output")}
                                                        className={cn(
                                                            "border rounded-xl p-4 cursor-pointer transition-all flex flex-col items-center text-center gap-2 hover:bg-slate-900",
                                                            paymentBasis === "output"
                                                                ? "bg-emerald-950/20 border-emerald-500/50 text-emerald-400"
                                                                : "bg-slate-950 border-slate-800 text-slate-500"
                                                        )}
                                                    >
                                                        <span className="font-bold text-sm">Output Generado</span>
                                                        <span className="text-[10px] opacity-70 leading-tight">Pagar por cada unidad de producto bueno terminado.</span>
                                                    </div>
                                                    <div
                                                        onClick={() => setPaymentBasis("input")}
                                                        className={cn(
                                                            "border rounded-xl p-4 cursor-pointer transition-all flex flex-col items-center text-center gap-2 hover:bg-slate-900",
                                                            paymentBasis === "input"
                                                                ? "bg-blue-950/20 border-blue-500/50 text-blue-400"
                                                                : "bg-slate-950 border-slate-800 text-slate-500"
                                                        )}
                                                    >
                                                        <span className="font-bold text-sm">Input Procesado</span>
                                                        <span className="text-[10px] opacity-70 leading-tight">Pagar por cada unidad de materia prima procesada.</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="button" onClick={() => handleSubmit()} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6">
                            {editingProcess ? "Guardar Cambios" : "Crear Proceso"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
