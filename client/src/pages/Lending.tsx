import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
    Landmark,
    Plus,
    Users,
    TrendingUp,
    Clock,
    CheckCircle2,
    AlertCircle,
    FileText,
    History,
    PieChart,
    Search,
    Shield,
    FileUp,
    AlertTriangle,
    Check,
    Briefcase
} from "lucide-react";
import { creditRiskCalculator } from "@/services/ai/risk_calculator";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CognitiveButton } from "@/components/ui/CognitiveButton";
import { StatCard } from "@/components/shared/StatCard";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";

import { AppLayout } from "@/components/layout/AppLayout";
import { LoanApplicationWizard } from "@/components/lending/LoanApplicationWizard";
import { CollectionsBoard } from "@/components/lending/CollectionsBoard";

export default function Lending() {
    const { session } = useAuth();
    const { toast } = useToast();
    const [isAppDialogOpen, setIsAppDialogOpen] = useState(false);

    // Queries
    const { data: loans, isLoading: loansLoading } = useQuery<any[]>({
        queryKey: ["/api/lending/loans"],
        enabled: !!session,
    });

    const { data: applications, isLoading: appsLoading } = useQuery<any[]>({
        queryKey: ["/api/lending/applications"],
        enabled: !!session,
    });

    const { data: dashboardStats } = useQuery<any>({
        queryKey: ["/api/lending/stats"],
        enabled: !!session,
    });

    // Mutations
    const approveApplicationMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            await apiRequest("PATCH", `/api/lending/applications/${id}`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/lending/applications"] });
            queryClient.invalidateQueries({ queryKey: ["/api/lending/loans"] });
            queryClient.invalidateQueries({ queryKey: ["/api/lending/stats"] });
            toast({ title: "Estado actualizado", description: "La solicitud ha sido procesada." });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const stats = [
        {
            title: "Cartera Total",
            value: dashboardStats?.portfolioTotal !== undefined
                ? `$${(dashboardStats.portfolioTotal / 100).toLocaleString()}`
                : "$0",
            description: "Balance total activos",
            icon: Landmark,
            trend: 0,
            helpText: "Suma total de capital pendiente de cobro."
        },
        {
            title: "Solicitudes",
            value: dashboardStats?.pendingApplications?.toString() || "0",
            description: "En evaluación",
            icon: FileText,
            trend: 0,
            helpText: "Solicitudes que aún no han sido aprobadas o rechazadas."
        },
        {
            title: "Recuperación",
            value: `${dashboardStats?.recoveryRate || 0}%`,
            description: "Pagos a tiempo",
            icon: TrendingUp,
            trend: 0,
            helpText: "Porcentaje de recuperación de pagos."
        },
        {
            title: "En Mora",
            value: dashboardStats?.overduePayments?.toString() || "0",
            description: "Cobros vencidos",
            icon: AlertCircle,
            trend: 0,
            variant: "destructive" as const,
            helpText: "Número de cobros vencidos."
        }
    ];

    return (
        <AppLayout title="Crédito y Cobranza" subtitle="Evaluación AI y Gestión de Cartera">
            <div className="p-6 space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Crédito y Cobranza
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm font-medium">
                            Máxima Complejidad: Evaluación AI, Amortización Francesa y Gestión de Mora.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Dialog open={isAppDialogOpen} onOpenChange={setIsAppDialogOpen}>
                            <DialogTrigger asChild>
                                <CognitiveButton>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nueva Solicitud
                                </CognitiveButton>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[700px] p-0 bg-transparent border-none shadow-none">
                                <LoanApplicationWizard onComplete={() => setIsAppDialogOpen(false)} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat) => (
                        <StatCard
                            key={stat.title}
                            title={stat.title}
                            value={stat.value}
                            description={stat.description}
                            icon={stat.icon}
                            trend={stat.trend}
                            helpText={stat.helpText}
                            variant={stat.variant}
                        />
                    ))}
                </div>

                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList className="bg-card border p-1 rounded-xl">
                        <TabsTrigger value="overview" className="rounded-lg">Dashboard</TabsTrigger>
                        <TabsTrigger value="applications" className="rounded-lg">Solicitudes</TabsTrigger>
                        <TabsTrigger value="portfolio" className="rounded-lg">Cartera Activa</TabsTrigger>
                        <TabsTrigger value="collections" className="rounded-lg flex items-center gap-2">
                            <Briefcase className="h-3.5 w-3.5" /> Cobranza (Aging)
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card className="md:col-span-2 border-primary/10 shadow-sm overflow-hidden group">
                                <CardHeader>
                                    <CardTitle>Evaluación de Riesgo AI</CardTitle>
                                    <CardDescription>Principales solicitudes esperando aprobación de gerente.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Cliente</TableHead>
                                                <TableHead>Monto</TableHead>
                                                <TableHead>Riesgo AI</TableHead>
                                                <TableHead>Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {applications?.filter(a => a.status === 'pending').slice(0, 5).map((app) => (
                                                <TableRow key={app.id}>
                                                    <TableCell className="font-medium">{app.customer?.name}</TableCell>
                                                    <TableCell>${(app.requestedAmount / 100).toLocaleString()}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`h-2 w-12 rounded-full ${app.riskScore < 40 ? 'bg-emerald-500' : app.riskScore < 70 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                                            <span className="text-xs font-bold">{app.riskScore}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            <CognitiveButton
                                                                size="sm"
                                                                onClick={() => approveApplicationMutation.mutate({ id: app.id, status: 'active' })}
                                                            >
                                                                <Check className="h-3 w-3 mr-1" /> Aprobar
                                                            </CognitiveButton>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            <Card className="border-primary/10 shadow-sm overflow-hidden group">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Alertas de Cobro</CardTitle>
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4 pt-4">
                                        <div className="flex items-start gap-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                            <AlertTriangle className="h-4 w-4 text-red-500 mt-1" />
                                            <div>
                                                <p className="text-xs font-bold text-red-500">3 Pagos Vencidos (90+ Días)</p>
                                                <p className="text-[10px] text-muted-foreground">Requieren escalación inmediata.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                            <Clock className="h-4 w-4 text-yellow-500 mt-1" />
                                            <div>
                                                <p className="text-xs font-bold text-yellow-500">Recordatorios Enviados</p>
                                                <p className="text-[10px] text-muted-foreground">8 clientes notificados vía SMS/Email.</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="applications">
                        <Card className="border-primary/10 shadow-sm">
                            <CardHeader>
                                <CardTitle>Bandeja de Entrada de Solicitudes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Folio</TableHead>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Monto</TableHead>
                                            <TableHead>Plazo</TableHead>
                                            <TableHead>Riesgo</TableHead>
                                            <TableHead>Estatus</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {applications?.map((app) => (
                                            <TableRow key={app.id}>
                                                <TableCell className="text-[10px] font-mono">{app.id.substring(0, 8)}</TableCell>
                                                <TableCell className="font-medium">{app.customer?.name}</TableCell>
                                                <TableCell>${(app.requestedAmount / 100).toLocaleString()}</TableCell>
                                                <TableCell>{app.requestedTermMonths} meses</TableCell>
                                                <TableCell><Badge variant="outline">{app.riskScore}</Badge></TableCell>
                                                <TableCell>
                                                    <Badge className={app.status === 'active' ? "bg-emerald-500" : ""}>
                                                        {app.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="collections">
                        <Card className="border-primary/10 shadow-sm bg-card/30 backdrop-blur-md">
                            <CardHeader className="border-b bg-muted/30">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>Muro de Cobranza (Aging Wall)</CardTitle>
                                        <CardDescription>Seguimiento de mora por antigüedad y asignación de agentes.</CardDescription>
                                    </div>
                                    <CognitiveButton
                                        variant="outline"
                                        size="sm"
                                        onClick={() => apiRequest('POST', '/api/lending/collections/sync')}
                                    >
                                        Sincronizar Mora
                                    </CognitiveButton>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <CollectionsBoard />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
