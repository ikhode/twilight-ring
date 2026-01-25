import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useConfiguration } from "@/context/ConfigurationContext";
import { useCognitiveEngine } from "./engine";
import { useTensorBridge } from "./tensor-bridge";

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

    // Tensor Actions
    const { setSalesTensor, setInventoryTensor, setPurchasesTensor } = useTensorBridge();

    // 1. Context Sync (Metadata)
    useEffect(() => {
        setContext({
            activeModules: enabledModules,
            userRole: profile?.role || "guest",
            organizationId: profile?.organizationId?.toString() || null,
            industry: "generic"
        });
    }, [enabledModules, user, profile, setContext]);

    // 2. Tensor Sync (Data Plane)
    // In a real scenario, this would subscribe to useQuery or Realtime streams.
    // For this refactor demonstrating the architecture, we will simulate the "Link".
    useEffect(() => {
        if (enabledModules.includes("sales")) {
            // Simulating connecting to the Sales Firehose
            // [Day, Orders, Revenue]
            const mockSalesData = [
                [1, 120, 5000],
                [2, 135, 6200],
                [3, 110, 4800],
                [4, 150, 7000],
                [5, 180, 8500]
            ];
            setSalesTensor(mockSalesData);
            console.log("🧠 Tensor Bridge: Sales Stream Linked");
        }

        if (enabledModules.includes("inventory")) {
            // [ItemId, StockLevel, ReorderPoint]
            const mockInventoryData = [
                [101, 50, 20],
                [102, 12, 15], // Low stock
                [103, 200, 50]
            ];
            setInventoryTensor(mockInventoryData);
            console.log("🧠 Tensor Bridge: Inventory Stream Linked");
        }

        if (enabledModules.includes("finance") || enabledModules.includes("purchases")) {
            // [Day, Amount, CategoryId]
            const mockPurchaseData = [
                [1, 500, 1],
                [2, 1200, 2],
                [3, 300, 1],
                [4, 0, 0],
                [5, 4500, 3]
            ];
            setPurchasesTensor(mockPurchaseData);
            console.log("🧠 Tensor Bridge: Purchases Stream Linked");
        }

    }, [enabledModules, setSalesTensor, setInventoryTensor, setPurchasesTensor]);

    return null;
}
