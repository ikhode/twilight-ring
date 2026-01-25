import { AppLayout } from "@/components/layout/AppLayout";
import { ModuleMarketplace } from "@/components/modules/ModuleMarketplace";

export default function Marketplace() {
    return (
        <AppLayout title="Marketplace de Módulos" subtitle="Expande las capacidades de tu Sistema Operativo Cognitivo">
            <div className="space-y-6 pb-12">
                <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-8 border border-white/5">
                    <h2 className="text-2xl font-black italic tracking-tighter text-white mb-2">CATÁLOGO DE FUNCIONALIDADES</h2>
                    <p className="text-slate-400 max-w-2xl">
                        Activa solo los módulos que tu operación necesita. El Núcleo Cognitivo se adaptará automáticamente
                        a las nuevas herramientas, integrando sus datos en el modelo de predicción global.
                    </p>
                </div>

                <ModuleMarketplace />
            </div>
        </AppLayout>
    );
}
