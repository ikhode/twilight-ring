import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDateRangePicker as DateRangePicker } from "@/components/ui/date-range-picker";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Download, Loader2, TrendingUp, DollarSign, CreditCard } from "lucide-react";
import { addDays, format, subDays } from "date-fns";
import { es } from "date-fns/locale";

export function SalesReports() {
    const { session } = useAuth();
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: subDays(new Date(), 30),
        to: new Date()
    });

    const queryParams = `?startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}`;

    // 1. Sales Trend & KPIs
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ["/api/sales/stats", queryParams],
        queryFn: async () => {
            const res = await fetch(`/api/sales/stats${queryParams}`, {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch stats");
            return res.json();
        },
        enabled: !!session?.access_token
    });

    // 2. Best Selling Items
    const { data: itemsAnalytics, isLoading: itemsLoading } = useQuery({
        queryKey: ["/api/sales/analytics/items", queryParams],
        queryFn: async () => {
            const res = await fetch(`/api/sales/analytics/items${queryParams}`, {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch item analytics");
            return res.json();
        },
        enabled: !!session?.access_token
    });

    // 3. Payment Methods
    const { data: paymentAnalytics, isLoading: paymentLoading } = useQuery({
        queryKey: ["/api/sales/analytics/payment-methods", queryParams],
        queryFn: async () => {
            const res = await fetch(`/api/sales/analytics/payment-methods${queryParams}`, {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch payment analytics");
            return res.json();
        },
        enabled: !!session?.access_token
    });

    // 4. Employee Performance
    const { data: employeeAnalytics, isLoading: employeeLoading } = useQuery({
        queryKey: ["/api/sales/by-employee", queryParams],
        queryFn: async () => {
            const res = await fetch(`/api/sales/by-employee${queryParams}`, {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch employee analytics");
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const handleExport = async () => {
        try {
            const res = await fetch(`/api/sales/export${queryParams}`, {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Export failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Ventas_${format(new Date(), "yyyy-MM-dd")}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            console.error(e);
        }
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    const formatCurrency = (val: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);

    if (statsLoading || itemsLoading || paymentLoading || employeeLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-display font-bold">Reportes de Ventas</h2>
                <div className="flex items-center gap-2">
                    <DateRangePicker
                        date={dateRange}
                        setDate={(range) => {
                            if (range?.from && range?.to) {
                                setDateRange({ from: range.from, to: range.to });
                            }
                        }}
                    />
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar CSV
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency((stats?.metrics[0]?.value || 0) / 100)}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.metrics[0]?.growth > 0 ? "+" : ""}{stats?.metrics[0]?.growth.toFixed(1)}% vs periodo anterior
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(((stats?.metrics[0]?.value || 0) / (stats?.metrics[0]?.count || 1)) / 100)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Transacciones</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{employeeAnalytics?.reduce((acc: number, curr: any) => acc + parseInt(curr.totalSales), 0) || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Tendencia de Ventas</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats?.days || []}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="date" fontSize={12} tickFormatter={(val) => format(new Date(val), 'dd MMM')} />
                                <YAxis fontSize={12} tickFormatter={(val) => `$${val}`} />
                                <Tooltip
                                    formatter={(val: number) => [`$${val.toFixed(2)}`, "Ventas"]}
                                    labelFormatter={(label) => format(new Date(label), 'dd MMMM yyyy')}
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                                />
                                <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top Productos</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={itemsAnalytics?.slice(0, 5) || []} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    fontSize={12}
                                    tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    formatter={(val: number) => [`$${(val / 100).toFixed(2)}`, "Ingresos"]}
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                                />
                                <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Métodos de Pago</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={paymentAnalytics || []}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="total"
                                    nameKey="method"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {(paymentAnalytics || []).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(val: number) => [`$${(val / 100).toFixed(2)}`, "Total"]}
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Rendimiento por Empleado</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={employeeAnalytics || []}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                <XAxis dataKey="employeeName" fontSize={12} />
                                <YAxis fontSize={12} tickFormatter={(val) => `$${val / 100}`} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    formatter={(val: number) => [`$${(val / 100).toFixed(2)}`, "Ventas"]}
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                                />
                                <Bar dataKey="totalRevenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
