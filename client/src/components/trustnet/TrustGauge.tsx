import { motion } from "framer-motion";
import { Shield, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrustGaugeProps {
    score: number;
    previousScore?: number;
    size?: number;
}

export function TrustGauge({ score, previousScore, size = 300 }: TrustGaugeProps) {
    const percentage = (score / 1000) * 100;
    const strokeWidth = size * 0.08;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    // We only show a semi-circle or 3/4 circle. Let's do 270 degrees (3/4).
    const angle = 270;
    const dashArray = circumference;
    const dashOffset = circumference - (percentage / 100) * circumference * (angle / 360);

    const getLevel = (s: number) => {
        if (s >= 800) return { name: "Platinum", color: "#10b981", bg: "bg-emerald-500/10" };
        if (s >= 600) return { name: "Gold", color: "#f59e0b", bg: "bg-amber-500/10" };
        if (s >= 400) return { name: "Silver", color: "#94a3b8", bg: "bg-slate-400/10" };
        return { name: "Bronze", color: "#78350f", bg: "bg-orange-900/10" };
    };

    const level = getLevel(score);
    const diff = previousScore ? score - previousScore : 0;

    return (
        <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-[225deg]">
                {/* Background track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${circumference * (angle / 360)} ${circumference}`}
                    strokeLinecap="round"
                    className="text-slate-800"
                />
                {/* Progress bar */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={level.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${circumference * (angle / 360)} ${circumference}`}
                    initial={{ strokeDashoffset: circumference * (angle / 360) }}
                    animate={{ strokeDashoffset: circumference * (angle / 360) * (1 - percentage / 100) }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 8px ${level.color}44)` }}
                />
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative"
                >
                    <span className="text-6xl font-black italic tracking-tighter text-white">
                        {score}
                    </span>
                    <div className="absolute -top-6 -right-6">
                        <Shield className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                </motion.div>

                <div className="mt-2 flex flex-col items-center">
                    <span className={`text-xs font-bold uppercase tracking-widest ${level.bg} px-3 py-1 rounded-full border border-white/10`} style={{ color: level.color }}>
                        {level.name} Level
                    </span>

                    {diff !== 0 && (
                        <div className={`mt-2 flex items-center gap-1 text-sm font-bold ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {diff > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {diff > 0 ? '+' : ''}{diff} pts
                        </div>
                    )}
                    {diff === 0 && previousScore && (
                        <div className="mt-2 flex items-center gap-1 text-sm font-bold text-slate-500">
                            <Minus className="w-4 h-4" />
                            Sin cambios
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
