import { motion } from "framer-motion";
import { Medal } from "lucide-react";

interface AchievementToastProps {
    title: string;
    xp: number;
}

export function AchievementToast({ title, xp }: AchievementToastProps) {
    return (
        <div className="flex items-center gap-4 bg-gradient-to-r from-yellow-900/90 to-slate-900/90 border border-yellow-500/30 p-4 rounded-xl shadow-2xl backdrop-blur-md">
            <div className="relative">
                <div className="absolute inset-0 bg-yellow-500 blur-xl opacity-50 animate-pulse" />
                <Medal className="w-10 h-10 text-yellow-400 relative z-10" />
            </div>
            <div>
                <h4 className="text-sm font-black uppercase text-yellow-500 tracking-wide">Logro Desbloqueado</h4>
                <p className="text-white font-bold">{title}</p>
                <p className="text-xs text-yellow-200 mt-1">+{xp} XP</p>
            </div>
        </div>
    );
}
