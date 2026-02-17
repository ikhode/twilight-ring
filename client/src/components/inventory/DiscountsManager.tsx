import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { Plus, Edit, Trash2, Loader2, Tag, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function DiscountsManager() {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    const { data: discounts = [], isLoading } = useQuery({
        queryKey: ["/api/inventory/discounts"],
        queryFn: async () => {
            const res = await fetch("/api/inventory/discounts", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch discounts");
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const url = data.id ? `/api/inventory/discounts/${data.id}` : "/api/inventory/discounts";
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
            queryClient.invalidateQueries({ queryKey: ["/api/inventory/discounts"] });
            setIsDialogOpen(false);
            setEditingItem(null);
            toast({ title: "Guardado", description: "El descuento ha sido actualizado." });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/inventory/discounts/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to delete");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory/discounts"] });
            toast({ title: "Eliminado", description: "El descuento ha sido eliminado." });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);

        let value = parseFloat(formData.get("value") as string);
        const type = formData.get("type") as string;

        // If percentage, generic number. If fixed, convert to cents
        if (type === "fixed") {
            value = Math.round(value * 100);
        }

        const data = {
            id: editingItem?.id,
            name: formData.get("name"),
            type,
            value
        };

        mutation.mutate(data);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-display font-semibold">Toldos y Promociones</h2>
                    <p className="text-sm text-muted-foreground">Gestión de descuentos aplicables en POS.</p>
                </div>
                <Button onClick={() => { setEditingItem(null); setIsDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Descuento
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <DataTable
                        columns={[
                            {
                                key: "name", header: "Nombre", render: (item) => (
                                    <div className="flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-blue-500" />
                                        <span className="font-medium">{item.name}</span>
                                    </div>
                                )
                            },
                            {
                                key: "value",
                                header: "Valor",
                                render: (item) => (
                                    <span className="font-bold">
                                        {item.type === "percentage" ? `${item.value}%` : `$${(item.value / 100).toFixed(2)}`}
                                    </span>
                                )
                            },
                            {
                                key: "type", header: "Tipo", render: (item) => (
                                    <span className="capitalize text-muted-foreground text-xs">{item.type}</span>
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
                                            if (confirm("¿Eliminar este descuento?")) deleteMutation.mutate(item.id);
                                        }}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )
                            }
                        ]}
                        data={discounts}
                        isLoading={isLoading}
                    />
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? "Editar Descuento" : "Nuevo Descuento"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nombre de la Promoción</Label>
                            <Input name="name" defaultValue={editingItem?.name} required placeholder="Ej. 10% Descuento, Happy Hour" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select name="type" defaultValue={editingItem?.type || "percentage"}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                                        <SelectItem value="fixed">Monto Fijo ($)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Valor</Label>
                                <Input
                                    name="value"
                                    type="number"
                                    step="0.01"
                                    defaultValue={editingItem ? (editingItem.type === "fixed" ? editingItem.value / 100 : editingItem.value) : ""}
                                    required
                                    placeholder="0"
                                />
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
