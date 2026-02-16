import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Camera, CreditCard } from "lucide-react";
import Webcam from "react-webcam";

export function ScannerDialog({ onScan }: { onScan: (code: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [cameraError, setCameraError] = useState(false);

    const handleSimulate = () => {
        // Simulate a common product barcode or allow user to type
        const mockCode = "7501055310806"; // Example EAN for Coca Cola or similar
        onScan(mockCode);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0" title="Escanear Código de Barras">
                    <Camera className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Escanear Producto</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center space-y-4 py-4">
                    {!cameraError ? (
                        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-slate-700">
                            <Webcam
                                audio={false}
                                className="w-full h-full object-cover"
                                screenshotFormat="image/jpeg"
                                onUserMediaError={() => setCameraError(true)}
                                videoConstraints={{ facingMode: "environment" }}
                            />
                            <div className="absolute inset-0 border-2 border-red-500/50 opacity-50 m-8 rounded-lg pointer-events-none animate-pulse" />
                            <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/80 bg-black/50 py-1">
                                Apunte la cámara al código de barras
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-48 bg-muted flex items-center justify-center rounded-lg border border-dashed">
                            <p className="text-muted-foreground text-sm px-4 text-center">
                                No se pudo acceder a la cámara. Verifique los permisos.
                            </p>
                        </div>
                    )}

                    <div className="flex gap-2 w-full">
                        <Button onClick={handleSimulate} className="w-full" variant="secondary">
                            <CreditCard className="w-4 h-4 mr-2" />
                            Simular Lectura (Demo)
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
