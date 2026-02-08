import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCognitiveDiagnostics } from "./CognitiveContext";
import { AlertTriangle, Brain, ShieldCheck, Activity, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { useConfiguration } from "@/context/ConfigurationContext";

export function GuardianDiagnostic({ title = "Auditoria Cognitiva de Formulario" }: { title?: string }) {
    const { aiConfig } = useConfiguration();
    const context = useCognitiveDiagnostics();
    if (!context || !aiConfig.guardianEnabled) return null;

    const { diagnostics, isAnalyzingForm } = context;
    const warnings = diagnostics.filter(d => d.type === 'warning');
    const errors = diagnostics.filter(d => d.type === 'error');

    const hasAnomalies = warnings.length > 0 || errors.length > 0;

    return (
        <AnimatePresence>
            {(hasAnomalies || isAnalyzingForm) && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className="mb-6 overflow-hidden"
                >
                    <div className={cn(
                        "relative p-4 rounded-xl border backdrop-blur-md transition-shadow duration-500 shadow-xl",
                        isAnalyzingForm
                            ? "bg-primary/10 border-primary/20 shadow-primary/5"
                            : errors.length > 0
                                ? "bg-red-500/10 border-red-500/20 shadow-red-500/5"
                                : "bg-amber-500/10 border-amber-500/20 shadow-amber-500/5"
                    )}>
                        {/* Status Icon */}
                        <div className="absolute top-4 right-4 bg-black/20 p-2 rounded-lg border border-white/10">
                            {isAnalyzingForm ? (
                                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            ) : (
                                <Activity className={cn(
                                    "w-4 h-4",
                                    errors.length > 0 ? "text-red-500 animate-pulse" : "text-amber-500 animate-pulse"
                                )} />
                            )}
                        </div>

                        <div className="flex items-start gap-4">
                            <div className={cn(
                                "p-3 rounded-xl border transition-colors duration-500",
                                isAnalyzingForm ? "bg-primary/20 border-primary/30" :
                                    errors.length > 0 ? "bg-red-500/20 border-red-500/30" : "bg-amber-500/20 border-amber-500/30"
                            )}>
                                <Brain className={cn(
                                    "w-6 h-6",
                                    isAnalyzingForm ? "text-primary animate-pulse" :
                                        errors.length > 0 ? "text-red-400" : "text-amber-400"
                                )} />
                            </div>

                            <div className="flex-1 space-y-1">
                                <h4 className={cn(
                                    "text-sm font-black uppercase tracking-widest",
                                    isAnalyzingForm ? "text-primary" :
                                        errors.length > 0 ? "text-red-400" : "text-amber-400"
                                )}>
                                    {isAnalyzingForm ? "Ejecutando Auditoría Holística..." :
                                        errors.length > 0 ? "Anomalías Críticas Detectadas" : "Sugerencias de Optimización"}
                                </h4>
                                <p className="text-xs text-white/60 font-medium italic">
                                    [Guardian] {isAnalyzingForm ? "Validando integridad semántica del payload..." :
                                        `${diagnostics.length} hallazgo(s) requieren atención para asegurar la integridad de los datos.`}
                                </p>
                            </div>
                        </div>

                        {/* Diagnostic List - only show if not analyzing */}
                        {!isAnalyzingForm && diagnostics.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {diagnostics.map((d, idx) => (
                                    <motion.div
                                        key={d.id}
                                        initial={{ x: -10, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-black/20 border border-white/5 group hover:border-white/10 transition-colors"
                                    >
                                        <AlertTriangle className={cn(
                                            "w-3 h-3 shrink-0",
                                            d.type === 'error' ? "text-red-500" : "text-amber-500"
                                        )} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-white/90 truncate">
                                                {d.message}
                                            </p>
                                            <p className="text-[9px] uppercase tracking-tighter text-white/40 font-black">
                                                Origen: {d.source.toUpperCase()}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export function GuardianSafeStatus() {
    return null;
}
