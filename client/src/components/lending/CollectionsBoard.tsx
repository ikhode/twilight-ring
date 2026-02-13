import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, User, DollarSign, Calendar } from 'lucide-react';
import { LoanCase } from '@shared/schema';

const AGING_BUCKETS = ['0-30', '31-60', '61-90', '90+'] as const;

export const CollectionsBoard: React.FC = () => {
    const { data: cases, isLoading } = useQuery<any[]>({
        queryKey: ['/api/lending/collections/cases']
    });

    if (isLoading) return <div>Cargando casos de cobros...</div>;

    const getBucketIcon = (bucket: string) => {
        switch (bucket) {
            case '0-30': return <Clock className="h-4 w-4 text-blue-400" />;
            case '31-60': return <AlertCircle className="h-4 w-4 text-yellow-400" />;
            case '61-90': return <AlertCircle className="h-4 w-4 text-orange-400" />;
            case '90+': return <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />;
            default: return <Clock className="h-4 w-4" />;
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            {AGING_BUCKETS.map(bucket => (
                <div key={bucket} className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            {getBucketIcon(bucket)}
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{bucket} Días</h3>
                        </div>
                        <Badge variant="outline">{cases?.filter(c => c.agingBucket === bucket).length || 0}</Badge>
                    </div>

                    <div className="space-y-3 min-h-[500px] p-2 rounded-lg bg-muted/20 border border-dashed border-muted">
                        {cases?.filter(c => c.agingBucket === bucket).map((c: any) => (
                            <Card key={c.id} className="cursor-pointer hover:border-primary/50 transition-colors bg-card/50 backdrop-blur-sm shadow-sm group">
                                <CardContent className="p-3 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-primary">Préstamo #{c.loanId.split('-')[0]}</span>
                                            <span className="text-sm font-bold group-hover:text-primary transition-colors">{c.loan?.customer?.name || 'Cliente Desconocido'}</span>
                                        </div>
                                        <Badge variant={c.status === 'active' ? 'destructive' : 'secondary'} className="text-[10px] px-1 h-4">
                                            {c.status}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-2 border-t border-muted">
                                        <div className="flex items-center gap-1">
                                            <DollarSign className="h-3 w-3" />
                                            <span>${(c.loan?.amount / 100).toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>Vence: {new Date(c.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1 col-span-2">
                                            <User className="h-3 w-3" />
                                            <span>Agente: {c.agentId ? 'Asignado' : 'Sin Asignar'}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
