import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Brain,
    Mail,
    Lock,
    User,
    Building2,
    ArrowRight,
    Sparkles,
    Package,
    Factory,
    Users,
    ShieldAlert,
    Globe,
    Zap,
    Utensils
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

export default function Auth() {
    const [location, setLocation] = useLocation();
    const { user, profile, loading: authLoading } = useAuth();

    // Redirección automática si ya está autenticado
    useEffect(() => {
        // Only redirect if we have a user AND a profile, and we're not actually loading
        if (user && profile && !authLoading) {
            const userRole = profile.role;
            const targetPath = userRole === "user" || userRole === "cashier" ? "/kiosk" : "/dashboard";

            // Only set location if we are not already at the target
            if (location !== targetPath) {
                console.log(`[Auth] Authenticated as ${userRole}. Redirecting to ${targetPath}`);
                setLocation(targetPath);
            }
        }
    }, [user, profile, authLoading, location, setLocation]);

    // Determine mode based on path, default to 'signup' if not clearly '/login'
    const initialMode = location === "/login" ? "login" : "signup";
    const [mode, setMode] = useState<"login" | "signup">(initialMode);

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        name: "",
        organizationName: "",
        industry: "other",
    });

    const industries = [
        { id: "retail", name: "Retail", icon: Package, color: "from-blue-500 to-cyan-500" },
        { id: "manufacturing", name: "Manufactura", icon: Factory, color: "from-purple-500 to-pink-500" },
        { id: "services", name: "Servicios", icon: Users, color: "from-green-500 to-emerald-500" },
        { id: "hospitality", name: "Restaurante", icon: Utensils, color: "from-orange-500 to-red-500" },
        { id: "healthcare", name: "Salud", icon: ShieldAlert, color: "from-red-500 to-orange-500" },
        { id: "logistics", name: "Logística", icon: Globe, color: "from-yellow-500 to-amber-500" },
        { id: "technology", name: "Tecnología", icon: Zap, color: "from-indigo-500 to-violet-500" },
        { id: "other", name: "Otro", icon: Sparkles, color: "from-slate-500 to-slate-700" },
    ];

    const { toast } = useToast();
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password
                });

                if (error) throw error;
                setLocation("/dashboard");
            } else {
                // Signup via Backend to create Org + User + Modules
                const res = await fetch("/api/auth/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData)
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.message);

                // Auto-login after signup
                const { error: loginError } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password
                });

                if (loginError) {
                    toast({ title: "Cuenta creada", description: "Por favor inicia sesión." });
                    setMode("login");
                } else {
                    setLocation("/onboarding");
                }
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message
            });
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-8 relative overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#3b82f611_0%,_transparent_70%)]" />

            {/* Floating Particles */}
            <div className="absolute inset-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-primary rounded-full"
                        initial={{
                            x: Math.random() * window.innerWidth,
                            y: Math.random() * window.innerHeight,
                        }}
                        animate={{
                            y: [null, Math.random() * window.innerHeight],
                            opacity: [0, 1, 0],
                        }}
                        transition={{
                            duration: Math.random() * 10 + 10,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                    />
                ))}
            </div>

            <div className="relative z-10 w-full max-w-md transform transition-transform duration-500" style={{ transform: `scale(var(--app-scale, 1))` }}>
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center transition-all duration-500 ${mode === 'login' ? 'rotate-0' : 'rotate-[360deg]'}`}>
                            <Brain className="w-6 h-6 text-primary" />
                        </div>
                        <span className="text-3xl font-black uppercase italic tracking-tighter">
                            Cognitive <span className="text-primary prose-invert">OS</span>
                        </span>
                    </div>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={mode}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ duration: 0.2 }}
                        >
                            <h2 className="text-xl font-bold text-white mb-1">
                                {mode === "login" ? "ACCESO AL NÚCLEO" : "EMPIEZA TU EVOLUCIÓN"}
                            </h2>
                            <p className="text-slate-400 text-sm">
                                {mode === "login"
                                    ? "Introduce tus credenciales para sincronizar"
                                    : "Configura tu ecosistema operativo en segundos"}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </motion.div>

                {/* Auth Card */}
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl shadow-2xl">
                    <CardContent className="p-8">
                        {/* Mode Toggle */}
                        <div className="flex gap-2 mb-8 p-1 bg-slate-950 rounded-xl">
                            <button
                                onClick={() => setMode("login")}
                                className={`flex-1 py-3 rounded-lg font-bold uppercase text-sm tracking-wider transition-all ${mode === "login"
                                    ? "bg-primary text-white"
                                    : "text-slate-500 hover:text-slate-300"
                                    }`}
                            >
                                Ingresar
                            </button>
                            <button
                                onClick={() => setMode("signup")}
                                className={`flex-1 py-3 rounded-lg font-bold uppercase text-sm tracking-wider transition-all ${mode === "signup"
                                    ? "bg-primary text-white"
                                    : "text-slate-500 hover:text-slate-300"
                                    }`}
                            >
                                Registrarse
                            </button>
                        </div>

                        <AnimatePresence mode="wait">
                            {mode === "login" ? (
                                <motion.form
                                    key="login"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onSubmit={handleSubmit}
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-sm font-bold uppercase tracking-wider text-slate-400">
                                            Email
                                        </Label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="tu@empresa.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="pl-12 h-14 bg-slate-950 border-slate-800 focus:border-primary rounded-xl"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="text-sm font-bold uppercase tracking-wider text-slate-400">
                                            Contraseña
                                        </Label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                            <Input
                                                id="password"
                                                type="password"
                                                placeholder="••••••••"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="pl-12 h-14 bg-slate-950 border-slate-800 focus:border-primary rounded-xl"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-14 bg-primary hover:bg-primary/90 font-black uppercase tracking-wider rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.3)] group"
                                    >
                                        Sincronizar Datos
                                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </motion.form>
                            ) : (
                                <motion.form
                                    key="signup"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onSubmit={handleSubmit}
                                    className="space-y-5"
                                >
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-sm font-bold uppercase tracking-wider text-slate-400">
                                            Tu Nombre
                                        </Label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                            <Input
                                                id="name"
                                                type="text"
                                                placeholder="Juan Pérez"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="pl-12 h-12 bg-slate-950 border-slate-800 focus:border-primary rounded-xl"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email-signup" className="text-sm font-bold uppercase tracking-wider text-slate-400">
                                            Email
                                        </Label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                            <Input
                                                id="email-signup"
                                                type="email"
                                                placeholder="tu@empresa.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="pl-12 h-12 bg-slate-950 border-slate-800 focus:border-primary rounded-xl"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password-signup" className="text-sm font-bold uppercase tracking-wider text-slate-400">
                                            Contraseña
                                        </Label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                            <Input
                                                id="password-signup"
                                                type="password"
                                                placeholder="••••••••"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="pl-12 h-12 bg-slate-950 border-slate-800 focus:border-primary rounded-xl"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="organization" className="text-sm font-bold uppercase tracking-wider text-slate-400">
                                            Nombre de la Organización
                                        </Label>
                                        <div className="relative">
                                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                            <Input
                                                id="organization"
                                                type="text"
                                                placeholder="Mi Empresa S.A."
                                                value={formData.organizationName}
                                                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                                                className="pl-12 h-12 bg-slate-950 border-slate-800 focus:border-primary rounded-xl"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-wider rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] group"
                                    >
                                        Desplegar Instancia
                                        <Zap className="ml-2 w-5 h-5 group-hover:scale-110 transition-transform" />
                                    </Button>
                                </motion.form>
                            )}
                        </AnimatePresence>

                        {/* Footer */}
                        <div className="mt-8 text-center text-sm text-slate-500">
                            {mode === "login" ? (
                                <p>
                                    ¿No tienes cuenta?{" "}
                                    <button
                                        onClick={() => setMode("signup")}
                                        className="text-primary hover:underline font-bold"
                                    >
                                        Regístrate gratis
                                    </button>
                                </p>
                            ) : (
                                <p>
                                    ¿Ya tienes cuenta?{" "}
                                    <button
                                        onClick={() => setMode("login")}
                                        className="text-primary hover:underline font-bold"
                                    >
                                        Inicia sesión
                                    </button>
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Trust Badges */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8 text-center space-y-3"
                >
                    <p className="text-xs text-slate-600 uppercase tracking-widest">
                        Confiado por empresas visionarias
                    </p>
                    <div className="flex justify-center gap-6 text-slate-700">
                        <Lock className="w-5 h-5" />
                        <span className="text-xs">Encriptación de 256 bits</span>
                        <span className="text-xs">•</span>
                        <span className="text-xs">Cumplimiento SOC 2</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
