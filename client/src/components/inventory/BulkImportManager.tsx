import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export function BulkImportManager() {
    const { toast } = useToast();
    const [jsonInput, setJsonInput] = useState("");

    // Simple CSV to JSON parser just for UI demo purposes if pasted
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            // Basic CSV Parse: Assume Header Row, Comma separated
            try {
                const lines = text.split('\n');
                const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                const result = [];
                setJsonInput(text);
                toast({ title: "Archivo cargado", description: "El contenido ha sido volcado en el editor para revisión." });
            } catch (err) {
                toast({ variant: "destructive", title: "Error al leer archivo" });
            }
        };
        reader.readAsText(file);
    };

    const importMutation = useMutation({
        mutationFn: async (jsonText: string) => {
            let items;
            try {
                items = JSON.parse(jsonText);
            } catch (e) {
                // If it's CSV-like, try to parse
                const lines = jsonText.split('\n');
                const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '')); // Naive
                items = lines.slice(1).filter(l => l.trim()).map(line => {
                    const vals = line.split(',');
                    const obj: any = {};
                    headers.forEach((h, i) => obj[h] = vals[i]?.trim().replace(/^"|"$/g, ''));
                    return obj;
                });
            }

            if (!Array.isArray(items)) throw new Error("Format invalid. Must be array of objects.");

            const res = await fetch("/api/inventory/import/json", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items })
            });
            return res.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Importación completada",
                description: `Exitosos: ${data.success}, Errores: ${data.errors}`
            });
        },
        onError: (err) => {
            toast({ variant: "destructive", title: "Error de Importación", description: String(err) });
        }
    });

    return (
        <div className="grid md:grid-cols-2 gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Importar Productos</CardTitle>
                    <CardDescription>Sube un archivo CSV o pega JSON directamente.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="file">Archivo CSV</Label>
                        <Input id="file" type="file" accept=".csv,.json,.txt" onChange={handleFileUpload} />
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        <p className="font-semibold mb-1">Formato CSV Esperado:</p>
                        <code>name,price,cost,stock,sku,category</code>
                    </div>
                    <Button onClick={() => importMutation.mutate(jsonInput)} disabled={importMutation.isPending || !jsonInput}>
                        {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Procesar Importación
                    </Button>
                </CardContent>
            </Card>

            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>Editor de Carga</CardTitle>
                    <CardDescription>Verifica o edita los datos antes de procesar.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                    <Textarea
                        className="h-full min-h-[300px] font-mono text-xs"
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder={`[\n  {"name": "Producto A", "price": 100, "stock": 50},\n  {"name": "Producto B", "price": 200, "stock": 20}\n]`}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
