import { create } from 'zustand';
import { useTensorBridge } from './tensor-bridge';

export type SystemMode = 'observation' | 'analysis' | 'intervention' | 'idle';

export interface CognitiveState {
    systemConfidence: number; // 0-100
    currentIntent: string | null;
    activeMode: SystemMode;
    suggestions: CognitiveSuggestion[];

    // Context Awareness
    context: {
        activeModules: string[];
        userRole: string | null;
        organizationId: string | null;
        industry?: string;
    };
    tensors: ReturnType<typeof useTensorBridge.getState>; // Expose full tensor state

    setContext: (ctx: Partial<CognitiveState['context']>) => void;
    syncTensors: () => void;

    // Actions
    setConfidence: (score: number) => void;
    setIntent: (intent: string) => void;
    setMode: (mode: SystemMode) => void;
    addSuggestion: (suggestion: CognitiveSuggestion) => void;
    removeSuggestion: (id: string) => void;
}

export interface CognitiveSuggestion {
    id: string;
    title: string;
    description: string;
    type: 'optimization' | 'warning' | 'insight';
    score: number; // Relevancy score
    actionLabel?: string;
    onAction?: () => void;
}

export const useCognitiveEngine = create<CognitiveState>((set) => ({
    systemConfidence: 85, // Initial high confidence
    currentIntent: null,
    activeMode: 'observation',
    suggestions: [],
    context: {
        activeModules: [],
        userRole: null,
        organizationId: null
    },
    // We bind the live tensor state here for easy access, 
    // though components should likely use useTensorBridge directly for subscriptions.
    tensors: useTensorBridge.getState(),

    setContext: (ctx) => set((state) => ({ context: { ...state.context, ...ctx } })),

    syncTensors: () => {
        set({ tensors: useTensorBridge.getState() });
    },

    setConfidence: (score) => set({ systemConfidence: score }),
    setIntent: (intent) => set({ currentIntent: intent }),
    setMode: (mode) => set({ activeMode: mode }),
    addSuggestion: (suggestion) => set((state) => ({
        suggestions: [...state.suggestions, suggestion]
    })),
    removeSuggestion: (id) => set((state) => ({
        suggestions: state.suggestions.filter(s => s.id !== id)
    })),
}));
