import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
    Users,
    DollarSign,
    ArrowUpRight,
    ArrowDownLeft,
    Wallet,
    Search
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Employee {
    id: string;
    name: string;
    role: string;
    balance: number; // in cents
}

export default function PayrollManager() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [payoutAmount, setPayoutAmount] = useState(0);

    const { data: employees = [] } = useQuery<Employee[]>({
        queryKey: ["/api/hr/employees"],
    });

    const payoutMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/finance/payout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employeeId: selectedEmployee?.id,
                    amount: payoutAmount * 100, // Send cents
                    notes: "Pago manual desde Payroll Manager"
                })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Error al procesar pago");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Pago Exitoso", description: "Se ha liquidado el monto al empleado." });
            queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
            setSelectedEmployee(null);
            setPayoutAmount(0);
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const filteredEmployees = Array.isArray(employees) ? employees.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

    const totalPayable = Array.isArray(employees) ? employees.reduce((acc, e) => acc + (e.balance > 0 ? e.balance : 0), 0) : 0;

    return (
        <div className="h-full flex flex-col gap-6 p-6 max-w-7xl mx-auto">
            <header>
                <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Gestión de Nómina</h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Control de Balances y Pagos</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-primary/10 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <Wallet className="w-4 h-4" /> Total por Pagar
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black tracking-tighter text-white">
                            ${(totalPayable / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="flex-1 bg-white/[0.02] border-white/5 flex flex-col min-h-0">
                <CardHeader className="border-b border-white/5 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                placeholder="BUSCAR EMPLEADO..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 bg-black/20 border-white/10 text-xs font-bold uppercase tracking-wider rounded-xl focus:border-primary/50"
                            />
                        </div>
                    </div>
                </CardHeader>
                <ScrollArea className="flex-1">
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredEmployees.map((employee) => (
                            <div
                                key={employee.id}
                                className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/30 transition-all group flex flex-col justify-between"
                            >
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge variant="outline" className="border-white/10 text-slate-500 text-[10px] uppercase font-bold">
                                            {employee.role}
                                        </Badge>
                                        <Users className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors" />
                                    </div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight truncate">{employee.name}</h3>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Balance Actual</p>
                                        <div className={`text-2xl font-black font-mono tracking-tight ${employee.balance > 0 ? "text-success" : employee.balance < 0 ? "text-destructive" : "text-slate-600"}`}>
                                            ${(employee.balance / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="flex-1 border-white/10 hover:bg-white/5 uppercase font-bold text-xs"
                                                    onClick={() => {
                                                        setSelectedEmployee(employee);
                                                        setPayoutAmount(employee.balance > 0 ? employee.balance / 100 : 0);
                                                    }}
                                                >
                                                    Pagar
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-md border-white/10 bg-black/95">
                                                <DialogHeader>
                                                    <DialogTitle className="text-xl font-black uppercase italic text-white">Liquidación de Pago</DialogTitle>
                                                    <CardDescription className="uppercase font-bold text-xs tracking-widest text-slate-500">
                                                        {selectedEmployee?.name}
                                                    </CardDescription>
                                                </DialogHeader>
                                                <div className="space-y-6 py-4">
                                                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                                                        <span className="text-xs font-bold uppercase text-slate-400">Saldo Pendiente</span>
                                                        <span className="text-xl font-black text-white font-mono">
                                                            ${(selectedEmployee?.balance ? selectedEmployee.balance / 100 : 0).toFixed(2)}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold uppercase text-slate-500">Monto a Pagar</label>
                                                        <div className="relative">
                                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                                                            <Input
                                                                type="number"
                                                                value={payoutAmount}
                                                                onChange={(e) => setPayoutAmount(parseFloat(e.target.value))}
                                                                className="pl-9 h-12 text-lg font-bold bg-white/5 border-white/10 text-white rounded-xl focus:border-primary"
                                                            />
                                                        </div>
                                                    </div>

                                                    <Button
                                                        onClick={() => payoutMutation.mutate()}
                                                        disabled={payoutMutation.isPending || payoutAmount <= 0}
                                                        className="w-full h-12 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest text-sm rounded-xl"
                                                    >
                                                        {payoutMutation.isPending ? "Procesando..." : "Confirmar Pago"}
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </Card>
        </div>
    );
}
