import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Factory,
  Truck,
  Wallet,
  Settings,
  Monitor,
  Clock,
  Brain,
  ChevronLeft,
  ChevronRight,
  Building2,
  ClipboardList,
  UserCircle,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/timeclock", icon: Clock, label: "Reloj Checador" },
  { path: "/kiosks", icon: Monitor, label: "Kioskos" },
  { path: "/employees", icon: Users, label: "Empleados" },
  { path: "/inventory", icon: Package, label: "Inventario" },
  { path: "/production", icon: Factory, label: "Producción" },
  { path: "/sales", icon: ShoppingCart, label: "Ventas" },
  { path: "/logistics", icon: Truck, label: "Logística" },
  { path: "/finance", icon: Wallet, label: "Finanzas" },
  { path: "/crm", icon: Building2, label: "Clientes/Proveedores" },
  { path: "/tickets", icon: ClipboardList, label: "Tickets" },
  { path: "/analytics", icon: Brain, label: "Analítica IA" },
];

export function Sidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
      data-testid="sidebar"
    >
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center glow">
            <span className="text-white font-bold text-lg font-display">F</span>
          </div>
          {!collapsed && (
            <span className="font-display font-bold text-xl gradient-text" data-testid="logo-text">
              FlexiERP
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;

          const navLink = (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
              data-testid={`nav-${item.path.replace("/", "") || "dashboard"}`}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "" : "text-muted-foreground group-hover:text-foreground")} />
              {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return navLink;
        })}
      </nav>

      <div className="px-3 pb-4">
        <Separator className="mb-4" />
        
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sidebar-foreground hover:bg-sidebar-accent mb-2",
                location === "/settings" && "bg-sidebar-accent"
              )}
              data-testid="nav-settings"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
              {!collapsed && <span className="font-medium text-sm">Configuración</span>}
            </Link>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right">Configuración</TooltipContent>
          )}
        </Tooltip>

        <div className={cn(
          "flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50",
          collapsed && "justify-center"
        )}>
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
              CM
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Carlos Mendoza</p>
              <p className="text-xs text-muted-foreground truncate">Administrador</p>
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon" className="w-8 h-8" data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full border bg-background shadow-md hover:bg-accent"
        data-testid="button-toggle-sidebar"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </Button>
    </aside>
  );
}
