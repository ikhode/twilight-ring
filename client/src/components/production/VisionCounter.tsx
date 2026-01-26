import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Camera, StopCircle, RefreshCw } from 'lucide-react';

// For now, we simulate the TensorFlow detection to ensure the UI works before pulling in heavy deps
// In a real scenario: import * as cocoSsd from "@tensorflow-models/coco-ssd"; import "@tensorflow/tfjs";

export function VisionCounter({ onCountChange }: { onCountChange: (count: number) => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isActive, setIsActive] = useState(false);
    const [count, setCount] = useState(0);
    const [modelLoading, setModelLoading] = useState(false);
    const [detectedObjects, setDetectedObjects] = useState<string[]>([]);

    // Simulation interval ref
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const startCamera = async () => {
        setModelLoading(true);
        // Simulate model load
        await new Promise(r => setTimeout(r, 1000));
        setModelLoading(false);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsActive(true);

                // Start simulation of counting
                intervalRef.current = setInterval(() => {
                    // Determine if we "see" a coconut (randomly for demo)
                    if (Math.random() > 0.7) {
                        setCount(c => {
                            const newCount = c + 1;
                            onCountChange(newCount);
                            return newCount;
                        });
                        setDetectedObjects(["coco", "coco"]);
                        setTimeout(() => setDetectedObjects([]), 500);
                    }
                }, 2000); // Check every 2s
            }
        } catch (err) {
            console.error("Camera error", err);
            alert("No se pudo acceder a la cámara. Verifique los permisos.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsActive(false);
    };

    useEffect(() => {
        return () => {
            stopCamera();
        }
    }, []);

    return (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-emerald-500" />
                    Smart Vision Sensor
                </CardTitle>
                <CardDescription>Conteo automático mediante visión artificial</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-slate-800">
                    {!isActive && (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                            <p className="text-xs">Cámara Inactiva</p>
                        </div>
                    )}
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${isActive ? 'opacity-100' : 'opacity-0'}`}
                    />
                    {isActive && detectedObjects.length > 0 && (
                        <div className="absolute top-2 right-2 flex gap-1">
                            <Badge variant="secondary" className="bg-emerald-500/80 text-white animate-pulse">
                                Objeto Detectado
                            </Badge>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <p className="text-sm font-bold text-slate-200">Total Detectado</p>
                        <p className="text-2xl font-black text-emerald-400 font-mono">{count}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setCount(0); onCountChange(0); }}
                            disabled={count === 0}
                        >
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                        {!isActive ? (
                            <Button size="sm" onClick={startCamera} disabled={modelLoading} className="bg-emerald-600 hover:bg-emerald-700">
                                {modelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
                                Activar Sensor
                            </Button>
                        ) : (
                            <Button size="sm" variant="destructive" onClick={stopCamera}>
                                <StopCircle className="w-4 h-4 mr-2" />
                                Detener
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
