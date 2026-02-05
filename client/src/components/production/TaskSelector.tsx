
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface TaskSelectorProps {
    tasks: any[];
    inventory: any[];
    isError: boolean;
}

export function TaskSelector({ tasks, inventory, isError }: TaskSelectorProps) {
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const selectedTask = tasks?.find(t => t.id === selectedTaskId);

    return (
        <div className="space-y-2">
            <div className="space-y-2">
                <Label>Proceso / Tarea</Label>
                <Select name="taskId" required onValueChange={setSelectedTaskId}>
                    <SelectTrigger>
                        <SelectValue placeholder={isError ? "Error al cargar procesos" : "Seleccionar Proceso"} />
                    </SelectTrigger>
                    <SelectContent>
                        {Array.isArray(tasks) && tasks.length > 0 ? (
                            tasks.map((task: any) => (
                                <SelectItem key={task.id} value={task.id}>
                                    {task.name} (${(task.unitPrice / 100).toFixed(2)})
                                </SelectItem>
                            ))
                        ) : (
                            <div className="p-2 text-xs text-muted-foreground">No hay procesos configurados</div>
                        )}
                    </SelectContent>
                </Select>
            </div>

            {selectedTask?.workflowData?.inputProductId && (
                <div className="p-2 bg-slate-900 rounded border border-slate-800 mt-2">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase text-slate-500">Requiere Insumo</span>
                        <Badge variant="outline" className="text-[10px]">Stock</Badge>
                    </div>
                    {(() => {
                        const inputProduct = inventory.find(i => i.id === selectedTask.workflowData.inputProductId);
                        return inputProduct ? (
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-white font-medium">{inputProduct.name}</span>
                                <span className="font-mono text-slate-400">{inputProduct.quantity} {inputProduct.unit}</span>
                            </div>
                        ) : <span className="text-[10px] text-red-400">Insumo no encontrado</span>
                    })()}
                </div>
            )}

            {selectedTask && (
                <div className="rounded-lg bg-slate-100 dark:bg-slate-900/50 p-2 border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Tarifa Base:</span>
                        <span className="font-bold font-mono text-emerald-600 dark:text-emerald-500">
                            ${(selectedTask.unitPrice / 100).toFixed(2)} / {selectedTask.unit}
                        </span>
                    </div>
                    {selectedTask.workflowData?.piecework?.basis && (
                        <div className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">Base de Pago:</span>
                            <span className="font-bold uppercase text-blue-500">
                                {selectedTask.workflowData.piecework.basis === 'input' ? 'Consumo (Input)' : 'Producción (Output)'}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {selectedTask?.workflowData?.outputProductIds?.length > 1 && (
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded">
                    <p className="text-[10px] font-bold text-amber-500 mb-1">Warning: Multi-output task</p>
                    <Select name="targetProductId">
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Producto Principal" /></SelectTrigger>
                        <SelectContent>
                            {selectedTask.workflowData.outputProductIds.map((pid: string) => {
                                const p = inventory.find(i => i.id === pid);
                                return <SelectItem key={pid} value={pid}>{p?.name || pid}</SelectItem>
                            })}
                        </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Esta tarea tiene múltiples orígenes posibles. Selecciona cuál se utilizó.</p>
                </div>
            )}
        </div>
    );
}
