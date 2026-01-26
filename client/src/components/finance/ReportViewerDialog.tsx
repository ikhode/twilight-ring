
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Printer, Download, FileText, Share2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type ReportType = "income_statement" | "balance_sheet" | "cash_flow" | "receivables" | "payables" | "payroll" | null;

interface ReportViewerDialogProps {
    reportType: ReportType;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ReportViewerDialog({ reportType, open, onOpenChange }: ReportViewerDialogProps) {
    const { session } = useAuth();
    const { data: summary, isLoading } = useQuery({
        queryKey: ["/api/finance/summary"],
        queryFn: async () => {
            const res = await fetch("/api/finance/summary", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            return res.json();
        },
        enabled: open && !!session?.access_token
    });

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
        }).format(amount);

    const getReportTitle = () => {
        switch (reportType) {
            case "income_statement": return "Estado de Resultados";
            case "balance_sheet": return "Balance General";
            case "cash_flow": return "Flujo de Efectivo";
            case "receivables": return "Cuentas por Cobrar";
            case "payables": return "Cuentas por Pagar";
            case "payroll": return "Reporte de Nómina";
            default: return "Reporte";
        }
    };

    const renderContent = () => {
        if (isLoading) return <div className="h-60 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
        if (!summary) return <div className="p-4 text-center">No hay datos disponibles.</div>;

        // SAFE GUARDS for empty data
        const income = summary.income || 0;
        const expenses = summary.expenses || 0;
        const netIncome = income - expenses;
        const cash = summary.balance || 0;
        const bank = summary.bankBalance || 0;
        const inventory = summary.inventoryValue || 0;
        const assets = cash + bank + inventory;
        const liabilities = summary.accountsPayable?.total || 0; // Simplified
        const equity = assets - liabilities;

        switch (reportType) {
            case "income_statement":
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="font-bold text-muted-foreground">Periodo:</div>
                            <div className="text-right">Mes Actual (Est.)</div>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Concepto</TableHead>
                                    <TableHead className="text-right">Monto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">Ingresos Totales (Ventas)</TableCell>
                                    <TableCell className="text-right text-emerald-500 font-mono">{formatCurrency(income / 100)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Costo de Ventas</TableCell>
                                    <TableCell className="text-right text-rose-500 font-mono">-{formatCurrency((expenses * 0.4) / 100)}</TableCell>
                                </TableRow>
                                <TableRow className="bg-muted/10 font-bold">
                                    <TableCell>Utilidad Bruta</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency((income - (expenses * 0.4)) / 100)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium pl-8">Gastos Operativos</TableCell>
                                    <TableCell className="text-right text-rose-500 font-mono">-{formatCurrency((expenses * 0.6) / 100)}</TableCell>
                                </TableRow>
                                <TableRow className="border-t-2 border-primary/20 bg-primary/5 font-black text-lg">
                                    <TableCell>Utilidad Neta</TableCell>
                                    <TableCell className={cn("text-right font-mono", netIncome >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                        {formatCurrency(netIncome / 100)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                );

            case "balance_sheet":
                return (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h4 className="font-bold border-b pb-2">Activos</h4>
                            <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>Efectivo en Caja</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(cash / 100)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Bancos</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(bank / 100)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Inventarios</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(inventory / 100)}</TableCell>
                                    </TableRow>
                                    <TableRow className="bg-muted/10 font-bold">
                                        <TableCell>Total Activos</TableCell>
                                        <TableCell className="text-right font-mono text-emerald-500">{formatCurrency(assets / 100)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-bold border-b pb-2">Pasivos y Capital</h4>
                            <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>Cuentas por Pagar</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(liabilities / 100)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Impuestos por Pagar (Est. 16%)</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency((income * 0.16) / 100)}</TableCell>
                                    </TableRow>
                                    <TableRow className="bg-muted/10 font-bold">
                                        <TableCell>Total Pasivos</TableCell>
                                        <TableCell className="text-right font-mono text-rose-500">{formatCurrency((liabilities + (income * 0.16)) / 100)}</TableCell>
                                    </TableRow>
                                    <TableRow className="border-t-2">
                                        <TableCell className="font-bold">Capital Contable</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-primary">{formatCurrency((equity - (income * 0.16)) / 100)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                );

            default:
                return (
                    <div className="text-center py-10">
                        <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">Visualización detallada no disponible para este reporte en la versión básica.</p>
                        <p className="text-sm text-muted-foreground mt-2">Los datos brutos están disponibles en la exportación.</p>
                    </div>
                );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-display flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        {getReportTitle()}
                    </DialogTitle>
                    <DialogDescription>
                        Generado automáticamente el {new Date().toLocaleDateString()} a las {new Date().toLocaleTimeString()}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[60vh] pr-4 border rounded-md bg-card p-6">
                    {renderContent()}
                </ScrollArea>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir
                    </Button>
                    <Button variant="outline">
                        <Share2 className="w-4 h-4 mr-2" />
                        Compartir
                    </Button>
                    <Button onClick={() => {
                        // In a real app, this would trigger PDF generation endpoint
                        alert("Iniciando descarga de PDF...");
                    }}>
                        <Download className="w-4 h-4 mr-2" />
                        Descargar PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Helper util
function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(" ");
}
