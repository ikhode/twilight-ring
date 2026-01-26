import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    FileText,
    FileCheck,
    Scan,
    CheckCircle2,
    AlertCircle,
    File as FileIcon,
    Upload,
    ArrowRight,
    Loader2,
    Sparkles,
    Receipt,
    ScrollText,
    FileDigit,
    Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface BusinessDoc {
    id: string;
    name: string;
    type: string;
    status: string;
    extractedData: any;
    confidence: number;
    createdAt: string;
}

export default function Documents() {
    const { toast } = useToast();
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const [isDragging, setIsDragging] = useState(false);

    // 1. Fetch Documents
    const { data: documents = [], isLoading } = useQuery<BusinessDoc[]>({
        queryKey: ["/api/business-documents"],
        queryFn: async () => {
            if (!session?.access_token) return [];
            const res = await fetch("/api/business-documents", {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!session?.access_token,
        refetchInterval: 2000
    });

    // 2. Upload Mutation
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            if (!session?.access_token) throw new Error("No session");

            // Mock upload - in real app would use FormData
            const res = await fetch("/api/business-documents/upload", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    name: file.name,
                    fileUrl: "mock_url",
                    userId: session.user.id
                })
            });
            if (!res.ok) throw new Error("Upload failed");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/business-documents"] });
            toast({ title: "Iniciando análisis", description: "El documento está siendo procesado por IA" });
        }
    });

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) uploadMutation.mutate(file);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "invoice": return <Receipt className="w-5 h-5 text-blue-500" />;
            case "contract": return <ScrollText className="w-5 h-5 text-purple-500" />;
            case "tax_id": return <Scan className="w-5 h-5 text-emerald-500" />;
            case "identification": return <Users className="w-5 h-5 text-amber-500" />;
            default: return <FileIcon className="w-5 h-5 text-gray-500" />;
        }
    };



    return (
        <AppLayout title="Gestión Documental" subtitle="Smart Inbox & Procesamiento Inteligente">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">

                {/* Left: Upload & Pending Pipeline */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Upload Zone */}
                    <Card
                        className={cn(
                            "border-2 border-dashed transition-all cursor-pointer h-40 flex flex-col items-center justify-center",
                            isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-muted hover:border-primary/50"
                        )}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <div className="p-3 bg-muted rounded-full">
                                <Upload className="w-6 h-6" />
                            </div>
                            <p className="font-medium">Arrastra tus archivos aquí</p>
                            <p className="text-xs">Soporta PDF, JPG, PNG (Detecta Facturas, Contratos)</p>
                        </div>
                    </Card>

                    {/* Processing Pipeline */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Scan className="w-4 h-4 text-primary" />
                            Cola de Procesamiento ({documents.filter(d => d.status === "processing").length})
                        </h3>

                        <ScrollArea className="flex-1 pr-4">
                            <AnimatePresence mode="popLayout">
                                {documents.filter(d => d.status === "processing").map(doc => (
                                    <motion.div
                                        key={doc.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="mb-3"
                                    >
                                        <Card className="border-l-4 border-l-yellow-500 bg-muted/30">
                                            <CardContent className="p-4 flex items-center gap-4">
                                                <div className="relative">
                                                    <FileText className="w-8 h-8 text-yellow-600 opacity-50" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-medium">{doc.name}</h4>
                                                    <p className="text-xs text-muted-foreground animate-pulse">Analizando contenido y extrayendo datos...</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}

                                {documents.filter(d => d.status === "processing").length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg border-dashed">
                                        No hay documentos procesándose actualmente
                                    </div>
                                )}
                            </AnimatePresence>
                        </ScrollArea>
                    </div>
                </div>

                {/* Right: Analyzed Items (Inbox) */}
                <div className="bg-card border rounded-xl overflow-hidden flex flex-col h-full">
                    <div className="p-4 border-b bg-muted/20">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-yellow-500" />
                            Smart Inbox ({documents.filter(d => d.status === "analyzed").length})
                        </h3>
                    </div>

                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-3">
                            {documents.filter(d => d.status === "analyzed" || d.status === "verified").map(doc => (
                                <motion.div key={doc.id} layout>
                                    <Card className="hover:bg-muted/50 transition-colors group">
                                        <CardContent className="p-3">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {getTypeIcon(doc.type)}
                                                    <Badge variant="outline" className="capitalize text-[10px] h-5">
                                                        {doc.type}
                                                    </Badge>
                                                </div>
                                                {doc.confidence > 80 && (
                                                    <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 hover:bg-green-500/20">
                                                        {doc.confidence}% Confianza
                                                    </Badge>
                                                )}
                                            </div>

                                            <h4 className="font-medium text-sm truncate mb-1" title={doc.name}>
                                                {doc.name}
                                            </h4>

                                            {/* Extracted Data Preview */}
                                            <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-2 rounded border border-dashed mb-3">
                                                {doc.type === "invoice" && (
                                                    <>
                                                        <div className="flex justify-between">
                                                            <span>Monto:</span>
                                                            <span className="font-mono text-foreground">${doc.extractedData?.amount}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Proveedor:</span>
                                                            <span className="text-foreground">{doc.extractedData?.supplier}</span>
                                                        </div>
                                                    </>
                                                )}
                                                {doc.type === "tax_id" && (
                                                    <>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-bold text-foreground text-[10px] leading-tight">{doc.extractedData?.razonSocial}</span>
                                                            <div className="flex justify-between">
                                                                <span>RFC:</span>
                                                                <span className="font-mono text-foreground">{doc.extractedData?.rfc}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>CP:</span>
                                                                <span className="text-foreground">{doc.extractedData?.cp}</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                                {doc.type === "identification" && (
                                                    <>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-bold text-foreground text-amber-500 text-[10px]">{doc.extractedData?.nombre}</span>
                                                            <div className="flex justify-between">
                                                                <span>CURP:</span>
                                                                <span className="font-mono text-foreground">{doc.extractedData?.curp}</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                                {doc.type === "contract" && (
                                                    <>
                                                        <div className="flex justify-between">
                                                            <span>Parte:</span>
                                                            <span className="text-foreground">{doc.extractedData?.party}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            <Button size="sm" className="w-full h-8 text-xs gap-2" variant={doc.type === 'tax_id' ? 'default' : 'secondary'}
                                                onClick={() => {
                                                    if (doc.type === 'tax_id') toast({ title: "Cliente Creado", description: `${doc.extractedData?.razonSocial || 'Cliente'} ha sido registrado.` });
                                                    if (doc.type === 'identification') toast({ title: "Empleado Vinculado", description: "Datos personales actualizados." });
                                                    if (doc.type === 'invoice') toast({ title: "Gasto Registrado", description: "Factura procesada y enviada a contabilidad." });
                                                }}
                                            >
                                                {doc.type === "invoice" && <><CheckCircle2 className="w-3 h-3" /> Crear Gasto</>}
                                                {doc.type === "tax_id" && <><CheckCircle2 className="w-3 h-3" /> Crear Cliente</>}
                                                {doc.type === "identification" && <><CheckCircle2 className="w-3 h-3" /> Alta Empleado</>}
                                                {doc.type === "contract" && <><CheckCircle2 className="w-3 h-3" /> Validar</>}
                                                {doc.type === "receipt" && <><CheckCircle2 className="w-3 h-3" /> Procesar</>}
                                                {!["invoice", "tax_id", "identification", "contract", "receipt"].includes(doc.type) && <><CheckCircle2 className="w-3 h-3" /> Procesar</>}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}

                            {documents.filter(d => d.status === "analyzed").length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                                        <CheckCircle2 className="w-6 h-6 opacity-20" />
                                    </div>
                                    <p className="text-sm">Bandeja limpia</p>
                                    <p className="text-xs opacity-50">Sube documentos para comenzar</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

            </div>
        </AppLayout>
    );
}
