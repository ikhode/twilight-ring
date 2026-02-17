import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Search, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export function LabelsManager() {
    const [searchQuery, setSearchQuery] = useState("");
    const [printQueue, setPrintQueue] = useState<any[]>([]);
    const [labelSize, setLabelSize] = useState("standard"); // standard (2x1), small (1x1)

    // Mock search for products (In real app, use useQuery with search param)
    const { data: products = [] } = useQuery({
        queryKey: ["/api/inventory/products", searchQuery],
        queryFn: async () => {
            if (!searchQuery) return [];
            const res = await fetch("/api/inventory/products"); // We should filter server side ideally
            if (!res.ok) return [];
            const all = await res.json();
            return all.filter((p: any) =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
            ).slice(0, 5);
        },
        enabled: searchQuery.length > 2
    });

    const addToQueue = (product: any) => {
        setPrintQueue(prev => [...prev, { ...product, quantity: 1 }]);
        setSearchQuery("");
    };

    const removeFromQueue = (index: number) => {
        setPrintQueue(prev => prev.filter((_, i) => i !== index));
    };

    const updateQuantity = (index: number, qty: number) => {
        setPrintQueue(prev => prev.map((p, i) => i === index ? { ...p, quantity: qty } : p));
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            <Card className="print:hidden">
                <CardHeader>
                    <CardTitle>Configuración de Impresión</CardTitle>
                    <CardDescription>Selecciona productos y formato de etiqueta.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <Label>Buscar Producto</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Escribe nombre o SKU..."
                                    className="pl-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {products.length > 0 && searchQuery.length > 2 && (
                                    <div className="absolute top-full left-0 right-0 z-50 bg-popover border rounded-md shadow-md mt-1 overflow-hidden">
                                        {products.map((p: any) => (
                                            <div
                                                key={p.id}
                                                className="p-2 hover:bg-muted cursor-pointer flex justify-between items-center"
                                                onClick={() => addToQueue(p)}
                                            >
                                                <span className="font-medium text-sm">{p.name}</span>
                                                <span className="text-xs text-muted-foreground">{p.sku}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="w-[200px] space-y-2">
                            <Label>Tamaño de Etiqueta</Label>
                            <Select value={labelSize} onValueChange={setLabelSize}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="standard">Estándar (5x2.5cm)</SelectItem>
                                    <SelectItem value="small">Pequeña (2.5x2.5cm)</SelectItem>
                                    <SelectItem value="a4">Hoja A4 (30 por pág)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {printQueue.length > 0 && (
                        <div className="border rounded-lg p-4 space-y-2">
                            <div className="flex justify-between items-center mb-2">
                                <Label>Cola de Impresión</Label>
                                <Button variant="ghost" size="sm" onClick={() => setPrintQueue([])} className="text-destructive h-auto p-0">
                                    Vaciar Todo
                                </Button>
                            </div>
                            {printQueue.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-muted/30 p-2 rounded">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-1 rounded border">
                                            <QRCodeSVG value={item.sku || item.id} size={32} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">{item.sku}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            min="1"
                                            className="w-16 h-8"
                                            value={item.quantity}
                                            onChange={(e) => updateQuantity(idx, parseInt(e.target.value))}
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => removeFromQueue(idx)}>
                                            <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            <div className="pt-4 flex justify-end">
                                <Button onClick={handlePrint} className="gap-2">
                                    <Printer className="w-4 h-4" />
                                    Imprimir {printQueue.reduce((acc, i) => acc + i.quantity, 0)} Etiquetas
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* PRINT PREVIEW AREA (Visible only in Print Mode) */}
            <div className="hidden print:block print:w-full print:absolute print:top-0 print:left-0 print:bg-white print:z-[9999]">
                <div className="grid grid-cols-3 gap-4 p-4">
                    {printQueue.flatMap((item) =>
                        Array.from({ length: item.quantity }).map((_, i) => ({ ...item, uniqueKey: `${item.id}-${i}` }))
                    ).map((item: any) => (
                        <div key={item.uniqueKey} className="border border-black p-2 flex flex-col items-center justify-center text-center h-[120px] break-inside-avoid">
                            <p className="text-[10px] font-bold truncate w-full mb-1">{item.name.substring(0, 20)}</p>
                            <QRCodeSVG value={item.sku || item.id} size={64} level="M" />
                            <div className="flex justify-between w-full px-1 mt-1">
                                <p className="text-[8px] font-mono">{item.sku}</p>
                                <p className="text-[8px] font-bold">${(item.price / 100).toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                @media print {
                    @page { margin: 0.5cm; }
                    body * { visibility: hidden; }
                    .print\\:block, .print\\:block * { visibility: visible; }
                    .print\\:block { position: absolute; left: 0; top: 0; width: 100%; }
                }
            `}</style>
        </div>
    )
}
