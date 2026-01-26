
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot,
    Sparkles,
    Building2,
    ChevronRight as ChevronIcon,
    ArrowRight,
    Volume2,
    VolumeX
} from 'lucide-react';
import { INDUSTRY_TEMPLATES } from '@/lib/industry-templates';
import { useAuth } from '@/hooks/use-auth';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/app-store';
import { apiRequest } from '@/lib/queryClient';
import { useOnboarding } from '@/context/OnboardingContext';
import { onboardingSteps } from '@/lib/onboarding-steps';

export function IntroJsOnboarding() {
    const [, setLocation] = useLocation();
    const { session, organization } = useAuth();
    const queryClient = useQueryClient();
    const store = useAppStore();
    const { completedSteps, startTour, skipOnboarding, isMuted, toggleMute } = useOnboarding();

    const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Sync from store on mount
    // Sync from store on mount
    // REMOVED: We want to force the user to confirm/select their industry explicitly during onboarding
    // even if it was pre-selected during signup. This ensures they see the "Giro Comercial" selector.
    /*
    useEffect(() => {
        if (organization?.industry && organization.industry !== 'other') {
            setSelectedIndustry(organization.industry);
        }
    }, [organization]);
    */

    // Initial check handled by AppLayout enforcement, but redundant check here is fine
    useEffect(() => {
        const hasCompletedOnboarding = localStorage.getItem('nexus_introjs_completed');
        if (hasCompletedOnboarding) {
            setLocation('/dashboard');
        }
    }, [setLocation]);

    const handleIndustrySelect = async (industryKey: string) => {
        setIsSaving(true);
        setSelectedIndustry(industryKey);
        store.applyIndustryTemplate(industryKey);

        try {
            const template = INDUSTRY_TEMPLATES[industryKey];
            await apiRequest('PATCH', '/api/organization', {
                industry: industryKey,
                onboardingStatus: 'completed', // Once industry is chosen, core onboarding is "vetted"
                settings: {
                    productCategories: template.categories,
                    defaultUnits: template.units,
                    industryName: template.name
                }
            }, {
                'Authorization': `Bearer ${session?.access_token}`
            });
            queryClient.invalidateQueries({ queryKey: ["/api/config"] });
            queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
            queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
        } catch (error) {
            console.error("Error setting industry:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)]" />
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px]" />

            {/* Floating Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-primary/30 rounded-full"
                        initial={{
                            x: Math.random() * window.innerWidth,
                            y: Math.random() * window.innerHeight,
                        }}
                        animate={{
                            y: [null, Math.random() * window.innerHeight],
                            x: [null, Math.random() * window.innerWidth],
                        }}
                        transition={{
                            duration: Math.random() * 10 + 10,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                    />
                ))}
            </div>

            {/* Header */}
            <header className="relative z-20 p-6 flex justify-between items-center bg-slate-950/50 backdrop-blur-md border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                        <Bot className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="font-black text-2xl tracking-tighter uppercase italic leading-none">
                            Nexus <span className="text-primary">Onboarding</span>
                        </h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                            Sistema de Aprendizaje Interactivo
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleMute}
                        className="text-slate-400 hover:text-white"
                        title={isMuted ? "Activar Narración" : "Silenciar Narración"}
                    >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={skipOnboarding}
                        className="text-slate-400 hover:text-white"
                    >
                        Saltar Tutorial
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 relative z-10 p-8 overflow-y-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="max-w-7xl mx-auto"
                    >
                        {/* Welcome Section */}
                        <div className="text-center mb-12">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6"
                            >
                                <Sparkles className="w-4 h-4 text-primary" />
                                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                                    {selectedIndustry ? `Nexus ERP para ${INDUSTRY_TEMPLATES[selectedIndustry].name}` : 'Bienvenido a Nexus ERP'}
                                </span>
                            </motion.div>

                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-5xl font-black uppercase italic tracking-tighter mb-4"
                            >
                                {selectedIndustry
                                    ? <>Aprende a <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">Dominar</span> tu Negocio</>
                                    : <>Configura tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">Experiencia</span></>
                                }
                            </motion.h2>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="text-slate-400 text-lg max-w-2xl mx-auto"
                            >
                                {selectedIndustry
                                    ? "Selecciona un módulo para comenzar un tour interactivo personalizado para tu industria."
                                    : "Para ofrecerte una experiencia personalizada, cuéntanos: ¿Cuál es el giro de tu negocio?"
                                }
                            </motion.p>
                        </div>

                        {!selectedIndustry ? (
                            /* Industry Selection Grid */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                                {Object.entries(INDUSTRY_TEMPLATES).map(([key, template], idx) => (
                                    <motion.div
                                        key={key}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        onClick={() => handleIndustrySelect(key)}
                                        className="group relative cursor-pointer"
                                    >
                                        <Card className="bg-slate-900/40 border-slate-800 hover:border-primary/50 transition-all duration-300 p-6 h-full flex flex-col items-center text-center group-hover:bg-slate-900/60 overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <Building2 className="w-8 h-8 text-primary" />
                                            </div>
                                            <h3 className="text-xl font-bold mb-2">{template.name}</h3>
                                            <p className="text-xs text-slate-400 mb-4 px-4 line-clamp-2">
                                                Incluye categorías como: {template.categories.slice(0, 3).join(", ")} y más.
                                            </p>
                                            <div className="mt-auto flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 group-hover:gap-3 transition-all">
                                                Seleccionar <ChevronIcon className="w-4 h-4" />
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            /* Modules Grid */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {onboardingSteps.map((step, index) => {
                                    const Icon = step.icon;
                                    const isCompleted = completedSteps.includes(step.id);

                                    return (
                                        <motion.div
                                            key={step.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 * index }}
                                        >
                                            <Card
                                                className={`
                                                    group relative overflow-hidden bg-slate-900/40 border-slate-800 
                                                    hover:border-primary/50 transition-all duration-300 cursor-pointer
                                                    hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] hover:scale-105
                                                    ${isCompleted ? 'border-green-500/50 bg-green-500/5' : ''}
                                                `}
                                                onClick={() => startTour(step.id)}
                                            >
                                                {/* Gradient Background */}
                                                <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-1 transition-opacity`} />

                                                {/* Completed Badge */}
                                                {isCompleted && (
                                                    <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                                        <span className="text-white text-xs">✓</span>
                                                    </div>
                                                )}

                                                <CardContent className="p-6 relative z-10">
                                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} p-0.5 mb-4`}>
                                                        <div className="w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center">
                                                            <Icon className="w-7 h-7 text-white" />
                                                        </div>
                                                    </div>

                                                    <h3 className="text-lg font-black uppercase tracking-tight mb-2">
                                                        {step.title}
                                                    </h3>

                                                    <p className="text-sm text-slate-400 leading-relaxed mb-4">
                                                        {step.description}
                                                    </p>

                                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary group-hover:gap-3 transition-all">
                                                        {isCompleted ? 'Revisar Tour' : 'Iniciar Tour'}
                                                        <ArrowRight className="w-4 h-4" />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Complete Onboarding Button */}
                        {completedSteps.length === onboardingSteps.length && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-12 text-center"
                            >
                                <Button
                                    onClick={skipOnboarding}
                                    className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white font-black uppercase tracking-wider text-sm h-14 px-8 rounded-2xl shadow-[0_0_40px_rgba(59,130,246,0.4)] group"
                                >
                                    <Sparkles className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                                    Ir al Dashboard
                                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </motion.div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}
