
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    GitGraph,
    Plus,
    Factory,
    Users,
    Briefcase,
    Truck,
    Wallet,
    ArrowRight,
    Settings2,
    Clock,
    PlayCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { SmartContextMenu } from "@/components/universal/SmartContextMenu";

export default function Workflows() {
    const [_location, setLocation] = useLocation();

    const { data: workflows = [], isLoading } = useQuery({
        queryKey: ["/api/workflows"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/workflows");
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        }
    });

    const getIcon = (type: string) => {
        switch (type) {
            case "production": return Factory;
            case "hr_onboarding": return Users;
            case "sales_pipeline": return Briefcase;
            case "logistics_route": return Truck;
            case "finance_approval": return Wallet;
            default: return GitGraph;
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case "production": return "text-emerald-500 bg-emerald-500/10";
            case "hr_onboarding": return "text-blue-500 bg-blue-500/10";
            case "sales_pipeline": return "text-indigo-500 bg-indigo-500/10";
            case "logistics_route": return "text-orange-500 bg-orange-500/10";
            case "finance_approval": return "text-yellow-500 bg-yellow-500/10";
            default: return "text-slate-500 bg-slate-500/10";
        }
    };

    const categories = [
        { id: "all", label: "Todos", icon: GitGraph },
        { id: "production", label: "Producción", icon: Factory },
        { id: "hr_onboarding", label: "RRHH", icon: Users },
        { id: "sales_pipeline", label: "Ventas", icon: Briefcase },
        { id: "logistics_route", label: "Logística", icon: Truck },
        { id: "finance_approval", label: "Finanzas", icon: Wallet },
    ];

    return (
        <AppLayout title="Arquitectura de Procesos" subtitle="Diseña y simula flujos de negocio globales">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Stats Header or Intro */}
                    </div>
                    <Button onClick={() => setLocation("/workflow-editor")} className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 border-0 hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20">
                        <Plus className="w-4 h-4" /> Nuevo Flujo Global
                    </Button>
                </div>

                <Tabs defaultValue="all" className="space-y-6">
                    <TabsList className="bg-slate-900 border border-slate-800 p-1">
                        {categories.map(cat => (
                            <TabsTrigger key={cat.id} value={cat.id} className="gap-2 data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                                <cat.icon className="w-4 h-4" />
                                {cat.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {categories.map(cat => (
                        <TabsContent key={cat.id} value={cat.id} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {(Array.isArray(workflows) ? workflows : [])
                                    .filter((w: any) => cat.id === "all" || w.type === cat.id)
                                    .map((workflow: any) => {
                                        const Icon = getIcon(workflow.type);
                                        return (
                                            <SmartContextMenu key={workflow.id} entityType="workflow" entityId={workflow.id} title={workflow.name}>
                                                <Card className="bg-[#030712] border-slate-800 hover:border-slate-700 transition-all cursor-pointer group" onClick={() => setLocation(`/workflow-editor?processId=${workflow.id}`)}>
                                                    <CardHeader>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className={cn("p-2 rounded-lg", getColor(workflow.type))}>
                                                                <Icon className="w-5 h-5" />
                                                            </div>
                                                            <Badge variant="outline" className="border-slate-800 bg-slate-900/50 text-slate-400 font-mono text-[10px] uppercase">
                                                                v1.0
                                                            </Badge>
                                                        </div>
                                                        <CardTitle className="text-base text-white group-hover:text-indigo-400 transition-colors">
                                                            {workflow.name}
                                                        </CardTitle>
                                                        <CardDescription className="text-slate-500 line-clamp-2 text-xs">
                                                            {workflow.description || "Sin descripción operativa."}
                                                        </CardDescription>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-800/50">
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                <span>Updated: {new Date(workflow.updatedAt).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <span>Editar Diseño</span>
                                                                <ArrowRight className="w-3 h-3" />
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </SmartContextMenu>
                                        );
                                    })}

                                {/* Empty State Add Card */}
                                <div
                                    onClick={() => setLocation("/workflow-editor")}
                                    className="border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center gap-4 min-h-[200px] text-slate-600 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-slate-900/50 transition-all cursor-pointer group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Plus className="w-6 h-6" />
                                    </div>
                                    <p className="font-medium text-sm">Crear otro flujo de {cat.label}</p>
                                </div>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </AppLayout>
    );
}
