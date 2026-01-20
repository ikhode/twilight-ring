
import { useState, useEffect } from "react";
import { Search, Loader2, Sparkles, Command } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AliveValue } from "./AliveValue";
import { useConfiguration } from "@/context/ConfigurationContext";
import { Button } from "@/components/ui/button";

interface SearchResult {
    id: string;
    title: string;
    subtitle: string;
    similarity: number;
    entityType: string;
}

export function SemanticSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { themeColor } = useConfiguration();

    // Toggle with Cmd+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const handleSearch = async (val: string) => {
        setQuery(val);
        if (val.length < 3) return;

        setIsLoading(true);
        try {
            const res = await fetch("/api/search/semantic", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: val }),
            });
            const data = await res.json();
            setResults(data.results || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Button
                variant="outline"
                className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2 text-muted-foreground mr-2"
                onClick={() => setIsOpen(true)}
            >
                <Search className="h-4 w-4 xl:mr-2" />
                <span className="hidden xl:inline-flex">Búsqueda Semántica...</span>
                <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
                    <span className="text-xs">Ctrl</span>K
                </kbd>
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="p-0 overflow-hidden max-w-2xl bg-background/80 backdrop-blur-xl border-primary/20">
                    <div className="flex items-center border-b px-3">
                        <Sparkles className="mr-2 h-4 w-4 shrink-0 overflow-hidden text-primary animate-pulse" />
                        <Input
                            className={cn(
                                "flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus-visible:ring-0"
                            )}
                            placeholder="Pregunta algo (ej. 'Problemas con proveedores recientes')..."
                            value={query}
                            onChange={(e) => handleSearch(e.target.value)}
                            autoFocus
                        />
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>

                    <div className="max-h-[300px] overflow-y-auto p-2">
                        {results.length === 0 && query.length > 2 && !isLoading && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                No encontré nada relevante en la base de conocimiento vectorial.
                            </div>
                        )}

                        {results.map((result) => (
                            <div
                                key={result.id}
                                className="flex flex-col gap-1 p-3 rounded-md hover:bg-muted/50 cursor-pointer transition-colors group"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium flex items-center gap-2">
                                        {result.title}
                                        <Badge variant="outline" className="text-[10px] h-5">{result.entityType}</Badge>
                                    </span>
                                    <span className="text-xs font-mono text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                        {(result.similarity * 100).toFixed(0)}% Match
                                    </span>
                                </div>
                                <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                            </div>
                        ))}

                        {query.length === 0 && (
                            <div className="py-12 text-center">
                                <Command className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    El motor semántico buscará en productos, procesos y logs.
                                </p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
