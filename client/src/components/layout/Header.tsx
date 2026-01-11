import { Bell, Search, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { mockAlerts } from "@/lib/mockData";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const [isDark, setIsDark] = useState(true);

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

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-background/80 backdrop-blur-lg border-b border-border">
      <div>
        <h1 className="text-xl font-display font-bold" data-testid="text-page-title">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground" data-testid="text-page-subtitle">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar..."
            className="w-64 pl-9 bg-muted/50"
            data-testid="input-search"
          />
        </div>

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
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {mockAlerts.length}
              </span>
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
            {mockAlerts.map((alert) => (
              <DropdownMenuItem key={alert.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                <div className="flex items-center gap-2 w-full">
                  <Badge className={cn("text-[10px] px-1.5 py-0", alertTypeColors[alert.type as keyof typeof alertTypeColors])}>
                    {alert.type === "critical" ? "CRÍTICO" : alert.type === "warning" ? "ALERTA" : alert.type === "success" ? "ÉXITO" : "INFO"}
                  </Badge>
                  <span className="font-medium text-sm">{alert.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{alert.message}</p>
                <span className="text-[10px] text-muted-foreground">{alert.time}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
