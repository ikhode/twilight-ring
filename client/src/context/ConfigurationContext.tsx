import React, { createContext, useContext, useState, useEffect } from "react";
import { UserRoleType } from "@/lib/ai/dashboard-engine";
import { ERP_MODULES } from "@/lib/modules";

export type IndustryType = "manufacturing" | "retail" | "logistics" | "services" | "generic";

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
        placeTypes: string[];
        productAttributes: { name: string; type: string }[];
        processFlows: { name: string; type: string }[];
        productCategories: string[];
        cedisAddress: string;
    };
    updateUniversalConfig: (config: any) => void;
}

const ConfigurationContext = createContext<ConfigurationContextType | undefined>(undefined);

import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function ConfigurationProvider({ children }: { children: React.ReactNode }) {
    const { session } = useAuth();
    const queryClient = useQueryClient();

    // Default State (Fallback or Loading)
    const [industry, setIndustryState] = useState<IndustryType>(() => (localStorage.getItem("nexus_industry") as IndustryType) || "generic");
    const [enabledModules, setEnabledModules] = useState<string[]>(() => {
        const saved = localStorage.getItem("nexus_modules");
        return saved ? JSON.parse(saved) : ERP_MODULES.map(m => m.id);
    });
    const [theme, setThemeState] = useState<"glass" | "compact">(() => (localStorage.getItem("nexus_theme") as "glass" | "compact") || "glass");
    const [role, setRoleState] = useState<UserRoleType>('admin');
    const [aiConfig, setAiConfig] = useState({
        guardianEnabled: true,
        copilotEnabled: true,
        adaptiveUiEnabled: true
    });
    const [themeColor, setThemeColorState] = useState<string>("#3b82f6");

    const [universalConfig, setUniversalConfig] = useState({
        placeTypes: [] as string[],
        productAttributes: [] as { name: string; type: string }[],
        processFlows: [] as { name: string; type: string }[],
        productCategories: [] as string[],
        cedisAddress: "",
    });

    // Fetch Config from Backend
    const { data: remoteConfig } = useQuery({
        queryKey: ["/api/config"],
        queryFn: async () => {
            if (!session?.access_token) return null;
            const orgId = localStorage.getItem("nexus_active_org") || "";
            const res = await fetch("/api/config", {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    "x-organization-id": orgId
                }
            });
            if (!res.ok) throw new Error("Failed to fetch config");
            return res.json();
        },
        enabled: !!session?.access_token,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Sync Remote to Local on Load
    useEffect(() => {
        if (remoteConfig) {
            if (remoteConfig.industry) setIndustryState(remoteConfig.industry);
            if (remoteConfig.theme) setThemeState(remoteConfig.theme);
            if (remoteConfig.themeColor) setThemeColorState(remoteConfig.themeColor);
            if (remoteConfig.enabledModules) setEnabledModules(remoteConfig.enabledModules);
            if (remoteConfig.ai) setAiConfig(prev => ({ ...prev, ...remoteConfig.ai }));
            if (remoteConfig.universal) setUniversalConfig(prev => ({ ...prev, ...remoteConfig.universal }));
        }
    }, [remoteConfig]);

    // Mutation for Updates
    const mutation = useMutation({
        mutationFn: async (payload: any) => {
            if (!session?.access_token) return;
            const orgId = localStorage.getItem("nexus_active_org") || "";
            await fetch("/api/config", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                    "x-organization-id": orgId
                },
                body: JSON.stringify(payload)
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/config"] });
        }
    });

    // Actions (Optimistic + Persist)
    const setThemeColor = (c: string) => {
        setThemeColorState(c);
        document.documentElement.style.setProperty('--primary', c);
        mutation.mutate({ themeColor: c });
    };

    const updateUniversalConfig = (config: any) => {
        setUniversalConfig(prev => {
            const next = { ...prev, ...config };
            mutation.mutate({ universal: next });
            return next;
        });
    };

    const updateAiConfig = (config: any) => {
        setAiConfig(prev => {
            const next = { ...prev, ...config };
            mutation.mutate({ ai: next });
            return next;
        });
    };
    const setIndustry = (ind: IndustryType) => {
        setIndustryState(ind);
        localStorage.setItem("nexus_industry", ind);
        mutation.mutate({ industry: ind });
    };

    const setTheme = (t: "glass" | "compact") => {
        setThemeState(t);
        localStorage.setItem("nexus_theme", t);
        mutation.mutate({ theme: t });
    };

    const setRole = (r: UserRoleType) => {
        setRoleState(r);
    };

    const toggleModule = (moduleId: string) => {
        const next = enabledModules.includes(moduleId)
            ? enabledModules.filter(id => id !== moduleId)
            : [...enabledModules, moduleId];

        setEnabledModules(next);
        localStorage.setItem("nexus_modules", JSON.stringify(next));
        mutation.mutate({ enabledModules: next });
    };

    return (
        <ConfigurationContext.Provider value={{
            industry,
            setIndustry,
            enabledModules,
            toggleModule,
            theme,
            setTheme,
            themeColor,
            setThemeColor,
            role,
            setRole,
            aiConfig,
            setAiConfig: updateAiConfig,
            universalConfig,
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
