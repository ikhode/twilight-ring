import React from 'react';
import { Info } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MLConfidenceIndicatorProps {
    confidence: number; // 0 to 1
    label?: string;
    className?: string;
}

/**
 * MLConfidenceIndicator - Visualizes the certainty of an AI prediction.
 * Uses color coding and tooltips to explain uncertainty.
 */
export const MLConfidenceIndicator: React.FC<MLConfidenceIndicatorProps> = ({
    confidence,
    label = "Confianza de Predicción",
    className
}) => {
    // Determine color based on confidence
    const getLevelColor = (conf: number) => {
        if (conf > 0.85) return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]";
        if (conf > 0.70) return "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]";
        return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]";
    };

    const percentage = Math.round(confidence * 100);

    return (
        <TooltipProvider>
            <div className={cn("flex items-center gap-2 px-2 py-1 rounded-full bg-slate-900/50 border border-slate-800 w-fit", className)}>
                <div className={cn("h-2 w-2 rounded-full animate-pulse", getLevelColor(confidence))} />
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    AI: {percentage}%
                </span>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button className="text-slate-500 hover:text-slate-300 transition-colors">
                            <Info className="h-3 w-3" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[200px] bg-slate-950 border-slate-800 text-slate-300">
                        <p className="font-semibold text-white mb-1">{label}</p>
                        <p className="text-xs leading-relaxed">
                            Este valor representa la certeza estadística del modelo ML basada en la varianza histórica de los datos y la calidad del modelo entrenado.
                        </p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
};
