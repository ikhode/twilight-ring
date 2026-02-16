import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Bot,
    FileText,
    MessageSquare,
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    Search,
    TrendingUp,
    Users,
    BookOpen,
    ListTodo,
    ShieldCheck,
    Globe,
    Clock,
    Monitor,
    Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ImplementationChecklist } from "./ImplementationChecklist";
import { useAuth } from "@/hooks/use-auth";

interface Agent {
    id: string;
    role: string;
    name: string;
    description: string;
    systemPrompt: string;
    knowledgeScope: string[];
    capabilities: string[];
}

interface Document {
    id: string;
    category: string;
    title: string;
    content: string;
    tags: string[];
    accessRoles: string[];
}

interface ChatStats {
    totalConversations: number;
    totalMessages: number;
    activeUsers: number;
    avgConfidence: number;
    topQueries: Array<{ query: string; count: number }>;
}

interface AuditLog {
    id: string;
    action: string;
    resourceId: string;
    timestamp: string;
    details: any;
    clientIp: string | null;
    userAgent: string | null;
    user?: {
        name: string;
        email: string;
    } | null;
}

export function AdminPanel() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [stats, setStats] = useState<ChatStats | null>(null);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const { toast } = useToast();
    const { session } = useAuth();

    useEffect(() => {
        loadAgents();
        loadDocuments();
        loadStats();
        loadAuditLogs();
    }, []);

    const loadAgents = async () => {
        try {
            const response = await fetch("/api/admin/agents", {
                headers: {
                    Authorization: `Bearer ${session?.access_token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setAgents(data.agents || []);
            }
        } catch (error) {
            console.error("Failed to load agents:", error);
        }
    };

    const loadDocuments = async () => {
        try {
            const response = await fetch("/api/documentation", {
                headers: {
                    Authorization: `Bearer ${session?.access_token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setDocuments(data.documents || []);
            }
        } catch (error) {
            console.error("Failed to load documents:", error);
        }
    };

    const loadStats = async () => {
        try {
            const response = await fetch("/api/admin/chat-stats", {
                headers: {
                    Authorization: `Bearer ${session?.access_token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Failed to load stats:", error);
        }
    };

    const loadAuditLogs = async () => {
        try {
            setIsLoadingLogs(true);
            const response = await fetch("/api/admin/audit-logs", {
                headers: {
                    Authorization: `Bearer ${session?.access_token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setAuditLogs(data.logs || []);
            }
        } catch (error) {
            console.error("Failed to load audit logs:", error);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const saveDocument = async (doc: Partial<Document>) => {
        try {
            const url = doc.id ? `/api/documentation/${doc.id}` : "/api/documentation";
            const method = doc.id ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify(doc)
            });

            if (response.ok) {
                toast({
                    title: "Éxito",
                    description: `Documento ${doc.id ? "actualizado" : "creado"} correctamente`
                });
                loadDocuments();
                setSelectedDoc(null);
                setIsEditing(false);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo guardar el documento",
                variant: "destructive"
            });
        }
    };

    const deleteDocument = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este documento?")) return;

        try {
            const response = await fetch(`/api/documentation/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${session?.access_token}`
                }
            });

            if (response.ok) {
                toast({
                    title: "Éxito",
                    description: "Documento eliminado correctamente"
                });
                loadDocuments();
                setSelectedDoc(null);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo eliminar el documento",
                variant: "destructive"
            });
        }
    };

    const filteredDocuments = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Panel de Administración</h1>
                    <p className="text-muted-foreground">Gestiona agentes de IA y documentación</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conversaciones</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalConversations || 0}</div>
                        <p className="text-xs text-muted-foreground">Total de chats</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mensajes</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalMessages || 0}</div>
                        <p className="text-xs text-muted-foreground">Interacciones totales</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.activeUsers || 0}</div>
                        <p className="text-xs text-muted-foreground">Últimos 7 días</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Confianza Promedio</CardTitle>
                        <Bot className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.avgConfidence ? `${(stats.avgConfidence * 100).toFixed(1)}%` : "N/A"}
                        </div>
                        <p className="text-xs text-muted-foreground">Score de IA</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="agents" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="agents">
                        <Bot className="h-4 w-4 mr-2" />
                        Agentes
                    </TabsTrigger>
                    <TabsTrigger value="documentation">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Documentación
                    </TabsTrigger>
                    <TabsTrigger value="analytics">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Analytics
                    </TabsTrigger>
                    <TabsTrigger value="checklist">
                        <ListTodo className="h-4 w-4 mr-2" />
                        Checklist
                    </TabsTrigger>
                    <TabsTrigger value="audit">
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Audit Trail
                    </TabsTrigger>
                </TabsList>

                {/* Agents Tab */}
                <TabsContent value="agents" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {agents.map((agent) => (
                            <motion.div
                                key={agent.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <Bot className="h-8 w-8 text-primary" />
                                            <Badge>{agent.role}</Badge>
                                        </div>
                                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                                        <CardDescription>{agent.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground mb-1">
                                                    Capacidades
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    {agent.capabilities.slice(0, 3).map((cap, idx) => (
                                                        <Badge key={idx} variant="outline" className="text-xs">
                                                            {cap}
                                                        </Badge>
                                                    ))}
                                                    {agent.capabilities.length > 3 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            +{agent.capabilities.length - 3}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </TabsContent>

                {/* Documentation Tab */}
                <TabsContent value="documentation" className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar documentación..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Button onClick={() => {
                            setSelectedDoc({
                                id: "",
                                category: "tutorial",
                                title: "",
                                content: "",
                                tags: [],
                                accessRoles: ["admin", "manager", "user", "viewer"]
                            });
                            setIsEditing(true);
                        }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Documento
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Document List */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Documentos ({filteredDocuments.length})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[500px]">
                                    <div className="space-y-2">
                                        {filteredDocuments.map((doc) => (
                                            <div
                                                key={doc.id}
                                                onClick={() => {
                                                    setSelectedDoc(doc);
                                                    setIsEditing(false);
                                                }}
                                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedDoc?.id === doc.id
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border hover:border-primary/50"
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                                            <h4 className="font-semibold text-sm">{doc.title}</h4>
                                                        </div>
                                                        <div className="flex gap-1 flex-wrap">
                                                            <Badge variant="outline" className="text-xs">
                                                                {doc.category}
                                                            </Badge>
                                                            {doc.tags.slice(0, 2).map((tag, idx) => (
                                                                <Badge key={idx} variant="secondary" className="text-xs">
                                                                    {tag}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Document Editor */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>
                                        {isEditing ? "Editar Documento" : "Vista Previa"}
                                    </CardTitle>
                                    {selectedDoc && (
                                        <div className="flex gap-2">
                                            {!isEditing ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setIsEditing(true)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => deleteDocument(selectedDoc.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => saveDocument(selectedDoc)}
                                                    >
                                                        <Save className="h-4 w-4 mr-2" />
                                                        Guardar
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setIsEditing(false)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {selectedDoc ? (
                                    <ScrollArea className="h-[500px]">
                                        <div className="space-y-4">
                                            {isEditing ? (
                                                <>
                                                    <div>
                                                        <label className="text-sm font-medium">Título</label>
                                                        <Input
                                                            value={selectedDoc.title}
                                                            onChange={(e) =>
                                                                setSelectedDoc({ ...selectedDoc, title: e.target.value })
                                                            }
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium">Categoría</label>
                                                        <Input
                                                            value={selectedDoc.category}
                                                            onChange={(e) =>
                                                                setSelectedDoc({ ...selectedDoc, category: e.target.value })
                                                            }
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium">Contenido</label>
                                                        <Textarea
                                                            value={selectedDoc.content}
                                                            onChange={(e) =>
                                                                setSelectedDoc({ ...selectedDoc, content: e.target.value })
                                                            }
                                                            rows={15}
                                                            className="font-mono text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium">
                                                            Tags (separados por coma)
                                                        </label>
                                                        <Input
                                                            value={selectedDoc.tags.join(", ")}
                                                            onChange={(e) =>
                                                                setSelectedDoc({
                                                                    ...selectedDoc,
                                                                    tags: e.target.value.split(",").map((t) => t.trim())
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div>
                                                        <h3 className="text-xl font-bold mb-2">{selectedDoc.title}</h3>
                                                        <div className="flex gap-2 mb-4">
                                                            <Badge>{selectedDoc.category}</Badge>
                                                            {selectedDoc.tags.map((tag, idx) => (
                                                                <Badge key={idx} variant="secondary">
                                                                    {tag}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                                        <pre className="whitespace-pre-wrap text-sm">
                                                            {selectedDoc.content}
                                                        </pre>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium mb-2">Roles con acceso:</p>
                                                        <div className="flex gap-2">
                                                            {selectedDoc.accessRoles.map((role, idx) => (
                                                                <Badge key={idx} variant="outline">
                                                                    {role}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </ScrollArea>
                                ) : (
                                    <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                                        <div className="text-center">
                                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p>Selecciona un documento para ver o editar</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Queries Más Frecuentes</CardTitle>
                            <CardDescription>Top 10 preguntas de usuarios</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {stats?.topQueries?.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-3 rounded-lg border"
                                    >
                                        <span className="text-sm">{item.query}</span>
                                        <Badge>{item.count} veces</Badge>
                                    </div>
                                )) || (
                                        <p className="text-muted-foreground text-center py-8">
                                            No hay datos disponibles
                                        </p>
                                    )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Checklist Tab */}
                <TabsContent value="checklist" className="space-y-4">
                    <ImplementationChecklist />
                </TabsContent>

                {/* Audit Trail Tab */}
                <TabsContent value="audit" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Bitácora de Auditoría (Audit Trail)</CardTitle>
                                    <CardDescription>Registro inmutable de acciones críticas del sistema</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={loadAuditLogs} disabled={isLoadingLogs}>
                                    <Clock className={`h-4 w-4 mr-2 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                                    Actualizar
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px] pr-4">
                                <div className="space-y-4">
                                    {auditLogs.length === 0 ? (
                                        <div className="py-20 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                                            <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                            <p>No se encontraron registros de auditoría.</p>
                                        </div>
                                    ) : (
                                        auditLogs.map((log) => (
                                            <div key={log.id} className="p-4 rounded-lg border bg-card hover:border-primary/50 transition-all">
                                                <div className="flex flex-wrap items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-[200px]">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Badge variant={log.action.includes('DELETE') ? 'destructive' : 'default'} className="font-mono text-[10px]">
                                                                {log.action}
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground flex items-center">
                                                                <Clock className="h-3 w-3 mr-1" />
                                                                {new Date(log.timestamp).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <h4 className="font-semibold text-sm mb-1">
                                                            {log.details?.message || `Acción en recurso: ${log.resourceId}`}
                                                        </h4>
                                                        <div className="flex flex-wrap gap-4 mt-3">
                                                            <div className="flex items-center text-xs text-muted-foreground">
                                                                <Users className="h-3 w-3 mr-1.5" />
                                                                {log.user?.name || 'Sistema'} ({log.user?.email || 'N/A'})
                                                            </div>
                                                            {log.clientIp && (
                                                                <div className="flex items-center text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/50">
                                                                    <Globe className="h-3 w-3 mr-1.5" />
                                                                    IP: {log.clientIp}
                                                                </div>
                                                            )}
                                                            {log.userAgent && (
                                                                <div className="flex items-center text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/50 max-w-[300px] truncate" title={log.userAgent}>
                                                                    <Monitor className="h-3 w-3 mr-1.5" />
                                                                    UA: {log.userAgent.split(')')[0] + ')'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {log.details && Object.keys(log.details).length > 1 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 text-[10px]"
                                                            onClick={() => {
                                                                // Future: Expandable details JSON viewer
                                                                console.log("Details:", log.details);
                                                            }}
                                                        >
                                                            <Info className="h-3 w-3 mr-1" />
                                                            Detalles JSON
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
