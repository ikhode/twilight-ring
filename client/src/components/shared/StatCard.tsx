import { cn } from "@/lib/utils";
import { LucideIcon, TrendingDown, TrendingUp, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatCardProps {
  title: string;
  value: string | number | React.ReactNode;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  description?: string;
  helpText?: string;
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  description,
  helpText,
  variant = "default",
  className,
}: StatCardProps) {
  const variantStyles = {
    default: "bg-card border-card-border",
    primary: "bg-primary/10 border-primary/20",
    success: "bg-success/10 border-success/20",
    warning: "bg-warning/10 border-warning/20",
    destructive: "bg-destructive/10 border-destructive/20",
  };

  const iconStyles = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/20 text-primary",
    success: "bg-success/20 text-success",
    warning: "bg-warning/20 text-warning",
    destructive: "bg-destructive/20 text-destructive",
  };

  return (
    <div
      className={cn(
        "relative p-6 rounded-2xl border transition-all duration-300 group overflow-hidden glass-card",
        variantStyles[variant],
        className
      )}
      data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {/* Background glow effect */}
      <div className={cn(
        "absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40",
        variant === 'primary' && "bg-primary",
        variant === 'success' && "bg-success",
        variant === 'warning' && "bg-warning",
        variant === 'destructive' && "bg-destructive",
        variant === 'default' && "bg-slate-400"
      )} />

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">{title}</p>
            {helpText && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors outline-none focus:ring-0">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-950 border-slate-800 text-white max-w-xs p-3">
                    <p className="text-xs font-medium">{helpText}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-display font-extrabold tracking-tight text-white drop-shadow-sm">
              {value}
            </div>
          </div>

          {(description || trend !== undefined) && (
            <div className="flex flex-col gap-1.5 mt-1">
              {trend !== undefined && (
                <div className="flex items-center gap-1.5 bg-background/40 backdrop-blur-sm self-start px-2 py-0.5 rounded-full border border-white/5">
                  {trend >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-success" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-destructive" />
                  )}
                  <span
                    className={cn(
                      "text-xs font-bold font-mono",
                      trend >= 0 ? "text-success" : "text-destructive"
                    )}
                  >
                    {trend > 0 ? "+" : ""}{trend}%
                  </span>
                  {trendLabel && (
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">{trendLabel}</span>
                  )}
                </div>
              )}
              {description && (
                <p className="text-[11px] text-muted-foreground font-medium leading-relaxed italic opacity-80">{description}</p>
              )}
            </div>
          )}
        </div>
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 group-hover:rotate-6 group-hover:scale-110 shadow-inner",
            iconStyles[variant],
            variant === 'default' ? "border-slate-700" : `border-${variant}/30`
          )}
        >
          <Icon className="w-6 h-6 drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
        </div>
      </div>
    </div>
  );
}
