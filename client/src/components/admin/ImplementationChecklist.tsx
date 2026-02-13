
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Circle, PartyPopper } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChecklistSection {
    id: string;
    title: string;
    items: string[];
}

const CHECKLIST_DATA: ChecklistSection[] = [
    {
        id: "objectives",
        title: "1. Definir Objetivos y Requisitos",
        items: [
            "Identificar objetivos comerciales (ej. procesamiento de pedidos más rápido, insights predictivos).",
            "Listar procesos clave para automatizar (ej. gestión de pedidos, seguimiento de inventario).",
            "Determinar capacidades de IA necesarias (ej. previsión de demanda, chatbots).",
            "Identificar requisitos de cumplimiento (ej. GDPR, CCPA)."
        ]
    },
    {
        id: "platform",
        title: "2. Seleccionar la Plataforma ERP Adecuada",
        items: [
            "Evaluar proveedores de ERP que soporten integración de IA/ML.",
            "Asegurar escalabilidad para crecimiento futuro.",
            "Verificar capacidades de integración (CRM, e-commerce, contabilidad).",
            "Verificar interfaz amigable y accesibilidad móvil.",
            "Evaluar opciones de soporte y capacitación."
        ]
    },
    {
        id: "data",
        title: "3. Preparación de Datos",
        items: [
            "Auditar fuentes de datos actuales.",
            "Limpiar y estandarizar datos para asegurar precisión.",
            "Definir arquitectura de datos para analítica de IA.",
            "Establecer políticas seguras de almacenamiento y respaldo.",
            "Asegurar medidas de privacidad y cumplimiento."
        ]
    },
    {
        id: "automation",
        title: "4. Configuración de IA y Automatización",
        items: [
            "Implementar modelos de IA para predicción de pedidos e inventario.",
            "Configurar insights de clientes (segmentación, churn).",
            "Configurar flujos automatizados para pedidos y aprobaciones.",
            "Integrar chatbots de IA para soporte.",
            "Probar recomendaciones de IA contra datos históricos."
        ]
    },
    {
        id: "integration",
        title: "5. Integración con Sistemas Existentes",
        items: [
            "Conectar ERP a e-commerce, POS y CRM.",
            "Integrar pasarelas de pago y logística.",
            "Asegurar sincronización en tiempo real.",
            "Configurar APIs o middleware para intercambio de datos."
        ]
    },
    {
        id: "roles",
        title: "6. Roles de Usuario y Capacitación",
        items: [
            "Definir roles y permisos (admin, ventas, inventario, finanzas).",
            "Proveer capacitación enfocada en IA para el personal.",
            "Crear manual de usuario y guías rápidas.",
            "Establecer mesa de ayuda post-lanzamiento."
        ]
    },
    {
        id: "testing",
        title: "7. Pruebas y Validación",
        items: [
            "Probar flujos de gestión de pedidos E2E.",
            "Validar predicciones y recomendaciones de IA.",
            "Realizar pruebas de seguridad.",
            "Verificar consistencia de datos.",
            "Recopilar retroalimentación de usuarios piloto."
        ]
    },
    {
        id: "deployment",
        title: "8. Despliegue",
        items: [
            "Migrar datos existentes al nuevo sistema.",
            "Habilitar módulos de IA y paneles.",
            "Lanzar el sistema en fases si es necesario.",
            "Monitorear rendimiento y adopción."
        ]
    },
    {
        id: "monitoring",
        title: "9. Monitoreo y Mejora Continua",
        items: [
            "Establecer KPIs para eficiencia y satisfacción.",
            "Revisar rendimiento de modelos de IA regularmente.",
            "Actualizar flujos basado en feedback.",
            "Programar auditorías de datos periódicas.",
            "Mantenerse actualizado sobre nuevas features."
        ]
    }
];

export function ImplementationChecklist() {
    // State for checked items: "sectionId-itemIndex" -> boolean
    const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});

    // Load from local storage
    useEffect(() => {
        const saved = localStorage.getItem("erp_ai_checklist_progress");
        if (saved) {
            try {
                setCheckedState(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse checklist progress", e);
            }
        }
    }, []);

    // Save to local storage
    useEffect(() => {
        localStorage.setItem("erp_ai_checklist_progress", JSON.stringify(checkedState));
    }, [checkedState]);

    const handleCheck = (sectionId: string, idx: number, checked: boolean) => {
        setCheckedState(prev => ({
            ...prev,
            [`${sectionId}-${idx}`]: checked
        }));
    };

    // Calculate progress
    const totalItems = CHECKLIST_DATA.reduce((acc, curr) => acc + curr.items.length, 0);
    const completedItems = Object.values(checkedState).filter(Boolean).length;
    const progress = Math.round((completedItems / totalItems) * 100);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header / Progress Card */}
            <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                <CheckCircle2 className="w-6 h-6 text-indigo-500" />
                                Roadmap de Implementación ERP + IA
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Guía paso a paso para la transformación digital de tu empresa
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <span className="text-3xl font-black text-indigo-400">{progress}%</span>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Completado</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Progress value={progress} className="h-2 bg-slate-800 [&>div]:bg-gradient-to-r [&>div]:from-indigo-500 [&>div]:to-purple-500" />
                    <div className="mt-2 flex justify-between text-xs text-slate-500 font-medium">
                        <span>{completedItems} de {totalItems} tareas completadas</span>
                        {progress === 100 && (
                            <span className="text-emerald-400 flex items-center gap-1 animate-pulse">
                                <PartyPopper className="w-3 h-3" /> ¡Implementación Finalizada!
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>

            <ScrollArea className="h-[600px] pr-4">
                <div className="grid grid-cols-1 gap-6 pb-20">
                    {CHECKLIST_DATA.map((section) => {
                        const sectionItems = section.items;
                        const sectionCompletedCount = sectionItems.filter((_, idx) => checkedState[`${section.id}-${idx}`]).length;
                        const isSectionComplete = sectionCompletedCount === sectionItems.length;

                        return (
                            <motion.div
                                key={section.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card className={`border transition-all duration-300 ${isSectionComplete ? "bg-emerald-500/5 border-emerald-500/30" : "bg-slate-900/50 border-slate-800"}`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className={`text-lg font-bold ${isSectionComplete ? "text-emerald-400" : "text-white"}`}>
                                                {section.title}
                                            </CardTitle>
                                            <Badge variant="secondary" className={isSectionComplete ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800"}>
                                                {sectionCompletedCount}/{sectionItems.length}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {sectionItems.map((item, idx) => {
                                            const isChecked = !!checkedState[`${section.id}-${idx}`];
                                            return (
                                                <div key={idx} className="flex items-start space-x-3 group">
                                                    <Checkbox
                                                        id={`${section.id}-${idx}`}
                                                        checked={isChecked}
                                                        onCheckedChange={(checked) => handleCheck(section.id, idx, checked as boolean)}
                                                        className="mt-0.5 data-[state=checked]:bg-indigo-500 border-slate-600"
                                                    />
                                                    <label
                                                        htmlFor={`${section.id}-${idx}`}
                                                        className={`text-sm leading-relaxed cursor-pointer select-none transition-colors ${isChecked ? "text-slate-500 line-through decoration-slate-600" : "text-slate-300 group-hover:text-white"}`}
                                                    >
                                                        {item}
                                                    </label>
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
