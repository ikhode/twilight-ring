import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Phone,
    Shield,
    Users,
    History,
    Plus,
    ShieldAlert,
    ShieldCheck,
    MoreVertical,
    Zap,
    Globe,
    Settings2,
    Lock,
    Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
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
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ShieldLine() {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("overview");

    // Fetch Lines
    const { data: lines, isLoading: loadingLines } = useQuery<any[]>({
        queryKey: ["/api/shieldline/lines"],
        enabled: !!session?.access_token
    });

    // Fetch Extensions
    const { data: extensions, isLoading: loadingExtensions } = useQuery<any[]>({
        queryKey: ["/api/shieldline/extensions"],
        enabled: !!session?.access_token
    });

    // Fetch Rules
    const { data: rules, isLoading: loadingRules } = useQuery<any[]>({
        queryKey: ["/api/shieldline/firewall"],
        enabled: !!session?.access_token
    });

    // Fetch Calls
    const { data: calls, isLoading: loadingCalls } = useQuery<any[]>({
        queryKey: ["/api/shieldline/calls"],
        enabled: !!session?.access_token
    });

    return (
        <AppLayout title="ShieldLine Cloud">
            <div className="flex flex-col gap-6 p-6">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            ShieldLine Cloud
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Infraestructura de identidad telefónica empresarial blindada
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="outline" className="px-3 py-1 bg-blue-50 text-blue-700 border-blue-200">
                            <Lock className="w-3 h-3 mr-1" /> Zero Trust Active
                        </Badge>
                        <Badge variant="outline" className="px-3 py-1 bg-green-50 text-green-700 border-green-200 font-medium">
                            Enterprise Plan
                        </Badge>
                    </div>
                </header>

                <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-5 max-w-2xl bg-muted/50 p-1">
                        <TabsTrigger value="overview">General</TabsTrigger>
                        <TabsTrigger value="lines">Líneas DID</TabsTrigger>
                        <TabsTrigger value="extensions">Extensiones</TabsTrigger>
                        <TabsTrigger value="firewall">Firewall</TabsTrigger>
                        <TabsTrigger value="logs">Logs</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="mt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="border-l-4 border-l-blue-500 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-help flex items-center gap-1">
                                                        Líneas Activas
                                                        <Info className="w-3 h-3 text-muted-foreground/50" />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-slate-950 border-slate-800 text-white p-3 max-w-xs text-xs">
                                                    <p className="font-bold border-b border-white/5 pb-1 mb-1">Identidades Públicas</p>
                                                    <p>Representa el total de números DID (Direct Inward Dialing) contratados y operativos para la organización.</p>
                                                    <p className="mt-2 text-[10px] text-slate-500 uppercase font-bold">Fórmula: COUNT(shieldline_lines) WHERE status = 'active'</p>
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Fuente: ShieldLine Core API</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <Phone className="w-4 h-4 text-muted-foreground" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{lines?.length || 0}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Números empresariales públicos</p>
                                </CardContent>
                            </Card>

                            <Card className="border-l-4 border-l-purple-500 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-help flex items-center gap-1">
                                                        Extensiones Red Privada
                                                        <Info className="w-3 h-3 text-muted-foreground/50" />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-slate-950 border-slate-800 text-white p-3 max-w-xs text-xs">
                                                    <p className="font-bold border-b border-white/5 pb-1 mb-1">Red Privada WebRTC</p>
                                                    <p>Indica el número de terminales virtuales configuradas para comunicación interna cifrada punto a punto.</p>
                                                    <p className="mt-2 text-[10px] text-slate-500 uppercase font-bold">Fórmula: COUNT(shieldline_extensions)</p>
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Fuente: ShieldLine Core API</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <Users className="w-4 h-4 text-muted-foreground" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{extensions?.length || 0}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Operando bajo WebRTC cifrado</p>
                                </CardContent>
                            </Card>

                            <Card className="border-l-4 border-l-indigo-500 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-help flex items-center gap-1">
                                                        Amenazas Bloqueadas
                                                        <Info className="w-3 h-3 text-muted-foreground/50" />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-slate-950 border-slate-800 text-white p-3 max-w-xs text-xs">
                                                    <p className="font-bold border-b border-white/5 pb-1 mb-1">Firewall de Voz Inteligente</p>
                                                    <p>Total de intentos de comunicación rechazados por patrones de spam o extorsión detectados por la IA.</p>
                                                    <p className="mt-2 text-[10px] text-slate-500 uppercase font-bold">Fórmula: COUNT(blocked_events) IN last 30 days</p>
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Fuente: ShieldLine Firewall Engine</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">142</div>
                                    <p className="text-xs text-muted-foreground mt-1">Filtradas por Firewall Inteligente</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-green-600" />
                                        Estado del Blindaje
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-green-100 p-2 rounded-full">
                                                <Lock className="w-4 h-4 text-green-700" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">Cifrado WebRTC</p>
                                                <p className="text-xs text-muted-foreground">Llamadas internas punto a punto</p>
                                            </div>
                                        </div>
                                        <Badge className="bg-green-500">Activo</Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-100 p-2 rounded-full">
                                                <Zap className="w-4 h-4 text-blue-700" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">Firewall Inteligente</p>
                                                <p className="text-xs text-muted-foreground">Análisis de patrones en tiempo real</p>
                                            </div>
                                        </div>
                                        <Badge className="bg-green-500">Activo</Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <History className="w-5 h-5 text-indigo-600" />
                                        Actividad Reciente
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[200px]">
                                        <div className="space-y-4">
                                            {calls?.slice(0, 5).map((call: any) => (
                                                <div key={call.id} className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-3">
                                                        <Phone className="w-4 h-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="font-medium">{call.fromNumber}</p>
                                                            <p className="text-xs text-muted-foreground">{new Date(call.startedAt).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    <Badge variant={call.status === 'completed' ? 'default' : 'destructive'}>
                                                        {call.status}
                                                    </Badge>
                                                </div>
                                            ))}
                                            {(!calls || calls.length === 0) && (
                                                <p className="text-center text-muted-foreground text-sm mt-8">Sin actividad reciente</p>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="lines" className="mt-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                <div>
                                    <CardTitle>Identidades Públicas (DID)</CardTitle>
                                    <CardDescription>Números registrados legalmente para contacto externo sin exponer tu línea personal.</CardDescription>
                                </div>
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                    <Plus className="w-4 h-4 mr-2" /> Contratar Número
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Número</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>IVR / Ruteo</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {lines?.map((line: any) => (
                                            <TableRow key={line.id}>
                                                <TableCell className="font-medium">{line.phoneNumber}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">{line.type.replace('_', ' ')}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="bg-green-500">Activo</Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">Mensaje de Bienvenida + Extensiones</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon"><Settings2 className="w-4 h-4" /></Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!lines || lines.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    No has registrado números públicos aún.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="extensions" className="mt-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                <div>
                                    <CardTitle>Extensiones de Red Privada</CardTitle>
                                    <CardDescription>Sistema interno de comunicación WebRTC blindado.</CardDescription>
                                </div>
                                <Button className="bg-purple-600 hover:bg-purple-700">
                                    <Plus className="w-4 h-4 mr-2" /> Nueva Extensión
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Extensión</TableHead>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Dispositivo</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {extensions?.map((ext: any) => (
                                            <TableRow key={ext.id}>
                                                <TableCell className="font-bold text-blue-600">#{ext.extensionNumber}</TableCell>
                                                <TableCell>{ext.displayName}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${ext.status === 'online' ? 'bg-green-500' : 'bg-slate-300'}`} />
                                                        <span className="text-sm capitalize">{ext.status}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground capitalize">{ext.deviceType}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!extensions || extensions.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    Registra extensiones para tu equipo de trabajo.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="firewall" className="mt-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        Firewall Telefónico Inteligente
                                        <Badge className="bg-blue-600 text-[10px] h-4">Power by AI</Badge>
                                    </CardTitle>
                                    <CardDescription>Define reglas de filtrado para proteger tu empresa de spam y extorsiones.</CardDescription>
                                </div>
                                <Button variant="outline">
                                    <ShieldCheck className="w-4 h-4 mr-2" /> Nueva Regla
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="p-4 border rounded-lg bg-blue-50/30 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Zap className="text-blue-600 w-5 h-5" />
                                            <div>
                                                <p className="font-semibold text-sm">Bloqueo de Spam Global</p>
                                                <p className="text-xs text-muted-foreground">Rechazar números reportados por la comunidad ShieldNet.</p>
                                            </div>
                                        </div>
                                        <Badge>ACTIVO</Badge>
                                    </div>

                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nombre de Regla</TableHead>
                                                <TableHead>Tipo</TableHead>
                                                <TableHead>Patrón</TableHead>
                                                <TableHead>Acción</TableHead>
                                                <TableHead className="text-right">Estado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rules?.map((rule: any) => (
                                                <TableRow key={rule.id}>
                                                    <TableCell className="font-medium text-sm">{rule.name}</TableCell>
                                                    <TableCell className="capitalize text-sm">{rule.type}</TableCell>
                                                    <TableCell className="font-mono text-xs">{rule.pattern}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={rule.action === 'allow' ? 'default' : 'destructive'}>
                                                            {rule.action.toUpperCase()}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {(!rules || rules.length === 0) && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                        No hay reglas personalizadas. El filtro global está protegiendo tu línea.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="logs" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Historial de Llamadas e Intervenciones</CardTitle>
                                <CardDescription>Logs completos de todas las comunicaciones corporativas blindadas.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha/Hora</TableHead>
                                            <TableHead>Origen</TableHead>
                                            <TableHead>Destino</TableHead>
                                            <TableHead>Duración</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead className="text-right">Grabación</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {calls?.map((call: any) => (
                                            <TableRow key={call.id}>
                                                <TableCell className="text-xs">{new Date(call.startedAt).toLocaleString()}</TableCell>
                                                <TableCell className="text-sm font-medium">{call.fromNumber}</TableCell>
                                                <TableCell className="text-sm">Ext. {call.toNumber}</TableCell>
                                                <TableCell className="text-sm">{Math.floor(call.duration / 60)}m {call.duration % 60}s</TableCell>
                                                <TableCell>
                                                    <Badge variant={call.status === 'completed' ? 'default' : 'outline'} className="text-[10px]">
                                                        {call.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" disabled={!call.recordingUrl}>
                                                        <Lock className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!calls || calls.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    No hay registros de llamadas.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
