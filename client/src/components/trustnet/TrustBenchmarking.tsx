import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Scale } from "lucide-react";

interface BenchmarkData {
    industry: string;
    metricName: string;
    averageValue: number;
    period: string;
}

export function TrustBenchmarking({ currentMetrics }: { currentMetrics: Record<string, number> }) {
    const { session } = useAuth();

    const { data: benchmarks = [], isLoading } = useQuery<BenchmarkData[]>({
        queryKey: ["/api/trust/benchmarks"],
        queryFn: async () => {
            const res = await fetch("/api/trust/benchmarks", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!session?.access_token
    });

    if (isLoading) return <div className="animate-pulse h-64 bg-slate-800/20 rounded-xl" />;

    // Prepare data for chart
    const chartData = Object.entries(currentMetrics).map(([key, value]) => {
        const benchmark = benchmarks.find(b => b.metricName === key);
        return {
            name: key.replace(/_/g, ' ').toUpperCase(),
            Tuya: value,
            Industria: benchmark?.averageValue || 0
        };
    }).filter(d => d.Industria > 0);

    return (
        <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-primary" />
                    Análisis de Benchmarking
                </CardTitle>
                <CardDescription>
                    Tu desempeño comparado con el promedio de la industria
                </CardDescription>
            </CardHeader>
            <CardContent>
                {chartData.length > 0 ? (
                    <div className="h-80 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#94a3b8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Legend iconType="circle" />
                                <Bar dataKey="Tuya" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="Industria" fill="#64748b" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <p className="text-center py-12 text-slate-500 text-sm italic">
                        No hay suficientes datos de industria para realizar la comparativa.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
