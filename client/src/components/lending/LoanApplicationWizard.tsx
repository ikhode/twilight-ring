import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertLoanApplicationSchema } from '@shared/schema';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { FileUp, Landmark, Calculator, UserCheck } from 'lucide-react';
import { MLConfidenceIndicator } from '../ai/MLConfidenceIndicator';

interface LoanApplicationWizardProps {
    onComplete?: () => void;
}

export const LoanApplicationWizard: React.FC<LoanApplicationWizardProps> = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const { toast } = useToast();

    const form = useForm({
        resolver: zodResolver(insertLoanApplicationSchema),
        defaultValues: {
            customerId: '',
            requestedAmount: 0,
            requestedTermMonths: 12,
            type: 'personal',
            metadata: {}
        }
    });

    const onSubmit = async (data: any) => {
        try {
            const res = await apiRequest('POST', '/api/lending/applications', {
                ...data,
                requestedAmount: data.requestedAmount * 100 // convert to cents
            });
            toast({ title: "Solicitud Enviada", description: "La solicitud ha sido registrada para evaluación." });
            queryClient.invalidateQueries({ queryKey: ['/api/lending/applications'] });
            if (onComplete) onComplete();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo enviar la solicitud.", variant: "destructive" });
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto border-glow bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    < Landmark className="h-6 w-6 text-primary" />
                    Nueva Solicitud de Crédito
                </CardTitle>
                <div className="flex justify-between mt-4">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className={`h-1 flex-1 mx-1 rounded ${step >= s ? 'bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-muted'}`} />
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {step === 1 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                                <CardTitle className="text-sm font-medium flex items-center gap-2 mb-4">
                                    <UserCheck className="h-4 w-4" /> Datos del Cliente
                                </CardTitle>
                                <FormField
                                    control={form.control}
                                    name="customerId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>ID del Cliente</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Buscar cliente..." className="bg-background/50" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tipo de Crédito</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-background/50">
                                                        <SelectValue placeholder="Seleccionar tipo" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="personal">Personal</SelectItem>
                                                    <SelectItem value="business">Empresarial</SelectItem>
                                                    <SelectItem value="collateralized">Con Garantía</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                <CardTitle className="text-sm font-medium flex items-center gap-2 mb-4">
                                    <Calculator className="h-4 w-4" /> Monto y Plazo
                                </CardTitle>
                                <FormField
                                    control={form.control}
                                    name="requestedAmount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Monto Solicitado ($)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} className="bg-background/50" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="requestedTermMonths"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Plazo (Meses)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} className="bg-background/50" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-4 animate-in fade-in zoom-in-95">
                                <CardTitle className="text-sm font-medium flex items-center gap-2 mb-4">
                                    <FileUp className="h-4 w-4" /> Resumen y Validación
                                </CardTitle>
                                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                                    <p className="text-sm text-muted-foreground">La solicitud será evaluada automáticamente por el motor de riesgo AI al procesar.</p>
                                    <div className="mt-4">
                                        <MLConfidenceIndicator confidence={0.95} label="Precisión del Motor de Riesgo" />
                                    </div>
                                </div>
                                <div className="space-y-1 text-sm border-t pt-4">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Monto:</span>
                                        <span className="font-bold">${form.watch('requestedAmount')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Plazo:</span>
                                        <span className="font-bold">{form.watch('requestedTermMonths')} meses</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </Form>
            </CardContent>
            <CardFooter className="flex justify-between gap-4">
                <Button variant="outline" disabled={step === 1} onClick={() => setStep(s => s - 1)}>
                    Anterior
                </Button>
                {step < 3 ? (
                    <Button className="flex-1" onClick={() => setStep(s => s + 1)}>Siguiente</Button>
                ) : (
                    <Button className="flex-1" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Enviando..." : "Finalizar Solicitud"}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
};
