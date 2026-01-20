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
    Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
    const [, setLocation] = useLocation();
    const [mode, setMode] = useState<"login" | "signup">("signup");
    const [step, setStep] = useState(1); // For signup flow
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        name: "",
        organizationName: "",
        industry: "manufacturing",
    });

    const industries = [
        { id: "retail", name: "Retail", emoji: "🛍️" },
        { id: "manufacturing", name: "Manufactura", emoji: "🏭" },
        { id: "services", name: "Servicios", emoji: "💼" },
        { id: "healthcare", name: "Salud", emoji: "🏥" },
        { id: "logistics", name: "Logística", emoji: "🚚" },
        { id: "hospitality", name: "Hospitalidad", emoji: "🏨" },
        { id: "construction", name: "Construcción", emoji: "🏗️" },
        { id: "technology", name: "Tecnología", emoji: "💻" },
        { id: "education", name: "Educación", emoji: "🎓" },
        { id: "other", name: "Otro", emoji: "🌐" },
    ];

    const { toast } = useToast();
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (mode === "signup" && step === 1) {
            setStep(2);
            return;
        }

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

            <div className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                            <Brain className="w-6 h-6 text-primary" />
                        </div>
                        <span className="text-3xl font-black uppercase italic">Cognitive OS</span>
                    </div>
                    <p className="text-slate-400 text-sm">
                        {mode === "login" ? "Bienvenido de vuelta al futuro" : "Únete a la evolución"}
                    </p>
                </motion.div>

                {/* Auth Card */}
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl shadow-2xl">
                    <CardContent className="p-8">
                        {/* Mode Toggle */}
                        <div className="flex gap-2 mb-8 p-1 bg-slate-950 rounded-xl">
                            <button
                                onClick={() => {
                                    setMode("login");
                                    setStep(1);
                                }}
                                className={`flex-1 py-3 rounded-lg font-bold uppercase text-sm tracking-wider transition-all ${mode === "login"
                                    ? "bg-primary text-white"
                                    : "text-slate-500 hover:text-slate-300"
                                    }`}
                            >
                                Ingresar
                            </button>
                            <button
                                onClick={() => {
                                    setMode("signup");
                                    setStep(1);
                                }}
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
                                        className="w-full h-14 bg-primary hover:bg-primary/90 font-black uppercase tracking-wider rounded-xl group"
                                    >
                                        Acceder al Dashboard
                                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </motion.form>
                            ) : step === 1 ? (
                                <motion.form
                                    key="signup-step1"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onSubmit={handleSubmit}
                                    className="space-y-6"
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
                                                className="pl-12 h-14 bg-slate-950 border-slate-800 focus:border-primary rounded-xl"
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
                                                className="pl-12 h-14 bg-slate-950 border-slate-800 focus:border-primary rounded-xl"
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
                                                className="pl-12 h-14 bg-slate-950 border-slate-800 focus:border-primary rounded-xl"
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
                                                className="pl-12 h-14 bg-slate-950 border-slate-800 focus:border-primary rounded-xl"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-14 bg-primary hover:bg-primary/90 font-black uppercase tracking-wider rounded-xl group"
                                    >
                                        Continuar
                                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </motion.form>
                            ) : (
                                <motion.form
                                    key="signup-step2"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onSubmit={handleSubmit}
                                    className="space-y-6"
                                >
                                    <div className="text-center mb-6">
                                        <Badge className="bg-primary/20 text-primary border-primary/30 mb-3">
                                            <Sparkles className="w-3 h-3 mr-1" />
                                            Paso 2 de 2
                                        </Badge>
                                        <h3 className="text-2xl font-black">Selecciona Tu Industria</h3>
                                        <p className="text-sm text-slate-400 mt-2">
                                            Configuraremos los módulos perfectos para ti
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                                        {industries.map((industry) => (
                                            <button
                                                key={industry.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, industry: industry.id })}
                                                className={`p-4 rounded-xl border-2 transition-all text-left ${formData.industry === industry.id
                                                    ? "border-primary bg-primary/10"
                                                    : "border-slate-800 bg-slate-950 hover:border-slate-700"
                                                    }`}
                                            >
                                                <div className="text-2xl mb-2">{industry.emoji}</div>
                                                <p className="text-sm font-bold">{industry.name}</p>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setStep(1)}
                                            className="flex-1 h-14 border-slate-800 hover:bg-slate-800 rounded-xl"
                                        >
                                            Atrás
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="flex-1 h-14 bg-primary hover:bg-primary/90 font-black uppercase tracking-wider rounded-xl group"
                                        >
                                            Crear Cuenta
                                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </div>
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
