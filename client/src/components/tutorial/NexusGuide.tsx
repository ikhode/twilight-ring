import { useEffect, useState } from 'react';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useAuth } from '@/hooks/use-auth';
import { Bot, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminSteps, managerSteps, operatorSteps, driverSteps } from '@/data/tutorialSteps';
import { motion, AnimatePresence } from 'framer-motion';

export function NexusGuide() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    // Check if user has seen the tutorial
    useEffect(() => {
        const hasSeenTutorial = localStorage.getItem('nexus_guide_completed');
        if (!hasSeenTutorial && user) {
            // Delay slightly to ensure UI is mounted
            setTimeout(() => setIsOpen(true), 1500);
        }
    }, [user]);

    const startTour = () => {
        setIsOpen(false);

        const driverObj = driver({
            showProgress: true,
            steps: getStepsForRole(user?.role || 'admin'),
            onDestroyed: () => {
                localStorage.setItem('nexus_guide_completed', 'true');
            }
        });

        driverObj.drive();
    };

    const getStepsForRole = (role: string) => {
        switch (role) {
            case 'admin': return adminSteps;
            case 'manager': return managerSteps;
            case 'operator': return operatorSteps;
            case 'driver': return driverSteps;
            default: return adminSteps;
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed bottom-6 right-6 z-50 max-w-sm w-full"
            >
                <div className="bg-slate-900/90 backdrop-blur-xl border border-primary/20 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header with Avatar */}
                    <div className="relative h-24 bg-gradient-to-r from-primary/20 to-purple-500/20 p-6 flex items-center justify-center">
                        <div className="absolute top-2 right-2">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={() => setIsOpen(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="w-16 h-16 bg-slate-900 rounded-2xl border-2 border-primary/30 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                            <Bot className="w-8 h-8 text-primary animate-pulse" />
                        </div>
                    </div>

                    <div className="p-6 text-center space-y-4">
                        <div>
                            <h3 className="text-lg font-black uppercase italic tracking-wider text-white">Nexus Guide</h3>
                            <p className="text-xs text-primary font-bold uppercase tracking-widest mt-1">Asistente de Onboarding</p>
                        </div>

                        <p className="text-sm text-slate-300 leading-relaxed">
                            ¡Hola <span className="text-white font-bold">{user?.email?.split('@')[0]}</span>! Soy tu copiloto cognitivo.
                            He preparado un tour rápido para mostrarte las herramientas clave de tu nuevo sistema operativo.
                        </p>

                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                className="flex-1 border-slate-700 hover:bg-slate-800 text-slate-300"
                                onClick={() => {
                                    setIsOpen(false);
                                    localStorage.setItem('nexus_guide_completed', 'true');
                                }}
                            >
                                Saltar
                            </Button>
                            <Button
                                className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold"
                                onClick={startTour}
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                Iniciar Tour
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
