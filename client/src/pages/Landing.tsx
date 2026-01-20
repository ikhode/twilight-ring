import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Brain,
    Zap,
    ShieldAlert,
    TrendingUp,
    ArrowRight,
    Check,
    Sparkles,
    Target,
    Globe,
    Lock,
    Factory,
    Package,
    DollarSign,
    Users,
    BarChart3
} from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

export default function Landing() {
    const [, setLocation] = useLocation();
    const [activeIndustry, setActiveIndustry] = useState("manufacturing");

    const industries = [
        { id: "retail", name: "Retail", icon: Package, color: "from-blue-500 to-cyan-500" },
        { id: "manufacturing", name: "Manufactura", icon: Factory, color: "from-purple-500 to-pink-500" },
        { id: "services", name: "Servicios", icon: Users, color: "from-green-500 to-emerald-500" },
        { id: "healthcare", name: "Salud", icon: ShieldAlert, color: "from-red-500 to-orange-500" },
        { id: "logistics", name: "Logística", icon: Globe, color: "from-yellow-500 to-amber-500" },
        { id: "technology", name: "Tecnología", icon: Zap, color: "from-indigo-500 to-violet-500" },
    ];

    const features = [
        {
            icon: Brain,
            title: "Núcleo Cognitivo",
            description: "IA que aprende los patrones de tu negocio y predice resultados con más del 98% de precisión",
            color: "text-primary"
        },
        {
            icon: ShieldAlert,
            title: "Capa Guardian",
            description: "Detección de anomalías en tiempo real que identifica problemas antes de que ocurran",
            color: "text-warning"
        },
        {
            icon: Sparkles,
            title: "UI Auto-Adaptativa",
            description: "La interfaz se reconfigura automáticamente según tus patrones de uso e industria",
            color: "text-success"
        },
        {
            icon: Target,
            title: "Arquitectura Modular",
            description: "Activa solo lo que necesitas. Sin sobrecarga, sin complejidad, solo eficiencia pura",
            color: "text-primary"
        },
    ];

    return (
        <div className="min-h-screen bg-[#020617] text-white overflow-hidden">
            {/* Neural Network Background */}
            <NeuralBackground />

            {/* Hero Section */}
            <section className="relative z-10 min-h-screen flex items-center justify-center px-8 py-20">
                <div className="max-w-7xl mx-auto text-center space-y-12">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Badge className="bg-primary/20 text-primary border-primary/30 px-6 py-2 text-sm font-black uppercase tracking-widest">
                            <Sparkles className="w-4 h-4 mr-2 inline" />
                            El Futuro del Software Empresarial
                        </Badge>
                    </motion.div>

                    {/* Main Headline */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="space-y-6"
                    >
                        <h1 className="text-7xl md:text-9xl font-black tracking-tighter uppercase italic">
                            <span className="bg-gradient-to-r from-white via-primary to-white bg-clip-text text-transparent">
                                La Nueva Era
                            </span>
                        </h1>
                        <p className="text-3xl md:text-5xl font-bold text-slate-300">
                            El <span className="text-primary italic">ERP Cognitivo</span> que evoluciona con tu negocio
                        </p>
                    </motion.div>

                    {/* Subheadline */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="text-xl md:text-2xl text-slate-400 max-w-4xl mx-auto leading-relaxed"
                    >
                        La siguiente generación de software empresarial ha llegado. Un ERP que <span className="text-white font-bold">aprende, predice y se adapta</span> a cualquier industria. Sin capacitación. Sin consultores. Solo inteligencia pura.
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                        className="flex flex-col sm:flex-row gap-6 justify-center items-center"
                    >
                        <Button
                            size="lg"
                            onClick={() => setLocation("/signup")}
                            className="bg-primary hover:bg-primary/90 text-white px-12 py-8 text-xl font-black uppercase tracking-wider rounded-2xl shadow-[0_0_50px_rgba(59,130,246,0.3)] hover:shadow-[0_0_80px_rgba(59,130,246,0.5)] transition-all group"
                        >
                            Comenzar Prueba Gratuita
                            <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform" />
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={() => setLocation("/demo")}
                            className="border-2 border-white/20 hover:border-primary hover:bg-primary/10 px-12 py-8 text-xl font-bold rounded-2xl backdrop-blur-xl"
                        >
                            Ver en Acción
                        </Button>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.8 }}
                        className="grid grid-cols-3 gap-8 max-w-3xl mx-auto pt-12"
                    >
                        {[
                            { value: "98.4%", label: "Precisión IA" },
                            { value: "10x", label: "Configuración Rápida" },
                            { value: "0", label: "Capacitación Requerida" },
                        ].map((stat, i) => (
                            <div key={i} className="text-center">
                                <p className="text-5xl font-black bg-gradient-to-r from-primary to-white bg-clip-text text-transparent italic">
                                    {stat.value}
                                </p>
                                <p className="text-sm text-slate-500 uppercase tracking-widest font-bold mt-2">
                                    {stat.label}
                                </p>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Industry Selector */}
            <section className="relative z-10 py-32 px-8 bg-gradient-to-b from-transparent to-slate-950/50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase italic mb-6">
                            Diseñado para <span className="text-primary">Toda Industria</span>
                        </h2>
                        <p className="text-xl text-slate-400 max-w-3xl mx-auto">
                            Una plataforma, infinitas configuraciones. Nuestra IA se adapta a tu industria automáticamente.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        {industries.map((industry) => {
                            const Icon = industry.icon;
                            return (
                                <motion.button
                                    key={industry.id}
                                    onClick={() => setActiveIndustry(industry.id)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`p-8 rounded-3xl border-2 transition-all ${activeIndustry === industry.id
                                        ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                                        : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                                        }`}
                                >
                                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${industry.color} flex items-center justify-center`}>
                                        <Icon className="w-8 h-8 text-white" />
                                    </div>
                                    <p className="text-sm font-bold uppercase tracking-wider">{industry.name}</p>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="relative z-10 py-32 px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase italic mb-6">
                            La <span className="text-primary">Siguiente Generación</span>
                        </h2>
                        <p className="text-xl text-slate-400 max-w-3xl mx-auto">
                            No solo agregamos funciones de IA. Reconstruimos el software empresarial desde cero con inteligencia en su núcleo.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {features.map((feature, i) => {
                            const Icon = feature.icon;
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: i * 0.1 }}
                                    className="p-10 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-primary/30 transition-all group"
                                >
                                    <div className="flex items-start gap-6">
                                        <div className={`w-16 h-16 rounded-2xl bg-${feature.color}/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                                            <Icon className={`w-8 h-8 ${feature.color}`} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black mb-3">{feature.title}</h3>
                                            <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Comparison Section */}
            <section className="relative z-10 py-32 px-8 bg-gradient-to-b from-transparent to-slate-950">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase italic mb-6">
                            Generación <span className="text-slate-500">Anterior</span> vs <span className="text-primary">Nueva Era</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Old ERPs */}
                        <div className="p-10 rounded-3xl bg-slate-900/30 border border-slate-800">
                            <h3 className="text-2xl font-black mb-8 text-slate-500">ERPs Tradicionales</h3>
                            <ul className="space-y-4">
                                {[
                                    "Implementación de 6-12 meses",
                                    "$100k+ en honorarios de consultoría",
                                    "Rígido, talla única para todos",
                                    "Entrada manual de datos en todas partes",
                                    "Reactivo, no predictivo",
                                    "Sobrecargado con funciones sin usar"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-500">
                                        <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                                            <span className="text-red-500 text-xl">×</span>
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Cognitive ERP */}
                        <div className="p-10 rounded-3xl bg-primary/10 border-2 border-primary shadow-[0_0_50px_rgba(59,130,246,0.2)]">
                            <h3 className="text-2xl font-black mb-8 text-primary">Cognitive OS</h3>
                            <ul className="space-y-4">
                                {[
                                    "Operativo en 24 horas",
                                    "Cero consultoría requerida",
                                    "Se adapta a tu negocio",
                                    "IA automatiza todo",
                                    "Predice antes de que surjan problemas",
                                    "Solo lo que necesitas, cuando lo necesitas"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                            <Check className="w-4 h-4 text-primary" />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="relative z-10 py-32 px-8">
                <div className="max-w-4xl mx-auto text-center space-y-12">
                    <h2 className="text-6xl md:text-7xl font-black tracking-tighter uppercase italic">
                        ¿Listo para la <span className="text-primary">Nueva Era</span>?
                    </h2>
                    <p className="text-2xl text-slate-400">
                        Únete a las empresas que lideran la siguiente generación de software empresarial.
                    </p>
                    <Button
                        size="lg"
                        onClick={() => setLocation("/signup")}
                        className="bg-primary hover:bg-primary/90 text-white px-16 py-10 text-2xl font-black uppercase tracking-wider rounded-2xl shadow-[0_0_50px_rgba(59,130,246,0.3)] hover:shadow-[0_0_80px_rgba(59,130,246,0.5)] transition-all group"
                    >
                        Comienza Tu Evolución
                        <ArrowRight className="ml-4 w-8 h-8 group-hover:translate-x-2 transition-transform" />
                    </Button>
                    <p className="text-sm text-slate-600 uppercase tracking-widest">
                        Sin tarjeta de crédito • Sin compromiso • Sin tonterías
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-slate-800 py-12 px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <Brain className="w-8 h-8 text-primary" />
                        <span className="text-2xl font-black uppercase italic">Cognitive ERP</span>
                    </div>
                    <div className="flex items-center gap-8 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            <span>Seguridad Empresarial</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            <span>Infraestructura Global</span>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600">© 2026 Cognitive ERP. Construido para el futuro.</p>
                </div>
            </footer>
        </div>
    );
}

// Neural Network Background Component
function NeuralBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const nodes: { x: number; y: number; vx: number; vy: number }[] = [];
        const nodeCount = 50;

        // Create nodes
        for (let i = 0; i < nodeCount; i++) {
            nodes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
            });
        }

        function animate() {
            if (!ctx || !canvas) return;

            ctx.fillStyle = "rgba(2, 6, 23, 0.1)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Update and draw nodes
            nodes.forEach((node, i) => {
                node.x += node.vx;
                node.y += node.vy;

                if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
                if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

                // Draw connections
                nodes.forEach((otherNode, j) => {
                    if (i === j) return;
                    const dx = node.x - otherNode.x;
                    const dy = node.y - otherNode.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 150) {
                        ctx.strokeStyle = `rgba(59, 130, 246, ${0.2 * (1 - distance / 150)})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(node.x, node.y);
                        ctx.lineTo(otherNode.x, otherNode.y);
                        ctx.stroke();
                    }
                });

                // Draw node
                ctx.fillStyle = "rgba(59, 130, 246, 0.6)";
                ctx.beginPath();
                ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
                ctx.fill();
            });

            requestAnimationFrame(animate);
        }

        animate();

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 opacity-30"
        />
    );
}
