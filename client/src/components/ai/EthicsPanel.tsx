import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Eye, Lock, Zap, Info, Fingerprint } from "lucide-react";
import { motion } from "framer-motion";

export function EthicsPanel() {
    const principles = [
        {
            title: "Transparencia Algorítmica",
            description: "Todas las predicciones de ventas y mantenimientos son trazables a vectores de datos históricos sin intervención humana sesgada.",
            icon: Eye,
            status: "Verificado"
        },
        {
            title: "Privacidad por Diseño",
            description: "Los datos de nómina y financieros están encriptados y aislados por organización (Multi-tenancy RLS).",
            icon: Lock,
            status: "Activo"
        },
        {
            title: "IA No-Determinista",
            description: "El Guardián detecta anomalías basándose en patrones de comportamiento, no en reglas rígidas que podrían ser discriminatorias.",
            icon: fingerPrint,
            status: "Auditable"
        },
        {
            title: "Responsabilidad Humana",
            description: "Las acciones críticas (como pausar una línea de producción) siempre requieren confirmación final de un operador con nivel > 5.",
            icon: Shield,
            status: "Certificado"
        }
    ];

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-6">
            <div className="flex flex-col gap-2 mb-8">
                <Badge className="w-fit bg-primary/10 text-primary border-primary/20 font-black uppercase tracking-widest text-[10px]">
                    <Zap className="w-3 h-3 mr-1" />
                    AI Governance v1.0
                </Badge>
                <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
                    Ética y Transparencia en la IA
                </h1>
                <p className="text-slate-500 max-w-2xl leading-relaxed">
                    Nexus Core opera bajo principios de ética radical. Nuestra inteligencia artificial está diseñada para potenciar la capacidad humana, no para reemplazarla.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {principles.map((p, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Card className="bg-slate-900/40 border-white/5 hover:border-primary/30 transition-all duration-500 group">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div className="p-2 rounded-lg bg-slate-800 border border-white/5 group-hover:bg-primary/20 transition-colors">
                                    <p.icon className="w-5 h-5 text-primary" />
                                </div>
                                <Badge variant="outline" className="text-[10px] font-black uppercase text-slate-500">
                                    {p.status}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <CardTitle className="text-lg font-bold text-white mb-2">{p.title}</CardTitle>
                                <p className="text-sm text-slate-400 leading-relaxed">{p.description}</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20 mt-12 overflow-hidden relative">
                <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Info className="w-5 h-5 text-primary" />
                        <CardTitle className="text-xl font-black italic uppercase tracking-tight">Compromiso con la Verdad de Datos</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-300 leading-relaxed italic">
                        "La inteligencia artificial de Nexus no fabrica realidades; interpreta señales latentes en tu operación para darte la libertad de decidir con certeza absoluta."
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

const fingerPrint = Fingerprint; // Alias fix for Lucide icon case mapping in schema
