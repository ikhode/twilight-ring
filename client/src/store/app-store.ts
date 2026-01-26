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
    productTypeLabels: Record<string, { label: string, context: string }>;
    cedisAddress?: string;
    cedisLat?: number;
    cedisLng?: number;

    // Actions
    setIndustry: (industry: string) => void;
    setTheme: (theme: "glass" | "compact") => void;
    setThemeColor: (color: string) => void;
    setModules: (modules: string[]) => void;
    setUniversalConfig: (config: {
        productCategories?: string[],
        defaultUnits?: string[],
        industryName?: string,
        productTypeLabels?: Record<string, { label: string, context: string }>,
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
            productTypeLabels: {
                both: { label: "Compra y Venta", context: "Optimización de margen y rotación." },
                purchase: { label: "Materia Prima", context: "Monitoreo de desabasto operativo." },
                sale: { label: "Producto Final", context: "Ajuste dinámico de precios." },
                internal: { label: "Uso Interno", context: "Control de gasto operativo." }
            },
            cedisAddress: "",
            cedisLat: undefined,
            cedisLng: undefined,

            setIndustry: (industry) => set({ industry }),
            setTheme: (theme) => set({ theme }),
            setThemeColor: (color) => set({ themeColor: color }),
            setModules: (modules) => set({ enabledModules: modules }),

            setUniversalConfig: (config) => set((state) => ({
                productCategories: config.productCategories || state.productCategories,
                defaultUnits: config.defaultUnits || state.defaultUnits,
                industryName: config.industryName || state.industryName,
                productTypeLabels: config.productTypeLabels || state.productTypeLabels,
                cedisAddress: config.cedisAddress !== undefined ? config.cedisAddress : state.cedisAddress,
                cedisLat: config.cedisLat !== undefined ? config.cedisLat : state.cedisLat,
                cedisLng: config.cedisLng !== undefined ? config.cedisLng : state.cedisLng
            })),

            applyIndustryTemplate: (industryKey) => {
                const template = INDUSTRY_TEMPLATES[industryKey];
                if (template) {
                    set({
                        industry: industryKey,
                        industryName: template.name,
                        productCategories: template.categories,
                        defaultUnits: template.units,
                        productTypeLabels: template.productTypeLabels
                    });
                }
            }
        }),
        {
            name: 'nexus-app-state',
        }
    )
);
