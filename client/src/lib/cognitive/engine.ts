import { create } from 'zustand';

export type SystemMode = 'observation' | 'analysis' | 'intervention' | 'idle';

export interface CognitiveState {
    systemConfidence: number; // 0-100
    currentIntent: string | null;
    activeMode: SystemMode;
    suggestions: CognitiveSuggestion[];

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
