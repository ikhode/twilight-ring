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
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

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
        <Card className={cn("h-full flex flex-col", className)}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FolderOpen className="w-5 h-5 text-primary" />
                            {label}
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {documents.length} documentos almacenados
                        </CardDescription>
                    </div>
                    <div>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => document.getElementById(`upload-${entityId}`)?.click()}>
                            <Upload className="w-3.5 h-3.5" />
                            Subir
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

            <CardContent className="flex-1 min-h-0 flex flex-col gap-4">
                {/* Drop Zone */}
                <div
                    className={cn(
                        "border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer",
                        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
                    )}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                >
                    <p className="text-xs text-muted-foreground">
                        {uploadMutation.isPending ? "Subiendo..." : "Arrastra archivos aquí"}
                    </p>
                </div>

                {/* Document List */}
                <ScrollArea className="flex-1 -mx-2 px-2">
                    <div className="space-y-2">
                        {isLoading && <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />}

                        {!isLoading && documents.length === 0 && (
                            <div className="text-center py-6">
                                <p className="text-xs text-muted-foreground italic">El expediente está vacío.</p>
                            </div>
                        )}

                        {documents.map((doc) => (
                            <div key={doc.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors group">
                                <div className="mt-1">
                                    {doc.type === 'invoice' ? <Receipt className="w-4 h-4 text-blue-400" /> :
                                        doc.type === 'contract' ? <ScrollText className="w-4 h-4 text-purple-400" /> :
                                            <FileText className="w-4 h-4 text-slate-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm font-medium truncate pr-2">{doc.name}</p>
                                        <Badge variant="secondary" className={cn("text-[9px] px-1 h-4", getStatusColor(doc.status))}>
                                            {doc.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-muted-foreground">
                                            {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true, locale: es })}
                                        </span>
                                        {doc.confidence > 0 && (
                                            <span className="text-[10px] text-emerald-500 font-mono flex items-center gap-0.5">
                                                <CheckCircle2 className="w-3 h-3" />
                                                {doc.confidence}% IA
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Button size="icon" variant="ghost" className="w-6 h-6 opacity-0 group-hover:opacity-100">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
