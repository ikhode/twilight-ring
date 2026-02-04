import { Bell, Moon, Sun, Trophy, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { GuardianStatus } from "@/components/cognitive";
import { SemanticSearch } from "@/components/cognitive/SemanticSearch";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useConfiguration } from "@/context/ConfigurationContext";
import { HelpPopover } from "./HelpPopover";

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function Header({ title, subtitle, children }: HeaderProps) {
  const [isDark, setIsDark] = useState(true);
  const { session } = useAuth();
  const { enabledModules } = useConfiguration();

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.body.classList.toggle("dark");
  };

  const alertTypeColors = {
    critical: "bg-destructive text-destructive-foreground",
    warning: "bg-warning text-warning-foreground",
    info: "bg-primary text-primary-foreground",
    success: "bg-success text-success-foreground",
  };

  const { data: userOrg } = useQuery({
    queryKey: ["/api/user-org"],
    queryFn: async () => {
      if (!session?.access_token) return null;
      const res = await fetch("/api/user-org", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!session?.access_token
  });

  // Real Notifications from various system sources
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      if (!session?.access_token) return [];
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!session?.access_token,
    refetchInterval: 60000, // Refresh every minute
  });

  const xp = userOrg?.xp || 0;
  const level = userOrg?.level || 1;
  const nextLevelXp = level * 1000;
  const progress = (xp / nextLevelXp) * 100;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="flex items-center gap-4">
        <div className="flex items-center">{children}</div>
        <div>
          <h1 className="text-xl font-display font-bold" data-testid="text-page-title">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground" data-testid="text-page-subtitle">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* XP Widget (User Request) */}
        <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-full bg-secondary/50 border border-border">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase text-primary tracking-widest">Nivel {level}</span>
            <span className="text-xs font-bold text-foreground tabular-nums">{xp} XP</span>
          </div>
          <div className="relative w-8 h-8 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path className="text-muted/30" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
              <path className="text-primary transition-all duration-1000 ease-out" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
            </svg>
            <Trophy className="w-3.5 h-3.5 text-yellow-500 absolute" />
          </div>
        </div>

        <div className="hidden lg:block">
          {enabledModules.length > 0 ? (
            <GuardianStatus />
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">System Standby</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:block">
          {enabledModules.length > 0 && <SemanticSearch />}
        </div>

        <HelpPopover />

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="w-9 h-9"
          data-testid="button-toggle-theme"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative w-9 h-9" data-testid="button-notifications">
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notificaciones</span>
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary">
                Marcar todas como leídas
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-xs">
                No hay notificaciones nuevas
              </div>
            ) : (
              notifications.map((alert: any) => (
                <DropdownMenuItem key={alert.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                  <div className="flex items-center gap-2 w-full">
                    <Badge className={cn("text-[10px] px-1.5 py-0", alertTypeColors[alert.type as keyof typeof alertTypeColors] || alertTypeColors.info)}>
                      {alert.type?.toUpperCase() || 'INFO'}
                    </Badge>
                    <span className="font-medium text-sm">{alert.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                  <span className="text-[10px] text-muted-foreground">
                    {alert.createdAt ? formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: es }) : "Reciente"}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>

        </DropdownMenu>
      </div>
    </header>
  );
}
