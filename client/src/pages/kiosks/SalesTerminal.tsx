import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogOut, ShoppingBasket } from "lucide-react";
import { KioskSession } from "@/types/kiosk";
import { getKioskHeaders } from "@/lib/kiosk-auth";
import { useAuth } from "@/hooks/use-auth";
import { POSView } from "@/components/pos/POSView";

interface SalesTerminalProps {
    sessionContext: KioskSession;
    onLogout: () => void;
}

export default function SalesTerminal({ sessionContext, onLogout }: SalesTerminalProps) {
    const { session } = useAuth();

    // Helper to generate auth headers for the Kiosk user
    const getAuthHeaders = () => {
        return getKioskHeaders({
            employeeId: sessionContext.driver?.id || localStorage.getItem("last_auth_employee_id"),
            supabaseToken: session?.access_token
        });
    };

    return (
        <div className="h-[100vh] w-full bg-[#050505] text-white selection:bg-primary/30 p-4 md:p-8 flex flex-col gap-6 overflow-hidden">
            {/* Ultra Modern Header - Consistent with CashierTerminal */}
            <header className="flex flex-col md:flex-row items-center justify-between gap-6 pb-4 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                        <div className="relative p-4 bg-black rounded-2xl border border-white/10 flex items-center justify-center">
                            <ShoppingBasket className="w-8 h-8 text-purple-400" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-black tracking-[ -0.05em] uppercase italic leading-none">Punto de Venta</h1>
                            <Badge variant="outline" className="uppercase tracking-widest text-[10px] py-0.5 px-2 bg-purple-500/10 text-purple-500 border-purple-500/20">
                                KIOSK MODE
                            </Badge>
                        </div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-2">
                            Estación: <span className="text-slate-300">{sessionContext.terminal.location || "Principal"}</span> — Terminal ID: {sessionContext.terminal.id.slice(0, 8)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-black text-white uppercase leading-none">{sessionContext.driver?.name}</p>
                        <p className="text-[10px] text-purple-500 font-bold uppercase tracking-widest mt-1">Vendedor</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onLogout}
                        className="w-12 h-12 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-all border border-white/5"
                    >
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </header>

            {/* Main Content Area - POS View */}
            <div className="flex-1 min-h-0 bg-white/[0.02] border border-white/5 rounded-[30px] p-4 overflow-hidden relative">
                <div className="absolute inset-0 bg-black/40 pointer-events-none" /> {/* Mild overlay if needed, or remove */}
                <div className="relative z-10 h-full overflow-y-auto custom-scrollbar">
                    <POSView
                        defaultDriverId={sessionContext.driver?.id}
                        customHeaders={getAuthHeaders()}
                        isKioskMode={true}
                    />
                </div>
            </div>
        </div>
    );
}
