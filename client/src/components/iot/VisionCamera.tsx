import { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, Eye, RefreshCw, AlertTriangle } from "lucide-react";

interface DetectedObject {
  class: string;
  score: number;
}

export function VisionCamera() {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [detections, setDetections] = useState<DetectedObject[]>([]);
  const [active, setActive] = useState(true);

  // Load Model
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        const loadedModel = await cocoSsd.load();
        setModel(loadedModel);
        setIsLoaded(true);
        console.log("Vision Module: Coco-SSD Loaded");
      } catch (err) {
        console.error("Failed to load vision model", err);
      }
    };
    loadModel();
  }, []);

  // Detection Loop
  useEffect(() => {
    let animationFrameId: number;

    const detect = async () => {
        if (model && active && webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
            const video = webcamRef.current.video;
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;

            // Set canvas dimensions
            if (canvasRef.current) {
                canvasRef.current.width = videoWidth;
                canvasRef.current.height = videoHeight;
                
                const ctx = canvasRef.current.getContext("2d");
                if (ctx) {
                    ctx.clearRect(0, 0, videoWidth, videoHeight);
                    
                    const predictions = await model.detect(video);
                    
                    // Draw bounding boxes
                    const currentDetections: DetectedObject[] = [];
                    
                    predictions.forEach(prediction => {
                        const [x, y, width, height] = prediction.bbox;
                        const text = `${prediction.class} (${Math.round(prediction.score * 100)}%)`;
                        
                        // Draw box
                        ctx.strokeStyle = "#00FF00";
                        ctx.lineWidth = 2;
                        ctx.strokeRect(x, y, width, height);
                        
                        // Draw label bg
                        ctx.fillStyle = "#00FF00";
                        ctx.fillRect(x, y - 20, width, 20);
                        
                        // Draw text
                        ctx.font = "14px Arial";
                        ctx.fillStyle = "#000000";
                        ctx.fillText(text, x + 5, y - 5);

                        currentDetections.push({ 
                            class: prediction.class, 
                            score: prediction.score 
                        });
                    });

                    setDetections(currentDetections);
                }
            }
        }
        animationFrameId = requestAnimationFrame(detect);
    };

    if (isLoaded && active) {
        detect();
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [model, isLoaded, active]);

  return (
    <Card className="bg-slate-950/80 border-slate-800 overflow-hidden relative">
      <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-900/50">
        <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-green-400" />
            <CardTitle className="text-sm font-black uppercase tracking-widest text-white">Vision Module (IoT)</CardTitle>
        </div>
        <div className="flex gap-2">
             <Badge variant={isLoaded ? "default" : "secondary"} className={isLoaded ? "bg-green-500 hover:bg-green-600" : ""}>
                {isLoaded ? "ONLINE" : "INITIALIZING..."}
             </Badge>
             <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setActive(!active)}>
                {active ? <Eye className="w-4 h-4 text-green-400" /> : <Eye className="w-4 h-4 text-slate-600" />}
             </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative min-h-[300px] bg-black flex items-center justify-center">
         {!isLoaded && (
             <div className="flex flex-col items-center gap-2 text-slate-500 animate-pulse">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="text-xs font-bold uppercase">Cargando Red Neural...</span>
             </div>
         )}
         
         <Webcam
            ref={webcamRef}
            muted={true} 
            className="absolute inset-0 w-full h-full object-cover"
            videoConstraints={{ facingMode: "environment" }}
         />
         
         <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover z-10"
         />

         {/* HUD Overlay */}
         <div className="absolute bottom-4 left-4 right-4 z-20 flex gap-2 overflow-x-auto">
            {detections.length === 0 && isLoaded && (
                <div className="bg-black/50 text-white px-3 py-1 rounded-full text-xs border border-white/10 backdrop-blur-md flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-yellow-500" />
                    <span>Sin actividad detectada</span>
                </div>
            )}
            {detections.map((d, i) => (
                <div key={i} className="bg-green-900/80 text-green-100 px-3 py-1 rounded-full text-xs border border-green-500/50 backdrop-blur-md font-mono">
                    {d.class.toUpperCase()} {(d.score * 100).toFixed(0)}%
                </div>
            ))}
         </div>
         
         {/* Grid Line Overlay for "Tech" feel */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

      </CardContent>
    </Card>
  );
}
