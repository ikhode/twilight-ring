import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Database,
    Send,
    Loader2,
    Code,
    Download,
    Lightbulb,
    Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface QueryResult {
    query: string;
    sql: string;
    explanation: string;
    results: any[];
    rowCount: number;
    executionTime: number;
    confidence: number;
    suggestions?: string[];
}

export function NLQueryPanel() {
    const [query, setQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<QueryResult | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSQL, setShowSQL] = useState(false);
    const { toast } = useToast();
    const { session } = useAuth();

    useEffect(() => {
        loadSuggestions();
    }, []);

    const loadSuggestions = async () => {
        try {
            const response = await fetch("/api/nl-query/suggestions", {
                headers: {
                    Authorization: `Bearer ${session?.access_token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setSuggestions(data.suggestions || []);
            }
        } catch (error) {
            console.error("Failed to load suggestions:", error);
        }
    };

    const executeQuery = async (queryText?: string) => {
        const finalQuery = queryText || query;
        if (!finalQuery.trim()) return;

        setIsLoading(true);
        setResult(null);

        try {
            const response = await fetch("/api/nl-query", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ query: finalQuery })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Error ejecutando consulta");
            }

            const data = await response.json();
            setResult(data);

            toast({
                title: "Consulta ejecutada",
                description: `${data.rowCount} resultado(s) en ${data.executionTime}ms`
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const exportToCSV = () => {
        if (!result || result.results.length === 0) return;

        const headers = Object.keys(result.results[0]);
        const csvContent = [
            headers.join(","),
            ...result.results.map(row =>
                headers.map(header => {
                    const value = row[header];
                    return typeof value === "string" && value.includes(",")
                        ? `"${value}"`
                        : value;
                }).join(",")
            )
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `query-results-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            executeQuery();
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                        <Database className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Consultas en Lenguaje Natural</h2>
                        <p className="text-muted-foreground">Pregunta sobre tus datos en español</p>
                    </div>
                </div>
            </div>

            {/* Query Input */}
            <Card>
                <CardHeader>
                    <CardTitle>Haz una pregunta</CardTitle>
                    <CardDescription>
                        Escribe tu pregunta en español y obtendrás datos en tiempo real
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Ej: ¿Cuántos productos tenemos en inventario?"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={isLoading}
                            className="flex-1"
                        />
                        <Button
                            onClick={() => executeQuery()}
                            disabled={!query.trim() || isLoading}
                            className="bg-gradient-to-r from-blue-600 to-purple-600"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>

                    {/* Suggestions */}
                    {suggestions.length > 0 && !result && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Lightbulb className="h-4 w-4" />
                                <span>Sugerencias:</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {suggestions.map((suggestion, idx) => (
                                    <Button
                                        key={idx}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setQuery(suggestion);
                                            executeQuery(suggestion);
                                        }}
                                        className="text-xs"
                                    >
                                        {suggestion}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Results */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Resultados</CardTitle>
                                        <CardDescription className="flex items-center gap-4 mt-2">
                                            <span>{result.rowCount} fila(s)</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {result.executionTime}ms
                                            </span>
                                            <Badge variant="outline">
                                                Confianza: {(result.confidence * 100).toFixed(0)}%
                                            </Badge>
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowSQL(!showSQL)}
                                        >
                                            <Code className="h-4 w-4 mr-2" />
                                            {showSQL ? "Ocultar" : "Ver"} SQL
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={exportToCSV}
                                            disabled={result.results.length === 0}
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Exportar CSV
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="table">
                                    <TabsList>
                                        <TabsTrigger value="table">Tabla</TabsTrigger>
                                        {showSQL && <TabsTrigger value="sql">SQL</TabsTrigger>}
                                    </TabsList>

                                    <TabsContent value="table" className="space-y-4">
                                        {/* Explanation */}
                                        <div className="p-3 rounded-lg bg-muted">
                                            <p className="text-sm">{result.explanation}</p>
                                        </div>

                                        {/* Results Table */}
                                        {result.results.length > 0 ? (
                                            <ScrollArea className="h-[400px] rounded-md border">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            {Object.keys(result.results[0]).map((header) => (
                                                                <TableHead key={header} className="font-bold">
                                                                    {header}
                                                                </TableHead>
                                                            ))}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {result.results.map((row, idx) => (
                                                            <TableRow key={idx}>
                                                                {Object.values(row).map((value: any, cellIdx) => (
                                                                    <TableCell key={cellIdx}>
                                                                        {value === null ? (
                                                                            <span className="text-muted-foreground italic">null</span>
                                                                        ) : typeof value === "object" ? (
                                                                            JSON.stringify(value)
                                                                        ) : (
                                                                            String(value)
                                                                        )}
                                                                    </TableCell>
                                                                ))}
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </ScrollArea>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                No se encontraron resultados
                                            </div>
                                        )}

                                        {/* Follow-up Suggestions */}
                                        {result.suggestions && result.suggestions.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium">Preguntas de seguimiento:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {result.suggestions.map((suggestion, idx) => (
                                                        <Button
                                                            key={idx}
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setQuery(suggestion);
                                                                executeQuery(suggestion);
                                                            }}
                                                        >
                                                            {suggestion}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </TabsContent>

                                    {showSQL && (
                                        <TabsContent value="sql">
                                            <div className="space-y-4">
                                                <div className="p-4 rounded-lg bg-slate-950 border">
                                                    <pre className="text-sm text-green-400 font-mono overflow-x-auto">
                                                        {result.sql}
                                                    </pre>
                                                </div>
                                            </div>
                                        </TabsContent>
                                    )}
                                </Tabs>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
