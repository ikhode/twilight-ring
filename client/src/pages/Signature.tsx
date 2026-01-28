import { useState, useRef, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SignatureCanvas from "react-signature-canvas";
import { CheckCircle2, ChevronRight, XCircle, Loader2, MousePointer2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Signature() {
    const [, params] = useRoute("/sign/:token");
    const { token } = params || {};
    const { toast } = useToast();
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [status, setStatus] = useState<"signing" | "submitting" | "success" | "error">("signing");

    const { data: payout, isLoading, error } = useQuery({
        queryKey: [`/api/finance/payout/token`, token],
        queryFn: async () => {
            const res = await fetch(`/api/finance/payout/token/${token}`);
            if (!res.ok) throw new Error("Link expirado o inválido");
            return res.json();
        },
        enabled: !!token
    });

    const mutation = useMutation({
        mutationFn: async (signatureData: string) => {
            const res = await fetch(`/api/finance/payout/confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, signatureData })
            });
            if (!res.ok) throw new Error("Error al confirmar el pago");
            return res.json();
        },
        onSuccess: () => {
            setStatus("success");
            toast({ title: "Pago Confirmado", description: "Tu firma ha sido registrada y el desembolso procesado." });
        },
        onError: (err: any) => {
            setStatus("signing");
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const clear = () => sigCanvas.current?.clear();

    const submit = () => {
        if (sigCanvas.current?.isEmpty()) {
            toast({ title: "Firma Requerida", description: "Por favor firma antes de continuar.", variant: "destructive" });
            return;
        }
        setStatus("submitting");
        const dataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL("image/png");
        if (dataUrl) mutation.mutate(dataUrl);
    };

    if (isLoading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
    );

    if (error || !payout) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <Card className="max-w-md w-full border-destructive/20 bg-destructive/5">
                <CardContent className="pt-6 text-center">
                    <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Enlace no válido</h2>
                    <p className="text-slate-400 mb-6">{error?.message || "Este enlace de pago ha expirado o ya fue utilizado."}</p>
                </CardContent>
            </Card>
        </div>
    );

    if (status === "success") return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <Card className="max-w-md w-full border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="pt-6 text-center">
                    <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-6 animate-bounce" />
                    <h2 className="text-2xl font-black text-white mb-2">¡PAGO RECIBIDO!</h2>
                    <p className="text-slate-400 mb-8">Gracias, {payout.employeeName}. El movimiento ha sido registrado en la caja principal.</p>
                    <div className="text-3xl font-mono text-emerald-400 font-black mb-8">
                        {formatCurrency(payout.amount / 100)}
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-2xl overflow-hidden border-slate-800">
                <CardHeader className="bg-slate-900 border-b border-white/5 pb-8 pt-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl font-black text-white">Recibo Digital</CardTitle>
                            <CardDescription className="uppercase tracking-widest text-[10px] text-primary font-bold">Nexus Finance Traceability</CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-black text-white font-mono">{formatCurrency(payout.amount / 100)}</p>
                            <p className="text-[10px] text-slate-500 uppercase">Monto a recibir</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-1">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Beneficiario</p>
                        <p className="text-xl font-bold text-slate-200">{payout.employeeName}</p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Firma de conformidad</p>
                            <Button variant="ghost" size="sm" onClick={clear} className="h-6 text-[10px] hover:text-white uppercase">Limpiar</Button>
                        </div>
                        <div className="bg-white rounded-xl overflow-hidden border-4 border-slate-800">
                            <SignatureCanvas
                                ref={sigCanvas}
                                penColor="black"
                                canvasProps={{
                                    className: "w-full h-48",
                                    style: { width: '100%', cursor: 'crosshair' }
                                }}
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 italic text-center">Firma dentro del recuadro blanco usando tu dedo o puntero.</p>
                    </div>

                    <Button
                        disabled={status === "submitting"}
                        className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20 text-lg"
                        onClick={submit}
                    >
                        {status === "submitting" ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>Confirmar y Recibir <ChevronRight className="ml-2 w-5 h-5" /></>
                        )}
                    </Button>
                </CardContent>
            </Card>

            <p className="mt-8 text-[10px] text-slate-600 uppercase tracking-widest flex items-center gap-2">
                <MousePointer2 className="w-3 h-3" /> Transacción Segura • Cifrado de Punto a Punto
            </p>
        </div>
    );
}
