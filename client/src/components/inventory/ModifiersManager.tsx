import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { Plus, Edit, Trash2, Loader2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export function ModifiersManager() {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    const { data: modifiers = [], isLoading } = useQuery({
        queryKey: ["/api/inventory/modifiers"],
        queryFn: async () => {
            const res = await fetch("/api/inventory/modifiers", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch modifiers");
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const url = data.id ? `/api/inventory/modifiers/${data.id}` : "/api/inventory/modifiers";
            const method = data.id ? "PATCH" : "POST";
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`
                },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Operation failed");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory/modifiers"] });
            setIsDialogOpen(false);
            setEditingItem(null);
            toast({ title: "Guardado", description: "El modificador ha sido actualizado." });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/inventory/modifiers/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to delete");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory/modifiers"] });
            toast({ title: "Eliminado", description: "El modificador ha sido eliminado." });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);

        // Parse options
        const optionsRaw = formData.get("optionsRaw") as string;
        const options = optionsRaw.split('\n').map(line => {
            const [name, priceStr] = line.split(':');
            const price = parseFloat(priceStr?.trim() || "0") * 100; // Store in cents
            return { name: name?.trim(), price: isNaN(price) ? 0 : price };
        }).filter(o => o.name);

        const data = {
            id: editingItem?.id,
            name: formData.get("name"),
            allowMultiple: formData.get("allowMultiple") === "on",
            isRequired: formData.get("isRequired") === "on",
            options
        };

        mutation.mutate(data);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-display font-semibold">Grupos de Modificadores</h2>
                    <p className="text-sm text-muted-foreground">Opciones extra para productos (ej. Salsas, Adicionales).</p>
                </div>
                <Button onClick={() => { setEditingItem(null); setIsDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Grupo
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <DataTable
                        columns={[
                            { key: "name", header: "Nombre", render: (item) => <span className="font-medium">{item.name}</span> },
                            {
                                key: "options",
                                header: "Opciones",
                                render: (item) => (
                                    <div className="flex flex-wrap gap-1">
                                        {(item.options || []).map((opt: any, i: number) => (
                                            <Badge key={i} variant="secondary" className="text-xs">
                                                {opt.name} (+${opt.price / 100})
                                            </Badge>
                                        ))}
                                    </div>
                                )
                            },
                            {
                                key: "config", header: "Configuración", render: (item) => (
                                    <div className="space-y-1 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${item.isRequired ? 'bg-red-500' : 'bg-slate-700'}`} />
                                            {item.isRequired ? "Obligatorio" : "Opcional"}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${item.allowMultiple ? 'bg-blue-500' : 'bg-slate-700'}`} />
                                            {item.allowMultiple ? "Múltiple" : "Único"}
                                        </div>
                                    </div>
                                )
                            },
                            {
                                key: "actions",
                                header: "Acciones",
                                render: (item) => (
                                    <div className="flex justify-end gap-2">
                                        <Button size="icon" variant="ghost" onClick={() => { setEditingItem(item); setIsDialogOpen(true); }}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => {
                                            if (confirm("¿Eliminar este grupo?")) deleteMutation.mutate(item.id);
                                        }}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )
                            }
                        ]}
                        data={modifiers}
                        isLoading={isLoading}
                    />
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? "Editar Modificadores" : "Nuevo Grupo de Modificadores"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nombre del Grupo</Label>
                            <Input name="name" defaultValue={editingItem?.name} required placeholder="Ej. Salsas, Tipo de Leche" />
                        </div>

                        <div className="space-y-2">
                            <Label>Opciones (Una por línea: Nombre : Precio)</Label>
                            <textarea
                                name="optionsRaw"
                                className="w-full h-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                placeholder="Roja : 0&#10;Verde : 0&#10;Extra Queso : 15"
                                defaultValue={editingItem?.options?.map((o: any) => `${o.name} : ${o.price / 100}`).join('\n')}
                            />
                            <p className="text-xs text-muted-foreground">Formato: Nombre de opción : Precio adicional</p>
                        </div>

                        <div className="flex gap-8 pt-2">
                            <div className="flex items-center gap-2">
                                <Switch name="isRequired" defaultChecked={editingItem?.isRequired} />
                                <Label>Obligatorio</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch name="allowMultiple" defaultChecked={editingItem?.allowMultiple ?? true} />
                                <Label>Permitir Múltiples</Label>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Guardar
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
