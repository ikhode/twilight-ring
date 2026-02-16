import React from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { AccountingAccount, InsertJournalEntry, InsertJournalItem } from "@shared/modules/finance/schema";
import { Plus, Trash2, Save, Scale } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface JournalEntryFormProps {
    accounts: AccountingAccount[];
    onSubmit: (entry: InsertJournalEntry, items: Partial<InsertJournalItem>[]) => void;
    isLoading?: boolean;
}

export const JournalEntryForm: React.FC<JournalEntryFormProps> = ({ accounts, onSubmit, isLoading }) => {
    const [header, setHeader] = React.useState<Partial<InsertJournalEntry>>({
        date: new Date(),
        reference: '',
        description: '',
        status: 'draft',
        type: 'manual'
    });

    const [items, setItems] = React.useState<Partial<InsertJournalItem>[]>([
        { accountId: '', debit: 0, credit: 0, description: '' },
        { accountId: '', debit: 0, credit: 0, description: '' }
    ]);

    const addItem = () => {
        setItems([...items, { accountId: '', debit: 0, credit: 0, description: '' }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof InsertJournalItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Logical constraint: If debit > 0, credit = 0 and vice versa
        if (field === 'debit' && value > 0) newItems[index].credit = 0;
        if (field === 'credit' && value > 0) newItems[index].debit = 0;

        setItems(newItems);
    };

    const totalDebit = items.reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
    const totalCredit = items.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
    const difference = totalDebit - totalCredit;

    const isValid = items.length >= 2 && difference === 0 && totalDebit > 0;

    return (
        <Card className="shadow-lg border-primary/10">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Save size={20} className="text-primary" />
                    Nuevo Asiento Contable
                </CardTitle>
                <CardDescription>
                    Registre una transacción manual asegurando que el total de Débitos coincida con los Créditos.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Fecha</Label>
                        <Input
                            type="date"
                            value={header.date instanceof Date ? header.date.toISOString().split('T')[0] : ''}
                            onChange={(e) => setHeader({ ...header, date: new Date(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Referencia</Label>
                        <Input
                            placeholder="Ej: FAC-001"
                            value={header.reference || ''}
                            onChange={(e) => setHeader({ ...header, reference: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Descripción General</Label>
                        <Input
                            placeholder="Motivo del asiento"
                            value={header.description || ''}
                            onChange={(e) => setHeader({ ...header, description: e.target.value })}
                        />
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40%]">Cuenta</TableHead>
                            <TableHead>Débito</TableHead>
                            <TableHead>Crédito</TableHead>
                            <TableHead className="w-10"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    <Select
                                        value={item.accountId}
                                        onValueChange={(val) => updateItem(index, 'accountId', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione cuenta..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accounts.filter(a => a.isSelectable).map(a => (
                                                <SelectItem key={a.id} value={a.id}>
                                                    {a.code} - {a.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        value={item.debit || 0}
                                        onChange={(e) => updateItem(index, 'debit', Number(e.target.value))}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        value={item.credit || 0}
                                        onChange={(e) => updateItem(index, 'credit', Number(e.target.value))}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeItem(index)}
                                        disabled={items.length <= 2}
                                    >
                                        <Trash2 size={16} className="text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
                    <Button variant="outline" size="sm" onClick={addItem} className="flex items-center gap-2">
                        <Plus size={16} /> Agregar Línea
                    </Button>

                    <div className="flex gap-8 items-center">
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">Total Débitos</p>
                            <p className="font-mono font-bold text-emerald-500">{formatCurrency(totalDebit)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">Total Créditos</p>
                            <p className="font-mono font-bold text-blue-500">{formatCurrency(totalCredit)}</p>
                        </div>
                        <div className="text-right border-l pl-8">
                            <p className="text-xs text-muted-foreground">Diferencia</p>
                            <p className={`font-mono font-bold ${difference === 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                                {formatCurrency(difference)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    {!isValid && difference !== 0 && (
                        <p className="text-xs text-destructive flex items-center gap-1 self-center mr-4">
                            <Scale size={14} /> El asiento no está cuadrado.
                        </p>
                    )}
                    <Button
                        disabled={!isValid || isLoading}
                        onClick={() => onSubmit(header as InsertJournalEntry, items)}
                        className="flex items-center gap-2"
                    >
                        {isLoading ? "Guardando..." : "Confirmar Asiento"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
