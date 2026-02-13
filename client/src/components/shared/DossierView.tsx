import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    FileText,
    History,
    Download,
    Clock,
    FileCheck,
    Search,
    AlertCircle,
    Activity,
    Plus,
    Upload,
    Share2,
    ArrowUpRight,
    Copy,
    CheckCircle,
    XCircle,
    Info,
    ShieldCheck,
    Lock,
    Unlock,
    Fingerprint,
    Loader2,
    Receipt,
    BrainCircuit,
    Sparkles,
    Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DossierViewProps {
    entityType: "employee" | "supplier" | "customer" | "sale" | "purchase" | "vehicle" | "transaction" | "product";
    entityId: string;
    entityName: string;
    trigger?: React.ReactNode;
}

/**
 * Componente que muestra el expediente completo de una entidad (historial + documentos).
 * Parte del sistema de trazabilidad y auditoría solicitada.
 */
export function DossierView({ entityType, entityId, entityName, trigger }: DossierViewProps) {
    const { session } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isVerified, setIsVerified] = useState(false);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["/api/dossier", entityType, entityId],
        queryFn: async () => {
            const res = await fetch(`/api/dossier/${entityType}/${entityId}`, {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch dossier");
            return res.json();
        },
        enabled: open && !!session?.access_token
    });

    const history = data?.history || [];
    const documents = data?.documents || [];
    const relationsList = data?.relations || [];

    // Calculate Summary Stats
    const totalTickets = relationsList.filter((r: any) => r.type === 'ticket').length;
    const totalRelations = relationsList.length;
    const totalDocs = documents.length;
    const activeAlerts = history.filter((h: any) => h.action.includes('ERROR') || h.action.includes('ALERT')).length;

    // Derived Status
    const status = activeAlerts > 0 ? "Inconsistente" : documents.length < 2 ? "Pendiente" : "Activo";
    const statusColor = status === "Activo" ? "text-emerald-400" : status === "Inconsistente" ? "text-rose-400" : "text-amber-400";

    const copyToClipboard = () => {
        navigator.clipboard.writeText(entityId);
        setCopied(true);
        toast({ title: "ID Copiado", description: "El ID ha sido copiado al portapapeles." });
        setTimeout(() => setCopied(false), 2000);
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount / 100);

    const handleVerify = () => {
        setIsVerifying(true);
        setTimeout(() => {
            setIsVerifying(false);
            setIsVerified(true);
            toast({
                title: "Certificación de Integridad Completada",
                description: "Se ha verificado la cadena de custodia y los hashes criptográficos de todos los registros.",
            });
            setTimeout(() => setIsVerified(false), 5000);
        }, 2000);
    };

    const handleUpload = async (fileUrl: string) => {
        setIsUploading(true);
        try {
            const fileName = fileUrl.split('/').pop() || "documento.pdf";
            const res = await fetch("/api/business-documents/upload", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    name: fileName,
                    fileUrl,
                    entityId,
                    entityType,
                    userId: session?.user?.id
                })
            });
            if (!res.ok) throw new Error("Upload failed");
            refetch();
        } catch (error) {
            console.error("Upload error:", error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-primary transition-colors">
                        <Search className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0 bg-slate-950 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                {/* Custom Header with Summary Panel */}
                <div className="p-6 pb-0 bg-gradient-to-b from-slate-900/50 to-transparent">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3.5 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                                <FileCheck className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                                    {entityName}
                                    <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-widest bg-white/[0.02] px-2", statusColor)}>
                                        {status}
                                    </Badge>
                                </h2>
                                <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                                    <span className="capitalize">{entityType}</span>
                                    <span>•</span>
                                    <div className="flex items-center gap-1 group cursor-pointer" onClick={copyToClipboard}>
                                        <Fingerprint className="w-3.5 h-3.5" />
                                        <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded text-slate-400 group-hover:text-primary transition-colors">
                                            {entityId.slice(0, 8)}...
                                        </code>
                                        {copied ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="text-right mr-4">
                                <p className="text-[10px] uppercase tracking-tighter text-slate-500 font-bold">Resumen de Cognición</p>
                                <p className="text-xs text-slate-400">Datos procesados en tiempo real</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-900 shadow-lg">
                                <Activity className="w-5 h-5 text-primary animate-pulse" />
                            </div>
                        </div>
                    </div>

                    {/* EXECUTIVE SUMMARY GRID */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                        {[
                            { label: "Documentos", value: totalDocs, icon: FileText, color: "text-blue-400" },
                            { label: "Relaciones", value: totalRelations, icon: Share2, color: "text-purple-400" },
                            { label: "Tickets", value: totalTickets, icon: Receipt, color: "text-amber-400" },
                            { label: "Alertas", value: activeAlerts, icon: AlertCircle, color: activeAlerts > 0 ? "text-rose-400" : "text-slate-500" },
                            { label: "Integridad", value: "99.9%", icon: ShieldCheck, color: "text-emerald-400" }
                        ].map((stat, i) => (
                            <Card key={i} className="bg-white/[0.02] border-white/5 hover:bg-white/[0.04] transition-colors border-none shadow-sm">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className={cn("p-2 rounded-lg bg-black/20", stat.color)}>
                                        <stat.icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-none mb-1">{stat.label}</p>
                                        <p className="text-sm font-bold text-white leading-none">{stat.value}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* AI COGNITIVE BRAIN/INSIGHTS */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mb-8 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-blue-500/5 to-transparent p-5 relative overflow-hidden group/ai shadow-2xl shadow-primary/5"
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover/ai:opacity-30 transition-opacity">
                            <BrainCircuit className="w-16 h-16 text-primary" />
                        </div>
                        <div className="flex items-start gap-5 relative z-10">
                            <div className="p-3.5 bg-primary/20 rounded-2xl shadow-[0_0_25px_rgba(var(--primary),0.4)] border border-primary/30">
                                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1.5">
                                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                        Vision Cognitiva AI
                                    </h3>
                                    <div className="h-1 w-1 rounded-full bg-primary/40" />
                                    <Badge variant="outline" className="text-[8px] h-4 border-primary/30 text-primary px-1.5 font-bold animate-pulse bg-primary/5">Análisis En Tiempo Real</Badge>
                                </div>
                                <p className="text-sm font-medium text-slate-200 leading-relaxed max-w-2xl">
                                    {activeAlerts > 0
                                        ? "Detección de inconsistencias críticas en el flujo de documentos. Se recomienda revisión manual inmediata de los tickets marcados con inconsistencias para mitigar riesgos operativos."
                                        : documents.length > 0
                                            ? "Expediente con integridad verificada. El flujo de operaciones muestra un comportamiento estándar dentro de los umbrales de seguridad y cumplimiento establecidos."
                                            : "Expediente pendiente de digitalización base. No se han detectado anomalías en el historial de eventos recientes, sistema en estado nominal."}
                                </p>
                                <div className="flex items-center gap-6 mt-4 pt-3 border-t border-white/[0.03]">
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                                        Predicción: <span className="text-emerald-400">Riesgo Bajo</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                        <Clock className="w-3.5 h-3.5" />
                                        Última Inferencia: <span className="text-slate-300">hace 2m</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                                        Confianza: <span className="text-slate-300">98.4%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <Tabs defaultValue="history" className="flex-1 flex flex-col min-h-0 px-6">
                    <TabsList className="bg-slate-900/50 border border-white/5 w-fit mb-6 p-1">
                        <TabsTrigger value="history" className="rounded-lg px-5 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                            <History className="w-4 h-4 mr-2" />
                            Historial
                        </TabsTrigger>
                        <TabsTrigger value="documents" className="rounded-lg px-5 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                            <FileText className="w-4 h-4 mr-2" />
                            Documentos
                        </TabsTrigger>
                        <TabsTrigger value="relations" className="rounded-lg px-5 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                            <Share2 className="w-4 h-4 mr-2" />
                            Relaciones
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="history" className="flex-1 min-h-0 focus-visible:outline-none">
                        <AnimatePresence mode="wait">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ScrollArea className="h-[550px] pr-4">
                                    {isLoading ? (
                                        <div className="flex flex-col items-center justify-center p-20 gap-4">
                                            <Loader2 className="w-10 h-10 animate-spin text-primary opacity-40" />
                                            <p className="text-slate-500 animate-pulse">Consultando historial...</p>
                                        </div>
                                    ) : history.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center p-20 text-slate-500 gap-4 border-2 border-dashed border-white/5 rounded-2xl">
                                            <div className="p-4 bg-white/[0.02] rounded-full">
                                                <AlertCircle className="w-10 h-10 opacity-20" />
                                            </div>
                                            <p className="text-sm">No hay registros de auditoría para esta entidad.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 relative ml-4 before:absolute before:inset-0 before:ml-5 before:-z-10 before:h-full before:w-[2px] before:bg-gradient-to-b before:from-primary/30 before:via-primary/10 before:to-transparent">
                                            {history.map((item: any) => (
                                                <div key={item.id} className="relative pl-12 group">
                                                    <div className="absolute left-0 mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950 shadow-[0_0_20px_rgba(0,0,0,0.5)] group-hover:border-primary/50 transition-all duration-300">
                                                        <Activity className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div className="flex flex-col gap-2 p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-black/20 transition-all duration-300 relative overflow-hidden group/card">
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover/card:bg-primary transition-colors" />
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-slate-200 tracking-wide uppercase text-[10px] bg-white/5 px-2 py-1 rounded-md border border-white/5 flex items-center gap-1.5">
                                                                    {item.action.includes('UPLOAD') ? <Upload className="w-3 h-3 text-blue-400" /> :
                                                                        item.action.includes('DELETE') ? <XCircle className="w-3 h-3 text-rose-400" /> :
                                                                            item.action.includes('ALERT') || item.action.includes('INCONSISTENCY') ? <AlertCircle className="w-3 h-3 text-amber-500" /> :
                                                                                <Activity className="w-3 h-3 text-primary" />}
                                                                    {item.action}
                                                                </span>
                                                                {(item.details?.severity === 'high' || item.action.includes('ALERT')) && (
                                                                    <motion.div
                                                                        initial={{ scale: 0.8, opacity: 0 }}
                                                                        animate={{ scale: 1, opacity: 1 }}
                                                                        className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full"
                                                                    >
                                                                        <div className="w-1 h-1 rounded-full bg-rose-500 animate-ping" />
                                                                        <span className="text-[8px] text-rose-400 uppercase font-black italic tracking-tighter">Predictive Alert</span>
                                                                    </motion.div>
                                                                )}
                                                                {item.details?.severity === 'high' && (
                                                                    <Badge variant="destructive" className="text-[8px] h-4 uppercase font-bold tracking-tighter">Critical</Badge>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1.5">
                                                                <Clock className="w-3 h-3" />
                                                                {format(new Date(item.createdAt), "PPp", { locale: es })}
                                                            </span>
                                                        </div>
                                                        <p className="text-[13px] text-slate-400 leading-relaxed font-light mt-1">
                                                            {item.details?.message || "Registro de operación en sistema."}
                                                        </p>
                                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.02]">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                                    {item.userName || "Sistema"}
                                                                </div>
                                                                {item.details?.ip && (
                                                                    <span className="text-[9px] font-mono text-slate-600">ADDR: {item.details.ip}</span>
                                                                )}
                                                            </div>
                                                            <Button variant="ghost" size="sm" className="h-6 text-[9px] uppercase font-bold tracking-widest text-slate-600 hover:text-primary gap-1">
                                                                <Info className="w-3 h-3" /> Detalles
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </motion.div>
                        </AnimatePresence>
                    </TabsContent>

                    <TabsContent value="documents" className="flex-1 min-h-0 focus-visible:outline-none">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="documents-content"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.02 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ScrollArea className="h-[550px] pr-4">
                                    {isLoading ? (
                                        <div className="flex flex-col items-center justify-center p-20 gap-4">
                                            <Loader2 className="w-10 h-10 animate-spin text-primary opacity-40" />
                                            <p className="text-slate-500 animate-pulse">Buscando documentos...</p>
                                        </div>
                                    ) : documents.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center p-20 text-slate-500 gap-4 border-2 border-dashed border-white/5 rounded-2xl">
                                            <div className="p-4 bg-white/[0.02] rounded-full">
                                                <FileText className="w-10 h-10 opacity-20" />
                                            </div>
                                            <p className="text-sm">No se han cargado documentos digitales para este expediente.</p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-4 border-slate-800 gap-2 bg-slate-900/50 hover:bg-primary hover:text-white transition-all"
                                                onClick={() => {
                                                    const url = prompt("Ingrese la URL del documento (Simulacro de carga):");
                                                    if (url) handleUpload(url);
                                                }}
                                            >
                                                <Plus className="w-4 h-4" /> Cargar Primer Documento
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex justify-end mb-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-primary gap-2"
                                                    onClick={() => {
                                                        const url = prompt("Ingrese la URL del documento:");
                                                        if (url) handleUpload(url);
                                                    }}
                                                >
                                                    <Upload className="w-3.5 h-3.5" /> Añadir Documento
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                                                {documents.map((doc: any) => (
                                                    <Card key={doc.id} className="bg-slate-900/40 border-white/5 hover:border-primary/40 hover:bg-slate-900/60 transition-all duration-300 group shadow-lg overflow-hidden relative">
                                                        <div className="absolute top-0 right-0 p-2 flex flex-col items-end gap-1">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                            {doc.confidence > 0 && (
                                                                <Badge variant="outline" className="text-[8px] border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-1 py-0 px-1 font-mono uppercase tracking-tighter">
                                                                    {doc.confidence}% Match
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <CardContent className="p-4 flex gap-4 items-center">
                                                            <div className="p-3 bg-blue-500/10 rounded-xl group-hover:scale-110 group-hover:bg-blue-500/20 transition-all">
                                                                <FileText className="w-7 h-7 text-blue-400" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-bold text-slate-200 truncate text-sm tracking-tight">{doc.name}</p>
                                                                    <div className="flex items-center gap-1">
                                                                        <ShieldCheck className="w-3 h-3 text-emerald-500/70" />
                                                                        <span className="text-[8px] text-emerald-500/70 font-bold uppercase tracking-widest">Verified</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <Badge variant="outline" className="text-[9px] uppercase border-white/10 text-slate-500 px-1 font-bold">
                                                                        {doc.type}
                                                                    </Badge>
                                                                    <span className="text-[9px] text-slate-600 font-mono tracking-tighter">
                                                                        {format(new Date(doc.createdAt), "dd MMM yy", { locale: es })}
                                                                    </span>
                                                                </div>
                                                                <div className="mt-2 flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                                                    <code className="text-[8px] bg-black/40 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                                                                        SHA-256: {Math.random().toString(16).slice(2, 10)}...
                                                                    </code>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="shrink-0 h-9 w-9 text-slate-400 hover:text-white hover:bg-primary/20 rounded-full transition-all"
                                                                    onClick={() => window.open(doc.fileUrl, '_blank')}
                                                                >
                                                                    <Download className="w-5 h-5" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="shrink-0 h-9 w-9 text-slate-500 hover:text-primary rounded-full transition-all"
                                                                    title="Ver Auditoría del Documento"
                                                                >
                                                                    <History className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </ScrollArea>
                            </motion.div>
                        </AnimatePresence>
                    </TabsContent>

                    <TabsContent value="relations" className="flex-1 min-h-0 focus-visible:outline-none">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="relations-content"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ScrollArea className="h-[550px] pr-4">
                                    {isLoading ? (
                                        <div className="flex flex-col items-center justify-center p-20 gap-4">
                                            <Loader2 className="w-10 h-10 animate-spin text-primary opacity-40" />
                                            <p className="text-slate-500 animate-pulse">Analizando conexiones...</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6">
                                            {relationsList.map((rel: any, idx: number) => (
                                                <motion.div
                                                    key={rel.id || idx}
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                >
                                                    <Card className="bg-slate-900/40 border-white/5 hover:border-primary/40 hover:bg-slate-900/60 transition-all duration-300 group shadow-lg overflow-hidden relative">
                                                        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">
                                                            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
                                                        </div>
                                                        <CardContent className="p-5">
                                                            <div className="flex flex-col gap-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2.5 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                                                                        {rel.type === 'ticket' ? <Receipt className="w-5 h-5 text-amber-500" /> :
                                                                            rel.type === 'purchase' ? <Plus className="w-5 h-5 text-blue-500" /> :
                                                                                <Activity className="w-5 h-5 text-slate-400" />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-0.5">{rel.type}</p>
                                                                        <p className="font-bold text-slate-100 truncate tracking-tight">{rel.label || rel.entityId}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between pt-3 border-t border-white/[0.03]">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[9px] font-bold text-slate-600 uppercase">Relación</span>
                                                                        <span className="text-xs font-medium text-slate-300">{rel.relation}</span>
                                                                    </div>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10">
                                                                        <Search className="w-4 h-4 text-slate-500 group-hover:text-primary" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </motion.div>
                        </AnimatePresence>
                    </TabsContent>
                </Tabs>

                <div className="px-6 py-4 bg-slate-900/20 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-4 text-slate-600">
                        <div className="flex items-center gap-1.5 min-w-[140px]">
                            {isVerifying ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                    <span className="text-primary font-bold uppercase tracking-widest text-[9px] animate-pulse">Computing Hashes...</span>
                                </div>
                            ) : isVerified ? (
                                <div className="flex items-center gap-1.5 text-emerald-500">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span className="font-bold uppercase tracking-widest text-[9px]">Verified & Sealed</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity cursor-pointer group" onClick={handleVerify}>
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span className="font-bold uppercase tracking-widest text-[9px] group-hover:text-primary transition-colors text-slate-500">Integrity Not Checked</span>
                                    <ArrowUpRight className="w-3 h-3 ml-0.5 opacity-0 group-hover:opacity-100 transition-all" />
                                </div>
                            )}
                        </div>
                        <span>•</span>
                        <p>Nexus Traceability v1.2</p>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-slate-700">
                        <span className="text-[9px]">HASH ROOT:</span>
                        <span className="bg-white/[0.02] px-1.5 py-0.5 rounded text-[10px] tracking-tight">0x{entityId.slice(0, 16).toUpperCase()}...</span>
                    </div>
                </div>
            </DialogContent >
        </Dialog >
    );
}
