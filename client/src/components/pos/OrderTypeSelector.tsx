import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface OrderTypeSelectorProps {
    orderType: "dine-in" | "takeout" | "delivery";
    setOrderType: (type: "dine-in" | "takeout" | "delivery") => void;
    tableNumber: string;
    setTableNumber: (val: string) => void;
    pax: number;
    setPax: (val: number) => void;
}

export function OrderTypeSelector({ orderType, setOrderType, tableNumber, setTableNumber, pax, setPax }: OrderTypeSelectorProps) {
    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4">
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant={orderType === "dine-in" ? "default" : "outline"}
                        className={cn(orderType === "dine-in" && "bg-primary text-primary-foreground")}
                        onClick={() => setOrderType("dine-in")}
                    >
                        Comedor
                    </Button>
                    <Button
                        variant={orderType === "takeout" ? "default" : "outline"}
                        className={cn(orderType === "takeout" && "bg-amber-500 hover:bg-amber-600 text-white border-amber-500")}
                        onClick={() => setOrderType("takeout")}
                    >
                        Para Llevar
                    </Button>
                    <Button
                        variant={orderType === "delivery" ? "default" : "outline"}
                        className={cn(orderType === "delivery" && "bg-blue-500 hover:bg-blue-600 text-white border-blue-500")}
                        onClick={() => setOrderType("delivery")}
                    >
                        Domicilio
                    </Button>
                </div>

                {orderType === "dine-in" && (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-5">
                        <div className="flex items-center gap-2">
                            <Label>Mesa</Label>
                            <Input
                                className="w-16 h-9 bg-slate-950"
                                placeholder="#"
                                value={tableNumber}
                                onChange={(e) => setTableNumber(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Label>Pax</Label>
                            <Input
                                type="number"
                                className="w-16 h-9 bg-slate-950"
                                min={1}
                                value={pax}
                                onChange={(e) => setPax(parseInt(e.target.value) || 1)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
