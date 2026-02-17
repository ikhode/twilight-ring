
import { Loader2 } from "lucide-react";

export function PageLoader() {
    return (
        <div className="flex h-[50vh] w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Cargando...</span>
            </div>
        </div>
    );
}
