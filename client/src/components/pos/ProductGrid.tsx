import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Plus, Camera } from "lucide-react";
import { ScannerDialog } from "./ScannerDialog";

interface Product {
    id: string; // or number, based on schema (looks like string uuid from earlier schema view, but Sales.tsx uses number for id in CartItem?)
    // Wait, schema says products.id is uuid (varchar). Sales.tsx CartItem says id: number. Discrepancy?
    // Let's check Sales.tsx line 223: interface CartItem { id: number; ... }
    // But schema sales.productId is varchar.
    // schema.ts: id: varchar("id").primaryKey()
    // This might be a latent bug or I misread Sales.tsx types.
    // In line 572: .map((p: any) => ({ ...p, ... })) 
    // If the DB returns UUIDs, Typescript might be ignored if using 'any'.
    // I should probably use string for ID to be safe, or 'string | number'.
    name: string;
    price: number;
    stock: number;
    sku?: string;
    image?: string;
    category?: string;
    status: "active" | "critical" | "low" | "available";
}

interface ProductGridProps {
    products: Product[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    addToCart: (product: Product) => void;
    onScan: (code: string) => void;
}

export function ProductGrid({ products, searchQuery, setSearchQuery, addToCart, onScan }: ProductGridProps) {
    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="font-display">Productos</CardTitle>
                    <div className="flex flex-1 gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre, código o SKU..."
                                className="pl-9 bg-background"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <ScannerDialog onScan={onScan} />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-4">
                {products.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {products.map((product) => (
                            <Button
                                key={product.id}
                                variant="outline"
                                className="h-auto flex flex-col items-start p-4 space-y-2 hover:border-primary hover:bg-muted/50 whitespace-normal text-left group relative overflow-hidden"
                                onClick={() => addToCart(product)}
                            >
                                <div className="w-full flex justify-between items-start">
                                    <Badge variant="secondary" className="mb-2 text-[10px] uppercase tracking-wider opacity-70">
                                        {product.category || "General"}
                                    </Badge>
                                    {product.status === "critical" && (
                                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                    )}
                                </div>

                                <div className="space-y-1 w-full">
                                    <div className="font-semibold leading-tight line-clamp-2 min-h-[2.5rem]">
                                        {product.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        SKU: {product.sku || "N/A"}
                                    </div>
                                </div>

                                <div className="w-full pt-2 mt-auto border-t border-dashed flex items-center justify-between">
                                    <span className="font-mono font-bold text-lg">
                                        ${product.price.toFixed(2)}
                                    </span>
                                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                </div>

                                {/* Stock Indicator overlay */}
                                <div className={`absolute bottom-0 left-0 h-1 transition-all ${product.status === 'critical' ? 'bg-red-500 w-full' :
                                        product.status === 'low' ? 'bg-amber-500 w-1/2' :
                                            'bg-green-500 w-full opacity-20'
                                    }`} />
                            </Button>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-semibold text-lg">No se encontraron productos</h3>
                            <p className="text-muted-foreground max-w-sm">
                                {searchQuery
                                    ? "Intenta con otros términos de búsqueda."
                                    : "El inventario está vacío. Comienza creando tus productos."}
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
