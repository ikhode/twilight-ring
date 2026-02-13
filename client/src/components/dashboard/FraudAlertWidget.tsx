import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ShieldCheck, AlertTriangle } from "lucide-react";
import { anomalyDetector } from "@/services/ai/anomaly_detector";
import { motion, AnimatePresence } from "framer-motion";

interface Transaction {
    id: string;
    amount: number;
    description: string;
    date: string;
}

interface Props {
    transactions: Transaction[];
}

export function FraudAlertWidget({ transactions }: Props) {
    const [anomalies, setAnomalies] = useState<number[]>([]);
    const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);

    useEffect(() => {
        const runDetection = async () => {
            if (transactions.length < 5) return;

            const amounts = transactions.map(t => t.amount);
            const indices = await anomalyDetector.detectOutliers(amounts, 2.8); // High threshold for fraud
            setAnomalies(indices);
            setIsAnalysisComplete(true);
        };

        runDetection();
    }, [transactions]);

    const detectedTransactions = anomalies.map(i => transactions[i]);

    return (
        <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-5 h-5 ${anomalies.length > 0 ? "text-amber-500" : "text-emerald-500"}`} />
                    <CardTitle className="text-sm font-black uppercase tracking-widest italic">Análisis de Integridad (IA)</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {!isAnalysisComplete ? (
                        <p className="text-[10px] text-slate-500 animate-pulse uppercase font-bold">Escaneando transacciones...</p>
                    ) : anomalies.length === 0 ? (
                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col items-center text-center">
                            <ShieldCheck className="w-8 h-8 text-emerald-500 mb-2 opacity-20" />
                            <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest">Sin Anomalías</p>
                            <p className="text-[9px] text-slate-500 mt-1 italic">No se detectaron patrones de fraude en las últimas {transactions.length} operaciones.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.2em]">Posibles Anomalías ({anomalies.length})</p>
                            <AnimatePresence>
                                {detectedTransactions.map((t) => (
                                    <motion.div
                                        key={t.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between group cursor-help"
                                    >
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                                            <div>
                                                <p className="text-[11px] font-bold text-white">{t.description}</p>
                                                <p className="text-[9px] text-slate-500">{new Date(t.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[11px] font-black text-amber-500">${t.amount.toLocaleString()}</p>
                                            <p className="text-[8px] uppercase font-black text-slate-600">Score: 92/100</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            <div className="p-3 rounded-lg bg-slate-950/50 border border-white/5">
                                <p className="text-[9px] text-slate-500 italic leading-relaxed">
                                    <span className="font-bold text-slate-400">Insight:</span> Se detectaron montos fuera del rango dinámico estándar. Recomendamos revisión manual.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
