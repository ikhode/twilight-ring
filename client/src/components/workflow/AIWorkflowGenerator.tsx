import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CognitiveTemplateGenerator, BusinessDescription } from '@/data/cognitiveTemplates';

interface AIWorkflowGeneratorProps {
    onWorkflowGenerated: (nodes: any[], edges: any[]) => void;
}

export default function AIWorkflowGenerator({ onWorkflowGenerated }: AIWorkflowGeneratorProps) {
    const [description, setDescription] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [analyzedBusiness, setAnalyzedBusiness] = useState<BusinessDescription | null>(null);

    const handleGenerate = async () => {
        if (!description.trim()) return;

        setIsGenerating(true);

        try {
            // Simular delay de IA (en producción, aquí iría la llamada al LLM)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Analizar descripción del negocio
            const businessInfo = await CognitiveTemplateGenerator.analyzeBusinessDescription(description);
            setAnalyzedBusiness(businessInfo);

            // Generar template
            const template = await CognitiveTemplateGenerator.generateTemplate(businessInfo);

            // Notificar al padre con el workflow generado
            onWorkflowGenerated(template.nodes, template.edges);

        } catch (error) {
            console.error('Error generating workflow:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const examples = [
        "Somos una taquería, compramos insumos frescos, preparamos tacos y vendemos al público",
        "Clínica médica: registramos pacientes, hacemos consultas, ordenamos estudios y facturamos",
        "Fábrica de muebles: compramos madera, producimos muebles, hacemos control de calidad y vendemos",
        "Empresa de logística: recibimos órdenes, optimizamos rutas, entregamos paquetes y capturamos POD"
    ];

    return (
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-2xl">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-black">Generador de Workflows con IA</CardTitle>
                        <p className="text-sm text-slate-400 mt-1">Describe tu negocio y la IA creará el workflow perfecto</p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Textarea para descripción */}
                <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-slate-400">
                        Describe tu negocio
                    </label>
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ej. Somos una taquería, compramos insumos, preparamos tacos y vendemos al público..."
                        className="min-h-[120px] bg-slate-950/50 border-slate-700 focus-visible:ring-purple-500 text-white resize-none"
                        disabled={isGenerating}
                    />
                </div>

                {/* Ejemplos */}
                <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ejemplos:</p>
                    <div className="grid grid-cols-1 gap-2">
                        {examples.map((example, i) => (
                            <button
                                key={i}
                                onClick={() => setDescription(example)}
                                className="text-left text-xs text-slate-400 hover:text-white bg-slate-950/50 hover:bg-slate-800/50 p-3 rounded-lg border border-slate-800 hover:border-purple-500/50 transition-all"
                                disabled={isGenerating}
                            >
                                {example}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Botón de generar */}
                <Button
                    onClick={handleGenerate}
                    disabled={!description.trim() || isGenerating}
                    className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-black uppercase tracking-wider rounded-xl group"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Generando Workflow con IA...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5 mr-2" />
                            Generar Workflow Automáticamente
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </Button>

                {/* Resultado del análisis */}
                {analyzedBusiness && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3 p-4 bg-slate-950/50 border border-slate-800 rounded-xl"
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            <p className="text-sm font-bold text-white">Análisis Completado</p>
                        </div>

                        <div className="space-y-2">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Industria Detectada:</p>
                                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                    {analyzedBusiness.industry}
                                </Badge>
                            </div>

                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Procesos Identificados:</p>
                                <div className="flex flex-wrap gap-2">
                                    {analyzedBusiness.processes.map((process, i) => (
                                        <Badge key={i} variant="outline" className="border-slate-700 text-slate-300">
                                            {process}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-slate-400 italic">
                            ✨ Workflow cognitivo generado con triggers, conditions y actions
                        </p>
                    </motion.div>
                )}
            </CardContent>
        </Card>
    );
}
