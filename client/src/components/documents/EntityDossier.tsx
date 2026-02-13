import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
    FileText, Upload, Trash2, ExternalLink,
    Receipt, ScrollText, AlertCircle, CheckCircle2, Loader2,
    FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface BusinessDoc {
    id: string;
    name: string;
    type: string;
    status: string;
    fileUrl: string;
    extractedData: any;
    confidence: number;
    createdAt: string;
}

interface EntityDossierProps {
    entityId: string;
    entityType: "employee" | "supplier" | "customer" | "transaction";
    label: string; // e.g., "Expediente del Empleado"
    className?: string;
}

export function EntityDossier({ entityId, entityType, label, className }: EntityDossierProps) {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDragging, setIsDragging] = useState(false);

    // Fetch Linked Documents
    const { data: documents = [], isLoading } = useQuery<BusinessDoc[]>({
        queryKey: [`/api/business-documents`, entityId],
        queryFn: async () => {
            if (!session?.access_token) return [];
            const res = await fetch(`/api/business-documents?entityId=${entityId}&entityType=${entityType}`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            return res.json();
        },
        refetchInterval: 3000 // Poll for updates
    });

    // Upload Mutation
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const res = await fetch("/api/business-documents/upload", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    name: file.name,
                    fileUrl: "mock_url", // Replace with real S3 url
                    userId: session?.user?.id,
                    entityId,
                    entityType
                })
            });
            if (!res.ok) throw new Error("Upload failed");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/business-documents`, entityId] });
            toast({ title: "Documento agregado", description: "Se ha vinculado al expediente correctamente." });
        }
    });

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) uploadMutation.mutate(file);
    };

    const getStatusColor = (status: string) => {
        if (status === 'processing') return "text-amber-500 bg-amber-500/10";
        if (status === 'analyzed') return "text-blue-500 bg-blue-500/10";
        if (status === 'verified') return "text-emerald-500 bg-emerald-500/10";
        return "text-slate-500 bg-slate-500/10";
    };

    return (
        <Card className={cn("h-full flex flex-col bg-slate-950/20 border-white/5 shadow-2xl overflow-hidden", className)}>
            <CardHeader className="pb-3 bg-gradient-to-b from-primary/5 to-transparent">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2 font-bold tracking-tight">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <FolderOpen className="w-5 h-5 text-primary" />
                            </div>
                            {label}
                        </CardTitle>
                        <CardDescription className="text-xs font-medium text-slate-500 mt-1">
                            <span className="text-primary font-bold">{documents.length}</span> documentos vinculados al expediente
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="h-9 px-3 text-xs gap-2 font-bold uppercase tracking-widest text-slate-400 hover:text-primary hover:bg-primary/5 transition-all" onClick={() => document.getElementById(`upload-${entityId}`)?.click()}>
                            <Upload className="w-4 h-4" />
                            Cargar
                        </Button>
                        <input
                            id={`upload-${entityId}`}
                            type="file"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && uploadMutation.mutate(e.target.files[0])}
                        />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 min-h-0 flex flex-col gap-5 p-6">
                {/* Drop Zone */}
                <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={cn(
                        "border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer relative overflow-hidden group/drop",
                        isDragging ? "border-primary bg-primary/10 ring-4 ring-primary/5" : "border-white/5 bg-white/[0.02] hover:border-primary/40 hover:bg-white/[0.04]"
                    )}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById(`upload-${entityId}`)?.click()}
                >
                    <div className="relative z-10 flex flex-col items-center gap-2">
                        <div className="p-3 bg-primary/10 rounded-full group-hover/drop:scale-110 transition-transform">
                            <Upload className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-300">
                                {uploadMutation.isPending ? "Subiendo archivo..." : "Cargar Documento Digital"}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">
                                PDF, JPG, PNG • Max 10MB
                            </p>
                        </div>
                    </div>
                    {isDragging && (
                        <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                    )}
                </motion.div>

                {/* Document List */}
                <div className="flex-1 min-h-0">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h4 className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500">Documentos Recientes</h4>
                        <div className="h-[1px] flex-1 bg-white/5 mx-4" />
                    </div>
                    <ScrollArea className="h-full -mx-2 px-2">
                        <div className="space-y-3 pb-4">
                            {isLoading && (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary opacity-40" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 animate-pulse">Analizando repositorio...</p>
                                </div>
                            )}

                            {!isLoading && documents.length === 0 && (
                                <div className="text-center py-12 border border-white/5 rounded-2xl bg-white/[0.01]">
                                    <div className="p-4 bg-white/[0.02] w-fit mx-auto rounded-full mb-3">
                                        <FolderOpen className="w-8 h-8 text-slate-700" />
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium italic">El expediente no contiene registros digitales.</p>
                                </div>
                            )}

                            <AnimatePresence>
                                {documents.map((doc, idx) => (
                                    <motion.div
                                        key={doc.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/30 transition-all duration-300 group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-1">
                                            <div className="h-1 w-1 rounded-full bg-emerald-500" />
                                        </div>
                                        <div className="mt-1 p-2.5 bg-slate-900 rounded-lg group-hover:bg-slate-800 transition-colors">
                                            {doc.type === 'invoice' ? <Receipt className="w-5 h-5 text-blue-400" /> :
                                                doc.type === 'contract' ? <ScrollText className="w-5 h-5 text-purple-400" /> :
                                                    <FileText className="w-5 h-5 text-slate-400" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <p className="text-sm font-bold text-slate-200 truncate pr-2 tracking-tight group-hover:text-primary transition-colors">
                                                    {doc.name}
                                                </p>
                                                <Badge variant="outline" className={cn("text-[9px] px-1.5 h-4 font-bold uppercase tracking-tighter border-none", getStatusColor(doc.status))}>
                                                    {doc.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                                                    {format(new Date(doc.createdAt), "dd LLL yyyy", { locale: es })}
                                                </span>
                                                <span className="text-slate-800">•</span>
                                                {doc.confidence > 0 && (
                                                    <span className="text-[10px] text-emerald-500/80 font-bold flex items-center gap-1 uppercase tracking-tighter">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        {doc.confidence}% IA
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full hover:bg-primary/20 hover:text-white" onClick={() => window.open(doc.fileUrl, '_blank')}>
                                                <ExternalLink className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full hover:bg-rose-500/20 hover:text-rose-400">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
    );
}
