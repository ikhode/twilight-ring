
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import {
    Download,
    FileText,
    TrendingUp,
    DollarSign,
    Package,
    Calendar,
    Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CalendarDateRangePicker } from "@/components/ui/date-range-picker";

export default function Reports() {
    const { toast } = useToast();
    const [dateRange, setDateRange] = useState<any>({
        from: new Date(new Date().setDate(new Date().getDate() - 30)),
        to: new Date(),
    });

    // Mock data - In a real app, this would come from the API
    const salesData = [
        { name: "Lun", ventas: 4000, costo: 2400 },
        { name: "Mar", ventas: 3000, costo: 1398 },
        { name: "Mie", ventas: 2000, costo: 9800 },
        { name: "Jue", ventas: 2780, costo: 3908 },
        { name: "Vie", ventas: 1890, costo: 4800 },
        { name: "Sab", ventas: 2390, costo: 3800 },
        { name: "Dom", ventas: 3490, costo: 4300 },
    ];

    const categoryData = [
        { name: "Bebidas", value: 400 },
        { name: "Snacks", value: 300 },
        { name: "Limpieza", value: 300 },
        { name: "Otros", value: 200 },
    ];

    const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

    const handleExport = (format: "pdf" | "excel") => {
        toast({
            title: "Exportando Reporte",
            description: `Generando archivo ${format.toUpperCase()}... Por favor espere.`,
        });
        // Simulate API call
        setTimeout(() => {
            toast({
                title: "Éxito",
                description: "El reporte se ha descargado correctamente.",
            });
        }, 1500);
    };

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
                        Reportes Avanzados
                    </h2>
                    <p className="text-muted-foreground">
                        Análisis detallado de ventas, inventario y finanzas.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <CalendarDateRangePicker date={dateRange} setDate={setDateRange} />
                    <Button onClick={() => handleExport("pdf")} variant="outline">
                        <FileText className="mr-2 h-4 w-4" />
                        PDF
                    </Button>
                    <Button onClick={() => handleExport("excel")} variant="secondary">
                        <Download className="mr-2 h-4 w-4" />
                        Excel
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="sales" className="space-y-4">
                <TabsList className="bg-black/40 border border-white/10 p-1">
                    <TabsTrigger value="sales" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-300">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Ventas
                    </TabsTrigger>
                    <TabsTrigger value="inventory" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-300">
                        <Package className="mr-2 h-4 w-4" />
                        Inventario
                    </TabsTrigger>
                    <TabsTrigger value="financial" className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-300">
                        <DollarSign className="mr-2 h-4 w-4" />
                        Financiero
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="sales" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Ventas Totales
                                </CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">$45,231.89</div>
                                <p className="text-xs text-muted-foreground">
                                    +20.1% del mes pasado
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Transacciones
                                </CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">+2350</div>
                                <p className="text-xs text-muted-foreground">
                                    +180.1% del mes pasado
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">$19.25</div>
                                <p className="text-xs text-muted-foreground">
                                    +19% del mes pasado
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Tasa de Conversión
                                </CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">4.5%</div>
                                <p className="text-xs text-muted-foreground">
                                    +2.5% del mes pasado
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4 bg-black/40 border-white/5 backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle>Resumen de Ventas</CardTitle>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <ResponsiveContainer width="100%" height={350}>
                                    <LineChart data={salesData}>
                                        <XAxis
                                            dataKey="name"
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `$${value}`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1f1f1f', border: 'none', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="ventas"
                                            stroke="#8884d8"
                                            strokeWidth={2}
                                            activeDot={{ r: 8 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="costo"
                                            stroke="#82ca9d"
                                            strokeWidth={2}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                        <Card className="col-span-3 bg-black/40 border-white/5 backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle>Ventas por Categoría</CardTitle>
                                <CardDescription>
                                    Distribución de ingresos por tipo de producto.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={350}>
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1f1f1f', border: 'none', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="mt-4 flex justify-center gap-4">
                                    {categoryData.map((entry, index) => (
                                        <div key={entry.name} className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                            <span className="text-xs text-muted-foreground">{entry.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="inventory" className="space-y-4">
                    <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle>Movimientos de Inventario</CardTitle>
                            <CardDescription>Entradas y salidas recientes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-10 text-muted-foreground">
                                Funcionalidad de reportes de inventario detallado próximamente.
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="financial" className="space-y-4">
                    <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle>Estado Financiero</CardTitle>
                            <CardDescription>Pérdidas, ganancias y proyecciones.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-10 text-muted-foreground">
                                Funcionalidad de reportes financieros detallado próximamente.
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
