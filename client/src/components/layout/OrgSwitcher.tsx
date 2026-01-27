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
    const { organization, allOrganizations, switchOrganization, session, profile } = useAuth();
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
                        className="w-full justify-between px-3 h-12 border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 transition-all rounded-xl shadow-lg backdrop-blur-sm group mb-4"
                    >
                        <div className="flex items-center gap-3 truncate">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_10px_rgba(59,130,246,0.2)] group-hover:scale-105 transition-transform">
                                <Building2 className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col items-start truncate overflow-hidden">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1">Empresa</span>
                                <span className="text-xs font-black text-slate-200 truncate max-w-[140px] tracking-tight">{organization.name}</span>
                            </div>
                        </div>
                        <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[280px] bg-slate-950/95 border-slate-800 backdrop-blur-xl p-2 rounded-xl shadow-2xl space-y-1">
                    <DropdownMenuLabel className="px-3 pt-2 pb-1">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Mis Organizaciones</span>
                    </DropdownMenuLabel>
                    <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                        {allOrganizations.map((org) => (
                            <DropdownMenuItem
                                key={org.id}
                                onClick={() => switchOrganization(org.id)}
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border border-transparent",
                                    org.id === organization.id
                                        ? "bg-primary/10 border-primary/20 text-primary"
                                        : "hover:bg-white/5 text-slate-400 hover:text-white"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
                                        org.id === organization.id ? "bg-primary/20 border-primary/30" : "bg-slate-900 border-slate-800"
                                    )}>
                                        <Building2 className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold truncate max-w-[160px]">{org.name}</span>
                                        <span className="text-[10px] opacity-60 uppercase font-black tracking-tighter">{(org as any).industry || "Negocio"}</span>
                                    </div>
                                </div>
                                {org.id === organization.id && (
                                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-primary" strokeWidth={3} />
                                    </div>
                                )}
                            </DropdownMenuItem>
                        ))}
                    </div>

                    <DropdownMenuSeparator className="bg-white/5 my-2" />

                    <DialogTrigger asChild>
                        <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-lg cursor-pointer text-primary hover:bg-primary/10 focus:bg-primary/10 focus:text-primary transition-all">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Plus className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold">Añadir Empresa</span>
                                <span className="text-[10px] opacity-60 uppercase font-black tracking-tighter">Nuevo espacio de trabajo</span>
                            </div>
                        </DropdownMenuItem>
                    </DialogTrigger>
                </DropdownMenuContent>
            </DropdownMenu>

            <DialogContent className="bg-slate-950 border-slate-800/50 shadow-2xl text-white rounded-2xl max-w-md">
                <DialogHeader>
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 mb-4">
                        <Plus className="w-6 h-6 text-primary" />
                    </div>
                    <DialogTitle className="text-2xl font-black italic uppercase tracking-tight">Nueva Organización</DialogTitle>
                    <DialogDescription className="text-slate-400 font-medium">
                        Crea un entorno independiente con sus propios módulos y flujos inteligentes.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-6 border-y border-white/5 my-2">
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nombre de la Entidad</Label>
                        <Input
                            id="name"
                            value={newOrgName}
                            onChange={(e) => setNewOrgName(e.target.value)}
                            className="bg-slate-900/50 border-slate-800 h-11 px-4 focus:ring-1 focus:ring-primary/50 transition-all rounded-xl"
                            placeholder="Ej. Corporativo Alpha S.A."
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="industry" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Vertical de Negocio</Label>
                        <select
                            id="industry"
                            value={newOrgIndustry}
                            onChange={(e) => setNewOrgIndustry(e.target.value)}
                            className="flex h-11 w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary/50 text-white"
                        >
                            <option value="retail">Comercio Detallista (Retail)</option>
                            <option value="manufacturing">Manufactura / Industrial</option>
                            <option value="services">Servicios Corporativos</option>
                            <option value="healthcare">Salud y Bienestar</option>
                            <option value="logistics">Transporte y Logística</option>
                            <option value="technology">Tecnología / Software</option>
                            <option value="other">Otro Sector</option>
                        </select>
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
                    <Button
                        onClick={() => createOrgMutation.mutate()}
                        disabled={createOrgMutation.isPending || !newOrgName.trim()}
                        className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest px-6 rounded-xl shadow-lg shadow-primary/20 transition-all"
                    >
                        {createOrgMutation.isPending ? "Configurando..." : "Iniciar Entorno"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
