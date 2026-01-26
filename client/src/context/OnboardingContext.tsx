
import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import introJs from "intro.js";
import "intro.js/introjs.css";
import "@/styles/introjs-custom.css";
import { useLocation } from "wouter";
import { onboardingSteps, OnboardingStep } from "@/lib/onboarding-steps";

interface OnboardingContextType {
    completedSteps: string[];
    startTour: (stepId: string) => void;
    skipOnboarding: () => void;
    isMuted: boolean;
    toggleMute: () => void;
    activeStepId: string | null;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export const useOnboarding = () => {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error("useOnboarding must be used within an OnboardingProvider");
    }
    return context;
};

// TTS Helper
const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const plainText = text.replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' ');
    const utterance = new SpeechSynthesisUtterance(plainText);

    // Attempt to load voices (chrome requires this, sometimes redundant)
    const voices = window.speechSynthesis.getVoices();
    // Prioritize Mexico/Latin America, then generic Spanish
    const esVoice = voices.find(v => v.lang.includes('es-MX')) ||
        voices.find(v => v.lang.includes('es-419')) ||
        voices.find(v => v.lang.startsWith('es'));

    if (esVoice) utterance.voice = esVoice;
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
};


export function OnboardingProvider({ children }: { children: React.ReactNode }) {
    const [completedSteps, setCompletedSteps] = useState<string[]>([]);
    const [location, setLocation] = useLocation();
    const [isMuted, setIsMuted] = useState(false);
    const [activeStepId, setActiveStepId] = useState<string | null>(null);
    const introRef = useRef<any>(null);

    // Initial Load
    useEffect(() => {
        const savedCompleted = localStorage.getItem('nexus_onboarding_progress');
        if (savedCompleted) {
            try {
                setCompletedSteps(JSON.parse(savedCompleted));
            } catch (e) { console.error("Failed to parse onboarding progress", e); }
        }

        const savedMute = localStorage.getItem('nexus_tts_muted');
        if (savedMute) setIsMuted(true);

        // Load voices
        window.speechSynthesis.getVoices();
    }, []);

    const toggleMute = () => {
        const newState = !isMuted;
        setIsMuted(newState);
        if (newState) {
            window.speechSynthesis.cancel();
            localStorage.setItem('nexus_tts_muted', 'true');
        } else {
            localStorage.removeItem('nexus_tts_muted');
        }
    };

    const skipOnboarding = () => {
        localStorage.setItem('nexus_introjs_completed', 'true');
        setLocation('/dashboard');
    };

    const startTour = (stepId: string) => {
        // Find the step config
        const step = onboardingSteps.find(s => s.id === stepId);
        if (!step) return;

        // Set active step (persists across navigation if provider is root)
        setActiveStepId(stepId);
        localStorage.setItem('nexus_tour_active', 'true');

        // Navigation Map
        const navigationMap: Record<string, string> = {
            'products': '/inventory',
            'sales': '/sales',
            'purchases': '/purchases',
            'workflows': '/workflows',
            'payroll': '/finance/payroll',
            'crm': '/crm',
            'logistics': '/logistics',
            'documents': '/documents'
        };

        const targetPath = navigationMap[stepId];
        if (targetPath && location !== targetPath) {
            setLocation(targetPath);
            // The useEffect below will detect location change + activeStepId and trigger intro
        } else {
            // Already there
            initIntro(step);
        }
    };

    // Watch for tour activation
    useEffect(() => {
        if (!activeStepId) return;

        const step = onboardingSteps.find(s => s.id === activeStepId);
        if (!step) return;

        const navigationMap: Record<string, string> = {
            'products': '/inventory',
            'sales': '/sales',
            'purchases': '/purchases',
            'workflows': '/workflows',
            'payroll': '/finance/payroll',
            'crm': '/crm',
            'logistics': '/logistics',
            'documents': '/documents'
        };
        const targetPath = navigationMap[activeStepId];

        // If we are on the right page, start the tour
        // We add a small delay to ensure DOM is ready
        if (location === targetPath) {
            // Small timeout to allow DOM to settle
            const t = setTimeout(() => {
                initIntro(step);
            }, 800);
            return () => clearTimeout(t);
        }

    }, [activeStepId, location]);

    // Handle Onboarding Actions (Real UI Interaction)
    useEffect(() => {
        const handleAction = (e: any) => {
            const action = e.detail;
            if (!introRef.current) return;

            const intro = introRef.current;
            const currentStepIndex = intro._currentStep;
            const currentStepData = intro._options.steps[currentStepIndex];

            if (!currentStepData) return;

            // Trigger Automatic Next
            if (currentStepData.actionTrigger === action) {
                intro.nextStep();
            }

            // Unlock Requirement
            if (currentStepData.actionRequirement === action) {
                // Show the next button
                const nextBtn = document.querySelector('.introjs-nextbutton') as HTMLElement;
                if (nextBtn) {
                    nextBtn.style.display = 'inline-block';
                    // Optional: Highlight it or click it automatically
                    // intro.nextStep(); 
                }
            }
        };

        window.addEventListener('NEXUS_ONBOARDING_ACTION' as any, handleAction);
        return () => window.removeEventListener('NEXUS_ONBOARDING_ACTION' as any, handleAction);
    }, [activeStepId]);

    const initIntro = (step: OnboardingStep) => {
        // Prevent double init
        if (introRef.current) return; // Actually, we might want to restart? 
        // intro.js usually cleans up itself.

        const intro = introJs();
        introRef.current = intro;

        intro.setOptions({
            steps: step.tourSteps,
            showProgress: true,
            showBullets: false,
            exitOnOverlayClick: false,
            dontShowAgain: false,
            nextLabel: 'Siguiente →',
            prevLabel: '← Anterior',
            doneLabel: '✓ Completar',
            skipLabel: 'Saltar',
        });

        intro.onchange((targetElement) => {
            // Safe access to internal Intro.js properties
            // @ts-ignore
            const items = intro._introItems;
            // @ts-ignore
            const stepIndex = intro._currentStep;

            if (!items || typeof stepIndex === 'undefined' || !items[stepIndex]) return;

            const currentStepData = items[stepIndex];

            if (!localStorage.getItem('nexus_tts_muted')) {
                speak(currentStepData.intro);
            }

            // Handle Action Requirements (Disable Next Button)
            setTimeout(() => {
                const nextBtn = document.querySelector('.introjs-nextbutton') as HTMLElement;
                const skipBtn = document.querySelector('.introjs-skipbutton') as HTMLElement;

                if (currentStepData?.actionRequirement || currentStepData?.actionTrigger) {
                    if (nextBtn) nextBtn.style.display = 'none';
                } else {
                    if (nextBtn) nextBtn.style.display = 'inline-block';
                }
            }, 50);
        });

        intro.oncomplete(() => {
            finishTour(step.id);
        });

        intro.onexit(() => {
            // User cancelled?
            resetTour();
        });

        intro.start();
    };

    const finishTour = (stepId: string) => {
        const newCompleted = [...completedSteps, stepId];
        // Dedupe
        const unique = Array.from(new Set(newCompleted));
        setCompletedSteps(unique);
        localStorage.setItem('nexus_onboarding_progress', JSON.stringify(unique));

        // If all completed?
        if (unique.length === onboardingSteps.length) {
            localStorage.setItem('nexus_introjs_completed', 'true');
        }

        resetTour();
        // Go back to menu
        setLocation('/onboarding');
    };

    const resetTour = () => {
        setActiveStepId(null);
        localStorage.removeItem('nexus_tour_active');
        window.speechSynthesis.cancel();
        introRef.current = null;
        // If user exited manually, we also probably want to go back to onboarding menu?
        // Or stay on page? Usually stay on page is less jarring, but for this linear flow:
        // "Show Welcome" logic in IntroJsOnboarding expects them to be there.
        // Let's navigate back to /onboarding if they exit prematurely?
        // User requested "friendly". Forcing back might be annoying if they want to explore.
        // But the Onboarding Menu is the hub. 
        // Let's force back to /onboarding for consistency in this guided mode.
        setLocation('/onboarding');
    };

    return (
        <OnboardingContext.Provider value={{ completedSteps, startTour, skipOnboarding, isMuted, toggleMute, activeStepId }}>
            {children}
        </OnboardingContext.Provider>
    );
}
