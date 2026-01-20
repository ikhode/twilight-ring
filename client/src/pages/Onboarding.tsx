import { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Background,
    Controls,
    applyNodeChanges,
    applyEdgeChanges,
    OnNodesChange,
    OnEdgesChange,
    addEdge,
    Connection,
    Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Bot,
    Sparkles,
    Send,
    Layout,
    Terminal,
    ArrowRight,
    Plus,
    Trash2,
    Edit3,
    Zap,
    Settings2,
    Check
} from 'lucide-react';
import { processGenerator } from '@/lib/ai/process-generator';
import 'd3-transition'; // Ensure d3-selection prototype is extended with .interrupt()
import { useLocation } from 'wouter';
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from 'framer-motion';
import { flowTemplates } from '@/data/flowTemplates';

export default function Onboarding() {
    const [, setLocation] = useLocation();
    const [step, setStep] = useState<'intake' | 'architect' | 'finalizing'>('intake');
    const [industry, setIndustry] = useState('');
    const [messages, setMessages] = useState<{ role: 'ai' | 'user', text: string }[]>([
        { role: 'ai', text: 'Hola. Soy el Arquitecto de Procesos (Nexus). Para configurar tu sistema de forma cognitiva, dime: ¿A qué industria pertenece tu empresa?' }
    ]);

    // React Flow State
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [showFlow, setShowFlow] = useState(false);

    // Editing State
    const [editingNode, setEditingNode] = useState<Node | null>(null);
    const [editLabel, setEditLabel] = useState('');

    useEffect(() => {
        if (step === 'architect') {
            const timer = setTimeout(() => setShowFlow(true), 800);
            return () => clearTimeout(timer);
        } else {
            setShowFlow(false);
        }
    }, [step]);

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [setNodes]
    );
    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        [setEdges]
    );
    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const handleSendMessage = () => {
        if (!industry.trim()) return;

        setMessages(prev => [...prev, { role: 'user', text: industry }]);

        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'ai', text: `Entendido. Estoy analizando el ecosistema operativo para "${industry}"... Generando arquitectura de procesos Nexus.` }]);

            const { nodes: genNodes, edges: genEdges } = processGenerator.generateFlow(industry);
            setNodes(genNodes);
            setEdges(genEdges);

            setTimeout(() => {
                setStep('architect');
            }, 1200);
        }, 500);
    };

    const handleTemplateSelect = (template: typeof flowTemplates[0]) => {
        setIndustry(template.name);
        setMessages(prev => [...prev, { role: 'user', text: `Plantilla: ${template.name}` }]);

        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'ai', text: `Excelente elección. Cargando arquitectura de referencia para ${template.name}...` }]);

            // Generate flow using the template ID to ensure exact match
            const { nodes: genNodes, edges: genEdges } = processGenerator.generateFlow(template.id);
            setNodes(genNodes);
            setEdges(genEdges);

            setTimeout(() => {
                setStep('architect');
            }, 1200);
        }, 500);
    };

    const { toast } = useToast();

    // Node Actions
    const onAddNode = () => {
        const newNode: Node = {
            id: `node-${nodes.length + 1}-${Date.now()}`,
            data: { label: 'Nuevo Proceso' },
            position: { x: 250, y: nodes.length > 0 ? nodes[nodes.length - 1].position.y + 100 : 100 },
            style: {
                background: '#1e293b',
                color: '#fff',
                border: '1px solid #3b82f6',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold',
                padding: '10px'
            }
        };
        setNodes((nds) => nds.concat(newNode));
        toast({ title: "Nodo añadido", description: "Se ha creado un nuevo paso en el proceso." });
    };

    const onNodeClick = (_: React.MouseEvent, node: Node) => {
        setEditingNode(node);
        setEditLabel(node.data.label);
    };

    const handleSaveEdit = () => {
        if (!editingNode) return;
        setNodes((nds) =>
            nds.map((n) => {
                if (n.id === editingNode.id) {
                    return { ...n, data: { ...n.data, label: editLabel } };
                }
                return n;
            })
        );
        setEditingNode(null);
        toast({ title: "Proceso actualizado", description: "El nombre del paso ha sido modificado." });
    };

    const onDeleteNode = (id: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
        setEditingNode(null);
        toast({ title: "Nodo eliminado", description: "El paso ha sido removido del flujo." });
    };

    const handleDeploy = async () => {
        setStep('finalizing');

        try {
            const { supabase } = await import('@/lib/supabase');
            const { data: { session: sbSession } } = await supabase.auth.getSession();

            if (!sbSession) throw new Error("No active session");

            const res = await fetch('/api/onboarding/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sbSession.access_token}`
                },
                body: JSON.stringify({
                    industry,
                    nodes,
                    edges
                })
            });

            if (!res.ok) throw new Error("Failed to save onboarding data");

            setTimeout(() => {
                setLocation('/dashboard');
            }, 2500);

        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "No se pudo desplegar la configuración del OS.", variant: "destructive" });
            setStep('architect');
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_70%)]" />
            <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:30px_30px]" />

            {/* Header */}
            <header className="relative z-20 p-6 flex justify-between items-center bg-slate-950/50 backdrop-blur-md border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                        <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="font-black text-xl tracking-tighter uppercase italic leading-none">Nexus <span className="text-primary">Architect</span></h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Cognitive OS Provisioning</p>
                    </div>
                </div>
                {step === 'architect' && (
                    <Button onClick={handleDeploy} className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] h-10 px-6 rounded-full shadow-[0_0_25px_rgba(59,130,246,0.35)] active:scale-95 transition-all">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Desplegar Ecosistema
                    </Button>
                )}
            </header>

            {/* Content */}
            <main className="flex-1 relative z-10 flex flex-col overflow-hidden">
                <AnimatePresence mode="wait">
                    {step === 'intake' && (
                        <motion.div
                            key="intake"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex-1 flex items-center justify-center p-4"
                        >
                            <Card className="w-full max-w-lg bg-slate-900/40 border-slate-800 backdrop-blur-2xl shadow-2xl overflow-hidden">
                                <div className="h-1 bg-gradient-to-r from-primary/50 via-purple-500/50 to-primary/50" />
                                <CardContent className="p-8 space-y-8">
                                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-4 custom-scrollbar">
                                        {messages.map((msg, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`
                                                    max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed
                                                    ${msg.role === 'user'
                                                        ? 'bg-primary text-white rounded-tr-none shadow-[0_5px_15px_rgba(59,130,246,0.2)]'
                                                        : 'bg-slate-800/80 text-slate-200 rounded-tl-none border border-white/5'}
                                                `}>
                                                    {msg.text}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>

                                    <div className="flex gap-3">
                                        <Input
                                            value={industry}
                                            onChange={(e) => setIndustry(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder="Ej. Hoteles, Logística, Restaurante..."
                                            className="bg-slate-950/50 border-slate-700 focus-visible:ring-primary h-12 rounded-xl text-xs font-bold font-mono tracking-tight text-white"
                                            autoFocus
                                        />
                                        <Button onClick={handleSendMessage} size="icon" className="h-12 w-12 bg-primary hover:bg-primary/90 rounded-xl shadow-lg active:scale-90 transition-transform">
                                            <Send className="w-5 h-5 text-white" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                                        {flowTemplates.map((template) => (
                                            <Button
                                                key={template.id}
                                                variant="outline"
                                                onClick={() => handleTemplateSelect(template)}
                                                className="h-auto py-3 px-1 flex flex-col items-center gap-1.5 bg-slate-900/50 border-white/5 hover:border-primary/50 hover:bg-primary/10 transition-all group"
                                            >
                                                <template.icon className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-white text-center leading-tight">
                                                    {template.name.split('/')[0]}
                                                </span>
                                            </Button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {step === 'architect' && (
                        <motion.div
                            key="architect"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-1 flex flex-col overflow-hidden"
                        >
                            {/* Editor Status Bar */}
                            <div className="px-6 py-4 bg-slate-900/30 border-b border-white/5 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                                        <Zap className="w-3.5 h-3.5 text-primary" />
                                        <span className="text-[11px] font-black uppercase tracking-widest text-primary">Live Architect Mode</span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium">
                                        Personaliza los procesos de <strong className="text-white italic">{industry}</strong>
                                    </p>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Entrada</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-slate-700" />
                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Proceso</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Salida</span>
                                    </div>
                                </div>
                            </div>

                            {/* React Flow Container - Ensuring fixed height is respected */}
                            <div className="relative w-full bg-slate-950/20 border-t border-white/5 overflow-hidden" style={{ height: '800px', minHeight: '800px' }}>
                                {showFlow ? (
                                    <ReactFlow
                                        nodes={nodes}
                                        edges={edges}
                                        onNodesChange={onNodesChange}
                                        onEdgesChange={onEdgesChange}
                                        onConnect={onConnect}
                                        onNodeClick={onNodeClick}
                                        fitView
                                        className="h-full w-full"
                                    >
                                        <Background variant={"dots" as any} color="#334155" gap={24} size={1} />
                                        <Controls className="!bg-slate-900 !border-slate-800 !fill-white !shadow-2xl" />

                                        <Panel position="top-right" className="bg-slate-900/80 backdrop-blur-md border border-white/10 p-3 rounded-2xl flex flex-col gap-2 shadow-2xl">
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 px-1 mb-1">Herramientas</p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="bg-slate-800/50 border-white/5 hover:bg-primary/20 hover:border-primary/30 text-[10px] font-black uppercase tracking-widest text-white h-9 px-4 rounded-xl transition-all"
                                                onClick={onAddNode}
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-2 text-primary" />
                                                Añadir Paso
                                            </Button>
                                            <div className="h-px bg-white/5 my-1" />
                                            <div className="space-y-2 mt-2">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-600 px-1">Biblioteca Core</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {["Ventas", "Inventario", "RRHH", "Calidad"].map(p => (
                                                        <Button key={p} variant="secondary" className="h-7 text-[8px] font-bold uppercase tracking-tighter bg-slate-800/30 hover:bg-primary/20 hover:text-white border-transparent" onClick={() => {
                                                            const newNode: Node = {
                                                                id: `node-${Date.now()}`,
                                                                data: { label: p },
                                                                position: { x: 100, y: 100 },
                                                                style: { background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', padding: '8px' }
                                                            };
                                                            setNodes(nds => [...nds, newNode]);
                                                        }}>{p}</Button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="h-px bg-white/5 my-1" />
                                            <div className="flex items-center gap-2 px-2 py-1">
                                                <Settings2 className="w-3 h-3 text-slate-600" />
                                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter italic">Selecciona un nodo para editar</span>
                                            </div>
                                        </Panel>
                                    </ReactFlow>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950">
                                        <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 animate-pulse">Sincronizando Nexus Flow...</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {step === 'finalizing' && (
                        <motion.div
                            key="finalizing"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-10"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
                                <div className="relative w-32 h-32 rounded-3xl bg-slate-900 border border-white/5 flex items-center justify-center shadow-2xl">
                                    <Bot className="w-16 h-16 text-primary animate-bounce" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">Configurando <span className="text-primary italic">Nexus Core</span></h2>
                                <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Provisionando recursos cognitivos en la nube</p>
                            </div>

                            <div className="w-full max-w-sm space-y-4">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <span className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                                        Iniciando Nexus Core...
                                    </span>
                                </div>
                                <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden border border-white/5">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: "100%" }}
                                        transition={{ duration: 4 }}
                                        className="h-full bg-gradient-to-r from-primary to-purple-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                    />
                                </div>
                                <div className="bg-slate-950/50 border border-white/5 p-4 rounded-xl text-[9px] font-mono text-slate-500 space-y-1 text-left">
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>{">"} Provisioning PostgreSQL clusters...</motion.p>
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}>{">"} Activating pgvector extension...</motion.p>
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>{">"} Injecting industry-specific logic...</motion.p>
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.0 }}>{">"} Calibrating TensorFlow.js models...</motion.p>
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} className="text-primary">{">"} System Online. Routing to Dashboard...</motion.p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Editing Dialog */}
            <Dialog open={!!editingNode} onOpenChange={(open) => !open && setEditingNode(null)}>
                <DialogContent className="bg-slate-900 border-slate-800 border-2 text-white sm:max-w-md rounded-3xl overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-500" />
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                            <Edit3 className="w-5 h-5 text-primary" />
                            Editar Proceso
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre del Proceso</label>
                            <Input
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                className="bg-slate-950 border-slate-800 h-12 rounded-xl text-xs font-bold font-mono text-white focus-visible:ring-primary"
                                placeholder="Ej. Facturación Express"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2 sm:justify-between items-center sm:gap-0 mt-4">
                        <Button
                            variant="destructive"
                            className="bg-red-500/10 hover:bg-red-500 hover:text-white border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-xl transition-all"
                            onClick={() => editingNode && onDeleteNode(editingNode.id)}
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Eliminar
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                className="text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest h-10 px-6"
                                onClick={() => setEditingNode(null)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="bg-primary hover:bg-primary/90 text-white text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-xl shadow-lg transition-transform active:scale-95"
                                onClick={handleSaveEdit}
                            >
                                <Check className="w-3.5 h-3.5 mr-2" />
                                Guardar
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                
                .react-flow__node-input {
                    background: #1e293b !important;
                    color: white !important;
                    border: 1px solid #3b82f6 !important;
                    border-radius: 12px !important;
                    box-shadow: 0 0 15px rgba(59, 130, 246, 0.3) !important;
                    font-size: 11px !important;
                    font-weight: 800 !important;
                    text-transform: uppercase !important;
                    padding: 10px !important;
                }
                
                .react-flow__node-default {
                    background: #0f172a !important;
                    color: #94a3b8 !important;
                    border: 1px solid #1e293b !important;
                    border-radius: 12px !important;
                    font-size: 11px !important;
                    font-weight: 800 !important;
                    text-transform: uppercase !important;
                    padding: 10px !important;
                }
                
                .react-flow__node-output {
                    background: #1e293b !important;
                    color: white !important;
                    border: 1px solid #a855f7 !important;
                    border-radius: 12px !important;
                    box-shadow: 0 0 15px rgba(168, 85, 247, 0.3) !important;
                    font-size: 11px !important;
                    font-weight: 800 !important;
                    text-transform: uppercase !important;
                    padding: 10px !important;
                }

                .react-flow__handle {
                    background: #3b82f6 !important;
                    width: 8px !important;
                    height: 8px !important;
                    border: 2px solid #020617 !important;
                }
                
                .react-flow__controls-button {
                    background: #1e293b !important;
                    border-bottom: 1px solid #334155 !important;
                }
                
                .react-flow__controls-button svg {
                    fill: #94a3b8 !important;
                }
            `}</style>
        </div>
    );
}
