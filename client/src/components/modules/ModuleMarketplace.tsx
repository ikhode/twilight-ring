import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Package,
    TrendingUp,
    DollarSign,
    UserCheck,
    BarChart3,
    Brain,
    MessageCircle,
    Search,
    Check,
    X,
    Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import * as LucideIcons from "lucide-react";

interface Module {
    id: string;
    name: string;
    description: string;
    longDescription: string;
    icon: string;
    category: string;
    route: string;
    features: string[];
    pricing: "included" | "premium";
    dependencies: string[];
    requiredRole: string;
    tags: string[];
    isActive?: boolean;
    activatedAt?: string;
}

const CATEGORY_ICONS: Record<string, any> = {
    operations: Package,
    sales: TrendingUp,
    finance: DollarSign,
    hr: UserCheck,
    analytics: BarChart3,
    ai: Brain,
    communication: MessageCircle
};

export function ModuleMarketplace() {
    const [modules, setModules] = useState<Module[]>([]);
    const [filteredModules, setFilteredModules] = useState<Module[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activating, setActivating] = useState<string | null>(null);
    const { toast } = useToast();
    const { session } = useAuth();

    useEffect(() => {
        if (session?.access_token) {
            loadModules();
        }
    }, [session]);

    useEffect(() => {
        filterModules();
    }, [modules, selectedCategory, searchQuery]);

    const loadModules = async () => {
        try {
            const response = await fetch("/api/modules/catalog", {
                headers: {
                    Authorization: `Bearer ${session?.access_token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setModules(data.modules || []);
            }
        } catch (error) {
            console.error("Failed to load modules:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const filterModules = () => {
        let filtered = modules;

        // Filter by category
        if (selectedCategory !== "all") {
            filtered = filtered.filter(m => m.category === selectedCategory);
        }

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(m =>
                m.name.toLowerCase().includes(query) ||
                m.description.toLowerCase().includes(query) ||
                m.tags.some(tag => tag.includes(query))
            );
        }

        setFilteredModules(filtered);
    };

    const toggleModule = async (module: Module) => {
        setActivating(module.id);

        try {
            const endpoint = module.isActive ? "deactivate" : "activate";
            const response = await fetch(`/api/modules/${module.id}/${endpoint}`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session?.access_token}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message);
            }

            toast({
                title: module.isActive ? "Módulo desactivado" : "Módulo activado",
                description: module.name
            });

            // Reload modules
            await loadModules();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setActivating(null);
        }
    };

    const getIcon = (iconName: string) => {
        const Icon = (LucideIcons as any)[iconName] || Package;
        return Icon;
    };

    const categories = [
        { id: "all", name: "Todos", icon: Package },
        { id: "operations", name: "Operaciones", icon: Package },
        { id: "sales", name: "Ventas & CRM", icon: TrendingUp },
        { id: "finance", name: "Finanzas", icon: DollarSign },
        { id: "hr", name: "RRHH", icon: UserCheck },
        { id: "analytics", name: "Analytics", icon: BarChart3 },
        { id: "ai", name: "IA", icon: Brain },
        { id: "communication", name: "Comunicación", icon: MessageCircle }
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold">Marketplace de Módulos</h2>
                <p className="text-muted-foreground">
                    Activa o desactiva módulos según las necesidades de tu negocio
                </p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar módulos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Category Tabs */}
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList className="w-full justify-start overflow-x-auto">
                    {categories.map((cat) => {
                        const Icon = cat.icon;
                        return (
                            <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
                                <Icon className="h-4 w-4" />
                                {cat.name}
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                <TabsContent value={selectedCategory} className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence>
                            {filteredModules.map((module) => {
                                const Icon = getIcon(module.icon);
                                return (
                                    <motion.div
                                        key={module.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                    >
                                        <Card className={`hover:border-primary/50 transition-all ${module.isActive ? "border-primary" : ""}`}>
                                            <CardHeader>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${module.isActive
                                                            ? "bg-primary/10 border-2 border-primary"
                                                            : "bg-muted"
                                                            }`}>
                                                            <Icon className={`h-6 w-6 ${module.isActive ? "text-primary" : "text-muted-foreground"}`} />
                                                        </div>
                                                        <div>
                                                            <CardTitle className="text-lg">{module.name}</CardTitle>
                                                            {module.isActive && (
                                                                <Badge variant="default" className="mt-1">
                                                                    <Check className="h-3 w-3 mr-1" />
                                                                    Activo
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Switch
                                                        checked={module.isActive}
                                                        onCheckedChange={() => toggleModule(module)}
                                                        disabled={activating === module.id}
                                                    />
                                                </div>
                                                <CardDescription className="mt-2">
                                                    {module.description}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        {module.pricing === "premium" && (
                                                            <Badge variant="secondary">Premium</Badge>
                                                        )}
                                                        {module.dependencies.length > 0 && (
                                                            <Badge variant="outline">
                                                                Requiere {module.dependencies.length} módulo(s)
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full"
                                                        onClick={() => setSelectedModule(module)}
                                                    >
                                                        Ver Detalles
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {filteredModules.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">
                                No se encontraron módulos con esos criterios
                            </p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Module Details Dialog */}
            <Dialog open={!!selectedModule} onOpenChange={() => setSelectedModule(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    {selectedModule && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    {(() => {
                                        const Icon = getIcon(selectedModule.icon);
                                        return <Icon className="h-8 w-8 text-primary" />;
                                    })()}
                                    <DialogTitle className="text-2xl">{selectedModule.name}</DialogTitle>
                                </div>
                                <DialogDescription>{selectedModule.longDescription}</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                {/* Features */}
                                <div>
                                    <h4 className="font-semibold mb-2">Características</h4>
                                    <ul className="space-y-2">
                                        {selectedModule.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                                <span className="text-sm">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Dependencies */}
                                {selectedModule.dependencies.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-2">Dependencias</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Este módulo requiere que los siguientes módulos estén activos:
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {selectedModule.dependencies.map((depId) => {
                                                const depModule = modules.find(m => m.id === depId);
                                                return (
                                                    <Badge key={depId} variant="outline">
                                                        {depModule?.name || depId}
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Action Button */}
                                <Button
                                    className="w-full"
                                    onClick={() => {
                                        toggleModule(selectedModule);
                                        setSelectedModule(null);
                                    }}
                                    disabled={activating === selectedModule.id}
                                    variant={selectedModule.isActive ? "destructive" : "default"}
                                >
                                    {activating === selectedModule.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : selectedModule.isActive ? (
                                        <X className="h-4 w-4 mr-2" />
                                    ) : (
                                        <Check className="h-4 w-4 mr-2" />
                                    )}
                                    {selectedModule.isActive ? "Desactivar Módulo" : "Activar Módulo"}
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
