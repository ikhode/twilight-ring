import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Activity, Sparkles, AlertTriangle, CheckCircle2, Info, ChevronRight } from "lucide-react";
import { useNLPEngine } from "@/lib/ai/nlp-engine";
import { useCognitiveDiagnostics } from "./CognitiveContext";

export interface CognitiveFieldProps {
    id?: string;
    children: React.ReactNode;
    label?: string;
    value?: any;
    context?: string;
    options?: string[]; // Possible candidates for Zero-Shot
    semanticType?: 'category' | 'status' | 'method' | 'priority' | 'generic';
    className?: string;
    onAcceptPrediction?: (val: any) => void;
}

export function CognitiveField({ children, label, value, context, semanticType, className, id, options, onAcceptPrediction }: CognitiveFieldProps) {
    const fieldId = React.useMemo(() => id || `field-${Math.random().toString(36).substr(2, 9)}`, [id]);
    const [feedback, setFeedback] = React.useState<{ message: string, type: 'info' | 'warning' | 'success', confidence?: number } | null>(null);
    const { findSemanticMatches, isUSELoading } = useNLPEngine();
    const diagContext = useCognitiveDiagnostics();
    const { registerDiagnostic, unregisterDiagnostic, acceptPrediction, predictions, diagnostics } = diagContext || {};
    const fieldDiagnostic = diagnostics?.find(d => d.id === fieldId || d.fieldId === id);

    const handleAccept = () => {
        const pred = predictions ? predictions[fieldId] : null;
        if (pred && acceptPrediction) {
            if (onAcceptPrediction) onAcceptPrediction(pred.value);
            acceptPrediction(fieldId);
        }
    };

    // Sync local feedback with central diagnostics
    React.useEffect(() => {
        if (fieldDiagnostic) {
            setFeedback({ message: fieldDiagnostic.message, type: fieldDiagnostic.type });
        } else {
            setFeedback(null);
        }
    }, [fieldDiagnostic]);

    const analyze = React.useCallback(async (val: any) => {
        if (!val && val !== 0) {
            setFeedback(null);
            return;
        }

        // CognitiveField is now primarily driven by Holistic Audit 
        // We only do a tiny check for critical missing values if needed
        return;
    }, []);

    React.useEffect(() => {
        analyze(value);
    }, [value, analyze]);

    // Cleanup logic stays the same if needed, but context handles holistics now
    React.useEffect(() => {
        return () => {
            if (unregisterDiagnostic) unregisterDiagnostic(fieldId);
        };
    }, [fieldId, unregisterDiagnostic]);

    return (
        <div className={cn("space-y-1.5 w-full group", className)}>
            {label && (
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                    {label}
                </label>
            )}

            <div className={cn(
                "relative rounded-md transition-all duration-300",
                feedback?.type === 'warning' && "ring-1 ring-amber-500/40",
                feedback?.type === 'success' && "ring-1 ring-emerald-500/20"
            )}>
                {children}
            </div>

            <AnimatePresence>
                {(feedback?.type === 'warning') && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, y: -5 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -5 }}
                        className="overflow-hidden mt-1"
                    >
                        <div className="flex items-center gap-2 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                            <Activity className="w-3 h-3 text-amber-500 shrink-0 animate-pulse" />
                            <p className="text-[9px] font-black uppercase tracking-wider text-amber-500/90 flex-1">
                                {feedback.message}
                            </p>
                            {feedback.confidence && (
                                <span className="text-[8px] font-mono text-amber-500/50">
                                    {feedback.confidence}% Match
                                </span>
                            )}
                        </div>
                    </motion.div>
                )}
                {/* Prediction Suggestion */}
                {!feedback && diagContext?.predictions[fieldId] && (
                    <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mt-1"
                    >
                        <button
                            onClick={handleAccept}
                            className="flex items-center gap-2 px-2 py-1 rounded bg-primary/20 border border-primary/30 hover:bg-primary/30 transition-colors w-full text-left group/pred"
                        >
                            <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                            <div className="flex-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-primary">Sugerencia predictiva</p>
                                <p className="text-[10px] font-bold text-white/90">Cambiar a "{diagContext.predictions[fieldId].value}"</p>
                            </div>
                            <ChevronRight className="w-3 h-3 text-primary group-hover/pred:translate-x-0.5 transition-transform" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
