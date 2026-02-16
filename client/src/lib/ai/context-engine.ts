import { ERP_MODULES } from "@/lib/modules";
import { UserRoleType } from "./dashboard-engine";
import { LayoutDashboard, Settings, Network } from "lucide-react";

export interface NavItem {
    id: string;
    title: string;
    icon: any;
    href: string;
    priority: number;
    reason?: string;
    status?: 'ready' | 'beta' | 'coming_soon';
}

// Core modules that are always present or handled separately
const coreModules = [
    { id: 'dashboard', title: 'Panel Principal', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'settings', title: 'Configuración', icon: Settings, href: '/settings' },
];

class ContextEngine {

    /**
     * core algorithm to sort navigation based on context
     */
    getAdaptiveNavigation(role: UserRoleType, enabledModules: string[] = []): NavItem[] {
        const hour = new Date().getHours();

        // 1. Filter ERP modules based on what is enabled (Automatic enable inventory-advanced if inventory is on)
        const activeERPModules = ERP_MODULES.filter(m => enabledModules.includes(m.id) || (m.id === 'inventory-advanced' && enabledModules.includes('inventory'))).map(m => ({
            id: m.id,
            title: m.name,
            icon: m.icon,
            href: m.href,
            status: m.status,
            priority: 50 // Base priority
        }));

        // 2. Merge with Core Modules
        const isZeroState = enabledModules.length === 0;
        const allModules = [...coreModules.map(m => ({
            ...m,
            priority: isZeroState && m.id === 'settings' ? 100 : 50
        })), ...activeERPModules];

        const items = allModules.map(module => {
            let priority = module.priority;
            let reason = "";

            // 3. Role-based Weighting
            switch (role) {
                case 'production':
                    if (['production', 'inventory', 'tickets'].includes(module.id)) {
                        priority += 40;
                        reason = "Rol: Producción";
                    }
                    break;
                case 'sales':
                    if (['sales', 'crm', 'analytics'].includes(module.id)) {
                        priority += 40;
                        reason = "Rol: Ventas";
                    }
                    break;
                case 'logistics':
                    if (['logistics', 'inventory'].includes(module.id)) {
                        priority += 40;
                        reason = "Rol: Logística";
                    }
                    break;
                case 'admin':
                    if (['dashboard', 'analytics', 'finance', 'admin', 'nl-query', 'vision'].includes(module.id)) {
                        priority += 20;
                    }
                    break;
            }

            // 4. Time-of-day Weighting (Simulation)
            // Morning: Operations / Tickets check
            if (hour < 10) {
                if (module.id === 'tickets' || module.id === 'dashboard') {
                    priority += 10;
                    reason = reason || "Revisión matutina";
                }
            }
            // End of day: Reporting / Finance
            if (hour > 16) {
                if (module.id === 'analytics' || module.id === 'finance') {
                    priority += 10;
                    reason = reason || "Cierre de día";
                }
            }

            return { ...module, priority, reason };
        });

        // Sort by priority desc
        return items.sort((a, b) => b.priority - a.priority);
    }
}

export const contextEngine = new ContextEngine();
