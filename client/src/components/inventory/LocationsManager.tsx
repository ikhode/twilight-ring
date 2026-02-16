import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export function LocationsManager() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    const { data: locations, isLoading } = useQuery({
        queryKey: ["locations"],
        queryFn: async () => {
            const res = await fetch("/api/inventory/locations");
            if (!res.ok) throw new Error("Failed to fetch locations");
            return res.json();
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/inventory/locations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to create location");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["locations"] });
            setIsOpen(false);
            toast({ title: "Ubicación creada exitosamente" });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        createMutation.mutate({
            name: formData.get("name"),
            type: formData.get("type"),
            address: formData.get("address"),
            isMain: formData.get("isMain") === "on"
        });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Gestión de Almacenes</CardTitle>
                    <CardDescription>Define las ubicaciones físicas de tu inventario.</CardDescription>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Nueva Ubicación
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Crear Nueva Ubicación</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nombre</Label>
                                <Input name="name" required placeholder="Ej. Almacén Central" />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select name="type" defaultValue="warehouse">
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="warehouse">Bodega / Almacén</SelectItem>
                                        <SelectItem value="store">Tienda / Sucursal</SelectItem>
                                        <SelectItem value="transit">En Tránsito (Virtual)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Dirección</Label>
                                <Textarea name="address" placeholder="Dirección completa" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Input type="checkbox" name="isMain" id="isMain" className="w-4 h-4" />
                                <Label htmlFor="isMain">Es la ubicación principal (HQ)</Label>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={createMutation.isPending}>
                                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Crear
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Dirección</TableHead>
                            <TableHead>Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-4">Cargando...</TableCell></TableRow>
                        ) : locations?.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No hay ubicaciones registradas</TableCell></TableRow>
                        ) : (
                            locations?.map((loc: any) => (
                                <TableRow key={loc.id}>
                                    <TableCell className="font-medium">
                                        {loc.name} {loc.isMain && <Badge variant="secondary" className="ml-2">Principal</Badge>}
                                    </TableCell>
                                    <TableCell className="capitalize">{loc.type === 'warehouse' ? 'Bodega' : loc.type === 'store' ? 'Tienda' : loc.type}</TableCell>
                                    <TableCell className="max-w-[300px] truncate">{loc.address || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant={loc.isActive ? "outline" : "destructive"}>
                                            {loc.isActive ? "Activo" : "Inactivo"}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
