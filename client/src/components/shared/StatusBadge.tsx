import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType =
  | "active"
  | "inactive"
  | "pending"
  | "completed"
  | "approved"
  | "rejected"
  | "paid"
  | "debt"
  | "online"
  | "offline"
  | "break"
  | "away"
  | "available"
  | "low"
  | "critical"
  | "in_transit"
  | "delivered"
  | "in_route"
  | "maintenance";

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

const statusConfig: Record<
  StatusType,
  { label: string; className: string }
> = {
  active: { label: "Activo", className: "bg-success/15 text-success border-success/30" },
  inactive: { label: "Inactivo", className: "bg-muted text-muted-foreground border-muted" },
  pending: { label: "Pendiente", className: "bg-warning/15 text-warning border-warning/30" },
  completed: { label: "Completado", className: "bg-success/15 text-success border-success/30" },
  approved: { label: "Aprobado", className: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Rechazado", className: "bg-destructive/15 text-destructive border-destructive/30" },
  paid: { label: "Pagado", className: "bg-primary/15 text-primary border-primary/30" },
  debt: { label: "Adeudo", className: "bg-destructive/15 text-destructive border-destructive/30" },
  online: { label: "En línea", className: "bg-success/15 text-success border-success/30" },
  offline: { label: "Desconectado", className: "bg-muted text-muted-foreground border-muted" },
  break: { label: "En descanso", className: "bg-warning/15 text-warning border-warning/30" },
  away: { label: "Ausente", className: "bg-muted text-muted-foreground border-muted" },
  available: { label: "Disponible", className: "bg-success/15 text-success border-success/30" },
  low: { label: "Stock bajo", className: "bg-warning/15 text-warning border-warning/30" },
  critical: { label: "Crítico", className: "bg-destructive/15 text-destructive border-destructive/30" },
  in_transit: { label: "En tránsito", className: "bg-primary/15 text-primary border-primary/30" },
  delivered: { label: "Entregado", className: "bg-success/15 text-success border-success/30" },
  in_route: { label: "En ruta", className: "bg-primary/15 text-primary border-primary/30" },
  maintenance: { label: "Mantenimiento", className: "bg-warning/15 text-warning border-warning/30" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as StatusType] || {
    label: status,
    className: "bg-muted text-muted-foreground border-muted",
  };

  return (
    <Badge
      variant="outline"
      className={cn("font-medium text-xs", config.className, className)}
      data-testid={`status-badge-${status}`}
    >
      {config.label}
    </Badge>
  );
}
