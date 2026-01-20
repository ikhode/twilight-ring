
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    FileText,
    FileCheck,
    Sparkles,
    Scan,
    CheckCircle2,
    AlertCircle,
    File,
    Search,
    Upload,
    ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Documents() {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedFile, setProcessedFile] = useState<any>(null);
    const [documents, setDocuments] = useState([
        { id: 1, name: "Factura_Prov_A.pdf", type: "invoice", date: "2024-05-12", status: "processed", meta: { amount: "$5,200", supplier: "Office Depot" } },
        { id: 2, name: "Contrato_Laboral.docx", type: "contract", date: "2024-05-10", status: "processed", meta: { employee: "Juan Perez" } },
    ]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        simulateOCR(e.dataTransfer.files[0]);
    };

    const simulateOCR = (file: File) => {
        setIsProcessing(true);
        // Simulate AI Latency
        setTimeout(() => {
            setIsProcessing(false);
            setProcessedFile({
                name: file.name,
                type: "invoice",
                confidence: 98,
                extracted: {
                    supplier: "Amazon Web Services",
                    amount: "$153.20",
                    date: "2024-05-18",
                    invoiceId: "INV-99283"
                }
            });
        }, 2500);
    };

    const saveDocument = () => {
        if (!processedFile) return;
        setDocuments(prev => [{
            id: Date.now(),
            name: processedFile.name,
            type: processedFile.type,
            date: new Date().toISOString().split('T')[0],
            status: "processed",
            meta: { amount: processedFile.extracted.amount, supplier: processedFile.extracted.supplier }
        }, ...prev]);
        setProcessedFile(null);
    };

    return (
        <AppLayout title="Documentos Inteligentes" subtitle="Digitalización y extracción de datos (OCR)">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Upload Area */}
                <div className="lg:col-span-2 space-y-6">
                    <Card
                        className={cn(
                            "border-dashed border-2 transition-all h-[300px] flex flex-col items-center justify-center text-center p-8 bg-slate-900/30",
                            isDragging ? "border-primary bg-primary/5" : "border-slate-800",
                            isProcessing && "opacity-50 pointer-events-none"
                        )}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        {isProcessing ? (
                            <div className="space-y-4 animate-pulse">
                                <Scan className="w-16 h-16 text-indigo-400 mx-auto animate-spin-slow" />
                                <div>
                                    <h3 className="text-xl font-bold text-indigo-400">Analizando Documento...</h3>
                                    <p className="text-slate-400">Extrayendo entidades con TensorFlow</p>
                                </div>
                            </div>
                        ) : processedFile ? (
                            <div className="space-y-6 w-full max-w-md">
                                <div className="flex items-center justify-center gap-2 text-emerald-400 mb-2">
                                    <CheckCircle2 className="w-6 h-6" />
                                    <span className="font-bold">Análisis Completado</span>
                                </div>

                                <Card className="bg-slate-900 border-indigo-500/30 overflow-hidden">
                                    <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                                    <CardContent className="p-4 space-y-4 text-left">
                                        <div className="flex items-center justify-between">
                                            <Badge variant="outline" className="border-indigo-500/30 text-indigo-400">
                                                <Sparkles className="w-3 h-3 mr-1" /> OCR Confidence: {processedFile.confidence}%
                                            </Badge>
                                            <span className="text-xs text-slate-500">{processedFile.name}</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-slate-500 text-xs">Proveedor</p>
                                                <p className="font-semibold text-slate-200">{processedFile.extracted.supplier}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 text-xs">Monto Total</p>
                                                <p className="font-bold text-emerald-400 text-lg">{processedFile.extracted.amount}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 text-xs">Factura #</p>
                                                <p className="font-mono text-slate-300">{processedFile.extracted.invoiceId}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 text-xs">Fecha</p>
                                                <p className="text-slate-300">{processedFile.extracted.date}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex gap-3">
                                    <Button variant="outline" className="flex-1" onClick={() => setProcessedFile(null)}>Descartar</Button>
                                    <Button className="flex-1 gap-2" onClick={saveDocument}>
                                        <CheckCircle2 className="w-4 h-4" /> Validar y Guardar
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                                    <Upload className="w-10 h-10 text-slate-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-200">Arrastra tus archivos aquí</h3>
                                    <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                                        Soporta PDF, PNG, JPG. La IA detectará automáticamente si es una factura, contrato o recibo.
                                    </p>
                                </div>
                                <Button variant="secondary" className="mt-6">Seleccionar Archivos</Button>
                            </>
                        )}
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { label: "Facturas Procesadas", value: "1,203", icon: FileText, color: "text-indigo-400" },
                            { label: "Ahorro de Tiempo", value: "45h", icon: Sparkles, color: "text-emerald-400" },
                            { label: "Errores Prevenidos", value: "12", icon: AlertCircle, color: "text-amber-400" },
                        ].map((stat, i) => (
                            <Card key={i} className="bg-slate-900/50 border-slate-800">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className={`p-3 rounded-lg bg-slate-950 ${stat.color}`}>
                                        <stat.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-200">{stat.value}</p>
                                        <p className="text-xs text-slate-500">{stat.label}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Recent List */}
                <div className="space-y-6">
                    <Card className="h-full bg-slate-900/50 border-slate-800 flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase text-slate-400">Recientes</CardTitle>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                                <input className="w-full bg-slate-950 border border-slate-800 rounded-md py-1.5 pl-8 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 rounded-lg" placeholder="Buscar..." />
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0">
                            <ScrollArea className="h-[400px]">
                                <div className="divide-y divide-white/5">
                                    {documents.map(doc => (
                                        <div key={doc.id} className="p-4 hover:bg-white/5 transition-colors cursor-pointer group">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 rounded bg-slate-800 text-indigo-400 group-hover:text-indigo-300 transition-colors">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-200 truncate">{doc.name}</p>
                                                    <p className="text-xs text-slate-500 capitalize">{doc.type} • {doc.date}</p>
                                                    {doc.meta.amount && (
                                                        <p className="text-xs font-mono font-bold text-emerald-500 mt-1">{doc.meta.amount}</p>
                                                    )}
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-slate-700 group-hover:text-slate-400" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
