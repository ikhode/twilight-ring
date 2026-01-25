import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useConfiguration } from "@/context/ConfigurationContext";
import { useCognitiveEngine } from "./engine";

/**
 * CognitiveBridge
 * 
 * Actúa como el "Nervous System Connector" entre el estado de React (Auth, Config)
 * y el Motor Cognitivo (Zustand Store).
 * 
 * Inyecta el contexto de la organización y los módulos activos en el "Cerebro"
 * para que las sugerencias sean 100% personalizadas.
 */
export function CognitiveBridge() {
    const { user, profile } = useAuth();
    const { enabledModules } = useConfiguration();
    const { setContext } = useCognitiveEngine();

    useEffect(() => {
        // Inyectar contexto al motor
        setContext({
            activeModules: enabledModules,
            userRole: profile?.role || "guest",
            organizationId: profile?.organizationId?.toString() || null,
            // En un futuro, aquí inyectaríamos la industria desde la config de la org
            industry: "generic"
        });

        console.log("🧠 Cognitive Context Synced:", {
            modules: enabledModules.length,
            role: profile?.role
        });

    }, [enabledModules, user, profile, setContext]);

    // Este componente no renderiza nada visualmente, es un componente lógico.
    return null;
}
