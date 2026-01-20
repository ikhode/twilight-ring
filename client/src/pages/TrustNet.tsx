import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Share2, Network, Lock, Zap, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useConfiguration } from "@/context/ConfigurationContext";

export default function TrustNet() {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const { industry } = useConfiguration();

    const { data: status, isLoading } = useQuery({
        queryKey: ["/api/trust/status"],
        queryFn: async () => {
            const res = await fetch("/api/trust/status", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/trust/contribute", {
                method: "POST",
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/trust/status"] });
        }
    });

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Real Network Graph Visualization from Supabase
    const { data: organizations } = useQuery({
        queryKey: ["/api/organizations/network"],
        queryFn: async () => {
            const res = await fetch("/api/organizations/network", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: !!session?.access_token
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !organizations) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = canvas.parentElement?.clientWidth || 600;
        let height = canvas.height = 400;

        // Build nodes from real organization data
        const nodes = [
            { x: width / 2, y: height / 2, r: 8, color: '#3b82f6', label: "YOU" }, // Center (current org)
            ...organizations.slice(0, 15).map((org: any, i: number) => {
                const angle = (i / organizations.length) * Math.PI * 2;
                const radius = 120 + Math.random() * 80;
                return {
                    x: width / 2 + Math.cos(angle) * radius,
                    y: height / 2 + Math.sin(angle) * radius,
                    r: org.trustScore ? Math.max(3, org.trustScore / 200) : 3,
                    color: org.trustScore > 500 ? '#10b981' : '#64748b',
                    label: org.name
                };
            })
        ];

        const draw = () => {
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, width, height);

            // Connections
            ctx.lineWidth = 0.5;
            nodes.forEach((node, i) => {
                nodes.forEach((n2, j) => {
                    if (i === j) return;
                    const d = Math.hypot(node.x - n2.x, node.y - n2.y);
                    if (d < 150) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(59, 130, 246, ${1 - d / 150})`;
                        ctx.moveTo(node.x, node.y);
                        ctx.lineTo(n2.x, n2.y);
                        ctx.stroke();
                    }
                });
            });

            // Nodes
            nodes.forEach(node => {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
                ctx.fillStyle = node.color;
                ctx.fill();

                // Pulse center
                if (node.label === "YOU") {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, node.r + 4 + Math.sin(Date.now() / 200) * 2, 0, Math.PI * 2);
                    ctx.strokeStyle = '#3b82f6';
                    ctx.stroke();
                }
            });

            requestAnimationFrame(draw);
        };
        draw();

    }, [organizations]);


    return (
        <AppLayout title="TrustNet" subtitle="Red Neuronal de Empresas Confiables">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-slate-200">

                {/* Main Visualization */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="bg-slate-900 border-slate-800 overflow-hidden">
                        <div className="relative h-[400px]">
                            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                            <div className="absolute top-4 left-4">
                                <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                    <Network className="w-3 h-3 mr-2" />
                                    RED ACTIVA: 12.4k Nodos
                                </Badge>
                            </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="bg-slate-900/50 border-slate-800">
                            <CardHeader>
                                <CardTitle className="text-sm font-black uppercase text-slate-400">Insight Marketplace</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="p-3 rounded-lg bg-slate-950 border border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded bg-purple-500/10 text-purple-500">
                                                <TrendingUp className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-white">
                                                    {industry === 'retail' ? 'Tendencias de Consumo - Q3' :
                                                        industry === 'manufacturing' ? 'Precios MP (Acero) - Q3' :
                                                            industry === 'logistics' ? 'Costos de Combustible' :
                                                                'Market Trends - Global'}
                                                </p>
                                                <p className="text-[10px] text-slate-500 capitalize">{industry} / Global</p>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" disabled={status?.trustScore < 500}>
                                            {status?.trustScore < 500 ? <Lock className="w-3 h-3" /> : "ACCEDER"}
                                        </Button>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-950 border border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded bg-green-500/10 text-green-500">
                                                <Zap className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-white">Benchmarks de Eficiencia</p>
                                                <p className="text-[10px] text-slate-500 capitalize">{industry} / Latam</p>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" disabled={status?.trustScore < 300}>
                                            {status?.trustScore < 300 ? <Lock className="w-3 h-3" /> : "ACCEDER"}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900/50 border-slate-800">
                            <CardHeader>
                                <CardTitle className="text-sm font-black uppercase text-slate-400">Tus Contribuciones</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-6">
                                    <p className="text-4xl font-black text-white mb-2">{status?.contributionCount || 0}</p>
                                    <p className="text-xs text-slate-500 uppercase">Datapoints Verificados</p>
                                    <Button
                                        onClick={() => mutation.mutate()}
                                        disabled={mutation.isPending}
                                        className="mt-4 w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 text-xs font-black uppercase"
                                    >
                                        {mutation.isPending ? "Minando..." : "Compartir Insight (+5 Score)"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-16 -mt-16" />
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary" />
                                <span className="text-lg font-black uppercase italic text-white">Trust Score</span>
                            </CardTitle>
                            <CardDescription className="text-xs font-mono">
                                ID: {status?.organizationId?.slice(0, 8)}...
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center p-6 space-y-4">
                                <div className="relative w-32 h-32 flex items-center justify-center">
                                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                                        <circle cx="64" cy="64" r="60" stroke="#1e293b" strokeWidth="8" fill="none" />
                                        <motion.circle
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: (status?.trustScore || 0) / 1000 }}
                                            cx="64" cy="64" r="60"
                                            stroke="#3b82f6" strokeWidth="8" fill="none"
                                            strokeDasharray="1 1"
                                        />
                                    </svg>
                                    <div className="flex flex-col items-center">
                                        <span className="text-3xl font-black text-white">{status?.trustScore || 0}</span>
                                        <span className="text-[9px] uppercase font-bold text-slate-500">de 1000</span>
                                    </div>
                                </div>
                                <Badge variant={status?.status === 'guardian' ? 'default' : 'secondary'} className="uppercase tracking-widest text-[10px]">
                                    {status?.status || "OBSERVATION"}
                                </Badge>
                            </div>

                            <div className="space-y-3 mt-6">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Multiplicador Temporal</span>
                                    <span className="font-mono text-green-400">x{(status?.multiplier || 100) / 100}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Nivel de Acceso</span>
                                    <span className="font-mono text-white">Tier {status?.trustScore > 500 ? '2' : '1'}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-destructive/10 border-destructive/20">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <Lock className="w-4 h-4 text-destructive mt-1" />
                                <div>
                                    <h5 className="text-xs font-black uppercase text-destructive mb-1">Advertencia de Freeloader</h5>
                                    <p className="text-[10px] text-destructive/80 leading-tight">
                                        Desactivar el módulo TrustNet resultará en la pérdida inmediata de tu multiplicador temporal. La recuperación de confianza tomará 4 semanas.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </AppLayout>
    );
}
