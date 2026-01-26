import * as React from "react";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { StatCard } from "@/components/shared/StatCard";
import {
    Plus,
    Building2,
    CreditCard,
    Wallet,
    Pencil,
    Trash2,
    ArrowLeft,
    Banknote,
    DollarSign
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";

export default function BankAccounts() {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<any>(null);

    const { data: accounts = [], isLoading } = useQuery({
        queryKey: ["/api/finance/accounts"],
        queryFn: async () => {
            const res = await fetch("/api/finance/accounts", {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            return res.json();
        },
        enabled: !!session?.access_token,
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/finance/accounts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify(data),
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts"] });
            setIsDialogOpen(false);
            toast({ title: "Cuenta registrada", description: "La cuenta bancaria se ha creado exitosamente." });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(`/api/finance/accounts/${data.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify(data),
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts"] });
            setIsDialogOpen(false);
            setEditingAccount(null);
            toast({ title: "Cuenta actualizada" });
        },
    });

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount / 100);

    const totalBalance = Array.isArray(accounts)
        ? accounts.reduce((acc: number, curr: any) => acc + (curr.balance || 0), 0)
        : 0;

    const columns = [
        {
            key: "name",
            header: "Nombre de Cuenta",
            render: (row: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{row.bankName}</p>
                    </div>
                </div>
            ),
        },
        { key: "accountNumber", header: "Número", render: (row: any) => <span className="font-mono">{row.accountNumber || "N/A"}</span> },
        { key: "currency", header: "Moneda" },
        {
            key: "balance",
            header: "Saldo",
            render: (row: any) => <span className="font-bold font-mono">{formatCurrency(row.balance)}</span>,
        },
        {
            key: "status",
            header: "Estado",
            render: (row: any) => (
                <Badge variant={row.isActive ? "default" : "secondary"}>
                    {row.isActive ? "Activa" : "Inactiva"}
                </Badge>
            ),
        },
        {
            key: "actions",
            header: "Acciones",
            render: (row: any) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            setEditingAccount(row);
                            setIsDialogOpen(true);
                        }}
                    >
                        <Pencil className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <AppLayout title="Cuentas Bancarias" subtitle="Gestión de cuentas institucionales">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Link href="/finance">
                        <Button variant="ghost" className="gap-2">
                            <ArrowLeft className="w-4 h-4" /> Volver a Finanzas
                        </Button>
                    </Link>
                    <Button className="gap-2" onClick={() => { setEditingAccount(null); setIsDialogOpen(true); }}>
                        <Plus className="w-4 h-4" /> Nueva Cuenta
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard title="Saldo Total Bancos" value={formatCurrency(totalBalance)} icon={Wallet} variant="primary" />
                    <StatCard title="Cuentas Activas" value={accounts.filter((a: any) => a.isActive).length.toString()} icon={CreditCard} />
                    <StatCard title="Moneda Base" value="MXN" icon={Banknote} />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Listado de Cuentas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DataTable columns={columns} data={accounts} />
                    </CardContent>
                </Card>

                <AccountDialog
                    isOpen={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    account={editingAccount}
                    onSubmit={(data: any) => {
                        if (editingAccount) {
                            updateMutation.mutate({ ...data, id: editingAccount.id });
                        } else {
                            createMutation.mutate(data);
                        }
                    }}
                    isPending={createMutation.isPending || updateMutation.isPending}
                />
            </div>
        </AppLayout>
    );
}

function AccountDialog({ isOpen, onOpenChange, account, onSubmit, isPending }: any) {
    const [formData, setFormData] = useState({
        name: "",
        bankName: "",
        accountNumber: "",
        currency: "MXN",
        balance: "0",
    });

    React.useEffect(() => {
        if (account) {
            setFormData({
                name: account.name,
                bankName: account.bankName || "",
                accountNumber: account.accountNumber || "",
                currency: account.currency,
                balance: (account.balance / 100).toString(),
            });
        } else {
            setFormData({ name: "", bankName: "", accountNumber: "", currency: "MXN", balance: "0" });
        }
    }, [account, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            balance: Math.round(parseFloat(formData.balance) * 100),
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{account ? "Editar Cuenta" : "Nueva Cuenta Bancaria"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre Identificador</Label>
                            <Input
                                id="name"
                                placeholder="Ej. Banorte Operativa"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bank">Institución (Banco)</Label>
                            <Input
                                id="bank"
                                placeholder="Ej. Banorte"
                                value={formData.bankName}
                                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="number">Número de Cuenta / CLABE</Label>
                        <Input
                            id="number"
                            placeholder="0123..."
                            value={formData.accountNumber}
                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="balance">Saldo Inicial</Label>
                            <div className="relative">
                                <DollarSign className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                                <Input
                                    id="balance"
                                    className="pl-9"
                                    type="number"
                                    step="0.01"
                                    value={formData.balance}
                                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currency">Moneda</Label>
                            <Input
                                id="currency"
                                value={formData.currency}
                                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Guardando..." : "Guardar Cuenta"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
