
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    PlayCircle,
    Edit,
    Copy,
    BrainCircuit,
    Trash2,
    MoreHorizontal,
    Share2,
    Database
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface SmartContextMenuProps {
    children: React.ReactNode;
    entityType: 'workflow' | 'employee' | 'product';
    entityId: string;
    title?: string;
    onDelete?: () => void;
}

export function SmartContextMenu({ children, entityType, entityId, title, onDelete }: SmartContextMenuProps) {
    const { toast } = useToast();
    const [_location, setLocation] = useLocation();

    const handleCopyId = () => {
        navigator.clipboard.writeText(entityId);
        toast({ title: "ID Copiado", description: entityId });
    };

    const handleSimulate = () => {
        if (entityType === 'workflow') {
            setLocation(`/workflow-editor?processId=${entityId}&mode=simulation`);
        } else {
            toast({ title: "Simulación no disponible", description: "Este objeto no es simulable aún." });
        }
    };

    const handleEdit = () => {
        if (entityType === 'workflow') {
            setLocation(`/workflow-editor?processId=${entityId}`);
        }
        // TODO: Add generic edit for others
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-64 bg-slate-900 border-slate-800 text-slate-200">
                <ContextMenuLabel className="text-xs text-slate-500 uppercase tracking-wider font-mono">
                    {title || "Acciones Inteligentes"}
                </ContextMenuLabel>
                <ContextMenuSeparator className="bg-slate-800" />

                {entityType === 'workflow' && (
                    <ContextMenuItem onClick={handleSimulate} className="focus:bg-indigo-500/20 focus:text-indigo-400 cursor-pointer">
                        <PlayCircle className="w-4 h-4 mr-2 text-indigo-400" />
                        Simular Flujo
                        <ContextMenuShortcut>⌘S</ContextMenuShortcut>
                    </ContextMenuItem>
                )}

                <ContextMenuItem onClick={handleEdit} className="focus:bg-slate-800 cursor-pointer">
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Diseño
                    <ContextMenuShortcut>⌘E</ContextMenuShortcut>
                </ContextMenuItem>

                <ContextMenuSub>
                    <ContextMenuSubTrigger className="focus:bg-slate-800 cursor-pointer">
                        <BrainCircuit className="w-4 h-4 mr-2 text-amber-500" />
                        Análisis IA
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-48 bg-slate-900 border-slate-800">
                        <ContextMenuItem className="focus:bg-slate-800 cursor-pointer">
                            Optimizar Proceso
                        </ContextMenuItem>
                        <ContextMenuItem className="focus:bg-slate-800 cursor-pointer">
                            Predecir Errores
                        </ContextMenuItem>
                    </ContextMenuSubContent>
                </ContextMenuSub>

                <ContextMenuSeparator className="bg-slate-800" />

                <ContextMenuItem onClick={handleCopyId} className="focus:bg-slate-800 cursor-pointer">
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar ID
                </ContextMenuItem>

                <ContextMenuItem className="focus:bg-slate-800 cursor-pointer">
                    <Database className="w-4 h-4 mr-2" />
                    Ver Atributos (JSON)
                </ContextMenuItem>

                {onDelete && (
                    <>
                        <ContextMenuSeparator className="bg-slate-800" />
                        <ContextMenuItem onClick={onDelete} className="text-red-500 focus:bg-red-900/20 focus:text-red-400 cursor-pointer">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                        </ContextMenuItem>
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
}
