import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { Package } from "lucide-react";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  onRowDoubleClick?: (item: T) => void;
  onCellDoubleClick?: (item: T, key: keyof T, value: any) => void;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  onRowClick,
  onRowDoubleClick,
  onCellDoubleClick,
  emptyMessage = "No hay datos disponibles",
  className,
}: DataTableProps<T>) {
  return (
    <div
      className={cn("rounded-2xl border border-white/5 bg-slate-900/30 backdrop-blur-md overflow-x-auto shadow-xl transition-all scrollbar-thin", className)}
      style={{ scrollbarGutter: "stable" }}
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-800/40 hover:bg-slate-800/40 border-b border-white/5">
            {columns.map((column, index) => (
              <TableHead
                key={String(column.key)}
                className={cn("h-12 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400", column.className)}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {(!Array.isArray(data) || data.length === 0) ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center"
              >
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Package className="w-8 h-8 opacity-20" />
                  <p className="text-sm font-medium">{!Array.isArray(data) ? "Error al cargar datos" : emptyMessage}</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => (
              <TableRow
                key={`${item.id}-${index}`}
                onClick={() => onRowClick?.(item)}
                onDoubleClick={() => onRowDoubleClick?.(item)}
                className={cn(
                  "group transition-all duration-200 border-b border-white/5",
                  onRowClick && "cursor-pointer hover:bg-white/[0.03] active:scale-[0.995]"
                )}
                data-testid={`table-row-${item.id}`}
              >
                {columns.map((column) => (
                  <TableCell
                    key={String(column.key)}
                    className={cn("py-4 px-4 text-sm transition-all", column.className)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onCellDoubleClick?.(item, column.key as keyof T, item[column.key as keyof T]);
                    }}
                  >
                    {column.render
                      ? column.render(item)
                      : <span className="text-slate-300">{String(item[column.key as keyof T] ?? "-")}</span>}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
