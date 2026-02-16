import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useConfiguration } from "@/context/ConfigurationContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function CreateCustomerDialog() {
    const { session } = useAuth();
    const { industry } = useConfiguration();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "" });

    const labels: Record<string, any> = {
        services: { title: "Nuevo Cliente", nameLabel: "Empresa / Razón Social", namePlaceholder: "Ej. Acme Corp", emailLabel: "Email de Contacto" },
        healthcare: { title: "Nuevo Paciente", nameLabel: "Nombre del Paciente", namePlaceholder: "Ej. Juan Pérez", emailLabel: "Email Personal" },
        hospitality: { title: "Nuevo Comensal", nameLabel: "Nombre", namePlaceholder: "Ej. María González", emailLabel: "Email" },
        generic: { title: "Nuevo Cliente", nameLabel: "Nombre", namePlaceholder: "Ej. Juan Pérez", emailLabel: "Email" }
    };

    const currentLabels = labels[industry as string] || labels.generic;

    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const res = await fetch("/api/crm/customers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`
                },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to create customer");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/crm/customers"] });
            setOpen(false);
            setFormData({ name: "", email: "", phone: "", address: "" });
            toast({ title: "Registro Exitoso", description: "Se ha guardado correctamente." });
        },
        onError: () => {
            toast({ variant: "destructive", title: "Error", description: "No se pudo crear el registro." });
        }
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> {currentLabels.title}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{currentLabels.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>{currentLabels.nameLabel}</Label>
                        <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder={currentLabels.namePlaceholder} />
                    </div>
                    <div className="space-y-2">
                        <Label>{currentLabels.emailLabel}</Label>
                        <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="contacto@ejemplo.com" />
                    </div>
                    <div className="space-y-2">
                        <Label>Teléfono</Label>
                        <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="5512345678" />
                    </div>

                    <div className="space-y-2">
                        <Label>Dirección / Ubicación</Label>
                        <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Dirección completa para entregas" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending}>
                        {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Guardar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
