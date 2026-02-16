import React from 'react';
import { cn } from "@/lib/utils";
import { useCognitiveEngine } from "@/lib/cognitive/engine";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Brain } from "lucide-react";

interface AliveValueProps {
    label?: string;
    value: string | number;
    unit?: string;
    trend?: 'up' | 'down' | 'neutral';
    explanation?: string; // AI generated explanation
    formula?: string; // Rule 11 requirement
    source?: string; // Rule 11 requirement
    className?: string;
    allowTrend?: boolean; // Added validation for unknown prop
}

export function AliveValue({ label, value, unit, trend, explanation, formula, source, className }: AliveValueProps) {
    const { systemConfidence } = useCognitiveEngine();

    // Calculate "aliveness" intensity based on system confidence (higher confidence = calmer pulse)
    // If confidence is low, it might "jitter" or pulse faster to indicate uncertainty/processing
    const pulseDuration = systemConfidence > 80 ? 4 : 1.5;

    return (
        <div className={cn("relative group", className)}>
            {label && (
                <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
                    {label}
                    {(explanation || formula || source) && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Brain className="w-3 h-3 text-primary/40 hover:text-primary cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="bg-slate-900 border-primary/20 p-3 max-w-[280px] shadow-2xl">
                                    <div className="space-y-2.5">
                                        {explanation && (
                                            <p className="text-xs text-slate-300 font-normal leading-relaxed">
                                                <span className="font-bold text-primary block mb-1">Análisis Cognitivo:</span>
                                                {explanation}
                                            </p>
                                        )}
                                        {formula && (
                                            <p className="text-[10px] text-slate-400 font-mono bg-slate-950 p-1.5 rounded border border-slate-800">
                                                <span className="font-bold text-emerald-500 block mb-1 uppercase tracking-wider text-[9px]">Fórmula:</span>
                                                {formula}
                                            </p>
                                        )}
                                        {source && (
                                            <p className="text-[10px] text-slate-400 italic">
                                                <span className="font-bold text-blue-400 block not-italic mb-0.5 uppercase tracking-wider text-[9px]">Fuente:</span>
                                                {source}
                                            </p>
                                        )}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </p>
            )}
            <div className="flex items-baseline gap-1">
                <motion.span
                    className="text-2xl font-bold font-display tracking-tight"
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 1 }}
                    transition={{
                        duration: pulseDuration,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut"
                    }}
                >
                    {value}
                </motion.span>
                {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>

            {/* Subtle trend indicator background */}
            {trend === 'up' && (
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-success/5 blur-xl rounded-full pointer-events-none" />
            )}
            {trend === 'down' && (
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-destructive/5 blur-xl rounded-full pointer-events-none" />
            )}
        </div>
    );
}
