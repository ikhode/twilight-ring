import React from 'react';
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Brain, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useCognitiveEngine } from "@/lib/cognitive/engine";
import { motion, AnimatePresence } from "framer-motion";

interface CognitiveButtonProps extends ButtonProps {
    intent?: string; // What action does this button perform?
    riskLevel?: 'low' | 'medium' | 'high';
    showConfidence?: boolean;
}

export const CognitiveButton = React.forwardRef<HTMLButtonElement, CognitiveButtonProps>(
    ({ className, children, intent, riskLevel = 'low', showConfidence = false, ...props }, ref) => {
        const { systemConfidence, currentIntent } = useCognitiveEngine();

        // Determine visual state based on risk and confidence
        const isRisky = riskLevel === 'high' || (riskLevel === 'medium' && systemConfidence < 70);
        const isRecommended = intent && currentIntent === intent;

        return (
            <Button
                ref={ref}
                className={cn(
                    "relative overflow-hidden transition-all duration-300",
                    isRecommended && "ring-2 ring-accent ring-offset-2 ring-offset-background",
                    isRisky ? "hover:bg-destructive/10 hover:text-destructive hover:border-destructive" : "",
                    className
                )}
                {...props}
            >
                <div className="relative z-10 flex items-center gap-2">
                    {isRecommended && <Sparkles className="w-4 h-4 text-accent animate-pulse" />}
                    {isRisky && <AlertTriangle className="w-4 h-4 text-destructive" />}
                    {children}
                </div>

                {/* Cognitive Aura / Background Effect */}
                {isRecommended && (
                    <motion.div
                        className="absolute inset-0 bg-accent/5 pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />
                )}
            </Button>
        );
    }
);

CognitiveButton.displayName = "CognitiveButton";
