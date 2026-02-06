import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'in' | 'out';
    employeeId?: string; // Optional: when used in Kiosk
}

export function TransactionModal({ isOpen, onClose, type, employeeId: propEmployeeId }: TransactionModalProps) {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        amount: "",
        category: "",
        description: ""
    });

    const categories = type === 'in'
        ? [
            { id: 'sales', label: 'Venta Mostrador' },
            { id: 'funding', label: 'Fondeo de Caja' },
            { id: 'supplier_refund', label: 'Reembolso de Proveedor' },
            { id: 'collection', label: 'Cobranza / Créditos' }
        ]
        : [
            { id: 'supplier', label: 'Pago a Proveedor' },
            { id: 'customer_refund', label: 'Devolución a Cliente' },
            { id: 'payroll', label: 'Adelanto de Nómina' },
            { id: 'expense', label: 'Gasto General' },
            { id: 'services', label: 'Pago de Servicios' },
            { id: 'withdrawal', label: 'Retiro a Banco' }
        ];

    const [selectedEmployee, setSelectedEmployee] = useState<string>("");

    const { data: employees } = useQuery({
        queryKey: ['/api/employees'],
        queryFn: async () => {
            const headers: Record<string, string> = {};
            if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
            const res = await fetch('/api/employees', { headers });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: isOpen && formData.category === 'payroll'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.amount || !formData.category) return;
        if (formData.category === 'payroll' && !selectedEmployee) {
            toast({ title: "Requerido", description: "Seleccione un empleado para el adelanto de nómina.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };

            // 1. Supabase Auth
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            // 2. Terminal Bridge Auth
            const deviceId = localStorage.getItem("kiosk_device_id");
            const salt = localStorage.getItem("kiosk_device_salt");
            const employeeId = propEmployeeId || localStorage.getItem("last_auth_employee_id");

            if (deviceId && salt) {
                headers['X-Device-Auth'] = `${deviceId}:${salt}`;
            }
            if (employeeId) {
                headers['X-Employee-ID'] = employeeId;
            }

            const res = await fetch('/api/finance/cash/transaction', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    type,
                    amount: Math.round(parseFloat(formData.amount) * 100), // convert to cents
                    category: formData.category,
                    description: formData.description,
                    targetEmployeeId: formData.category === 'payroll' ? selectedEmployee : undefined
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Error occurred');
            }

            await queryClient.invalidateQueries({ queryKey: ['/api/finance/cash/stats'] });
            await queryClient.invalidateQueries({ queryKey: ['/api/finance/summary'] });

            toast({
                title: "Transacción Exitosa",
                description: `Se registró el ${type === 'in' ? 'ingreso' : 'egreso'} correctamente.`
            });
            onClose();
            setFormData({ amount: "", category: "", description: "" });
            setSelectedEmployee("");

        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        {type === 'in' ? (
                            <span className="text-emerald-500">Registrar Ingreso</span>
                        ) : (
                            <span className="text-red-500">Registrar Egreso</span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Monto</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-7 bg-slate-950 border-slate-700"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Concepto / Categoría</Label>
                        <Select
                            value={formData.category}
                            onValueChange={(val) => setFormData({ ...formData, category: val })}
                        >
                            <SelectTrigger className="bg-slate-950 border-slate-700">
                                <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800">
                                {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id} className="text-white hover:bg-slate-800 focus:bg-slate-800">
                                        {cat.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {formData.category === 'payroll' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <Label className="text-emerald-400">Seleccionar Empleado</Label>
                            <Select
                                value={selectedEmployee}
                                onValueChange={setSelectedEmployee}
                            >
                                <SelectTrigger className="bg-slate-950 border-emerald-500/50">
                                    <SelectValue placeholder="Busque empleado..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-emerald-500/30">
                                    {employees?.map((emp: any) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            {emp.firstName} {emp.lastName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Descripción / Referencia</Label>
                        <Textarea
                            placeholder="Detalles adicionales..."
                            className="bg-slate-950 border-slate-700 min-h-[80px]"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className={type === 'in' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
                            disabled={isLoading}
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Registrar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
