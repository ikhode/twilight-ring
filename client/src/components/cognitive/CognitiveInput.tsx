import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Brain, AlertCircle, CheckCircle2, Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { useNLPEngine } from "@/lib/ai/nlp-engine";
import { useCognitiveDiagnostics } from "./CognitiveContext";

export interface CognitiveInputProps extends React.ComponentProps<"input"> {
    id?: string;
    label?: string;
    semanticType?: 'name' | 'sku' | 'email' | 'phone' | 'price' | 'category';
    context?: string; // e.g. "manufacturing", "retail"
}

export const CognitiveInput = React.forwardRef<HTMLInputElement, CognitiveInputProps>(
    ({ className, semanticType, label, context, id, ...props }, ref) => {
        const fieldId = id || props.name || Math.random().toString(36).substr(2, 9);
        const [internalValue, setInternalValue] = React.useState((props.value as string) || "");
        const [feedback, setFeedback] = React.useState<{ message: string, type: 'info' | 'warning' | 'success' | 'error', confidence?: number } | null>(null);
        const [isAnalyzing, setIsAnalyzing] = React.useState(false);
        const { findSemanticMatches, isUSELoading } = useNLPEngine();
        const diagContext = useCognitiveDiagnostics();
        const { registerDiagnostic, unregisterDiagnostic, setValue, diagnostics } = diagContext || {};
        const fieldDiagnostic = diagnostics?.find(d => d.id === fieldId || d.fieldId === id || d.fieldId === props.name);

        // Sync local feedback with central diagnostics
        React.useEffect(() => {
            if (fieldDiagnostic) {
                setFeedback({ message: fieldDiagnostic.message, type: fieldDiagnostic.type });
            } else {
                setFeedback(null);
            }
        }, [fieldDiagnostic]);

        // Standard validation patterns (Quieter version)
        const analyze = React.useCallback((val: string) => {
            if (!val || val.length === 0) {
                setFeedback(null);
                return;
            }

            // Only analyze critical technical errors in real-time
            if (semanticType === 'sku' && !/^[A-Z0-9-_]+$/i.test(val)) {
                setFeedback({ message: "Caracteres no permitidos en SKU.", type: 'error' });
            } else if (semanticType === 'price' && isNaN(parseFloat(val))) {
                setFeedback({ message: "Valor numérico inválido.", type: 'error' });
            }

            return null; // No interval/timeout needed for this simple check
        }, [semanticType]);

        React.useEffect(() => {
            const timeoutId = analyze(internalValue);
            return () => {
                if (typeof timeoutId === 'number') clearTimeout(timeoutId);
            };
        }, [internalValue, analyze]);

        // Sync internal value with props toggle
        React.useEffect(() => {
            if (props.value !== undefined) {
                setInternalValue(props.value as string);
            }
        }, [props.value]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            setInternalValue(val);
            if (setValue) setValue(fieldId, val, semanticType);
            if (props.onChange) props.onChange(e);
        };

        return (
            <div className="space-y-1.5 w-full group relative">
                <div className="relative">
                    <Input
                        {...props}
                        ref={ref}
                        value={internalValue}
                        onChange={handleChange}
                        className={cn(
                            "pr-10 transition-all duration-500 bg-background font-medium",
                            feedback?.type === 'success' && "border-emerald-500/30 focus-visible:ring-emerald-500/20",
                            feedback?.type === 'warning' && "border-amber-500/30 focus-visible:ring-amber-500/20",
                            feedback?.type === 'error' && "border-destructive/30 focus-visible:ring-destructive/20",
                            className
                        )}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                        <AnimatePresence mode="wait">
                            {isAnalyzing ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex items-center"
                                >
                                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                                </motion.div>
                            ) : feedback ? (
                                <motion.div
                                    key="feedback"
                                    initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                >
                                    {feedback.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                                    {feedback.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                                    {feedback.type === 'error' && <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
                                    {feedback.type === 'info' && <Sparkles className="w-3.5 h-3.5 text-primary" />}
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </div>
                </div>

                <AnimatePresence>
                    {(feedback?.type === 'warning' || feedback?.type === 'error') && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, y: -5 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -5 }}
                            className="overflow-hidden flex items-center justify-between mt-1"
                        >
                            <p className={cn(
                                "text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5",
                                feedback.type === 'warning' && "text-amber-500",
                                feedback.type === 'error' && "text-destructive"
                            )}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                {feedback.message}
                            </p>
                            {feedback.confidence && feedback.confidence < 100 && (
                                <span className="text-[9px] text-muted-foreground font-mono opacity-60">
                                    Confianza: {feedback.confidence}%
                                </span>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }
);
CognitiveInput.displayName = "CognitiveInput";
