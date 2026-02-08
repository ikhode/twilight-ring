
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    LayoutDashboard,
    Workflow,
    History,
    Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";

// Components
import { ProductionCockpit } from "../components/production/ProductionCockpit";
import { ProcessStudio } from "../components/production/ProcessStudio";
import { TraceabilityLedger } from "../components/production/TraceabilityLedger";

export default function ProductionHub() {
    const [activeTab, setActiveTab] = useState("cockpit");

    return (
        <AppLayout
            title="Production Studio"
            subtitle="Gestión cognitiva de manufactura y procesos"
        >
            <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex items-center justify-between mb-6">
                        <TabsList className="bg-slate-900/50 border border-slate-800 p-1 backdrop-blur-md">
                            <TabsTrigger value="cockpit" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                                <LayoutDashboard className="w-4 h-4" />
                                <span className="hidden sm:inline">Cockpit Operativo</span>
                            </TabsTrigger>
                            <TabsTrigger value="studio" className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all">
                                <Workflow className="w-4 h-4" />
                                <span className="hidden sm:inline">Process Studio</span>
                            </TabsTrigger>
                            <TabsTrigger value="ledger" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all">
                                <History className="w-4 h-4" />
                                <span className="hidden sm:inline">Traceability Ledger</span>
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex items-center gap-2">
                            <div className="hidden lg:flex flex-col items-end mr-4">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Industry Mode</span>
                                <span className="text-xs font-medium text-blue-400">Agnostic / Universal</span>
                            </div>
                            <button className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors">
                                <Settings2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <TabsContent value="cockpit" className="mt-0 focus-visible:outline-none">
                        <ProductionCockpit />
                    </TabsContent>

                    <TabsContent value="studio" className="mt-0 focus-visible:outline-none">
                        <ProcessStudio />
                    </TabsContent>

                    <TabsContent value="ledger" className="mt-0 focus-visible:outline-none">
                        <TraceabilityLedger />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
