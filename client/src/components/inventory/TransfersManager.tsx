import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Truck, Plus, Download, Mail, X, Info, FileText, FileSpreadsheet, Search, ArrowRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";

interface Location {
    id: string;
    name: string;
    type: string;
}

interface Product {
    id: string;
    name: string;
    sku: string;
    stock: number;
}

interface ProductStock {
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
}

interface TransferOrderItem {
    productId: string;
    productName?: string;
    quantity: number;
}

interface TransferOrder {
    id: string;
    sourceLocationId: string | null;
    destinationLocationId: string | null;
    status: 'draft' | 'requested' | 'in_transit' | 'completed' | 'cancelled';
    items: TransferOrderItem[];
    notes: string | null;
    createdAt: string;
    completedAt: string | null;
    sourceLocation?: { name: string };
    destinationLocation?: { name: string };
}

const statusConfig = {
    draft: { label: 'Borrador', color: 'bg-gray-500' },
    requested: { label: 'Solicitada', color: 'bg-blue-500' },
    in_transit: { label: 'En Tránsito', color: 'bg-yellow-500' },
    completed: { label: 'Completada', color: 'bg-green-500' },
    cancelled: { label: 'Cancelada', color: 'bg-red-500' },
};

export function TransfersManager() {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState<TransferOrder | null>(null);
    const [emailAddress, setEmailAddress] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Form state
    const [sourceLocationId, setSourceLocationId] = useState("");
    const [destinationLocationId, setDestinationLocationId] = useState("");
    const [selectedProducts, setSelectedProducts] = useState<Array<{ productId: string; quantity: number }>>([]);
    const [notes, setNotes] = useState("");
    const [productSearch, setProductSearch] = useState("");

    // Fetch locations
    const { data: locations = [] } = useQuery<Location[]>({
        queryKey: ["/api/inventory-advanced/locations"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/inventory-advanced/locations");
            return res.json();
        },
        enabled: !!session?.access_token
    });

    // Fetch transfers
    const { data: transfers = [] } = useQuery<TransferOrder[]>({
        queryKey: ["/api/inventory-advanced/transfers"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/inventory-advanced/transfers");
            return res.json();
        },
        enabled: !!session?.access_token
    });

    // Fetch products
    const { data: products = [] } = useQuery<Product[]>({
        queryKey: ["/api/inventory/products"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/inventory/products");
            return res.json();
        },
        enabled: !!session?.access_token
    });

    // Fetch stock for source location
    const { data: sourceStock = [] } = useQuery<ProductStock[]>({
        queryKey: ["/api/inventory-advanced/locations", sourceLocationId, "stock"],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/inventory-advanced/locations/${sourceLocationId}/stock`);
            return res.json();
        },
        enabled: !!sourceLocationId
    });

    // Fetch stock for destination location
    const { data: destStock = [] } = useQuery<ProductStock[]>({
        queryKey: ["/api/inventory-advanced/locations", destinationLocationId, "stock"],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/inventory-advanced/locations/${destinationLocationId}/stock`);
            return res.json();
        },
        enabled: !!destinationLocationId
    });

    // Realtime subscriptions
    useSupabaseRealtime({ table: 'transfer_orders', queryKey: ["/api/inventory-advanced/transfers"] });
    useSupabaseRealtime({ table: 'product_stocks', queryKey: ["/api/inventory-advanced/locations", sourceLocationId, "stock"] });
    useSupabaseRealtime({ table: 'product_stocks', queryKey: ["/api/inventory-advanced/locations", destinationLocationId, "stock"] });

    // Create transfer mutation
    const createTransferMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/inventory-advanced/transfers", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory-advanced/transfers"] });
            setIsCreateDialogOpen(false);
            resetForm();
            toast({ title: "Orden Creada", description: "La orden de transferencia se ha creado correctamente." });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    // Update status mutation
    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const res = await apiRequest("PATCH", `/api/inventory-advanced/transfers/${id}/status`, { status });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory-advanced/transfers"] });
            queryClient.invalidateQueries({ queryKey: ["/api/inventory-advanced/locations"] });
            toast({ title: "Estado Actualizado", description: "El estado de la orden se ha actualizado." });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    // Send email mutation
    const sendEmailMutation = useMutation({
        mutationFn: async ({ id, email }: { id: string; email: string }) => {
            const res = await apiRequest("POST", `/api/inventory-advanced/transfers/${id}/email`, { email });
            return res.json();
        },
        onSuccess: () => {
            setIsEmailDialogOpen(false);
            setEmailAddress("");
            toast({ title: "Email Enviado", description: "La orden se ha enviado por email correctamente." });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const resetForm = () => {
        setSourceLocationId("");
        setDestinationLocationId("");
        setSelectedProducts([]);
        setNotes("");
        setProductSearch("");
    };

    const handleAddProduct = (productId: string) => {
        if (!selectedProducts.find(p => p.productId === productId)) {
            setSelectedProducts([...selectedProducts, { productId, quantity: 1 }]);
        }
    };

    const handleRemoveProduct = (productId: string) => {
        setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
    };

    const handleQuantityChange = (productId: string, quantity: number) => {
        setSelectedProducts(selectedProducts.map(p =>
            p.productId === productId ? { ...p, quantity: Math.max(1, quantity) } : p
        ));
    };

    const handleCreateTransfer = (status: 'draft' | 'requested') => {
        if (!sourceLocationId || !destinationLocationId) {
            toast({ title: "Error", description: "Seleccione ubicaciones de origen y destino", variant: "destructive" });
            return;
        }

        if (sourceLocationId === destinationLocationId) {
            toast({ title: "Error", description: "Origen y destino deben ser diferentes", variant: "destructive" });
            return;
        }

        if (selectedProducts.length === 0) {
            toast({ title: "Error", description: "Agregue al menos un producto", variant: "destructive" });
            return;
        }

        createTransferMutation.mutate({
            sourceLocationId,
            destinationLocationId,
            items: selectedProducts,
            notes: notes || null,
            status
        });
    };

    const handleDownloadPDF = (transferId: string) => {
        window.open(`/api/inventory-advanced/transfers/${transferId}/pdf`, '_blank');
    };

    const handleDownloadCSV = (transferId: string) => {
        window.open(`/api/inventory-advanced/transfers/${transferId}/csv`, '_blank');
    };

    const handleSendEmail = (transfer: TransferOrder) => {
        setSelectedTransfer(transfer);
        setIsEmailDialogOpen(true);
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.sku.toLowerCase().includes(productSearch.toLowerCase())
        );
    }, [products, productSearch]);

    const filteredTransfers = useMemo(() => {
        return transfers.filter(t =>
            t.sourceLocation?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.destinationLocation?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.status.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [transfers, searchQuery]);

    const getProductStock = (productId: string, stockList: ProductStock[]) => {
        const stock = stockList.find(s => s.productId === productId);
        return stock?.quantity || 0;
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Órdenes de Transferencia</CardTitle>
                            <CardDescription>Mueve inventario entre ubicaciones de forma controlada.</CardDescription>
                        </div>
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nueva Transferencia
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar transferencias..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {filteredTransfers.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No hay órdenes de transferencia</p>
                            </div>
                        ) : (
                            filteredTransfers.map((transfer) => (
                                <Card key={transfer.id} className="border-l-4" style={{ borderLeftColor: statusConfig[transfer.status].color.replace('bg-', '#') }}>
                                    <CardContent className="pt-6">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-center gap-3">
                                                    <Badge className={statusConfig[transfer.status].color}>
                                                        {statusConfig[transfer.status].label}
                                                    </Badge>
                                                    <span className="text-sm text-muted-foreground">
                                                        #{transfer.id.slice(0, 8)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="font-medium">{transfer.sourceLocation?.name || 'N/A'}</span>
                                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">{transfer.destinationLocation?.name || 'N/A'}</span>
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {transfer.items.length} producto(s) • {new Date(transfer.createdAt).toLocaleDateString('es-MX')}
                                                </div>
                                                {transfer.notes && (
                                                    <p className="text-sm text-muted-foreground italic">{transfer.notes}</p>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(transfer.id)}>
                                                                <FileText className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Descargar PDF</TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="outline" size="sm" onClick={() => handleDownloadCSV(transfer.id)}>
                                                                <FileSpreadsheet className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Descargar CSV</TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="outline" size="sm" onClick={() => handleSendEmail(transfer)}>
                                                                <Mail className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Enviar por Email</TooltipContent>
                                                    </Tooltip>

                                                    {transfer.status === 'requested' && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="default"
                                                                    size="sm"
                                                                    onClick={() => updateStatusMutation.mutate({ id: transfer.id, status: 'completed' })}
                                                                >
                                                                    Completar
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Marcar como completada y actualizar stock</TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </TooltipProvider>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Create Transfer Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Nueva Orden de Transferencia</DialogTitle>
                        <DialogDescription>
                            Seleccione las ubicaciones y productos a transferir
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Ubicación de Origen</Label>
                                <Select value={sourceLocationId} onValueChange={setSourceLocationId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar origen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locations.map((loc) => (
                                            <SelectItem key={loc.id} value={loc.id}>
                                                {loc.name} ({loc.type})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Ubicación de Destino</Label>
                                <Select value={destinationLocationId} onValueChange={setDestinationLocationId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar destino" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locations.map((loc) => (
                                            <SelectItem key={loc.id} value={loc.id} disabled={loc.id === sourceLocationId}>
                                                {loc.name} ({loc.type})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Productos</Label>
                            <div className="relative mb-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar productos..."
                                    className="pl-9"
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                />
                            </div>

                            {selectedProducts.length > 0 && (
                                <div className="border rounded-lg p-4 space-y-2 mb-4">
                                    {selectedProducts.map((item) => {
                                        const product = products.find(p => p.id === item.productId);
                                        const sourceQty = getProductStock(item.productId, sourceStock);
                                        const destQty = getProductStock(item.productId, destStock);

                                        return (
                                            <div key={item.productId} className="flex items-center gap-4 p-2 bg-muted rounded">
                                                <div className="flex-1">
                                                    <div className="font-medium">{product?.name}</div>
                                                    <div className="text-sm text-muted-foreground flex gap-4">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="cursor-help">Origen: {sourceQty}</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="font-bold text-xs mb-1">STOCK EN ORIGEN</p>
                                                                    <p>Existencias actuales en la ubicación de origen.</p>
                                                                    <p>Este valor se reducirá al completar la transferencia.</p>
                                                                </TooltipContent>
                                                            </Tooltip>

                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="cursor-help">Destino: {destQty}</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="font-bold text-xs mb-1">STOCK EN DESTINO</p>
                                                                    <p>Existencias actuales en la ubicación de destino.</p>
                                                                    <p>Este valor aumentará al completar la transferencia.</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </div>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                max={sourceQty}
                                                                value={item.quantity}
                                                                onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 1)}
                                                                className="w-24"
                                                            />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="font-bold text-xs mb-1">CANTIDAD A TRANSFERIR</p>
                                                            <p>Unidades a transferir. No puede exceder el stock disponible en origen ({sourceQty}).</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <Button variant="ghost" size="sm" onClick={() => handleRemoveProduct(item.productId)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="border rounded-lg max-h-48 overflow-y-auto">
                                {filteredProducts.filter(p => !selectedProducts.find(sp => sp.productId === p.id)).map((product) => (
                                    <div
                                        key={product.id}
                                        className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer"
                                        onClick={() => handleAddProduct(product.id)}
                                    >
                                        <div>
                                            <div className="font-medium">{product.name}</div>
                                            <div className="text-sm text-muted-foreground">{product.sku}</div>
                                        </div>
                                        <Button variant="ghost" size="sm">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Notas (Opcional)</Label>
                            <Textarea
                                placeholder="Agregar notas sobre esta transferencia..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button variant="secondary" onClick={() => handleCreateTransfer('draft')}>
                            Guardar Borrador
                        </Button>
                        <Button onClick={() => handleCreateTransfer('requested')}>
                            Solicitar Transferencia
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Email Dialog */}
            <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enviar Orden por Email</DialogTitle>
                        <DialogDescription>
                            Ingrese la dirección de email del destinatario
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                placeholder="ejemplo@empresa.com"
                                value={emailAddress}
                                onChange={(e) => setEmailAddress(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => selectedTransfer && sendEmailMutation.mutate({ id: selectedTransfer.id, email: emailAddress })}
                            disabled={!emailAddress}
                        >
                            <Mail className="h-4 w-4 mr-2" />
                            Enviar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
