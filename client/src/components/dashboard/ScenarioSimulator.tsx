import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { RefreshCw, Play, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ScenarioSimulatorProps {
    baseRevenue?: number;
}

export function ScenarioSimulator({ baseRevenue = 1240000 }: ScenarioSimulatorProps) {
    const [price, setPrice] = useState(0); // 0 = no change
    const [stock, setStock] = useState(0);
    const [efficiency, setEfficiency] = useState(0);
    const [isSimulating, setIsSimulating] = useState(false);

    // Simulated impact calculation
    const baseMargin = 24;
    const revenueImpact = baseRevenue * (1 + (price * 0.05) + (efficiency * 0.02) - (stock < 0 ? 0.1 : 0));
    const marginImpact = baseMargin * (1 + (price * 0.02) + (efficiency * 0.05));

    const handleOptimize = () => {
        setIsSimulating(true);
        setTimeout(() => {
            setPrice(10); // +10%
            setStock(5); // +5%
            setEfficiency(15); // +15%
            setIsSimulating(false);
        }, 800);
    };

    return (
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl overflow-hidden">
            <CardHeader className="border-b border-white/5 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <Play className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-white">Simulador de Escenarios</CardTitle>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Proyecciones en tiempo real</p>
                        </div>
                    </div>
                    <Badge variant="outline" className="border-purple-500/20 text-purple-400 text-[9px] uppercase tracking-widest">
                        Motor Predictivo
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
                {/* Sliders */}
                <div className="space-y-6">
                    <div className="space-y-3">
                        <div className="flex justify-between text-xs font-bold uppercase text-slate-400">
                            <span>Ajuste de Precios</span>
                            <span className={price > 0 ? "text-green-500" : price < 0 ? "text-red-500" : ""}>{price > 0 ? "+" : ""}{price}%</span>
                        </div>
                        <Slider
                            value={[price]}
                            onValueChange={(v) => setPrice(v[0])}
                            min={-20}
                            max={20}
                            step={1}
                            className="[&>.absolute]:bg-purple-500"
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between text-xs font-bold uppercase text-slate-400">
                            <span>Eficiencia Operativa</span>
                            <span className={efficiency > 0 ? "text-green-500" : ""}>{efficiency > 0 ? "+" : ""}{efficiency}%</span>
                        </div>
                        <Slider
                            value={[efficiency]}
                            onValueChange={(v) => setEfficiency(v[0])}
                            min={-10}
                            max={30}
                            step={1}
                        />
                    </div>
                </div>

                {/* Results Visualization */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5 space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Ingresos Proyectados</p>
                        <motion.div
                            key={revenueImpact}
                            initial={{ scale: 0.95, opacity: 0.5 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-xl font-black text-white"
                        >
                            ${(revenueImpact / 1000000).toFixed(2)}M
                        </motion.div>
                        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-2">
                            <motion.div
                                animate={{ width: `${Math.min(100, (revenueImpact / 1500000) * 100)}%` }}
                                className="h-full bg-green-500"
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5 space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Margen Neto</p>
                        <motion.div
                            key={marginImpact}
                            initial={{ scale: 0.95, opacity: 0.5 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-xl font-black text-white"
                        >
                            {marginImpact.toFixed(1)}%
                        </motion.div>
                        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-2">
                            <motion.div
                                animate={{ width: `${Math.min(100, (marginImpact / 35) * 100)}%` }}
                                className="h-full bg-purple-500"
                            />
                        </div>
                    </div>
                </div>

                <Button
                    variant="outline"
                    className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 font-bold uppercase text-xs h-10 tracking-widest"
                    onClick={handleOptimize}
                    disabled={isSimulating}
                >
                    {isSimulating ? (
                        <div className="flex items-center gap-2">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Optimizando...
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3" />
                            Aplicar Optimización IA
                        </div>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
