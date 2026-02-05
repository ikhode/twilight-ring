
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash, Save, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface DynamicEntityViewProps {
    entityType: 'employee' | 'product' | 'customer' | 'supplier' | 'ticket' | 'process';
    entityId: string;
    initialAttributes?: Record<string, any>;
    title?: string;
    className?: string;
}

export function DynamicEntityView({ entityType, entityId, initialAttributes = {}, title = "Atributos Dinámicos", className }: DynamicEntityViewProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [attributes, setAttributes] = useState<Record<string, any>>(initialAttributes);
    const [newKey, setNewKey] = useState("");
    const [newValue, setNewValue] = useState("");
    const [auditMode, setAuditMode] = useState(false); // Simulated AI Audit

    const mutation = useMutation({
        mutationFn: async (newAttrs: Record<string, any>) => {
            const res = await apiRequest("POST", "/api/universal/attributes", {
                entityType,
                entityId,
                attributes: newAttrs
            });
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Atributos Actualizados", description: "Los datos se han guardado correctamente." });
            queryClient.invalidateQueries({ queryKey: [`/api/${entityType}s`] }); // Heuristic invalidation
        },
        onError: () => {
            toast({ title: "Error", description: "No se pudieron guardar los atributos.", variant: "destructive" });
        }
    });

    const handleAdd = () => {
        if (!newKey.trim()) return;
        setAttributes(prev => ({
            ...prev,
            [newKey]: newValue
        }));
        setNewKey("");
        setNewValue("");
    };

    const handleDelete = (key: string) => {
        const next = { ...attributes };
        delete next[key];
        setAttributes(next);
    };

    const handleSave = () => {
        mutation.mutate(attributes);
    };

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    <CardDescription>Extensión de datos (ECS System)</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setAuditMode(!auditMode)} className={auditMode ? "text-indigo-400 bg-indigo-500/10" : "text-slate-500"}>
                    <Sparkles className="w-4 h-4" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {Object.entries(attributes).length === 0 && (
                    <div className="text-xs text-slate-500 italic py-2">
                        No hay atributos definidos.
                    </div>
                )}

                <div className="space-y-2">
                    {Object.entries(attributes).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-2 group">
                            <div className="flex-1 grid grid-cols-2 gap-2 text-sm border border-slate-800 rounded-md p-2 bg-slate-900/50">
                                <span className="font-mono text-slate-400">{key}</span>
                                <span className="text-white truncate">{String(val)}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10" onClick={() => handleDelete(key)}>
                                <Trash className="w-3 h-3" />
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="flex items-end gap-2 pt-2 border-t border-slate-800/50">
                    <div className="grid grid-cols-2 gap-2 flex-1">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-slate-500">Clave</Label>
                            <Input
                                placeholder="e.g. licencia_conducir"
                                value={newKey}
                                onChange={e => setNewKey(e.target.value)}
                                className="h-8 text-xs bg-slate-900 border-slate-800"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-slate-500">Valor</Label>
                            <Input
                                placeholder="Valor..."
                                value={newValue}
                                onChange={e => setNewValue(e.target.value)}
                                className="h-8 text-xs bg-slate-900 border-slate-800"
                            />
                        </div>
                    </div>
                    <Button size="icon" className="h-8 w-8 bg-slate-800 hover:bg-slate-700" onClick={handleAdd}>
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>

                <Button className="w-full gap-2 mt-4 bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={mutation.isPending}>
                    {mutation.isPending ? "Guardando..." : (
                        <>
                            <Save className="w-4 h-4" />
                            Guardar Atributos
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
