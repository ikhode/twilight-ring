import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Trash2, Save, Clock, Minus, Plus, Activity, CreditCard, Banknote, Building2, Printer, Loader2, CheckCircle2 } from "lucide-react";
import { CognitiveProvider, CognitiveField, GuardianDiagnostic, GuardianSafeStatus } from "@/components/cognitive";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CustomerCombobox } from "@/components/pos/CustomerCombobox";

interface CartItem {
    id: number; // Keeping as number to match Sales.tsx, though ProductGrid uses string. Need to verify.
    name: string;
    price: number;
    quantity: number;
    maxStock: number;
}

interface CartProps {
    cart: CartItem[];
    setCart: (cart: CartItem[]) => void;
    updateQuantity: (id: number, delta: number) => void;
    removeFromCart: (id: number) => void;
    handleHoldOrder: () => void;
    setIsRecallOpen: (open: boolean) => void;

    // Context / Selection
    selectedCustomer: string;
    setSelectedCustomer: (id: string) => void;
    customers: any[];
    currentLabels: any;

    selectedSeller: string;
    setSelectedSeller: (id: string) => void;
    sellers: any[];

    selectedDriver: string;
    setSelectedDriver: (id: string) => void;
    drivers: any[];

    selectedVehicle: string;
    setSelectedVehicle: (id: string) => void;
    vehicles: any[];

    // Payment
    isPayDialogOpen: boolean;
    setIsPayDialogOpen: (open: boolean) => void;
    paymentMethod: "cash" | "transfer";
    setPaymentMethod: (m: "cash" | "transfer") => void;
    selectedBankId: string;
    setSelectedBankId: (id: string) => void;
    bankAccounts: any[];
    handlePay: () => void;
    isPayPending: boolean; // payMutation.isPending

    formatCurrency: (amount: number) => string;
}

export function Cart({
    cart, setCart, updateQuantity, removeFromCart, handleHoldOrder, setIsRecallOpen,
    selectedCustomer, setSelectedCustomer, customers, currentLabels,
    selectedSeller, setSelectedSeller, sellers,
    selectedDriver, setSelectedDriver, drivers,
    selectedVehicle, setSelectedVehicle, vehicles,
    isPayDialogOpen, setIsPayDialogOpen, paymentMethod, setPaymentMethod,
    selectedBankId, setSelectedBankId, bankAccounts, handlePay, isPayPending,
    formatCurrency
}: CartProps) {

    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const tax = subtotal * 0.16;
    const total = subtotal + tax;

    return (
        <Card className="h-[calc(100vh-8rem)] flex flex-col">
            <CardHeader className="pb-3 border-b bg-muted/40">
                <div className="flex items-center justify-between">
                    <CardTitle className="font-display flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" />
                        Orden Actual
                    </CardTitle>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setCart([])} title="Limpiar">
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleHoldOrder} title="Guardar (Pendiente)">
                            <Save className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setIsRecallOpen(true)} title="Recuperar">
                            <Clock className="w-4 h-4 text-amber-500" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col overflow-hidden pt-4">
                <CognitiveProvider>
                    <GuardianDiagnostic />
                    <GuardianSafeStatus />

                    {cart.length > 0 && (
                        <div className="space-y-3 p-3 rounded-lg bg-primary/5 border border-primary/10 shrink-0">
                            <CognitiveField label={currentLabels.client} value={selectedCustomer} semanticType="category" options={customers.map((c: any) => c.name)}>
                                <CustomerCombobox
                                    value={selectedCustomer}
                                    setValue={setSelectedCustomer}
                                    customers={customers}
                                    labels={currentLabels}
                                />
                            </CognitiveField>
                            <CognitiveField label="Vendedor / Asesor" value={selectedSeller} semanticType="person">
                                <select className="w-full bg-background border border-border rounded-md p-2 text-sm" value={selectedSeller} onChange={(e) => setSelectedSeller(e.target.value)}>
                                    <option value="">Auto-asignar (Yo)</option>
                                    {sellers.map((s: any) => (<option key={s.id} value={s.id}>{s.name} ({s.role})</option>))}
                                </select>
                            </CognitiveField>
                            <CognitiveField label="Conductor" value={selectedDriver} semanticType="method">
                                <select className="w-full bg-background border border-border rounded-md p-2 text-sm" value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}>
                                    <option value="">Sin asignar</option>
                                    {drivers.map((d: any) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                                </select>
                            </CognitiveField>
                            <CognitiveField label="Vehículo" value={selectedVehicle} semanticType="method">
                                <select className="w-full bg-background border border-border rounded-md p-2 text-sm" value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)}>
                                    <option value="">Sin asignar</option>
                                    {vehicles.map((v: any) => (<option key={v.id} value={v.id}>{v.plate} - {v.model}</option>))}
                                </select>
                            </CognitiveField>
                        </div>
                    )}

                    {cart.length === 0 ? (
                        <div className="text-center py-8 flex-1 flex flex-col justify-center">
                            <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground">Carrito vacío</p>
                            <p className="text-sm text-muted-foreground/70">Seleccione productos para agregar</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
                            <div className="space-y-3">
                                {cart.map((item) => (
                                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{item.name}</p>
                                            <p className="text-xs text-muted-foreground font-mono">{formatCurrency(item.price)} x {item.quantity}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => updateQuantity(item.id, -1)}><Minus className="w-3 h-3" /></Button>
                                            <span className="w-8 text-center font-mono font-semibold">{item.quantity}</span>
                                            <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => updateQuantity(item.id, 1)}><Plus className="w-3 h-3" /></Button>
                                            <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => removeFromCart(item.id)}><Trash2 className="w-3 h-3" /></Button>
                                        </div>
                                        <p className="font-semibold font-mono min-w-20 text-right">{formatCurrency(item.price * item.quantity)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {cart.length > 0 && (
                        <div className="space-y-4 shrink-0 mt-2">
                            <Separator />
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{formatCurrency(subtotal)}</span></div>
                                <div className="flex justify-between text-sm">
                                    <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">IVA (16%)</span>
                                        <span className="text-[10px] text-muted-foreground/50 italic px-1 bg-muted rounded">Fiscal</span>
                                    </div>
                                    <span className="font-mono">{formatCurrency(tax)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="font-mono text-primary">{formatCurrency(total)}</span></div>
                            </div>

                            {/* Operational Insight Pattern - Results Oriented */}
                            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Optimización Comercial</span>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                        <p className="text-[10px] text-slate-400">
                                            {cart.length} items listos para <span className="text-slate-200">reserva de inventario</span>.
                                        </p>
                                    </div>
                                    {selectedCustomer ? (
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                                <p className="text-[10px] text-slate-400">
                                                    Afectando <span className="text-slate-200">{currentLabels?.insight}</span> del {currentLabels?.client.toLowerCase()} seleccionado.
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-purple-500" />
                                                <p className="text-[10px] text-slate-400">
                                                    Ganarás <span className="text-purple-200 font-bold">{Math.floor(subtotal / 10)} pts</span> de lealtad.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-amber-500" />
                                            <p className="text-[10px] text-slate-400 font-medium italic">
                                                Venta sin registro: se registrará como <span className="text-amber-200/80">{currentLabels?.anonymous}</span>.
                                            </p>
                                        </div>
                                    )}
                                    {(selectedDriver || selectedVehicle) && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-blue-500" />
                                            <p className="text-[10px] text-slate-400">
                                                Despacho logístico <span className="text-blue-200">auditado</span> habilitado.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="h-16 text-lg font-bold" disabled={cart.length === 0} data-tour="new-sale-btn">
                                            <CreditCard className="w-6 h-6 mr-2" />
                                            Finalizar Venta
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Confirmar Pago</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                                                <span className="text-lg font-medium">Total a Pagar:</span>
                                                <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
                                            </div>

                                            <CognitiveField label="Método de Pago" value={paymentMethod} semanticType="method">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Button
                                                        type="button"
                                                        variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                                                        className="h-12"
                                                        onClick={() => setPaymentMethod('cash')}
                                                    >
                                                        <Banknote className="w-4 h-4 mr-2" /> Efectivo
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant={paymentMethod === 'transfer' ? 'default' : 'outline'}
                                                        className="h-12"
                                                        onClick={() => setPaymentMethod('transfer')}
                                                    >
                                                        <Building2 className="w-4 h-4 mr-2" /> Transferencia
                                                    </Button>
                                                </div>
                                            </CognitiveField>

                                            {paymentMethod === 'transfer' && (
                                                <CognitiveField label="Cuenta Bancaria de Destino" value={selectedBankId} semanticType="category">
                                                    <select
                                                        className="w-full bg-background border border-border rounded-md p-2 text-sm"
                                                        value={selectedBankId}
                                                        onChange={(e) => setSelectedBankId(e.target.value)}
                                                    >
                                                        <option value="">Seleccione cuenta...</option>
                                                        {bankAccounts.map((a: any) => (
                                                            <option key={a.id} value={a.id}>{a.name} ({a.bankName})</option>
                                                        ))}
                                                    </select>
                                                </CognitiveField>
                                            )}
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setIsPayDialogOpen(false)}>Cancelar</Button>
                                            <Button
                                                onClick={handlePay}
                                                disabled={isPayPending || (paymentMethod === 'transfer' && !selectedBankId)}
                                            >
                                                {isPayPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                Confirmar Venta
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <Button variant="outline" className="w-full" onClick={() => {
                                const win = window.open('', '', 'width=300,height=600');
                                if (win) {
                                    win.document.write(`
                        <html>
                          <head><title>Ticket de Venta</title><style>body { font-family: monospace; padding: 20px; }</style></head>
                          <body>
                            <h3 style="text-align:center;">Nexus ERP</h3>
                            <p style="text-align:center;">Ticket de Venta</p>
                            <p style="text-align:center; font-size: 12px;">${new Date().toLocaleString()}</p>
                            ${(() => {
                                            const customer = customers.find(c => c.id === selectedCustomer);
                                            if (customer) {
                                                return `
                                    <div style="border-bottom: 1px dashed black; margin-bottom: 10px; padding-bottom: 5px;">
                                        <strong>Cliente:</strong> ${customer.name}<br/>
                                        ${customer.address ? `<strong>Dirección:</strong> ${customer.address}<br/>` : ''}
                                        ${customer.rfc ? `<strong>RFC:</strong> ${customer.rfc}<br/>` : ''}
                                    </div>`;
                                            }
                                            return '';
                                        })()}
                            <hr style="border-top: 1px dashed black;"/>
                            <table style="width:100%; border-collapse:collapse; font-size: 12px;">
                            ${cart.map(i => `<tr><td>${i.name} <br/> <span style="font-size:10px;">x${i.quantity}</span></td><td style="text-align:right;">${formatCurrency(i.price * i.quantity)}</td></tr>`).join('')}
                            </table>
                            <hr style="border-top: 1px dashed black;"/>
                            <div style="display:flex; justify-content:space-between; font-weight:bold; font-size: 14px;"><span>TOTAL</span><span>${formatCurrency(total)}</span></div>
                            <p style="text-align:center; margin-top:20px; font-size: 12px;">¡Gracias por su compra!</p>
                          </body>
                        </html>`);
                                    win.print();
                                    win.close();
                                }
                            }}>
                                <Printer className="w-4 h-4 mr-2" />
                                Imprimir Ticket
                            </Button>
                        </div>
                    )}
                </CognitiveProvider>
            </CardContent>
        </Card>
    );
}
