import { AppLayout } from "@/components/layout/AppLayout";
import { ModuleMarketplace } from "@/components/modules/ModuleMarketplace";

export default function MarketplacePage() {
    return (
        <AppLayout
            title="Marketplace"
            subtitle="Explora y activa módulos para tu negocio"
        >
            <ModuleMarketplace />
        </AppLayout>
    );
}
