import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Truck } from "lucide-react";

export function TransfersManager() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Órdenes de Transferencia</CardTitle>
                <CardDescription>Mueve inventario entre ubicaciones de forma controlada.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center border-dashed border-2 rounded-lg m-4">
                <div className="text-center text-muted-foreground">
                    <Truck className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Selecciona o crea una orden de transferencia para comenzar.</p>
                </div>
            </CardContent>
        </Card>
    )
}
