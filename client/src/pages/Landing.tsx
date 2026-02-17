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
    BarChart3,
    CheckCircle2,
    MousePointer2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

export default function Landing() {
    const [, setLocation] = useLocation();
    const [activeIndustry, setActiveIndustry] = useState("manufacturing");
    const [text, setText] = useState("");
    const fullText = "EL COGNITIVE OS QUE EVOLUCIONA CON TU NEGOCIO.";

    useEffect(() => {
        let i = 0;
        const timer = setInterval(() => {
            setText(fullText.slice(0, i));
            i++;
            if (i > fullText.length) clearInterval(timer);
        }, 50);
        return () => clearInterval(timer);
    }, []);

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
            icon: DollarSign,
            title: "Stripe Financial Core",
            description: "Infraestructura bancaria nativa. Gestiona cobros, payouts y conciliación automática con la potencia de Stripe.",
            color: "text-indigo-400"
        },
        {
            icon: Brain,
            title: "Orquestación Cognitiva",
            description: "El sistema 'piensa' por tu negocio. Predice inventarios, detecta fraudes y sugiere líneas de crédito en tiempo real.",
            color: "text-purple-400"
        },
        {
            icon: Globe,
            title: "Middleware de Pagos",
            description: "Conecta cualquier terminal (Clip, PAX, WisePOS) al cerebro central. Unifica tus canales físicos y digitales.",
            color: "text-emerald-400"
        },
        {
            icon: Target,
            title: "Despliegue Instantáneo",
            description: "Configuración zero-code. Tu ecosistema operativo se autoconstruye basado en tu industria en segundos.",
            color: "text-emerald-400"
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
                        transition={{ duration: 0.8 }}
                    >
                        <Badge className="bg-primary/20 text-primary border-primary/30 px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em] backdrop-blur-md">
                            <Sparkles className="w-3.5 h-3.5 mr-2 inline animate-pulse" />
                            Next-Generation Enterprise OS
                        </Badge>
                    </motion.div>

                    {/* Main Headline */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="space-y-6"
                    >
                        <h1 className="text-8xl md:text-[10rem] font-black tracking-tighter uppercase italic leading-[0.8] mb-10">
                            <span className="bg-gradient-to-r from-white via-primary to-indigo-400 bg-clip-text text-transparent">
                                COGNITIVE OS + STRIPE
                            </span>
                        </h1>
                        <p className="text-2xl md:text-5xl font-bold text-slate-300 leading-tight h-[3em]">
                            {text.split("COGNITIVE OS").map((part, i) => (
                                <span key={i}>
                                    {part}
                                    {i === 0 && text.includes("COGNITIVE OS") && (
                                        <span className="relative inline-block">
                                            <span className="text-primary italic">COGNITIVE OS</span>
                                            <motion.span
                                                className="absolute -bottom-2 left-0 w-full h-1 bg-primary/30"
                                                initial={{ scaleX: 0 }}
                                                animate={{ scaleX: 1 }}
                                                transition={{ duration: 1, delay: 1 }}
                                            />
                                        </span>
                                    )}
                                </span>
                            ))}
                            <motion.span
                                animate={{ opacity: [0, 1] }}
                                transition={{ repeat: Infinity, duration: 0.8 }}
                                className="inline-block w-1 h-8 md:h-12 bg-primary ml-1 align-middle"
                            />
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.4 }}
                        className="relative max-w-5xl mx-auto group mt-20"
                    >
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-cyan-500/50 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
                        <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl backdrop-blur-3xl bg-black/40 p-4">
                            <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                            <img
                                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2000"
                                alt="Nexus ERP Dashboard"
                                className="w-full h-auto rounded-[1.5rem] shadow-inner"
                            />
                        </div>
                        {/* Interactive Floaties */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-10 -right-10 bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl hidden md:block"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Core Status: Optimal</span>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Subheadline */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="text-xl md:text-2xl text-slate-400 max-w-4xl mx-auto leading-relaxed"
                    >
                        Tu sistema operativo de negocio que <span className="text-white font-bold">piensa, predice y ejecuta</span> operaciones financieras.
                        Infraestructura Stripe nativa para escalar sin límites.
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
                            className="bg-primary hover:bg-primary/90 text-white px-10 py-8 text-lg font-black uppercase tracking-wider rounded-2xl shadow-[0_0_50px_rgba(59,130,246,0.3)] transition-all active:scale-95 group"
                        >
                            <Sparkles className="mr-3 w-6 h-6 group-hover:rotate-12 transition-transform" />
                            Iniciar Despliegue Gratis
                            <ArrowRight className="ml-3 w-5 h-5 opacity-50" />
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={() => setLocation("/demo")}
                            className="border-slate-800 hover:bg-white/5 text-slate-300 px-10 py-8 text-lg font-black uppercase tracking-wider rounded-2xl transition-all"
                        >
                            <MousePointer2 className="mr-3 w-5 h-5 text-primary" />
                            Probar Demo Interactiva
                        </Button>
                    </motion.div>

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

            {/* Social Proof Section (Logos) */}
            <section className="relative z-10 py-12 border-y border-slate-900 bg-slate-950/20">
                <div className="max-w-7xl mx-auto px-8">
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.4em] text-center mb-10 italic">
                        Alimentando el crecimiento de visionarios en
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
                        {["NEBULOS", "SYNTHX", "QUANTUM", "AXON", "VECTOR"].map((brand) => (
                            <div key={brand} className="flex items-center gap-2 group cursor-default">
                                <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center p-1.5 group-hover:bg-primary/20 transition-colors">
                                    <Sparkles className="w-full h-full text-slate-400 group-hover:text-primary" />
                                </div>
                                <span className="text-xl font-black tracking-tighter text-slate-500 group-hover:text-white transition-colors uppercase">{brand}</span>
                            </div>
                        ))}
                    </div>
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
                                    className="p-10 rounded-3xl bg-slate-900/40 border border-slate-800/50 hover:border-primary/30 transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] group-hover:bg-primary/10 transition-colors" />
                                    <div className="flex items-start gap-6 relative z-10">
                                        <div className={`w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:border-primary/50 transition-all shadow-2xl`}>
                                            <Icon className={`w-8 h-8 ${feature.color}`} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black mb-3 italic tracking-tight uppercase text-slate-100">{feature.title}</h3>
                                            <p className="text-slate-400 leading-relaxed font-medium">{feature.description}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="relative z-10 py-32 px-8 bg-slate-950">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-24">
                        <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic mb-6">
                            EL CICLO DE <span className="text-primary">INTELIGENCIA</span>
                        </h2>
                        <p className="text-xl text-slate-400 max-w-3xl mx-auto">
                            Transformamos datos crudos en ventajas competitivas exponenciales.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12">
                        {[
                            {
                                step: "01",
                                title: "Ingestión Transaccional",
                                description: "Cada pago (en tienda o web) alimenta el Data Lake. Procesamos metadatos financieros en tiempo real via Stripe.",
                                icon: DollarSign,
                                accent: "bg-indigo-500"
                            },
                            {
                                step: "02",
                                title: "Análisis Semántico",
                                description: "La IA cruza ventas con inventario y comportamiento. Detecta patrones de fraude, lealtad y demanda futura.",
                                icon: Brain,
                                accent: "bg-purple-500"
                            },
                            {
                                step: "03",
                                title: "Ejecución Financiera",
                                description: "El OS automatiza resurtido, facturación (CFDI 4.0) y sugiere financiamiento basado en tu flujo real.",
                                icon: TrendingUp,
                                accent: "bg-emerald-500"
                            }
                        ].map((item, i) => (
                            <div key={i} className="relative group">
                                <div className="absolute -top-10 left-0 text-7xl font-black text-white/5 opacity-20 group-hover:opacity-100 transition-opacity">
                                    {item.step}
                                </div>
                                <div className="space-y-6 relative z-10">
                                    <div className={`w-20 h-20 rounded-3xl ${item.accent}/20 border border-${item.accent}/30 flex items-center justify-center`}>
                                        <item.icon className={`w-10 h-10 ${item.accent.replace('bg-', 'text-')}`} />
                                    </div>
                                    <h3 className="text-3xl font-black uppercase italic tracking-tighter">{item.title}</h3>
                                    <p className="text-slate-400 text-lg leading-relaxed">{item.description}</p>
                                </div>
                                {i < 2 && (
                                    <div className="hidden lg:block absolute top-1/2 -right-6 translate-y-[-50%]">
                                        <ArrowRight className="w-12 h-12 text-slate-800" />
                                    </div>
                                )}
                            </div>
                        ))}
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
                                    "Stripe Banking Infrastructure",
                                    "IA Predictiva Financiera",
                                    "Facturación CFDI 4.0 Auto",
                                    "Marketplace Ready",
                                    "Sin costos de consultoría",
                                    "Ecosistema de Pagos Unificado"
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
        const nodeCount = 60;
        let mouse = { x: 0, y: 0 };

        // Create nodes
        for (let i = 0; i < nodeCount; i++) {
            nodes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
            });
        }

        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };
        window.addEventListener("mousemove", handleMouseMove);

        function animate() {
            if (!ctx || !canvas) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update and draw nodes
            nodes.forEach((node, i) => {
                node.x += node.vx;
                node.y += node.vy;

                if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
                if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

                // Mouse interaction
                const dxm = node.x - mouse.x;
                const dym = node.y - mouse.y;
                const distm = Math.sqrt(dxm * dxm + dym * dym);
                if (distm < 200) {
                    node.x += dxm * 0.01;
                    node.y += dym * 0.01;
                }

                // Draw connections
                nodes.forEach((otherNode, j) => {
                    if (i === j) return;
                    const dx = node.x - otherNode.x;
                    const dy = node.y - otherNode.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 180) {
                        ctx.strokeStyle = `rgba(59, 130, 246, ${0.15 * (1 - distance / 180)})`;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(node.x, node.y);
                        ctx.lineTo(otherNode.x, otherNode.y);
                        ctx.stroke();
                    }
                });

                // Draw node
                ctx.fillStyle = "rgba(59, 130, 246, 0.4)";
                ctx.beginPath();
                ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2);
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
        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 opacity-30"
        />
    );
}
