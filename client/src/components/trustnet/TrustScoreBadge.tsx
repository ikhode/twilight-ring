import { Shield, TrendingUp, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TrustScoreBadgeProps {
    score: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    showTrend?: boolean;
    previousScore?: number;
}

const getScoreConfig = (score: number) => {
    if (score >= 800) {
        return {
            label: 'Guardian',
            color: 'text-green-400',
            bgColor: 'bg-green-500/20',
            borderColor: 'border-green-500/30',
            description: 'Historial excepcional de confiabilidad',
            emoji: '🛡️'
        };
    } else if (score >= 500) {
        return {
            label: 'Verificado',
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/20',
            borderColor: 'border-blue-500/30',
            description: 'Consistentemente confiable',
            emoji: '✓'
        };
    } else if (score >= 300) {
        return {
            label: 'Activo',
            color: 'text-amber-400',
            bgColor: 'bg-amber-500/20',
            borderColor: 'border-amber-500/30',
            description: 'Construyendo reputación',
            emoji: '⭐'
        };
    } else if (score >= 100) {
        return {
            label: 'Emergente',
            color: 'text-gray-400',
            bgColor: 'bg-gray-500/20',
            borderColor: 'border-gray-500/30',
            description: 'Nuevo en el marketplace',
            emoji: '🌱'
        };
    } else {
        return {
            label: 'En Revisión',
            color: 'text-orange-400',
            bgColor: 'bg-orange-500/20',
            borderColor: 'border-orange-500/30',
            description: 'Bajo evaluación',
            emoji: '⚠️'
        };
    }
};

const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
        case 'sm':
            return {
                container: 'px-2 py-1',
                score: 'text-sm',
                label: 'text-xs',
                icon: 'w-3 h-3'
            };
        case 'lg':
            return {
                container: 'px-4 py-2',
                score: 'text-2xl',
                label: 'text-base',
                icon: 'w-6 h-6'
            };
        default: // md
            return {
                container: 'px-3 py-1.5',
                score: 'text-lg',
                label: 'text-sm',
                icon: 'w-4 h-4'
            };
    }
};

export function TrustScoreBadge({
    score,
    size = 'md',
    showLabel = true,
    showTrend = false,
    previousScore
}: TrustScoreBadgeProps) {
    const config = getScoreConfig(score);
    const sizeClasses = getSizeClasses(size);

    const trend = previousScore !== undefined ? score - previousScore : 0;
    const trendPercentage = previousScore ? ((trend / previousScore) * 100).toFixed(1) : '0';

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={`inline-flex items-center gap-2 rounded-lg border ${config.bgColor} ${config.borderColor} ${sizeClasses.container} transition-all hover:scale-105 cursor-help`}
                    >
                        <Shield className={`${config.color} ${sizeClasses.icon}`} />
                        <div className="flex items-baseline gap-1.5">
                            <span className={`font-black italic ${config.color} ${sizeClasses.score}`}>
                                {score}
                            </span>
                            {showLabel && (
                                <span className={`${config.color} ${sizeClasses.label} font-semibold`}>
                                    {config.label}
                                </span>
                            )}
                        </div>

                        {showTrend && previousScore !== undefined && trend !== 0 && (
                            <div className={`flex items-center gap-1 ${sizeClasses.label} ${trend > 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                <TrendingUp className={`${sizeClasses.icon} ${trend < 0 ? 'rotate-180' : ''}`} />
                                <span>{trend > 0 ? '+' : ''}{trendPercentage}%</span>
                            </div>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">{config.emoji}</span>
                            <div>
                                <p className="font-bold">{config.label}</p>
                                <p className="text-xs text-slate-400">{config.description}</p>
                            </div>
                        </div>
                        <div className="pt-2 border-t border-slate-700">
                            <p className="text-xs text-slate-300">
                                <strong>Trust Score:</strong> {score}/1000
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                Calculado a partir de métricas operacionales verificadas: cumplimiento de pagos,
                                puntualidad en entregas, tasa de disputas, y más.
                            </p>
                        </div>
                        {showTrend && previousScore !== undefined && (
                            <div className="pt-2 border-t border-slate-700">
                                <p className="text-xs">
                                    <span className={trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-slate-400'}>
                                        {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)} puntos
                                    </span>
                                    {' '}desde la última actualización
                                </p>
                            </div>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
