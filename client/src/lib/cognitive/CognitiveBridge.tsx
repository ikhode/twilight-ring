import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useConfiguration } from "@/context/ConfigurationContext";
import { useCognitiveEngine } from "./engine";
import { useTensorBridge } from "./tensor-bridge";
import { useQuery } from "@tanstack/react-query";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";

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
    const { user, profile, session } = useAuth();
    const { enabledModules } = useConfiguration();
    const { setContext } = useCognitiveEngine();

    // Tensor Actions
    const { setSalesTensor, setInventoryTensor, setPurchasesTensor } = useTensorBridge();

    // Fetch real tensor data from backend
    const { data: tensorData } = useQuery({
        queryKey: ["/api/analytics/tensors"],
        queryFn: async () => {
            if (!session?.access_token) return null;
            const res = await fetch("/api/analytics/tensors", {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!session?.access_token && enabledModules.length > 0,
        refetchInterval: 300000, // Refresh every 5 minutes
    });

    // Subscriptions to ensure AI context is always fresh
    useSupabaseRealtime({ table: 'sales', queryKey: ["/api/analytics/tensors"] });
    useSupabaseRealtime({ table: 'products', queryKey: ["/api/analytics/tensors"] });
    useSupabaseRealtime({ table: 'purchases', queryKey: ["/api/analytics/tensors"] });
    useSupabaseRealtime({ table: 'process_events', queryKey: ["/api/analytics/tensors"] });

    // 1. Context Sync (Metadata)
    useEffect(() => {
        setContext({
            activeModules: enabledModules,
            userRole: profile?.role || "guest",
            organizationId: profile?.organizationId?.toString() || null,
            industry: "generic"
        });
    }, [enabledModules, user, profile, setContext]);

    // 2. Tensor Sync (Data Plane) - Using REAL data from backend
    useEffect(() => {
        if (!tensorData) return;

        if (enabledModules.includes("sales") && tensorData.sales) {
            setSalesTensor(tensorData.sales);
            console.log("🧠 Tensor Bridge: Sales Stream Linked (REAL DATA)", tensorData.sales.length, "records");
        }

        if (enabledModules.includes("inventory") && tensorData.inventory) {
            setInventoryTensor(tensorData.inventory);
            console.log("🧠 Tensor Bridge: Inventory Stream Linked (REAL DATA)", tensorData.inventory.length, "items");
        }

        if ((enabledModules.includes("finance") || enabledModules.includes("purchases")) && tensorData.purchases) {
            setPurchasesTensor(tensorData.purchases);
            console.log("🧠 Tensor Bridge: Purchases Stream Linked (REAL DATA)", tensorData.purchases.length, "records");
        }

    }, [tensorData, enabledModules, setSalesTensor, setInventoryTensor, setPurchasesTensor]);

    return null;
}
