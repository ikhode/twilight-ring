import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, AlertCircle, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function TerminalLink() {
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [error, setError] = useState<string | null>(null);
    const [terminalName, setTerminalName] = useState<string | null>(null);

    useEffect(() => {
        async function bindDevice() {
            try {
                const params = new URLSearchParams(window.location.search);
                const token = params.get("token");

                if (!token) {
                    setError("Token de vinculación no encontrado");
                    setStatus("error");
                    return;
                }

                // 1. Generate or retrieve hardware salt
                let salt = localStorage.getItem("nexus_terminal_salt");
                if (!salt) {
                    salt = crypto.randomUUID();
                    localStorage.setItem("nexus_terminal_salt", salt);
                }

                // 2. Simple browser fingerprint (can be improved)
                const deviceId = `${navigator.userAgent}-${screen.width}x${screen.height}`;

                // 3. Call backend to bind
                const res = await fetch("/api/kiosks/bind", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token, deviceId, salt }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.message || "Error al vincular el dispositivo");
                }

                const data = await res.json();
                setTerminalName(data.name);

                // Store the credentials for the Kiosk Interface
                localStorage.setItem("kiosk_device_id", deviceId);
                localStorage.setItem("kiosk_device_salt", salt);

                setStatus("success");

                toast({
                    title: "Vínculo Seguro Establecido",
                    description: "Este dispositivo ahora es una terminal autorizada.",
                });

                // Redirect after a short delay
                setTimeout(() => {
                    setLocation(`/kiosk-terminal/${data.terminalId}`);
                }, 3000);

            } catch (err: any) {
                console.error("Binding error:", err);
                setError(err.message);
                setStatus("error");
            }
        }

        bindDevice();
    }, [setLocation, toast]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Card className="w-full max-w-md border-primary/20 bg-slate-900/50 backdrop-blur-xl shadow-2xl">
                    <CardHeader className="text-center pb-2">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
                            <Smartphone className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-display text-white">
                            Vínculo de Terminal
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 text-center">
                        {status === "loading" && (
                            <div className="space-y-4">
                                <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                                <p className="text-slate-400">Verificando seguridad y enlazando hardware...</p>
                            </div>
                        )}

                        {status === "success" && (
                            <div className="space-y-4">
                                <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-2">
                                    <ShieldCheck className="w-8 h-8 text-success" />
                                </div>
                                <h3 className="text-xl font-bold text-white">¡Vinculado con Éxito!</h3>
                                <p className="text-slate-400">
                                    Este dispositivo ha sido registrado como:<br />
                                    <span className="text-primary font-bold">{terminalName}</span>
                                </p>
                                <p className="text-xs text-slate-500">Redirigiendo a la interfaz de terminal...</p>
                            </div>
                        )}

                        {status === "error" && (
                            <div className="space-y-4">
                                <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                                <h3 className="text-xl font-bold text-white">Error de Vinculación</h3>
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                                    <p className="text-sm text-destructive">{error}</p>
                                </div>
                                <Button
                                    onClick={() => window.location.reload()}
                                    variant="outline"
                                    className="w-full mt-4"
                                >
                                    Reintentar
                                </Button>
                                <p className="text-xs text-slate-500 underline cursor-pointer" onClick={() => setLocation("/")}>
                                    Volver al Inicio
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
