import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
    UserPlus,
    ScanFace,
    LayoutDashboard,
    LogOut,
    ChevronRight,
    Camera
} from "lucide-react";
import { KioskSession } from "../KioskInterface";
import { useLocation } from "wouter";

interface AdminTerminalProps {
    sessionContext: KioskSession;
    onLogout: () => void;
}

export default function AdminTerminal({ sessionContext, onLogout }: AdminTerminalProps) {
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [formData, setFormData] = useState({ name: "", email: "", role: "operator" });
    const [isCapturing, setIsCapturing] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);

    // Quick Links
    const links = [
        { title: "Dashboard Financiero", icon: LayoutDashboard, href: "/finance" },
        { title: "Gestión de Personal", icon: UserPlus, href: "/hr" },
        { title: "Inventario", icon: LayoutDashboard, href: "/logistics" },
    ];

    /* 
     * FACE ID LOGIC (Placeholder Mock)
     * In a real implementation:
     * 1. Load face-api.js models
     * 2. Detect face in video stream
     * 3. extracting 128-float descriptor
     * 4. sending descriptor to /api/kiosks/enroll
     */
    const startCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
            setIsCapturing(true);
        } catch (e) {
            toast({ title: "Error", description: "No se pudo acceder a la cámara", variant: "destructive" });
        }
    };

    const stopCamera = () => {
        stream?.getTracks().forEach(t => t.stop());
        setStream(null);
        setIsCapturing(false);
    };

    const enrollMutation = useMutation({
        mutationFn: async () => {
            // Simulate API call to enroll
            await new Promise(r => setTimeout(r, 1500));
            // Would post to /api/kiosks/enroll with formData + descriptor
            return { success: true };
        },
        onSuccess: () => {
            toast({ title: "Empleado Registrado", description: "Biometría facial vinculada correctamente." });
            setFormData({ name: "", email: "", role: "operator" });
            stopCamera();
        }
    });


    return (
        <div className="h-full flex flex-col gap-6 p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white">Terminal Administrativa</h1>
                    <p className="text-slate-400">Gestión y Altas</p>
                </div>
                <Button variant="outline" size="icon" onClick={onLogout}>
                    <LogOut className="w-4 h-4" />
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

                {/* Quick Actions */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle>Accesos Rápidos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {links.map((link, i) => (
                            <Button
                                key={i}
                                variant="ghost"
                                className="w-full justify-between h-14 bg-slate-950/30 hover:bg-primary/10 border border-slate-800 hover:border-primary/30"
                                onClick={() => setLocation(link.href)}
                            >
                                <span className="flex items-center gap-3">
                                    <link.icon className="w-5 h-5 text-slate-400" />
                                    {link.title}
                                </span>
                                <ChevronRight className="w-4 h-4 text-slate-500" />
                            </Button>
                        ))}
                    </CardContent>
                </Card>

                {/* Enrollment Form */}
                <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-primary" />
                            Alta de Empleado con Face ID
                        </CardTitle>
                        <CardDescription>Registre nuevos operadores directamente en planta</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nombre Completo</Label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej. María González"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email (Opcional)</Label>
                                <Input
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="contacto@ejemplo.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Rol</Label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="operator">Operador General</option>
                                    <option value="driver">Conductor</option>
                                    <option value="cashier">Cajero</option>
                                    <option value="manager">Supervisor</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label>Biometría Facial</Label>
                            <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-slate-700 flex items-center justify-center">
                                {!isCapturing ? (
                                    <ScanFace className="w-16 h-16 text-slate-600" />
                                ) : (
                                    <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
                                )}

                                {isCapturing && (
                                    <div className="absolute inset-0 border-2 border-primary/50 animate-pulse rounded-lg pointer-events-none" />
                                )}
                            </div>

                            {!isCapturing ? (
                                <Button className="w-full" variant="secondary" onClick={startCamera}>
                                    <Camera className="w-4 h-4 mr-2" />
                                    Activar Cámara
                                </Button>
                            ) : (
                                <Button className="w-full" onClick={() => enrollMutation.mutate()} disabled={enrollMutation.isPending}>
                                    {enrollMutation.isPending ? "Analizando y Guardando..." : "Capturar y Registrar"}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
