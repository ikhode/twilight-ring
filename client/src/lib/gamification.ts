import { create } from 'zustand';

interface GamificationState {
    xp: number;
    level: number;
    achievements: string[];
    addXP: (amount: number) => void;
    unlockAchievement: (id: string) => void;
    showLevelUp: boolean;
    closeLevelUp: () => void;
}

export const useGamification = create<GamificationState>((set, get) => ({
    xp: 120, // Initial Mock
    level: 1,
    achievements: [],
    showLevelUp: false,

    addXP: (amount) => {
        const { xp, level } = get();
        const newXP = xp + amount;
        const nextLevelXP = level * 1000;

        if (newXP >= nextLevelXP) {
            set({ xp: newXP, level: level + 1, showLevelUp: true });
        } else {
            set({ xp: newXP });
        }
    },

    unlockAchievement: (id) => {
        const { achievements } = get();
        if (!achievements.includes(id)) {
            set({ achievements: [...achievements, id] });
        }
    },

    closeLevelUp: () => set({ showLevelUp: false }),
}));

export const XP_VALUES = {
    USE_COPILOT: 10,
    COMPLETE_PROCESS: 100,
    RESOLVE_ANOMALY: 50,
    VISIT_DASHBOARD: 5
};
