import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Briefcase,
    Hammer,
    Coffee,
    Utensils,
    User
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export function FloorControl() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedLog, setSelectedLog] = useState<any>(null);
    const [finalizeData, setFinalizeData] = useState({ quantity: 0, notes: "", status: 'approved' });
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Fetch Active Logs
    const { data: logs = [] } = useQuery({
        queryKey: ["/api/production/logs/active"],
        queryFn: async () => {
            const res = await fetch("/api/production/logs/active");
            if (!res.ok) return [];
            return res.json();
        },
        refetchInterval: 5000 // Poll every 5s for realtime-ish updates
    });

    const finalizeMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/production/logs/finalize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    logId: selectedLog.id,
                    ...finalizeData
                })
            });
            if (!res.ok) throw new Error("Failed to finalize");
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Actividad Finalizada", description: "El registro ha sido procesado." });
            setIsDialogOpen(false);
            setFinalizeData({ quantity: 0, notes: "", status: 'approved' });
            setSelectedLog(null);
            queryClient.invalidateQueries({ queryKey: ["/api/production/logs/active"] });
            queryClient.invalidateQueries({ queryKey: ["/api/piecework/tickets"] }); // Refresh tickets if created
        },
        onError: () => {
            toast({ title: "Error", variant: "destructive" });
        }
    });

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'production': return <Hammer className="w-5 h-5 text-emerald-500" />;
            case 'break': return <Coffee className="w-5 h-5 text-yellow-500" />;
            case 'lunch': return <Utensils className="w-5 h-5 text-orange-500" />;
            default: return <Briefcase className="w-5 h-5 text-slate-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {logs.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl">
                        <CheckCircle2 className="w-12 h-12 text-slate-800 mb-4" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest">Sin actividad pendiente</p>
                    </div>
                )}

                {logs.map((log: any) => (
                    <Card key={log.id} className="bg-slate-900/50 border-slate-800">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                                        <User className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div>
                                        {/* Ideally fetch name, but for now ID or if generic join in backend */}
                                        <p className="font-bold text-white uppercase tracking-tighter truncate w-32">
                                            {/* We need employee name. The backend endpoint provided raw logs. 
                                                I should probably join employee name in backend or fetch employees here.
                                                Assuming log has employeeName if I update backend, or I use existing employees cache.
                                            */}
                                            {/* Fallback to Employee ID for now if name missing */}
                                            {log.employeeName || "Empleado"}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            {getActivityIcon(log.activityType)}
                                            <span className="uppercase">{log.activityType}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 animate-pulse">
                                        ACTIVO
                                    </Badge>
                                    <p className="text-xs font-mono text-slate-400 mt-1">
                                        {formatDistanceToNow(new Date(log.startedAt), { locale: es, addSuffix: true })}
                                    </p>
                                </div>
                            </div>

                            <Dialog open={isDialogOpen && selectedLog?.id === log.id} onOpenChange={(open) => {
                                setIsDialogOpen(open);
                                if (open) setSelectedLog(log);
                            }}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full border-slate-700 hover:bg-slate-800">
                                        Gestionar / Finalizar
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-slate-950 border-slate-800">
                                    <DialogHeader>
                                        <DialogTitle>Finalizar Actividad</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 text-xs uppercase">Inicio</span>
                                                <span className="font-mono text-white">{new Date(log.startedAt).toLocaleTimeString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 text-xs uppercase">Duración</span>
                                                <span className="font-mono text-emerald-500 font-bold">
                                                    {formatDistanceToNow(new Date(log.startedAt), { locale: es })}
                                                </span>
                                            </div>
                                        </div>

                                        {log.activityType === 'production' && (
                                            <div className="space-y-2">
                                                <label className="text-xs uppercase font-bold text-slate-500">Cantidad Producida (Piezas)</label>
                                                <Input
                                                    type="number"
                                                    className="bg-slate-900 border-slate-800 text-2xl font-mono text-center"
                                                    value={finalizeData.quantity || ''}
                                                    onChange={(e) => setFinalizeData({ ...finalizeData, quantity: parseInt(e.target.value) || 0 })}
                                                    placeholder="0"
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-xs uppercase font-bold text-slate-500">Notas de Supervisor</label>
                                            <Textarea
                                                className="bg-slate-900 border-slate-800 resize-none"
                                                value={finalizeData.notes}
                                                onChange={(e) => setFinalizeData({ ...finalizeData, notes: e.target.value })}
                                                placeholder="Observaciones..."
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter className="gap-2 sm:gap-0">
                                        <Button
                                            variant="destructive"
                                            onClick={() => {
                                                setFinalizeData({ ...finalizeData, status: 'rejected' });
                                                finalizeMutation.mutate();
                                            }}
                                        >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Rechazar / Cancelar
                                        </Button>
                                        <Button
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                                            onClick={() => {
                                                setFinalizeData({ ...finalizeData, status: 'approved' });
                                                finalizeMutation.mutate();
                                            }}
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Aprobar y Finalizar
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
