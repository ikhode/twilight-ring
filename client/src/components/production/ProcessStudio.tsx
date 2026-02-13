
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Workflow,
    Plus,
    Search,
    ArrowRight,
    Layers,
    Zap,
    Target,
    LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProcessWorkflowEditor } from "./ProcessWorkflowEditor";

export function ProcessStudio() {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
    const [selectedProcess, setSelectedProcess] = useState<any>(null);

    const { data: processes, isLoading } = useQuery({
        queryKey: ["/api/cpe/processes"],
        queryFn: async () => {
            const res = await fetch("/api/cpe/processes", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const { data: inventory = [] } = useQuery({
        queryKey: ["/api/inventory/products"],
        queryFn: async () => {
            const res = await fetch("/api/inventory/products", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const { data: tasks = [] } = useQuery({
        queryKey: ["/api/cpe/tasks"],
        queryFn: async () => {
            const res = await fetch("/api/cpe/tasks", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const saveMutation = useMutation({
        mutationFn: async ({ nodes, edges }: { nodes: any[], edges: any[] }) => {
            const res = await fetch(`/api/cpe/processes/${selectedProcess.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    workflow_data: { nodes, edges }
                })
            });
            if (!res.ok) throw new Error('Failed to save process');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/cpe/processes"] });
        }
    });

    if (viewMode === 'editor') {
        return (
            <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('list')}
                            className="text-slate-400 hover:text-white"
                        >
                            Volver al Listado
                        </Button>
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            {selectedProcess ? `Editando: ${selectedProcess.name}` : 'Nuevo Arquitecto de Proceso'}
                        </h2>
                    </div>
                </div>
                <div className="h-[800px] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                    <ProcessWorkflowEditor
                        inventory={inventory}
                        tasks={tasks}
                        initialNodes={selectedProcess?.workflow_data?.nodes || selectedProcess?.workflowData?.nodes || []}
                        initialEdges={selectedProcess?.workflow_data?.edges || selectedProcess?.workflowData?.edges || []}
                        onSave={(nodes: any[], edges: any[]) => saveMutation.mutate({ nodes, edges })}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                            <Workflow className="w-6 h-6 text-purple-400" />
                        </div>
                        Architect Studio
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        Define flujos de trabajo granulares, recetas y reglas de negocio universales.
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setSelectedProcess(null);
                        setViewMode('editor');
                    }}
                    className="bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/20 gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Diseño de Proceso
                </Button>
            </div>

            {/* Industry Agnostic Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FeatureCard
                    icon={Layers}
                    title="Modularidad Total"
                    description="Cada paso del proceso es un nodo independiente con sus propias entradas y rendimientos."
                    color="blue"
                />
                <FeatureCard
                    icon={Target}
                    title="Industry Agnostic"
                    description="Personaliza campos y etiquetas para adaptarse a cualquier flujo, desde agroindustria hasta manufactura tecnológica."
                    color="emerald"
                />
                <FeatureCard
                    icon={Zap}
                    title="Real-Time Logic"
                    description="Añade condiciones lógicas a tus procesos para automatizar decisiones de calidad o ruteo."
                    color="amber"
                />
            </div>

            {/* Process List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Librería de Procesos</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                        <input
                            placeholder="Buscar proceso..."
                            className="bg-slate-900 border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 w-64"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {processes?.map((process: any) => (
                        <Card
                            key={process.id}
                            className="bg-slate-900/30 border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer group"
                            onClick={() => {
                                setSelectedProcess(process);
                                setViewMode('editor');
                            }}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                                        <Workflow className="w-5 h-5" />
                                    </div>
                                    <Badge variant="secondary" className="bg-slate-800 text-slate-400 text-[9px] uppercase font-bold">
                                        Configurable
                                    </Badge>
                                </div>
                                <h4 className="text-lg font-bold text-white mb-2">{process.name}</h4>
                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                    {process.workflowData?.description || "Sin descripción configurada para este proceso granular."}
                                </p>
                                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-600 uppercase font-bold">
                                        Última edición: {new Date(process.updatedAt || process.createdAt).toLocaleDateString()}
                                    </span>
                                    <ArrowRight className="w-4 h-4 text-slate-700 group-hover:text-purple-400 transition-colors" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

function FeatureCard({ icon: Icon, title, description, color }: { icon: LucideIcon, title: string, description: string, color: 'blue' | 'emerald' | 'amber' }) {
    const colorClasses = {
        blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    };

    return (
        <div className="p-5 rounded-3xl bg-slate-900/20 border border-slate-800/50 space-y-3">
            <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center", colorClasses[color])}>
                <Icon className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">{title}</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
                {description}
            </p>
        </div>
    );
}
