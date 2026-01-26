import React, { createContext, useContext, useEffect } from "react";
import { UserRoleType } from "@/lib/ai/dashboard-engine";
import { useAppStore, IndustryType } from "@/store/app-store";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ConfigurationContextType {
    industry: IndustryType;
    setIndustry: (industry: IndustryType) => void;
    enabledModules: string[];
    toggleModule: (moduleId: string) => void;
    theme: "glass" | "compact";
    setTheme: (theme: "glass" | "compact") => void;
    themeColor: string;
    setThemeColor: (color: string) => void;
    role: UserRoleType;
    setRole: (role: UserRoleType) => void;
    aiConfig: {
        guardianEnabled: boolean;
        copilotEnabled: boolean;
        adaptiveUiEnabled: boolean;
    };
    setAiConfig: (config: any) => void;
    universalConfig: {
        productCategories: string[];
        defaultUnits: string[];
        industryName: string;
        // Legacy stubs for compatibility
        placeTypes: string[];
        productAttributes: any[];
        processFlows: any[];
        cedisAddress: string;
    };
    updateUniversalConfig: (config: any) => void;
}

const ConfigurationContext = createContext<ConfigurationContextType | undefined>(undefined);

export function ConfigurationProvider({ children }: { children: React.ReactNode }) {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const store = useAppStore();

    // Roles and AI config still managed locally for now, 
    // but industry/theme/modules are now reactive via Store
    const [role, setRoleState] = React.useState<UserRoleType>('admin');
    const [aiConfig, setAiConfig] = React.useState({
        guardianEnabled: true,
        copilotEnabled: true,
        adaptiveUiEnabled: true
    });

    // Fetch Config from Backend
    const { data: remoteConfig } = useQuery({
        queryKey: ["/api/config"],
        queryFn: async () => {
            if (!session?.access_token) return null;
            const res = await fetch("/api/config", {
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });
            if (!res.ok) throw new Error("Failed to fetch config");
            return res.json();
        },
        enabled: !!session?.access_token,
    });

    // Sync Remote to Zustand Store on Load
    useEffect(() => {
        if (remoteConfig) {
            if (remoteConfig.industry) store.setIndustry(remoteConfig.industry);
            if (remoteConfig.theme) store.setTheme(remoteConfig.theme);
            if (remoteConfig.themeColor) {
                store.setThemeColor(remoteConfig.themeColor);
                document.documentElement.style.setProperty('--primary', remoteConfig.themeColor);
            }
            if (remoteConfig.enabledModules) store.setModules(remoteConfig.enabledModules);
            if (remoteConfig.ai) setAiConfig(prev => ({ ...prev, ...remoteConfig.ai }));
            if (remoteConfig.universal) {
                store.setUniversalConfig(remoteConfig.universal);
            }
        }
    }, [remoteConfig]);

    const mutation = useMutation({
        mutationFn: async (payload: any) => {
            if (!session?.access_token) return;
            await apiRequest("PATCH", "/api/config", payload, {
                Authorization: `Bearer ${session.access_token}`
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/config"] });
        }
    });

    // Wrapped Actions
    const setThemeColor = (c: string) => {
        store.setThemeColor(c);
        document.documentElement.style.setProperty('--primary', c);
        mutation.mutate({ themeColor: c });
    };

    const updateUniversalConfig = (config: any) => {
        store.setUniversalConfig(config);
        mutation.mutate({ universal: config });
    };

    const setIndustry = (ind: IndustryType) => {
        store.setIndustry(ind);
        mutation.mutate({ industry: ind });
    };

    const setTheme = (t: "glass" | "compact") => {
        store.setTheme(t);
        mutation.mutate({ theme: t });
    };

    const toggleModule = (moduleId: string) => {
        const next = store.enabledModules.includes(moduleId)
            ? store.enabledModules.filter(id => id !== moduleId)
            : [...store.enabledModules, moduleId];
        store.setModules(next);
        mutation.mutate({ enabledModules: next });
    };

    return (
        <ConfigurationContext.Provider value={{
            industry: store.industry,
            setIndustry,
            enabledModules: store.enabledModules,
            toggleModule,
            theme: store.theme,
            setTheme,
            themeColor: store.themeColor,
            setThemeColor,
            role,
            setRole: setRoleState,
            aiConfig,
            setAiConfig: (c: any) => {
                setAiConfig(prev => ({ ...prev, ...c }));
                mutation.mutate({ ai: c });
            },
            universalConfig: {
                productCategories: store.productCategories,
                defaultUnits: store.defaultUnits,
                industryName: store.industryName,
                // Stubs
                placeTypes: [],
                productAttributes: [],
                processFlows: [],
                cedisAddress: ""
            },
            updateUniversalConfig,
        }}>
            {children}
        </ConfigurationContext.Provider>
    );
}

export function useConfiguration() {
    const context = useContext(ConfigurationContext);
    if (context === undefined) {
        throw new Error("useConfiguration must be used within a ConfigurationProvider");
    }
    return context;
}

