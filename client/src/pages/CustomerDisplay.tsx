import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, User, Smartphone, QrCode } from "lucide-react";
import { useConfiguration } from "@/context/ConfigurationContext";

interface CartItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
    maxStock: number;
}

interface CustomerDisplayState {
    cart: CartItem[];
    customer: { name: string; points?: number } | null;
    total: number;
    subtotal: number;
    tax: number;
}

export default function CustomerDisplay() {
    const { universalConfig } = useConfiguration();
    const [state, setState] = useState<CustomerDisplayState>({
        cart: [],
        customer: null,
        total: 0,
        subtotal: 0,
        tax: 0
    });

    useEffect(() => {
        const channel = new BroadcastChannel("pos_customer_display");

        channel.onmessage = (event) => {
            if (event.data && event.data.type === 'CART_UPDATE') {
                setState(event.data.payload);
            }
        };

        return () => {
            channel.close();
        };
    }, []);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-slate-900 border-b border-slate-800 p-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                        <ShoppingCart className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{universalConfig?.industryName || "Nexus ERP"}</h1>
                        <p className="text-slate-400">Total a Pagar</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Total</p>
                    <p className="text-5xl font-bold text-emerald-400 font-mono">
                        {formatCurrency(state.total)}
                    </p>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left Column: Cart Items */}
                <Card className="md:col-span-2 bg-slate-900/50 border-slate-800 h-full flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5" />
                            Tu Compra
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto">
                        {state.cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 opacity-50">
                                <ShoppingCart className="w-24 h-24" />
                                <p className="text-xl">Esperando productos...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {state.cart.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300">
                                                {item.quantity}x
                                            </div>
                                            <div>
                                                <p className="font-semibold text-lg">{item.name}</p>
                                                <p className="text-sm text-slate-400">{formatCurrency(item.price)} c/u</p>
                                            </div>
                                        </div>
                                        <p className="font-bold text-xl font-mono">{formatCurrency(item.price * item.quantity)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right Column: Customer & Promo */}
                <div className="space-y-6 flex flex-col">
                    {/* Customer Card */}
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Cliente
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {state.customer ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                            <User className="w-6 h-6 text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg">{state.customer.name}</p>
                                            <Badge variant="outline" className="text-indigo-300 border-indigo-500/30">Miembro Lealtad</Badge>
                                        </div>
                                    </div>

                                    <Separator className="bg-slate-700" />

                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                            <p className="text-xs text-emerald-400 font-bold uppercase">Puntos a Ganar</p>
                                            <p className="text-2xl font-bold text-emerald-300">+{Math.floor(state.subtotal / 10)}</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                            <p className="text-xs text-purple-400 font-bold uppercase">Saldo Actual</p>
                                            <p className="text-2xl font-bold text-purple-300">{state.customer.points || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-slate-500">
                                    <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>Identifícate para ganar puntos</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Promo / QR Placeholder */}
                    <Card className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border-slate-800 flex-1">
                        <CardContent className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                            <QrCode className="w-32 h-32 text-slate-600" />
                            <div>
                                <h3 className="text-xl font-bold text-slate-200">¡Escanea y Gana!</h3>
                                <p className="text-slate-400 max-w-[200px] mx-auto mt-2">
                                    Descarga nuestra App para ver tus puntos y promociones.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
