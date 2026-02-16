import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Package, TrendingUp, Plus } from "lucide-react";

interface CartItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
    maxStock: number;
}

export function UpsellSuggestion({ cart, allProducts, onAdd }: { cart: CartItem[], allProducts: any[], onAdd: (p: any) => void }) {
    const suggestion = useMemo(() => {
        if (cart.length === 0) return null;
        const lastItem = cart[cart.length - 1];
        const fullLastItem = allProducts.find(p => p.id === lastItem.id);
        if (!fullLastItem) return null;

        return allProducts.find(p =>
            p.id !== lastItem.id &&
            !cart.find(c => c.id === p.id) &&
            p.category === fullLastItem.category
        );
    }, [cart, allProducts]);

    if (!suggestion) return null;

    return (
        <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-400">
                    <Package className="w-4 h-4" />
                    Sugerencia Inteligente
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-indigo-500/20 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-indigo-100">{suggestion.name}</p>
                        <p className="text-xs text-indigo-300/70">Clientes suelen llevar esto junto.</p>
                    </div>
                    <Button size="sm" variant="secondary" className="h-8" onClick={() => onAdd(suggestion)}>
                        <Plus className="w-3 h-3 mr-1" />
                        Agg
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
