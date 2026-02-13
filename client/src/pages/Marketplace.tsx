import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Store,
    Package,
    ShoppingCart,
    TrendingUp,
    Shield,
    RefreshCw,
    Search,
    Filter,
    ArrowRight,
    MessageSquare,
    CheckCircle2,
    XCircle,
    Info,
    Clock,
    Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface MarketplaceListing {
    id: string;
    productName: string;
    description: string;
    category: string;
    price: number;
    currency: string;
    stock: number;
    minOrderQty: number;
    sellerName: string;
    sellerTrustScore: number;
    createdAt: string;
}

interface MarketplaceOffer {
    id: string;
    listingId: string;
    buyerId: string;
    sellerId: string;
    qtyRequested: number;
    pricePerUnit: number;
    totalPrice: number;
    terms: string;
    status: 'pending' | 'accepted' | 'rejected' | 'negotiating';
    createdAt: string;
}

export default function Marketplace() {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("feed");
    const [searchQuery, setSearchQuery] = useState("");
    const [minTrustScore, setMinTrustScore] = useState(0);

    // RFQ State
    const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
    const [rfqQty, setRfqQty] = useState(1);
    const [rfqPrice, setRfqPrice] = useState(0);
    const [rfqTerms, setRfqTerms] = useState("");
    const [rfqDialogOpen, setRfqDialogOpen] = useState(false);

    // Queries
    const { data: feed = [], isLoading: feedLoading } = useQuery<MarketplaceListing[]>({
        queryKey: ["/api/marketplace/feed"],
        queryFn: async () => {
            const res = await fetch("/api/marketplace/feed", {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            if (!res.ok) throw new Error("Failed to fetch feed");
            return res.json();
        },
        enabled: !!session?.access_token,
    });

    const { data: offers = [], isLoading: offersLoading } = useQuery<MarketplaceOffer[]>({
        queryKey: ["/api/marketplace/offers"],
        queryFn: async () => {
            const res = await fetch("/api/marketplace/offers", {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            if (!res.ok) throw new Error("Failed to fetch offers");
            return res.json();
        },
        enabled: !!session?.access_token,
    });

    const { data: myListings = [] } = useQuery<MarketplaceListing[]>({
        queryKey: ["/api/marketplace/my-listings"],
        queryFn: async () => {
            const res = await fetch("/api/marketplace/my-listings", {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            if (!res.ok) throw new Error("Failed to fetch my listings");
            return res.json();
        },
        enabled: !!session?.access_token,
    });

    // Mutations
    const submitRfqMutation = useMutation({
        mutationFn: async (rfqData: any) => {
            const res = await fetch("/api/marketplace/offers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify(rfqData),
            });
            if (!res.ok) throw new Error("Failed to submit RFQ");
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "RFQ Enviada", description: "El vendedor ha sido notificado de tu interés." });
            queryClient.invalidateQueries({ queryKey: ["/api/marketplace/offers"] });
            setRfqDialogOpen(false);
            setActiveTab("offers");
        }
    });

    const updateOfferStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const res = await fetch(`/api/marketplace/offers/${id}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error("Failed to update status");
            return res.json();
        },
        onSuccess: (_, variables) => {
            toast({
                title: variables.status === 'accepted' ? "Oferta Aceptada" : "Oferta Rechazada",
                description: variables.status === 'accepted' ? "Se ha iniciado la transacción comercial." : "La oferta ha sido declinada."
            });
            queryClient.invalidateQueries({ queryKey: ["/api/marketplace/offers"] });
        }
    });

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
        }).format(amount / 100);

    const filteredFeed = feed.filter(item =>
        (item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(searchQuery.toLowerCase())) &&
        item.sellerTrustScore >= minTrustScore
    );

    const openRfqDialog = (listing: MarketplaceListing) => {
        setSelectedListing(listing);
        setRfqQty(listing.minOrderQty || 1);
        setRfqPrice(listing.price);
        setRfqTerms("");
        setRfqDialogOpen(true);
    };

    return (
        <AppLayout title="Marketplace B2B" subtitle="Ecosistema de Comercio de Alta Confianza">
            <div className="space-y-6">

                {/* Search and Filters */}
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                    <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                placeholder="Buscar productos, materias primas, servicios..."
                                className="pl-10 bg-slate-950 border-slate-800"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-primary" />
                                <span className="text-xs font-bold uppercase text-slate-500">Min Trust:</span>
                                <select
                                    className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                                    value={minTrustScore}
                                    onChange={(e) => setMinTrustScore(parseInt(e.target.value))}
                                >
                                    <option value={0}>Todos</option>
                                    <option value={400}>400+ (Silver)</option>
                                    <option value={600}>600+ (Gold)</option>
                                    <option value={800}>800+ (Platinum)</option>
                                </select>
                            </div>
                            <Button variant="outline" className="gap-2 border-slate-800">
                                <Filter className="w-4 h-4" />
                                Filtros
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-slate-950/50 border border-slate-800 p-1 w-full md:w-auto grid grid-cols-3">
                        <TabsTrigger value="feed" className="gap-2 uppercase font-black italic tracking-widest text-[10px]">
                            <Store className="w-3 h-3" /> Explorar Mercado
                        </TabsTrigger>
                        <TabsTrigger value="offers" className="gap-2 uppercase font-black italic tracking-widest text-[10px]">
                            <MessageSquare className="w-3 h-3" /> Mis RFQs/Ofertas
                        </TabsTrigger>
                        <TabsTrigger value="listings" className="gap-2 uppercase font-black italic tracking-widest text-[10px]">
                            <Package className="w-3 h-3" /> Mis Productos
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="feed">
                        {feedLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredFeed.map((item) => (
                                    <Card key={item.id} className="bg-slate-900/40 border-slate-800 hover:border-primary/20 transition-all flex flex-col group overflow-hidden">
                                        <div className="h-2 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                                        <CardHeader>
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="outline" className="text-[10px] bg-slate-950 border-slate-800">{item.category}</Badge>
                                                <div className="flex items-center gap-1.5">
                                                    <Shield className={`w-3 h-3 ${item.sellerTrustScore >= 800 ? 'text-emerald-400' : 'text-primary'}`} />
                                                    <span className={`text-xs font-black italic ${item.sellerTrustScore >= 800 ? 'text-emerald-400' : 'text-white'}`}>{item.sellerTrustScore}</span>
                                                </div>
                                            </div>
                                            <CardTitle className="text-xl font-black italic uppercase tracking-tighter text-white group-hover:text-primary transition-colors">{item.productName}</CardTitle>
                                            <CardDescription className="flex items-center gap-1 text-xs">
                                                <Store className="w-3 h-3 text-slate-500" />
                                                <span className="font-bold">{item.sellerName}</span>
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-1">
                                            <p className="text-sm text-slate-400 line-clamp-3 mb-6">{item.description}</p>

                                            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-800/50 mb-4">
                                                <div>
                                                    <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Precio Ref.</span>
                                                    <span className="text-lg font-black italic text-white">{formatCurrency(item.price)} <span className="text-[10px] text-slate-500 uppercase">{item.currency}</span></span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Min. Orden</span>
                                                    <span className="text-sm font-bold text-slate-300">{item.minOrderQty} unidades</span>
                                                </div>
                                            </div>

                                            <Button
                                                className="w-full gap-2 font-black italic uppercase tracking-widest text-xs"
                                                onClick={() => openRfqDialog(item)}
                                            >
                                                Solicitar Cotización (RFQ)
                                                <ArrowRight className="w-3 h-3" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                                {filteredFeed.length === 0 && (
                                    <div className="col-span-full py-20 text-center bg-slate-950/20 rounded-xl border border-dashed border-slate-800">
                                        <XCircle className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm italic">No se encontraron productos que coincidan</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="offers">
                        <div className="space-y-4">
                            {offers.map((offer) => {
                                const isBuyer = offer.buyerId === session?.user?.user_metadata?.orgId;
                                return (
                                    <Card key={offer.id} className="bg-slate-900/40 border-slate-800 overflow-hidden">
                                        <div className="flex flex-col md:flex-row">
                                            <div className={`w-2 h-full md:w-full md:h-1 ${offer.status === 'pending' ? 'bg-amber-500' :
                                                    offer.status === 'accepted' ? 'bg-emerald-500' :
                                                        'bg-red-500'
                                                }`} />
                                            <div className="flex-1 p-6 flex flex-col md:flex-row gap-6 items-center">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <Badge variant="outline" className="text-[10px]">{isBuyer ? 'COMPRA' : 'VENTA'}</Badge>
                                                        <span className="text-[10px] text-slate-500 font-bold uppercase">Ref: {offer.id.split('-')[0]}</span>
                                                    </div>
                                                    <h3 className="text-lg font-black italic uppercase text-white mb-2">
                                                        RFQ para {feed.find(l => l.id === offer.listingId)?.productName || 'Producto'}
                                                    </h3>
                                                    <div className="flex gap-4 text-xs text-slate-400">
                                                        <span><Clock className="w-3 h-3 inline mr-1" /> {new Date(offer.createdAt).toLocaleDateString()}</span>
                                                        <span><Package className="w-3 h-3 inline mr-1" /> {offer.qtyRequested} unidades</span>
                                                    </div>
                                                </div>

                                                <div className="text-center md:px-8 border-x border-slate-800/50">
                                                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Ofertado</span>
                                                    <span className="text-xl font-black italic text-white">{formatCurrency(offer.totalPrice)}</span>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {offer.status === 'pending' && !isBuyer && (
                                                        <>
                                                            <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => updateOfferStatusMutation.mutate({ id: offer.id, status: 'rejected' })}>
                                                                Declinar
                                                            </Button>
                                                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500" onClick={() => updateOfferStatusMutation.mutate({ id: offer.id, status: 'accepted' })}>
                                                                Aceptar y Ledger
                                                            </Button>
                                                        </>
                                                    )}
                                                    {offer.status !== 'pending' && (
                                                        <Badge variant="outline" className={`px-4 py-1 font-bold ${offer.status === 'accepted' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5' :
                                                                'border-red-500 text-red-500 bg-red-500/5'
                                                            }`}>
                                                            {offer.status.toUpperCase()}
                                                        </Badge>
                                                    )}
                                                    {isBuyer && offer.status === 'pending' && (
                                                        <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/5 px-4 py-1">
                                                            ESPERANDO RESPUESTA
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </TabsContent>

                    <TabsContent value="listings">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black uppercase italic tracking-widest">Mis Publicaciones</h3>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" /> Nuevo Listing
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {myListings.map((listing) => (
                                <Card key={listing.id} className="bg-slate-900/40 border-slate-800">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded bg-slate-950 flex items-center justify-center border border-slate-800">
                                                <Package className="w-6 h-6 text-slate-700" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white uppercase italic">{listing.productName}</h4>
                                                <p className="text-xs text-slate-500">{listing.category} | Stock: {listing.stock}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <div className="text-right">
                                                <span className="text-xs font-bold text-slate-600 uppercase block">Precio Unitario</span>
                                                <span className="font-black italic text-white">{formatCurrency(listing.price)}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary"><TrendingUp className="w-4 h-4" /></Button>
                                                <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary"><RefreshCw className="w-4 h-4" /></Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* RFQ Dialog */}
                <Dialog open={rfqDialogOpen} onOpenChange={setRfqDialogOpen}>
                    <DialogContent className="bg-slate-950 border-slate-800 max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black italic uppercase tracking-tight text-white">Solicitar Cotización</DialogTitle>
                            <DialogDescription>
                                Estás enviando una solicitud formal a <span className="text-primary font-bold">{selectedListing?.sellerName}</span>.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 pt-4">
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-500 uppercase">Producto</h4>
                                    <p className="text-lg font-black italic text-white">{selectedListing?.productName}</p>
                                </div>
                                <div className="text-right">
                                    <h4 className="text-sm font-bold text-slate-500 uppercase">Precio Ref.</h4>
                                    <p className="text-lg font-black italic text-primary">{formatCurrency(selectedListing?.price || 0)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase text-slate-500">Cantidad Solicitada</Label>
                                    <Input
                                        type="number"
                                        min={selectedListing?.minOrderQty || 1}
                                        className="bg-slate-900 border-slate-800 h-10"
                                        value={rfqQty}
                                        onChange={(e) => setRfqQty(parseInt(e.target.value))}
                                    />
                                    <p className="text-[10px] text-slate-500 italic">Mínimo: {selectedListing?.minOrderQty} unidades</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase text-slate-500">Precio Ofertado / Und</Label>
                                    <Input
                                        type="number"
                                        className="bg-slate-900 border-slate-800 h-10"
                                        value={rfqPrice / 100}
                                        onChange={(e) => setRfqPrice(parseFloat(e.target.value) * 100)}
                                    />
                                    <p className="text-[10px] text-slate-500 italic">Precios en MXN</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase text-slate-500">Términos Especiales / Notas</Label>
                                <Textarea
                                    placeholder="Incluye condiciones de entrega, plazos de pago, o especificaciones técnicas..."
                                    className="bg-slate-900 border-slate-800 min-h-[100px]"
                                    value={rfqTerms}
                                    onChange={(e) => setRfqTerms(e.target.value)}
                                />
                            </div>

                            <div className="pt-2 border-t border-slate-800">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Total Estimado de la Operación</span>
                                    <span className="text-2xl font-black italic text-white">{formatCurrency(rfqQty * rfqPrice)}</span>
                                </div>
                                <Button
                                    className="w-full h-12 font-black italic uppercase tracking-widest"
                                    onClick={() => submitRfqMutation.mutate({
                                        listingId: selectedListing?.id,
                                        qtyRequested: rfqQty,
                                        pricePerUnit: rfqPrice,
                                        terms: rfqTerms
                                    })}
                                    disabled={submitRfqMutation.isPending}
                                >
                                    {submitRfqMutation.isPending ? "Procesando RFQ..." : "Enviar Solicitud B2B Verificada"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

            </div>
        </AppLayout>
    );
}
