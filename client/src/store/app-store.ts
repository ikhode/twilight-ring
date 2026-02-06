import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { INDUSTRY_TEMPLATES } from '@/lib/industry-templates';

export type IndustryType = "manufacturing" | "retail" | "logistics" | "services" | "generic" | string;

interface AppState {
    // Basic Info
    industry: IndustryType;
    industryName: string;

    // Modules & UI
    enabledModules: string[];
    theme: "glass" | "compact";
    themeColor: string;

    // Universal Config (Product Categories, etc.)
    productCategories: string[];
    defaultUnits: string[];
    cedisAddress?: string;
    cedisLat?: number;
    cedisLng?: number;

    // Dynamic Labels
    productTypeLabels?: Record<string, string>;

    // Actions
    setIndustry: (industry: string) => void;
    setTheme: (theme: "glass" | "compact") => void;
    setThemeColor: (color: string) => void;
    setModules: (modules: string[]) => void;
    setUniversalConfig: (config: {
        productCategories?: string[],
        defaultUnits?: string[],
        industryName?: string,
        cedisAddress?: string,
        cedisLat?: number,
        cedisLng?: number
    }) => void;

    // Optimistic Industry Update
    applyIndustryTemplate: (industryKey: string) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            industry: "generic",
            industryName: "General",
            enabledModules: [],
            theme: "glass",
            themeColor: "#3b82f6",
            productCategories: [],
            defaultUnits: ["pza"],
            cedisAddress: "",
            cedisLat: undefined,
            cedisLng: undefined,

            setIndustry: (industry) => set({ industry }),
            setTheme: (theme) => set({ theme }),
            setThemeColor: (color) => set({ themeColor: color }),
            setModules: (modules) => set({ enabledModules: modules }),

            setUniversalConfig: (config) => set((state) => ({
                productCategories: config.productCategories ?? state.productCategories,
                defaultUnits: config.defaultUnits ?? state.defaultUnits,
                industryName: config.industryName ?? state.industryName,
                cedisAddress: config.cedisAddress ?? state.cedisAddress,
                cedisLat: config.cedisLat ?? state.cedisLat,
                cedisLng: config.cedisLng ?? state.cedisLng
            })),

            applyIndustryTemplate: (industryKey) => {
                const template = INDUSTRY_TEMPLATES[industryKey];
                if (template) {
                    set({
                        industry: industryKey,
                        industryName: template.name,
                        productCategories: template.categories,
                        defaultUnits: template.units,
                        productTypeLabels: template.productTypeLabels,
                        enabledModules: template.modules || []
                    });
                }
            }
        }),
        {
            name: 'nexus-app-state',
        }
    )
);
