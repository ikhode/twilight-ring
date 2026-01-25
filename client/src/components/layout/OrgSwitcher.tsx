import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuShortcut
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Building2, Plus, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function OrgSwitcher() {
    const { organization, allOrganizations, switchOrganization, session } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [newOrgName, setNewOrgName] = useState("");
    const [newOrgIndustry, setNewOrgIndustry] = useState("other");
    const queryClient = useQueryClient();

    const createOrgMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/organization", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ name: newOrgName, industry: newOrgIndustry })
            });
            if (!res.ok) throw new Error("Failed to create organization");
            return res.json();
        },
        onSuccess: (newOrg) => {
            setIsOpen(false);
            setNewOrgName("");
            // Force reload to pick up new list or just switch?
            // Reload is safest as per useAuth logic
            switchOrganization(newOrg.id);
        }
    });

    if (!organization) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between px-2 border border-slate-800 bg-slate-950/50 hover:bg-slate-900 mb-4"
                    >
                        <div className="flex items-center gap-2 truncate">
                            <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center text-primary">
                                <Building2 className="w-3 h-3" />
                            </div>
                            <span className="text-xs font-bold truncate max-w-[140px]">{organization.name}</span>
                        </div>
                        <ChevronsUpDown className="w-3 h-3 text-slate-500 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[240px] bg-slate-950 border-slate-800">
                    <DropdownMenuLabel className="text-xs text-slate-500 font-normal uppercase tracking-wider">
                        Organizaciones
                    </DropdownMenuLabel>
                    {allOrganizations.map((org) => (
                        <DropdownMenuItem
                            key={org.id}
                            onClick={() => switchOrganization(org.id)}
                            className="flex items-center justify-between text-xs font-medium cursor-pointer focus:bg-slate-900 focus:text-white"
                        >
                            <div className="flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                                {org.name}
                            </div>
                            {org.id === organization.id && <Check className="w-3.5 h-3.5 text-primary" />}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="bg-slate-800" />
                    <DialogTrigger asChild>
                        <DropdownMenuItem className="text-xs text-primary focus:text-primary focus:bg-primary/10 cursor-pointer">
                            <Plus className="w-3.5 h-3.5 mr-2" />
                            Crear Nueva Empresa
                        </DropdownMenuItem>
                    </DialogTrigger>
                </DropdownMenuContent>
            </DropdownMenu>

            <DialogContent className="bg-slate-950 border-slate-800 text-white">
                <DialogHeader>
                    <DialogTitle>Crear Nueva Organización</DialogTitle>
                    <DialogDescription>
                        Configura un nuevo espacio de trabajo independiente.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nombre de la Empresa</Label>
                        <Input
                            id="name"
                            value={newOrgName}
                            onChange={(e) => setNewOrgName(e.target.value)}
                            className="bg-slate-900 border-slate-800"
                            placeholder="Acme Corp"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="industry">Industria Principal</Label>
                        <select
                            id="industry"
                            value={newOrgIndustry}
                            onChange={(e) => setNewOrgIndustry(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-white"
                        >
                            <option value="retail">Retail</option>
                            <option value="manufacturing">Manufactura</option>
                            <option value="services">Servicios</option>
                            <option value="healthcare">Salud</option>
                            <option value="logistics">Logística</option>
                            <option value="technology">Tecnología</option>
                            <option value="other">Otro</option>
                        </select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button onClick={() => createOrgMutation.mutate()} disabled={createOrgMutation.isPending}>
                        {createOrgMutation.isPending ? "Creando..." : "Crear Empresa"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
