import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Brain,
    Sparkles,
    TrendingUp,
    ShieldAlert,
    Zap,
    Users,
    Package,
    ArrowRight,
    MousePointer2,
    Bot,
    ChevronRight,
    Layout,
    CheckCircle2,
    BarChart3,
    Factory,
    Truck,
    Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

export default function Demo() {
    const [, setLocation] = useLocation();
    const [industry, setIndustry] = useState<"retail" | "manufacturing" | "services">("manufacturing");
    const [step, setStep] = useState(0);
    const [showGuide, setShowGuide] = useState(true);

    const demoSteps = [
        {
            title: "Bienvenido al Futuro",
            content: "Este es el modo Demo. Aquí puedes ver cómo el 'Cognitive OS' se adapta a tu industria y utiliza IA real para predecir tu éxito.",
            target: "hero",
            action: "Explorar Interfaz"
        },
        {
            title: "Núcleo Cognitivo",
            content: "Nuestra IA analiza tus datos en tiempo real. Observa cómo cambia la confianza de predicción a medida que el sistema 'aprende'.",
            target: "ai-card",
            action: "Ver Proyecciones"
        },
        {
            title: "Adaptación por Industria",
            content: "Cambia de industria en el selector de arriba. Verás cómo los módulos y el lenguaje se reconfiguran instantáneamente.",
            target: "industry-switcher",
            action: "Cambiar Industria"
        },
        {
            title: "Capa Guardian",
            content: "El sistema detecta anomalías antes de que el humano se de cuenta. Previene pérdidas proactivamente.",
            target: "guardian",
            action: "Finalizar Tour"
        }
    ];

    const currentStep = demoSteps[step];

    const industryPresets = {
        retail: {
            title: "Retail Intelligence",
            stat1: "Inventario Crítico",
            stat2: "Ventas Proyectadas",
            icon: Package,
            color: "from-blue-500 to-cyan-500",
            nodes: ["Punto de Venta", "Almacén Central", "Logística de Envío"]
        },
        manufacturing: {
            title: "Fábrica Cognitiva",
            stat1: "Eficiencia de Línea",
            stat2: "Mantenimiento Predictivo",
            icon: Factory,
            color: "from-purple-500 to-pink-500",
            nodes: ["Materia Prima", "Ensamble A1", "Control de Calidad"]
        },
        services: {
            title: "Gestión de Servicios",
            stat1: "Nivel de Ocupación",
            stat2: "Retención de Clientes",
            icon: Briefcase,
            color: "from-green-500 to-emerald-500",
            nodes: ["Intake de Clientes", "Asignación de Staff", "Feedback Loop"]
        }
    };

    const preset = industryPresets[industry];

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col overflow-hidden relative font-sans">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_70%)]" />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-purple-500/50 to-primary/50" />

            {/* Header / Demo Menu */}
            <header className="relative z-50 p-6 flex justify-between items-center border-b border-white/5 bg-slate-950/50 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
                        <Brain className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="font-black text-xl tracking-tighter uppercase italic leading-none">Cognitive OS <span className="text-slate-500">DEMO</span></h1>
                        <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">Interactivo • Sin compromiso</p>
                    </div>
                </div>

                <div id="industry-switcher" className="flex items-center gap-2 p-1 bg-slate-900 rounded-2xl border border-white/5">
                    {(Object.keys(industryPresets) as Array<keyof typeof industryPresets>).map((ind) => {
                        const Icon = industryPresets[ind].icon;
                        const active = industry === ind;
                        return (
                            <button
                                key={ind}
                                onClick={() => setIndustry(ind)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">{ind}</span>
                            </button>
                        );
                    })}
                </div>

                <Button
                    variant="outline"
                    onClick={() => setLocation("/signup")}
                    className="border-primary/30 hover:bg-primary/20 text-primary font-black uppercase tracking-widest text-xs h-10 px-6 rounded-full"
                >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Obtener Acceso Real
                </Button>
            </header>

            {/* Main Demo Content */}
            <main className="flex-1 overflow-y-auto p-8 relative">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Hero Stat Banner */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card id="ai-card" className="bg-primary/10 border-primary/20 col-span-1 md:col-span-2 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] animate-pulse" />
                            <CardHeader className="relative z-10">
                                <CardTitle className="text-xl font-black uppercase italic tracking-tight text-white flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-primary" />
                                    Fase de Calibración IA
                                </CardTitle>
                                <CardDescription className="text-slate-400 font-medium">El sistema está aprendiendo tus flujos operativos</CardDescription>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <div className="flex items-end gap-4 mb-4">
                                    <span className="text-6xl font-black italic tracking-tighter text-primary">82.4%</span>
                                    <div className="space-y-1 mb-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Confianza de Predicción</p>
                                        <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: "82%" }} className="h-full bg-primary" />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                    Nexus ha identificado <span className="text-primary font-bold">12 patrones operativos</span> únicos en tu industria de <span className="italic font-bold">{industry}</span>. Estamos listos para optimizar.
                                </p>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-2 gap-4 col-span-1 md:col-span-2">
                            <Card className="bg-slate-900/50 border-white/5 flex flex-col justify-center items-center text-center p-6 border-dashed border-2">
                                <preset.icon className="w-10 h-10 text-primary mb-3 opacity-50" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{preset.stat1}</p>
                                <p className="text-3xl font-black italic tracking-tighter mt-1">OPTIMIZADO</p>
                            </Card>
                            <Card className="bg-slate-900/50 border-white/5 flex flex-col justify-center items-center text-center p-6 border-dashed border-2">
                                <TrendingUp className="w-10 h-10 text-emerald-400 mb-3 opacity-50" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{preset.stat2}</p>
                                <p className="text-3xl font-black italic tracking-tighter mt-1 text-emerald-400">+24.5%</p>
                            </Card>
                        </div>
                    </div>

                    {/* Operational Map Simulation */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <Card className="lg:col-span-2 bg-slate-950/50 border-white/5 h-[400px] overflow-hidden relative">
                            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
                            <CardHeader className="relative z-10 border-b border-white/5 bg-slate-950/80 backdrop-blur">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-sm font-black uppercase italic tracking-wider flex items-center gap-2">
                                        <Layout className="w-4 h-4 text-primary" />
                                        Arquitectura de Procesos Live
                                    </CardTitle>
                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary">Simulando Flujo</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="h-full flex items-center justify-center p-0 relative">
                                <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
                                    {preset.nodes.map((node, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.2 }}
                                            className="relative"
                                        >
                                            <div className="w-32 h-20 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-4 shadow-2xl relative z-10 hover:border-primary/50 transition-colors group cursor-default">
                                                <p className="text-[8px] font-black uppercase tracking-tighter text-slate-500 group-hover:text-primary transition-colors">{node}</p>
                                                <div className="flex items-center gap-1 mt-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                    <span className="text-[10px] font-mono text-white">Active</span>
                                                </div>
                                            </div>
                                            {i < preset.nodes.length - 1 && (
                                                <div className="hidden md:block absolute top-1/2 -right-16 w-16 h-px bg-gradient-to-r from-primary to-transparent" />
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                                {/* Particle effect */}
                                <div className="absolute inset-0 pointer-events-none">
                                    {[...Array(10)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            className="absolute w-1 h-1 bg-primary rounded-full blur-[1px]"
                                            initial={{ x: "20%", y: "50%", opacity: 0 }}
                                            animate={{
                                                x: ["20%", "50%", "80%"],
                                                y: ["50%", `${40 + Math.random() * 20}%`, "50%"],
                                                opacity: [0, 1, 0]
                                            }}
                                            transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card id="guardian" className="bg-slate-900/30 border-rose-500/20 relative overflow-hidden flex flex-col">
                            <div className="absolute top-0 left-0 w-full h-1 bg-rose-500/30 shadow-[0_4px_20px_rgba(244,63,94,0.3)]" />
                            <CardHeader>
                                <CardTitle className="text-sm font-black uppercase italic tracking-wider flex items-center gap-2 text-rose-500">
                                    <ShieldAlert className="w-4 h-4" />
                                    Capa Guardian
                                </CardTitle>
                                <CardDescription className="text-xs">Predicción de Anomalías</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4">
                                <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase text-rose-300">Anomalía Detectada</span>
                                        <span className="text-[8px] font-mono text-rose-500">hace 2 min</span>
                                    </div>
                                    <p className="text-xs text-slate-300">Inconsistencia detectada en el flujo de <span className="font-bold text-rose-200 uppercase">{preset.nodes[1]}</span>. Probabilidad de desperdicio: <span className="text-rose-500 font-black">12.4%</span></p>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-950 border border-white/5 space-y-2 opacity-50">
                                    <p className="text-[8px] font-black uppercase text-slate-600 tracking-widest">Logs de Seguridad</p>
                                    <div className="font-mono text-[9px] text-slate-500 space-y-1">
                                        <p>{">"} Analizando heartbeat_core...</p>
                                        <p>{">"} Sincronizando pgvector...</p>
                                    </div>
                                </div>
                            </CardContent>
                            <div className="p-6 border-t border-white/5 text-center">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Monitoreo Real-Time Activo</p>
                            </div>
                        </Card>
                    </div>

                    {/* Final CTA Strip */}
                    <Card className="bg-gradient-to-r from-primary/10 via-slate-900/50 to-primary/10 border-primary/20 p-8 text-center relative group">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-4">¿Te ves liderando con <span className="text-primary italic">IA Real</span>?</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto mb-8 text-sm leading-relaxed">
                            Esta demo utiliza solo el 5% de la potencia de Cognitive OS. Al registrarte gratuito, obtendrás acceso a integraciones completas, entrenamiento personalizado y el motor de optimización TFJS.
                        </p>
                        <Button
                            size="lg"
                            onClick={() => setLocation("/signup")}
                            className="bg-primary hover:bg-primary/90 text-white px-12 py-8 text-xl font-black uppercase tracking-wider rounded-2xl shadow-[0_0_50px_rgba(59,130,246,0.3)] transition-all active:scale-95"
                        >
                            Comenzar Prueba Gratuita
                            <ArrowRight className="ml-3 w-6 h-6" />
                        </Button>
                    </Card>
                </div>
            </main>

            {/* AI Guide Navigation Overlay */}
            <AnimatePresence>
                {showGuide && (
                    <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col justify-end p-12 md:p-24">
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="w-full max-w-md bg-slate-950 border border-primary/30 rounded-3xl p-8 shadow-[0_0_100px_rgba(59,130,246,0.2)] pointer-events-auto relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-500" />
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center relative">
                                    <Bot className="w-6 h-6 text-primary" />
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-slate-950 rounded-full animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none mb-1">Nexus Guide</p>
                                    <h3 className="text-xl font-black uppercase italic tracking-tight text-white leading-none">{currentStep.title}</h3>
                                </div>
                                <button
                                    onClick={() => setShowGuide(false)}
                                    className="ml-auto text-slate-600 hover:text-white transition-colors"
                                >
                                    <MousePointer2 className="w-4 h-4" />
                                </button>
                            </div>

                            <p className="text-slate-400 text-sm leading-relaxed mb-8">
                                {currentStep.content}
                            </p>

                            <div className="flex items-center justify-between">
                                <div className="flex gap-1.5">
                                    {demoSteps.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-1.5 rounded-full transition-all duration-500 ${step === i ? "w-8 bg-primary" : "w-3 bg-slate-800"}`}
                                        />
                                    ))}
                                </div>
                                <Button
                                    onClick={() => {
                                        if (step < demoSteps.length - 1) setStep(step + 1);
                                        else setShowGuide(false);
                                    }}
                                    className="bg-white/5 hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-xl border border-white/5"
                                >
                                    {currentStep.action}
                                    <ChevronRight className="ml-2 w-4 h-4" />
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {!showGuide && (
                <button
                    onClick={() => { setStep(0); setShowGuide(true); }}
                    className="fixed bottom-12 right-12 z-[110] w-14 h-14 bg-primary rounded-full shadow-[0_0_40px_rgba(59,130,246,0.5)] flex items-center justify-center border-2 border-white/20 hover:scale-110 active:scale-90 transition-all group"
                >
                    <Bot className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
                </button>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .bg-grid-white {
                    background-image: 
                        linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
                }
            `}</style>
        </div>
    );
}
