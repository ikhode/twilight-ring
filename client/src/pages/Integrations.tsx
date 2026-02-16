import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Key, Globe, Trash2, Copy, CheckCircle2, AlertCircle, ShieldCheck, Shield, Activity } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Integrations() {
    const { toast } = useToast();
    const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
    const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false);
    const [newKey, setNewKey] = useState<string | null>(null);

    const { data: keys, isLoading: loadingKeys } = useQuery<any[]>({
        queryKey: ["/api/integrations/keys"],
    });

    const { data: webhooks, isLoading: loadingWebhooks } = useQuery<any[]>({
        queryKey: ["/api/integrations/webhooks"],
    });

    const createKeyMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/integrations/keys", data);
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/integrations/keys"] });
            setNewKey(data.plainKey);
            toast({ title: "Clave API generada", description: "Guárdela en un lugar seguro." });
        },
    });

    const revokeKeyMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/integrations/keys/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/integrations/keys"] });
            toast({ title: "Clave revocada" });
        },
    });

    const createWebhookMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/integrations/webhooks", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/integrations/webhooks"] });
            setIsWebhookDialogOpen(false);
            toast({ title: "Webhook creado" });
        },
    });

    const deleteWebhookMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/integrations/webhooks/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/integrations/webhooks"] });
            toast({ title: "Webhook eliminado" });
        },
    });

    const { data: organization } = useQuery<any>({
        queryKey: ["/api/config"], // We can get settings from config too
    });

    const updateFacturapiMutation = useMutation({
        mutationFn: async (apiKey: string) => {
            const currentSettings = organization?.universal || {}; // Adjusting to match Config route structure
            await apiRequest("PATCH", "/api/organization", {
                settings: { ...currentSettings, facturapiApiKey: apiKey }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/config"] });
            toast({ title: "Configuración actualizada", description: "Clave Facturapi guardada con éxito." });
        },
    });

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copiado al portapapeles" });
    };

    return (
        <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-white">Integraciones y API</h1>
                <p className="text-slate-400">Administre el acceso externo y las notificaciones en tiempo real para sus sistemas.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* API Keys Section */}
                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Key className="w-5 h-5 text-blue-400" />
                                Claves API
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Acceso programático seguro a su organización.
                            </CardDescription>
                        </div>
                        <Dialog open={isKeyDialogOpen} onOpenChange={(open) => {
                            setIsKeyDialogOpen(open);
                            if (!open) setNewKey(null);
                        }}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Nueva Clave
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-slate-900 border-slate-800 text-white">
                                <DialogHeader>
                                    <DialogTitle>Generar Clave API</DialogTitle>
                                    <DialogDescription className="text-slate-400">
                                        Proporcione un nombre descriptivo para identificar el uso de esta clave.
                                    </DialogDescription>
                                </DialogHeader>
                                {newKey ? (
                                    <div className="space-y-4 py-4">
                                        <div className="p-4 bg-amber-500/10 border border-amber-500/50 rounded-lg flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                                            <p className="text-xs text-amber-200">
                                                Esta clave solo se mostrará una vez. Guárdela ahora en un lugar seguro.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input value={newKey} readOnly className="bg-slate-950 border-slate-700" />
                                            <Button size="icon" variant="outline" onClick={() => copyToClipboard(newKey)}>
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        createKeyMutation.mutate({
                                            name: formData.get("name"),
                                            role: formData.get("role")
                                        });
                                    }} className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Nombre de la Aplicación/Uso</Label>
                                            <Input name="name" placeholder="Ej: Integración Facturación" required className="bg-slate-950 border-slate-700" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Rol de Acceso</Label>
                                            <Select name="role" defaultValue="viewer">
                                                <SelectTrigger className="bg-slate-950 border-slate-700">
                                                    <SelectValue placeholder="Seleccione un rol" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                                    <SelectItem value="viewer">Lector (Solo Vista)</SelectItem>
                                                    <SelectItem value="editor">Editor (Lectura y Escritura)</SelectItem>
                                                    <SelectItem value="admin">Administrador (Acceso Total)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit" disabled={createKeyMutation.isPending} className="bg-blue-600 hover:bg-blue-500 text-white">
                                                {createKeyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                Generar Clave
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                )}
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-800">
                                    <TableHead className="text-slate-400">Nombre</TableHead>
                                    <TableHead className="text-slate-400">Prefijo</TableHead>
                                    <TableHead className="text-slate-400">Rol</TableHead>
                                    <TableHead className="text-slate-400">Estado</TableHead>
                                    <TableHead className="text-slate-400"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {keys?.map((key) => (
                                    <TableRow key={key.id} className="border-slate-800 hover:bg-slate-800/30">
                                        <TableCell className="font-medium text-white">{key.name}</TableCell>
                                        <TableCell className="text-slate-400 font-mono text-xs">{key.keyPrefix}...</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="border-slate-700 text-slate-300">
                                                {key.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {key.revokedAt ? (
                                                <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">Revocada</Badge>
                                            ) : (
                                                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Activa</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {!key.revokedAt && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="text-slate-500 hover:text-red-400 hover:bg-red-400/10"
                                                    onClick={() => revokeKeyMutation.mutate(key.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!keys?.length && !loadingKeys && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                            No hay claves generadas.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Webhooks Section */}
                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Globe className="w-5 h-5 text-emerald-400" />
                                Webhooks
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Notificaciones HTTP POST en tiempo real hacia sus sistemas.
                            </CardDescription>
                        </div>
                        <Dialog open={isWebhookDialogOpen} onOpenChange={setIsWebhookDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Nuevo Webhook
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>Configurar Webhook</DialogTitle>
                                    <DialogDescription className="text-slate-400">
                                        Defina el punto final para recibir notificaciones del sistema.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    createWebhookMutation.mutate({
                                        name: formData.get("name"),
                                        url: formData.get("url"),
                                        events: ["customer.created", "deal.created", "sale.completed"] // Default for now
                                    });
                                }} className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Nombre del Webhook</Label>
                                        <Input name="name" placeholder="Ej: Slack / Discord Integration" required className="bg-slate-950 border-slate-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>URL de Destino</Label>
                                        <Input name="url" placeholder="https://api.empresa.com/hooks/nexus" type="url" required className="bg-slate-950 border-slate-700" />
                                    </div>
                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-2">
                                        <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Eventos Suscritos (Predeterminado)
                                        </h4>
                                        <p className="text-[10px] text-emerald-200 opacity-70">
                                            customer.created, deal.created, deal.status_changed, sale.completed.
                                        </p>
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={createWebhookMutation.isPending} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                                            {createWebhookMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                            Crear Webhook
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-800">
                                    <TableHead className="text-slate-400">Nombre</TableHead>
                                    <TableHead className="text-slate-400">Punto Final</TableHead>
                                    <TableHead className="text-slate-400">Estado</TableHead>
                                    <TableHead className="text-slate-400"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {webhooks?.map((hook) => (
                                    <TableRow key={hook.id} className="border-slate-800 hover:bg-slate-800/30">
                                        <TableCell className="font-medium text-white">{hook.name}</TableCell>
                                        <TableCell className="text-slate-400 max-w-[150px] truncate" title={hook.url}>{hook.url}</TableCell>
                                        <TableCell>
                                            {hook.isActive ? (
                                                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Activo</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-slate-500 border-slate-700">Inactivo</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="text-slate-500 hover:text-red-400 hover:bg-red-400/10"
                                                onClick={() => deleteWebhookMutation.mutate(hook.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!webhooks?.length && !loadingWebhooks && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                            No hay webhooks configurados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Regional Fiscal Compliance (Phase 3) */}
                <Card className="border-emerald-800/50 bg-slate-900/50 backdrop-blur-md lg:col-span-2 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                        <Shield className="w-32 h-32 text-emerald-500" />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                                Cumplimiento Fiscal (México - Facturapi PAC)
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Configure su conexión oficial con el PAC para el timbrado de CFDI 4.0.
                            </CardDescription>
                        </div>
                        <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 font-mono text-[10px]">
                            RFC: Activo (Demo)
                        </Badge>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-xs font-bold uppercase tracking-widest">Facturapi API Key (Main / Test)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="password"
                                            placeholder="sk_test_..."
                                            defaultValue={organization?.facturapiApiKey || ""}
                                            id="facturapi-key-input"
                                            className="bg-slate-950 border-slate-700 h-11"
                                        />
                                        <Button
                                            size="lg"
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11"
                                            onClick={() => {
                                                const val = (document.getElementById('facturapi-key-input') as HTMLInputElement).value;
                                                updateFacturapiMutation.mutate(val);
                                            }}
                                            disabled={updateFacturapiMutation.isPending}
                                        >
                                            {updateFacturapiMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Vincular"}
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 italic">
                                        Se recomienda usar 'Test Key' primero para validar la estructura de datos sin costo fiscal.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                                        <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Estado de Conexión</p>
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full", organization?.facturapiApiKey ? "bg-emerald-500 animate-pulse" : "bg-slate-700")} />
                                            <span className="text-xs font-bold text-slate-300">
                                                {organization?.facturapiApiKey ? "En Línea / Certificado" : "No Configurado"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                                        <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Versión CFDI</p>
                                        <span className="text-xs font-bold text-slate-300 opacity-80 italic">Anexo 20 - v4.0 (2024)</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-emerald-500/10 to-transparent p-5 rounded-2xl border border-emerald-500/20 space-y-4">
                                <Activity className="w-8 h-8 text-emerald-500/50" />
                                <h4 className="text-sm font-black text-emerald-400 uppercase italic tracking-tighter">Impacto Operativo</h4>
                                <ul className="text-[11px] text-slate-400 space-y-3">
                                    <li className="flex gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <span>Timbrado automático al confirmar pago de ventas.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <span>Descarga inmediata de PDF y envío de XML.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <span>Cumplimiento 100% con requerimientos del SAT.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
