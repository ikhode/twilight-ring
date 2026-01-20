import { useGamification } from "@/lib/gamification";
import { Progress } from "@/components/ui/progress";
import { Zap, Trophy } from "lucide-react";

export function LevelIndicator() {
    const { xp, level } = useGamification();
    // Simple calculation: Level N starts at N*1000 XP. Progress is % of current 1000 chunk.
    const currentLevelBase = (level - 1) * 1000;
    const progress = ((xp - currentLevelBase) / 1000) * 100;

    return (
        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Nivel Cognitivo</p>
                        <p className="text-sm font-black text-white">Lvl {level}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-yellow-500">
                    <Zap className="w-3 h-3 fill-yellow-500" />
                    {xp} XP
                </div>
            </div>

            <div className="relative h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                    className="absolute h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-1000 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="flex justify-between mt-1">
                <span className="text-[9px] text-slate-500 font-mono">0%</span>
                <span className="text-[9px] text-slate-500 font-mono">NEXT LEVEL</span>
            </div>
        </div>
    );
}
