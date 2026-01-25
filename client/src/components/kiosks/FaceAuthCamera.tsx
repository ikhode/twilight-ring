
import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import { faceApiService } from "@/lib/face-api";
import { Loader2, Camera, Shield, UserCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FaceAuthCameraProps {
    onAuthenticated: (employee: any) => void;
    terminalId: string;
}

export function FaceAuthCamera({ onAuthenticated, terminalId }: FaceAuthCameraProps) {
    const webcamRef = useRef<Webcam>(null);
    const [status, setStatus] = useState<'idle' | 'scanning' | 'verifying' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const statusRef = useRef(status);
    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    // Auto-scan loop
    useEffect(() => {
        const scan = async () => {
            if (!webcamRef.current || statusRef.current === 'verifying' || statusRef.current === 'success') return;

            try {
                const imageSrc = webcamRef.current.getScreenshot();
                if (!imageSrc) return;

                const img = new Image();
                img.src = imageSrc;
                await new Promise((resolve) => (img.onload = resolve));

                const descriptor = await faceApiService.getFaceDescriptor(img);

                if (descriptor && (statusRef.current as any) !== 'verifying' && (statusRef.current as any) !== 'success') {
                    setStatus('verifying');
                    // Send descriptor to backend
                    const res = await fetch('/api/kiosks/identify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            descriptor: faceApiService.descriptorToArray(descriptor),
                            terminalId
                        })
                    });

                    if (res.ok) {
                        const employee = await res.json();
                        setStatus('success');
                        onAuthenticated(employee);
                    } else {
                        setStatus('error');
                        setErrorMsg('Persona no reconocida');
                        setTimeout(() => setStatus('idle'), 2000);
                    }
                }
            } catch (err) {
                console.error('Scan error:', err);
            }
        };

        const intervalId = setInterval(scan, 2000); // Scan every 2 seconds
        return () => clearInterval(intervalId);
    }, [terminalId, onAuthenticated]);

    const manualScan = async () => {
        if (!webcamRef.current) return;
        setStatus('scanning');
        try {
            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) return;

            const img = new Image();
            img.src = imageSrc;
            await new Promise((resolve) => (img.onload = resolve));

            const descriptor = await faceApiService.getFaceDescriptor(img);

            if (!descriptor) {
                setStatus('error');
                setErrorMsg('No se detecta rostro. Ajuste posición.');
                setTimeout(() => setStatus('idle'), 2000);
                return;
            }

            setStatus('verifying');
            const res = await fetch('/api/kiosks/identify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    descriptor: faceApiService.descriptorToArray(descriptor),
                    terminalId
                })
            });

            if (res.ok) {
                const employee = await res.json();
                setStatus('success');
                onAuthenticated(employee);
            } else {
                setStatus('error');
                setErrorMsg('Persona no reconocida');
                setTimeout(() => setStatus('idle'), 2000);
            }
        } catch (err) {
            console.error('Manual scan error:', err);
            setStatus('error');
            setErrorMsg('Error de conexión o cámara');
            setTimeout(() => setStatus('idle'), 2000);
        }
    };

    return (
        <div className="relative w-full max-w-sm mx-auto overflow-hidden">
            <div className={cn(
                "relative aspect-square rounded-[80px] overflow-hidden border-8 transition-all duration-500 cursor-pointer active:scale-95",
                status === 'success' ? "border-emerald-500 scale-105" :
                    status === 'error' ? "border-red-500" :
                        status === 'verifying' ? "border-primary animate-pulse" : "border-white/5 hover:border-primary/50"
            )} onClick={manualScan}>
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                        width: 600,
                        height: 600,
                        facingMode: "user",
                    }}
                    className="w-full h-full object-cover grayscale brightness-110 contrast-125 scale-110"
                />

                {/* Overlay Scanner UI */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {/* Scanning Frame */}
                    <div className="w-48 h-48 border-2 border-primary/30 rounded-full flex items-center justify-center">
                        <div className="w-full h-1 bg-primary/20 absolute animate-scan" />
                    </div>
                </div>

                {/* HUD Stats */}
                <div className="absolute top-6 left-6 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Biometric Link: Active</span>
                </div>

                {/* Status Messages */}
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-6 text-center">
                    {status === 'verifying' && (
                        <>
                            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                            <p className="text-sm font-black uppercase tracking-[0.2em]">Verificando Identidad...</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <UserCheck className="w-16 h-16 text-emerald-500 mb-4 animate-bounce" />
                            <p className="text-xl font-black uppercase tracking-widest text-emerald-500">Acceso Autorizado</p>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                            <p className="text-sm font-black uppercase tracking-widest text-red-500">{errorMsg}</p>
                        </>
                    )}

                    {status === 'idle' || status === 'scanning' ? (
                        <div className="mt-48 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 group-hover:bg-primary/20 transition-colors">
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Tocá aquí para escanear</p>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="mt-8 flex items-center justify-between px-4">
                <div className="flex flex-col">
                    <span className="text-[8px] uppercase tracking-widest opacity-40">Security Protocol</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">AES-256 Biometric Stream</span>
                </div>
                <div className="flex items-center gap-2 text-primary">
                    <Shield className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest tracking-widest">Nexus Guard</span>
                </div>
            </div>
        </div>
    );
}
