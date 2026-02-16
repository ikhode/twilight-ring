import React from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, FolderTree, Landmark } from "lucide-react";
import { AccountingAccount } from "@shared/modules/finance/schema";
import { formatCurrency } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface COATreeProps {
    accounts: AccountingAccount[];
    onSelect?: (account: AccountingAccount) => void;
}

export const COATree: React.FC<COATreeProps> = ({ accounts, onSelect }) => {
    const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const buildTree = (parentId: string | null = null, level = 1): React.ReactNode[] => {
        return accounts
            .filter(a => a.parentId === parentId)
            .sort((a, b) => a.code.localeCompare(b.code))
            .map(account => {
                const hasChildren = accounts.some(a => a.parentId === account.id);
                const isExpanded = expanded[account.id];

                return (
                    <React.Fragment key={account.id}>
                        <TableRow
                            className={`cursor-pointer hover:bg-muted/50 transition-colors ${!account.isSelectable ? 'font-semibold text-primary' : ''}`}
                            onClick={() => account.isSelectable && onSelect?.(account)}
                        >
                            <TableCell className="pl-4">
                                <div className="flex items-center" style={{ paddingLeft: `${(level - 1) * 20}px` }}>
                                    {hasChildren ? (
                                        <button onClick={(e) => toggleExpand(account.id, e)} className="mr-2">
                                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </button>
                                    ) : (
                                        <Landmark size={14} className="mr-2 text-muted-foreground" />
                                    )}
                                    <span className="text-xs font-mono text-muted-foreground mr-3">{account.code}</span>
                                    {account.name}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="capitalize">
                                    {account.type}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className={account.balance < 0 ? 'text-destructive' : 'text-emerald-500'}>
                                                {formatCurrency(account.balance / 100)}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Saldo actual consolidado en esta cuenta.</p>
                                            <p className="text-xs text-muted-foreground">Fuente: Libro Mayor (Detección en tiempo real)</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </TableCell>
                        </TableRow>
                        {hasChildren && isExpanded && buildTree(account.id, level + 1)}
                    </React.Fragment>
                );
            });
    };

    return (
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <FolderTree className="text-primary" size={20} />
                    Plan de Cuentas (COA)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre y Código</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-right">Saldo</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {buildTree(null)}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};
