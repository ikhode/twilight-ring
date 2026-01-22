
import { useState, useRef, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, CheckCircle2, AlertCircle } from "lucide-react";
import Webcam from "react-webcam";
import { faceApiService } from "@/lib/face-api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Employee } from "@shared/schema";

interface FaceEnrollmentDialogProps {
    employee: Employee | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function FaceEnrollmentDialog({ employee, open, onOpenChange }: FaceEnrollmentDialogProps) {
    const [isCapturing, setIsCapturing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [descriptor, setDescriptor] = useState<number[] | null>(null);
    const webcamRef = useRef<Webcam>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const enrollMutation = useMutation({
        mutationFn: async (faceDescriptor: number[]) => {
            const res = await fetch(`/api/kiosks/enroll`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employeeId: employee?.id,
                    descriptor: faceDescriptor,
                }),
            });
            if (!res.ok) throw new Error("Enrollment failed");
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Registro Biométrico Exitoso",
                description: `Se ha registrado el FaceID para ${employee?.name}.`,
            });
            queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
            onOpenChange(false);
            reset();
        },
        onError: (err: any) => {
            toast({
                title: "Error de Registro",
                description: err.message,
                variant: "destructive",
            });
            reset();
        },
    });

    const reset = () => {
        setIsCapturing(false);
        setIsProcessing(false);
        setDescriptor(null);
    };

    const capture = useCallback(async () => {
        if (!webcamRef.current) return;

        setIsProcessing(true);
        try {
            // Get image from webcam
            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) throw new Error("Could not capture image from webcam");

            // Create a temporary image element to process
            const img = new Image();
            img.src = imageSrc;
            await new Promise((resolve) => (img.onload = resolve));

            // Get descriptor
            const desc = await faceApiService.getFaceDescriptor(img);
            if (!desc) {
                toast({
                    title: "Rostro no detectado",
                    description: "Por favor, asegúrate de estar frente a la cámara en un lugar iluminado.",
                    variant: "destructive",
                });
                return;
            }

            setDescriptor(faceApiService.descriptorToArray(desc));
        } catch (error) {
            console.error("Capture error:", error);
            toast({
                title: "Error de Cámara",
                description: "No se pudo procesar la imagen.",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    }, [webcamRef, toast]);

    if (!employee) return null;

    return (
        <Dialog open={open} onOpenChange={(v) => {
            if (!v) reset();
            onOpenChange(v);
        }}>
            <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Camera className="w-5 h-5 text-primary" />
                        Enrolamiento FaceID
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Registra la firma biométrica para <strong>{employee.name}</strong>.
                        Asegúrate de una buena iluminación.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 flex flex-col items-center justify-center space-y-4">
                    <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-slate-800 bg-slate-950 flex items-center justify-center">
                        {!descriptor ? (
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                videoConstraints={{
                                    width: 400,
                                    height: 400,
                                    facingMode: "user",
                                }}
                                className="w-full h-full object-cover grayscale brightness-110 contrast-125"
                            />
                        ) : (
                            <div className="flex flex-col items-center text-center space-y-2">
                                <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-bounce" />
                                <p className="text-sm font-bold uppercase tracking-widest text-emerald-500">
                                    Firma Capturada
                                </p>
                            </div>
                        )}

                        {isProcessing && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center space-y-2">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                <span className="text-[10px] uppercase tracking-widest font-bold">Procesando Red Neuronal...</span>
                            </div>
                        )}
                    </div>

                    {!descriptor && (
                        <p className="text-xs text-slate-500 italic text-center px-8">
                            Ubica el rostro dentro del círculo y presiona "Capturar Firma"
                        </p>
                    )}
                </div>

                <DialogFooter className="sm:justify-center gap-2">
                    {!descriptor ? (
                        <Button
                            className="w-full bg-primary hover:bg-primary/90 text-black font-bold uppercase"
                            onClick={capture}
                            disabled={isProcessing}
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
                            Capturar Firma
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                className="border-slate-700 text-slate-400 hover:bg-slate-800"
                                onClick={() => setDescriptor(null)}
                            >
                                Reintentar
                            </Button>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase"
                                onClick={() => enrollMutation.mutate(descriptor)}
                                disabled={enrollMutation.isPending}
                            >
                                {enrollMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                Guardar Biometría
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
