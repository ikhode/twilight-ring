import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Beaker, TrendingDown, Target, Clock, AlertCircle } from "lucide-react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

const dummyOEE = [
    { name: 'Lun', value: 82 },
    { name: 'Mar', value: 85 },
    { name: 'Mie', value: 78 },
    { name: 'Jue', value: 91 },
    { name: 'Vie', value: 84 },
    { name: 'Sab', value: 88 },
];

const dummyCosts = [
    { name: 'Mat. Primas', value: 45000, color: '#3b82f6' },
    { name: 'Mano Obra', value: 15000, color: '#10b981' },
    { name: 'Energía', value: 5000, color: '#f59e0b' },
    { name: 'Mermas', value: 2500, color: '#ef4444' },
];

export function ManufacturingAnalytics() {
    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            {/* KPI Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Activity className="w-16 h-16 text-primary" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Target className="w-3 h-3 text-primary" /> Eficiencia General (OEE)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-white">84.2%</div>
                        <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-1">
                            <TrendingDown className="w-3 h-3 rotate-180" /> +3.1% vs semana pasada
                        </p>
                    </CardContent>
                    <div className="h-1 bg-slate-900 w-full"><div className="h-full bg-primary" style={{ width: '84%' }}></div></div>
                </Card>

                <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden relative group text-amber-500">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <AlertCircle className="w-16 h-16" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Beaker className="w-3 h-3" /> Tasa de Defectos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">1.4%</div>
                        <p className="text-[10px] text-red-400 font-bold flex items-center gap-1 mt-1">
                            Fuera de rango meta (&lt;1.0%)
                        </p>
                    </CardContent>
                    <div className="h-1 bg-slate-900 w-full"><div className="h-full bg-amber-500" style={{ width: '15%' }}></div></div>
                </Card>

                <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Clock className="w-16 h-16 text-emerald-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Clock className="w-3 h-3 text-emerald-500" /> Tiempo Ciclo Promedio
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-white">14.5 min</div>
                        <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-1">
                            Optimización de 2min lograda en Step #3
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-slate-950 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            Disponibilidad y Rendimiento (OEE Semanal)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dummyOEE}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="bg-slate-950 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold">Desglose de Costos de Producción</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dummyCosts} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px' }}
                                    cursor={{ fill: 'transparent' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {dummyCosts.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
