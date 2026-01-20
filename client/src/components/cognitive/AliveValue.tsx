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
    className?: string;
    allowTrend?: boolean; // Added validation for unknown prop
}

export function AliveValue({ label, value, unit, trend, explanation, className }: AliveValueProps) {
    const { systemConfidence } = useCognitiveEngine();

    // Calculate "aliveness" intensity based on system confidence (higher confidence = calmer pulse)
    // If confidence is low, it might "jitter" or pulse faster to indicate uncertainty/processing
    const pulseDuration = systemConfidence > 80 ? 4 : 1.5;

    return (
        <div className={cn("relative group", className)}>
            {label && (
                <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
                    {label}
                    {explanation && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Brain className="w-3 h-3 text-primary/40 hover:text-primary cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="bg-slate-900 border-primary/20 p-3 max-w-[200px]">
                                    <p className="text-xs text-slate-300 font-normal leading-relaxed">
                                        <span className="font-bold text-primary block mb-1">Análisis Cognitivo:</span>
                                        {explanation}
                                    </p>
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
