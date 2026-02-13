import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, Settings2 } from "lucide-react";
import { useCustomModel, MODEL_CONFIGS } from "@/hooks/useCustomModel";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type ModelType = 'coco' | 'agriculture' | 'warehouse' | 'safety' | 'fleet';

interface ModelSelectorProps {
    currentModel: ModelType;
    onModelChange: (model: ModelType) => void;
    isLoading?: boolean;
}

const MODEL_INFO: Record<ModelType, {
    name: string;
    description: string;
    icon: string;
    useCase: string;
}> = {
    coco: {
        name: 'COCO-SSD (Genérico)',
        description: 'Modelo pre-entrenado con 90 clases de objetos comunes',
        icon: '🌐',
        useCase: 'Uso general, personas, vehículos, objetos cotidianos'
    },
    agriculture: {
        name: 'Agricultura & Productos',
        description: 'Detección de cocos, tarimas, sacos y cajas',
        icon: '🥥',
        useCase: 'Conteo de productos agrícolas, inventario de almacén'
    },
    warehouse: {
        name: 'Almacén & Logística',
        description: 'Pallets, contenedores, montacargas, estantes',
        icon: '📦',
        useCase: 'Gestión de almacén, control de inventario'
    },
    safety: {
        name: 'Seguridad Industrial (EPP)',
        description: 'Detección de equipo de protección personal',
        icon: '🦺',
        useCase: 'Verificación de cumplimiento de seguridad'
    },
    fleet: {
        name: 'Flota & Vehículos',
        description: 'Camiones, trailers, pickups, autos',
        icon: '🚛',
        useCase: 'Control de patio, entrada/salida de vehículos'
    }
};

/**
 * Selector de modelo de IA con información detallada
 * Permite alternar entre COCO-SSD genérico y modelos personalizados
 */
export function ModelSelector({ currentModel, onModelChange, isLoading }: ModelSelectorProps) {
    const [showDetails, setShowDetails] = useState(false);

    const currentInfo = MODEL_INFO[currentModel];

    return (
        <Card className="bg-slate-950/50 border-white/5 backdrop-blur-xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-primary" />
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                            Motor de IA
                        </CardTitle>
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => setShowDetails(!showDetails)}
                    >
                        <Settings2 className="w-3 h-3" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Model Selector */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                        Modelo Activo
                    </label>
                    <Select
                        value={currentModel}
                        onValueChange={(value) => onModelChange(value as ModelType)}
                        disabled={isLoading}
                    >
                        <SelectTrigger className="w-full bg-slate-900/50 border-slate-700">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {(Object.entries(MODEL_INFO) as [ModelType, typeof MODEL_INFO[ModelType]][]).map(([key, info]) => (
                                <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-2">
                                        <span>{info.icon}</span>
                                        <span className="text-sm font-semibold">{info.name}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Current Model Info */}
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{currentInfo.icon}</span>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-white">{currentInfo.name}</h4>
                            <p className="text-[10px] text-slate-400">{currentInfo.description}</p>
                        </div>
                        {isLoading && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        )}
                    </div>

                    {showDetails && (
                        <div className="pt-2 border-t border-slate-700/50 space-y-2">
                            <div>
                                <p className="text-[9px] font-bold uppercase text-slate-500 mb-1">Caso de Uso</p>
                                <p className="text-[10px] text-slate-300">{currentInfo.useCase}</p>
                            </div>

                            {currentModel !== 'coco' && (
                                <div>
                                    <p className="text-[9px] font-bold uppercase text-slate-500 mb-1">Clases Detectables</p>
                                    <div className="flex flex-wrap gap-1">
                                        {MODEL_CONFIGS[currentModel].labels.map((label) => (
                                            <Badge
                                                key={label}
                                                variant="outline"
                                                className="text-[8px] bg-primary/10 text-primary border-primary/20"
                                            >
                                                {label}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <div className="p-2 bg-slate-800/50 rounded">
                                    <p className="text-[8px] font-bold uppercase text-slate-500">Threshold</p>
                                    <p className="text-sm font-black text-white">
                                        {currentModel === 'coco' ? '0.60' : MODEL_CONFIGS[currentModel].scoreThreshold}
                                    </p>
                                </div>
                                <div className="p-2 bg-slate-800/50 rounded">
                                    <p className="text-[8px] font-bold uppercase text-slate-500">Input Size</p>
                                    <p className="text-sm font-black text-white">
                                        {currentModel === 'coco' ? '300px' : `${MODEL_CONFIGS[currentModel].inputSize}px`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Performance Indicator */}
                <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <Zap className="w-3 h-3 text-green-400" />
                    <span className="text-[9px] font-bold text-green-400 uppercase tracking-wider">
                        Modelo Cargado en Memoria
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
