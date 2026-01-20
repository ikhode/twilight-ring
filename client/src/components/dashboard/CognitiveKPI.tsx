import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Info } from "lucide-react";

interface CognitiveKPIProps {
    label: string;
    value: string | number;
    change?: number; // percentage
    trend?: "up" | "down" | "neutral";
    insight: string; // The "Cognitive" explanation
    icon?: any;
}

export function CognitiveKPI({ label, value, change, trend, insight, icon: Icon }: CognitiveKPIProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Card
            className="relative overflow-hidden bg-slate-900/40 border-slate-800 hover:border-primary/30 transition-all duration-500 group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <CardContent className="p-6 relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-primary/80 transition-colors">
                        {label}
                    </p>
                    {Icon && <Icon className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors" />}
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                    <h3 className="text-2xl font-black text-white">{value}</h3>
                    {change !== undefined && (
                        <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1",
                            trend === "up" ? "bg-green-500/10 text-green-500" :
                                trend === "down" ? "bg-red-500/10 text-red-500" : "bg-slate-500/10 text-slate-500"
                        )}>
                            {trend === "up" && <TrendingUp className="w-3 h-3" />}
                            {trend === "down" && <TrendingDown className="w-3 h-3" />}
                            {Math.abs(change)}%
                        </span>
                    )}
                </div>

                {/* Cognitive Layer - Revealed on Hover */}
                <div className="h-0 group-hover:h-auto overflow-hidden transition-all duration-300">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : -10 }}
                        className="pt-3 mt-3 border-t border-white/5"
                    >
                        <div className="flex gap-2 items-start">
                            <Info className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                            <p className="text-[10px] text-slate-300 leading-relaxed italic">
                                {insight}
                            </p>
                        </div>
                    </motion.div>
                </div>

                {/* Subtle pulse to indicate "knowledge inside" */}
                <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-primary/20 group-hover:hidden animate-pulse" />
            </CardContent>
        </Card>
    );
}
