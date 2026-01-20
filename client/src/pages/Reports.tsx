import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    BarChart3,
    FileText,
    Download,
    Search,
    Filter,
    Box,
    RefreshCw,
    TrendingUp,
    DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDateRangePicker } from "@/components/ui/date-range-picker";

export default function Reports() {
    const [searchTerm, setSearchTerm] = useState("");
    const [reportType, setReportType] = useState("inventory");
    const [dateRange, setDateRange] = useState<any>({
        from: new Date(new Date().setDate(new Date().getDate() - 30)),
        to: new Date(),
    });

    // Fetch Inventory Movements
    const { data: movements, isLoading: loadingMovements } = useQuery({
        queryKey: ["/api/reports/inventory-movements"],
        queryFn: async () => {
            // Mock data for now until backend endpoint is ready
            const response = await fetch("/api/reports/inventory-movements").catch(() => null);
            if (response && response.ok) return response.json();

            // Fallback mock data if endpoint not ready
            return [
                { id: "1", date: new Date().toISOString(), type: "purchase", product: "Mezclilla 14oz", quantity: 500, before: 100, after: 600, reference: "PUR-1001" },
                { id: "2", date: new Date().toISOString(), type: "production", product: "Mezclilla 14oz", quantity: -50, before: 600, after: 550, reference: "TICKET-882" },
                { id: "3", date: new Date().toISOString(), type: "production", product: "Pantalón Jeans 32", quantity: 50, before: 0, after: 50, reference: "TICKET-882" },
                { id: "4", date: new Date().toISOString(), type: "sale", product: "Pantalón Jeans 32", quantity: -10, before: 50, after: 40, reference: "SALE-505" },
            ];
        }
    });

    const handleDownload = () => {
        alert("Generando reporte PDF...");
    };

    return (
        <div className="h-full flex flex-col gap-6 p-8 max-w-[1600px] mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white">Reportes Avanzados</h1>
                    <p className="text-slate-400">Trazabilidad completa de operaciones y finanzas</p>
                </div>
                <div className="flex items-center gap-2">
                    <CalendarDateRangePicker date={dateRange} setDate={setDateRange} />
                    <Button variant="outline" className="gap-2" onClick={() => window.location.reload()}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button className="gap-2" onClick={handleDownload}>
                        <Download className="w-4 h-4" /> Exportar
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <Card className="flex-1 bg-slate-900/50 border-slate-800 flex flex-col min-h-0">
                <CardHeader className="pb-0 border-b border-slate-800/50">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                        <Tabs defaultValue="inventory" className="w-full md:w-auto" onValueChange={setReportType}>
                            <TabsList className="bg-slate-950/50 border border-slate-800">
                                <TabsTrigger value="inventory" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-black">
                                    <Box className="w-4 h-4" /> Inventario & Kardex
                                </TabsTrigger>
                                <TabsTrigger value="sales" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-black">
                                    <TrendingUp className="w-4 h-4" /> Ventas
                                </TabsTrigger>
                                <TabsTrigger value="financial" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-black">
                                    <DollarSign className="w-4 h-4" /> Financiero
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    placeholder="Buscar producto, referencia..."
                                    className="pl-9 bg-slate-950 border-slate-800"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="icon">
                                <Filter className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 p-0 overflow-auto">
                    {/* Inventory Tab */}
                    {reportType === "inventory" && (
                        <Table>
                            <TableHeader className="bg-slate-950/50 sticky top-0 z-10">
                                <TableRow className="hover:bg-transparent border-slate-800">
                                    <TableHead className="text-slate-400">Fecha / Hora</TableHead>
                                    <TableHead className="text-slate-400">Tipo</TableHead>
                                    <TableHead className="text-slate-400">Referencia</TableHead>
                                    <TableHead className="text-slate-400">Producto</TableHead>
                                    <TableHead className="text-right text-slate-400">Entrada</TableHead>
                                    <TableHead className="text-right text-slate-400">Salida</TableHead>
                                    <TableHead className="text-right text-slate-400">Stock Final</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingMovements ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">Cargando movimientos...</TableCell>
                                    </TableRow>
                                ) : (
                                    movements?.map((m: any) => (
                                        <TableRow key={m.id} className="border-slate-800/50 hover:bg-slate-800/30">
                                            <TableCell className="font-mono text-slate-300">
                                                {format(new Date(m.date), "dd/MM/yyyy HH:mm", { locale: es })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`
                                                    ${m.type === 'purchase' ? 'border-emerald-500 text-emerald-500' : ''}
                                                    ${m.type === 'sale' ? 'border-blue-500 text-blue-500' : ''}
                                                    ${m.type === 'production' ? 'border-amber-500 text-amber-500' : ''}
                                                    capitalize
                                                `}>
                                                    {m.type === 'purchase' && 'Compra'}
                                                    {m.type === 'sale' && 'Venta'}
                                                    {m.type === 'production' && 'Producción'}
                                                    {m.type === 'adjustment' && 'Ajuste'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{m.reference}</TableCell>
                                            <TableCell className="font-medium text-white">{m.product}</TableCell>
                                            <TableCell className="text-right font-mono text-emerald-400">
                                                {m.quantity > 0 ? `+${m.quantity}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-red-400">
                                                {m.quantity < 0 ? `${m.quantity}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-slate-200">
                                                {m.afterStock}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}

                    {/* Placeholder for other tabs */}
                    {reportType !== "inventory" && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <FileText className="w-16 h-16 mb-4 opacity-20" />
                            <p>Reporte de {reportType} en construcción</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
