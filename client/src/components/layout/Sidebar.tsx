import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { contextEngine, NavItem } from "@/lib/ai/context-engine";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { Menu, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserRoleType } from "@/lib/ai/dashboard-engine";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, ChevronRight, ChevronLeft, Settings } from "lucide-react";

import { useConfiguration } from "@/context/ConfigurationContext";

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

import { OrgSwitcher } from "@/components/layout/OrgSwitcher";

export function Sidebar({ className, onLinkClick }: SidebarProps) {
  const [location] = useLocation();
  const { user, profile, signOut } = useAuth();
  const { enabledModules } = useConfiguration();
  const [items, setItems] = useState<NavItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  // Mock role until profile is fully loaded with role
  const role: UserRoleType = (profile?.role as UserRoleType) || 'admin';

  useEffect(() => {
    setItems(contextEngine.getAdaptiveNavigation(role, enabledModules));
  }, [role, enabledModules]);

  const handleLinkClick = (href: string) => {
    if (onLinkClick) onLinkClick();

    // Onboarding Action Trigger
    window.dispatchEvent(new CustomEvent('NEXUS_ONBOARDING_ACTION', {
      detail: `nav_${href}`
    }));
  };

  return (
    <div
      className={cn(
        "bg-sidebar/95 backdrop-blur-xl border-r border-sidebar-border flex flex-col z-40 transition-all duration-300",
        collapsed ? "w-[var(--sidebar-collapsed-width,72px)]" : "w-[var(--sidebar-width,260px)]",
        // Default fixed unless overridden
        !className?.includes("relative") && "fixed left-0 top-0 h-screen",
        className
      )}
      style={{
        // Proportional adjustments for sidebar width
        "--sidebar-width": `calc(260px * var(--app-scale, 1))`,
        "--sidebar-collapsed-width": `calc(72px * var(--app-scale, 1))`
      } as React.CSSProperties}
    >
      {/* Header / Org Switcher */}
      <div className={cn("px-4 pt-4 pb-2 transition-all", collapsed ? "flex justify-center px-0" : "")}>
        {!collapsed ? (
          <OrgSwitcher />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold mb-4">
            OS
          </div>
        )}
      </div>

      {/* Brand */}
      <div className="h-12 flex items-center px-6 border-b border-sidebar-border bg-gradient-to-r from-primary/5 to-transparent overflow-hidden mb-2">
        <Menu className="w-5 h-5 text-muted-foreground mr-3 flex-shrink-0" />
        {!collapsed && (
          <h1 className="font-black text-xl tracking-tighter italic text-sidebar-foreground whitespace-nowrap">
            COGNITIVE<span className="text-primary text-xs align-top ml-0.5">OS</span>
          </h1>
        )}
      </div>

      {/* Navigation */}
      <LayoutGroup>
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 scrollbar-none">

          {useConfiguration().aiConfig.adaptiveUiEnabled && !collapsed && (
            <p className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2 flex justify-between">
              <span>Navegación Contextual</span>
              <Zap className="w-3 h-3 text-primary animate-pulse" />
            </p>
          )}

          {items.map((item) => {
            const isActive = location === item.href;
            const isHighPriority = item.priority > 60;

            // Map href to data-tour attribute
            const dataTourMap: Record<string, string> = {
              '/inventory': 'inventory-nav',
              '/sales': 'sales-nav',
              '/purchases': 'purchases-nav',
              '/workflows': 'workflows-nav',
              '/employees': 'employees-nav',
              '/finance/payroll': 'payroll-nav',
              '/crm': 'crm-nav',
              '/logistics': 'logistics-nav',
              '/documents': 'documents-nav'
            };

            return (
              <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Link href={item.href} onClick={() => handleLinkClick(item.href)}>
                  <div
                    data-tour={dataTourMap[item.href]}
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group cursor-pointer overflow-hidden",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                        : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-nav"
                        className="absolute inset-0 bg-primary z-0"
                        transition={{ duration: 0.2 }}
                      />
                    )}

                    {/* Icon */}
                    <item.icon className={cn("w-5 h-5 relative z-10 transition-transform group-hover:scale-110 flex-shrink-0", isActive ? "text-white" : "text-slate-500 group-hover:text-white")} />

                    {/* Title */}
                    {!collapsed && (
                      <span className="text-sm font-bold relative z-10 whitespace-nowrap">{item.title}</span>
                    )}

                    {/* Cognitive Indicator for High Priority Items */}
                    {isHighPriority && item.reason && !isActive && !collapsed && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse z-10" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-slate-900 border-primary/20 text-xs font-bold">
                          <p className="flex items-center gap-2">
                            <Zap className="w-3 h-3 text-primary" />
                            {item.reason}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </LayoutGroup>

      {/* User Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "")}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-purple-500 border-2 border-slate-900 flex items-center justify-center text-xs font-black text-white shadow-lg flex-shrink-0">
            {user?.email?.[0].toUpperCase() || "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-sidebar-foreground truncate">{user?.email || "Usuario"}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase truncate">{role}</p>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
              className="w-8 h-8 text-slate-500 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-24 w-6 h-6 rounded-full border border-sidebar-border bg-sidebar shadow-xl hover:bg-sidebar-accent text-muted-foreground group z-50 transition-all"
      >
        {collapsed ? <ChevronRight className="w-3 h-3 group-hover:text-primary" /> : <ChevronLeft className="w-3 h-3 group-hover:text-primary" />}
      </Button>

    </div>
  );
}
