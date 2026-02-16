import React from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { AccountingAccount } from "@shared/modules/finance/schema";
import { formatCurrency } from "@/lib/utils";
import { FileText, TrendingUp, Landmark, Calculator } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FinancialStatementsProps {
    accounts: AccountingAccount[];
}

export const FinancialStatements: React.FC<FinancialStatementsProps> = ({ accounts }) => {
    const renderAccountRow = (account: AccountingAccount, level = 0) => {
        const isParent = accounts.some(a => a.parentId === account.id);
        const paddingLeft = level * 16;
        const balance = account.balance || 0;

        return (
            <TooltipProvider key={account.id}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <TableRow className={isParent ? "bg-muted/30 font-semibold" : ""}>
                            <TableCell style={{ paddingLeft: `${paddingLeft + 16}px` }} className="flex items-center gap-2">
                                {isParent ? <Landmark size={14} className="text-primary/70" /> : <Calculator size={14} className="text-muted-foreground" />}
                                {account.name}
                                <span className="text-[10px] text-muted-foreground font-mono ml-2">({account.code})</span>
                            </TableCell>
                            <TableCell className={`text-right font-mono ${balance < 0 ? 'text-destructive' : ''}`}>
                                {formatCurrency(Math.abs(balance) / 100)}
                            </TableCell>
                        </TableRow>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-slate-900 border-slate-800 text-xs text-slate-300">
                        <p><strong>{account.name}</strong></p>
                        <p>Tipo: {account.type}</p>
                        <p>Saldo: {formatCurrency(balance / 100)}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    };

    const renderCategory = (type: string, title: string) => {
        const rootAccounts = accounts.filter(a => a.type === type && !a.parentId);

        const renderSubTree = (parentId: string, level: number): React.ReactNode[] => {
            return accounts
                .filter(a => a.parentId === parentId)
                .map(a => [
                    renderAccountRow(a, level),
                    ...renderSubTree(a.id, level + 1)
                ])
                .flat();
        };

        const total = accounts
            .filter(a => a.type === type && !a.parentId)
            .reduce((sum, a) => sum + (a.balance || 0), 0);

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-lg font-bold text-primary">{title}</h3>
                    <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase">Total {title}</p>
                        <p className="text-xl font-mono font-bold">{formatCurrency(Math.abs(total) / 100)}</p>
                    </div>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Concepto</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rootAccounts.map(a => [
                            renderAccountRow(a, 0),
                            ...renderSubTree(a.id, 1)
                        ])}
                    </TableBody>
                </Table>
            </div>
        );
    };

    return (
        <Card className="shadow-xl bg-slate-950/50 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="text-primary" /> Estados Financieros Reales
                </CardTitle>
                <CardDescription>
                    Información financiera consolidada en tiempo real basada en el libro mayor.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="balance">
                    <TabsList className="mb-6">
                        <TabsTrigger value="balance">Balance General</TabsTrigger>
                        <TabsTrigger value="pnl">Estado de Resultados (P&L)</TabsTrigger>
                    </TabsList>

                    <TabsContent value="balance" className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {renderCategory("asset", "Activos")}
                            <div className="space-y-12">
                                {renderCategory("liability", "Pasivos")}
                                {renderCategory("equity", "Patrimonio")}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="pnl" className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {renderCategory("revenue", "Ingresos")}
                            {renderCategory("expense", "Gastos")}
                        </div>
                        <div className="mt-8 p-6 bg-primary/5 rounded-xl border border-primary/20 flex justify-between items-center">
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Utilidad Neta del Periodo</h4>
                                <p className="text-xs text-muted-foreground mt-1">Calculado como Ingresos - Gastos</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-mono font-bold text-emerald-500">
                                    {formatCurrency(
                                        (accounts.filter(a => a.type === 'revenue' && !a.parentId).reduce((sum, a) => sum + (a.balance || 0), 0) -
                                            accounts.filter(a => a.type === 'expense' && !a.parentId).reduce((sum, a) => sum + (a.balance || 0), 0)) / 100
                                    )}
                                </p>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};
