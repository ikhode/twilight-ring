import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Bot, User, Sparkles, BrainCircuit, X, TrendingUp, ShieldCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface ReasoningChatDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    product: any;
}

export function ReasoningChatDialog({ isOpen, onOpenChange, product }: ReasoningChatDialogProps) {
    const { session } = useAuth();
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string, metadata?: any }[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial greeting / Context loading
    useEffect(() => {
        if (isOpen && product && !conversationId) {
            startConversation();
        }
    }, [isOpen, product]);

    const startConversation = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/chat/conversations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ title: `Análisis: ${product.name}` })
            });
            const data = await res.json();
            setConversationId(data.conversationId);

            const initialContext = `Estoy analizando el producto "${product.name}". 
            Datos actuales: Stock=${product.stock}, Nivel Crítico=${product.criticalityLevel || 'N/A'}, 
            Variabilidad=${product.demandVariability || 'estable'}.
            ¿Me puedes dar un resumen de la situación y recomendaciones?`;

            await sendMessageToApi(data.conversationId, initialContext, true);

        } catch (error) {
            console.error("Failed to start chat", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Error al conectar con el núcleo neuronal. Intente nuevamente." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const sendMessageToApi = async (convId: string, text: string, hidden: boolean = false) => {
        setIsLoading(true);
        if (!hidden) {
            setMessages(prev => [...prev, { role: 'user', content: text }]);
        }

        try {
            const res = await fetch(`/api/chat/conversations/${convId}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ message: text })
            });

            const data = await res.json();

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.aiMessage.content,
                metadata: data.aiMessage.metadata
            }]);

        } catch (error) {
            console.error("Failed to send message", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = () => {
        if (!inputValue.trim() || !conversationId) return;
        sendMessageToApi(conversationId, inputValue);
        setInputValue("");
    };

    useEffect(() => {
        if (scrollRef.current) {
            const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollArea) {
                scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' });
            }
        }
    }, [messages, isLoading]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-[#020617] border-slate-800/80 text-white flex flex-col h-[700px] p-0 gap-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border-t-purple-500/20">
                <DialogHeader className="p-6 border-b border-white/5 bg-slate-900/40 backdrop-blur-md shrink-0 relative overflow-hidden">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)] glow-accent">
                            <BrainCircuit className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <DialogTitle className="flex items-center gap-2 text-base font-display font-bold uppercase tracking-widest text-white">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                Núcleo de Razonamiento
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-400 font-medium">
                                Analizando <span className="text-purple-300 font-bold">{product?.name}</span> • <span className="text-slate-500">{product?.sku}</span>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6 relative bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.03),transparent)]" ref={scrollRef}>
                    <div className="space-y-6 pb-4">
                        {/* Context Board - Situational Awareness */}
                        {product && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-slate-900/80 border border-purple-500/20 rounded-2xl p-4 shadow-lg backdrop-blur-md mb-8"
                            >
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contexto de Operación Activo</span>
                                    <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400 bg-purple-500/5">Sincronizado</Badge>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold">Stock Actual</p>
                                        <p className="text-xl font-black italic tracking-tighter text-white">{product.stock} <span className="text-xs text-slate-500 not-italic uppercase font-medium">{product.unit || 'uds'}</span></p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold">Nivel Crítico</p>
                                        <p className={cn("text-xl font-black italic tracking-tighter", product.stock <= (product.criticalityLevel || 10) ? "text-rose-500" : "text-emerald-500")}>
                                            {product.criticalityLevel || '10'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold">Demanda</p>
                                        <p className="text-[11px] font-black uppercase text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md inline-block">
                                            {product.demandVariability || 'Estable'}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        <AnimatePresence initial={false}>
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "")}
                                >
                                    <div className={cn(
                                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm border",
                                        msg.role === 'assistant'
                                            ? "bg-purple-600/20 text-purple-400 border-purple-500/30"
                                            : "bg-slate-800 text-slate-300 border-slate-700"
                                    )}>
                                        {msg.role === 'assistant' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                    </div>
                                    <div className={cn(
                                        "rounded-2xl p-4 text-[13px] leading-relaxed max-w-[85%] shadow-md border group/msg relative",
                                        msg.role === 'assistant'
                                            ? "bg-slate-900 border-slate-800 text-slate-200 rounded-tl-none prose prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-2"
                                            : "bg-purple-600 border-purple-500 text-white rounded-tr-none shadow-[0_10px_30px_rgba(147,51,234,0.1)]"
                                    )}>
                                        {msg.role === 'user' ? (
                                            msg.content
                                        ) : (
                                            <>
                                                {/* Reasoning Log Section */}
                                                {msg.metadata?.reasoning && (
                                                    <div className="mb-4 bg-slate-950/50 rounded-xl border border-white/5 overflow-hidden not-prose">
                                                        <div className="px-3 py-2 bg-purple-500/10 border-b border-white/5 flex items-center justify-between">
                                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-400 flex items-center gap-2">
                                                                <BrainCircuit className="w-3 h-3" />
                                                                Log de Razonamiento Cognitivo
                                                            </span>
                                                            <span className="text-[8px] font-mono text-slate-500">v2.0 ACTIVE</span>
                                                        </div>

                                                        <div className="p-3 space-y-4">
                                                            {/* Analysis Plan */}
                                                            <div className="space-y-2">
                                                                <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Plan de Análisis</span>
                                                                <div className="space-y-1.5 border-l border-slate-800 ml-1 pl-3">
                                                                    {msg.metadata.reasoning.plan.map((p: any, j: number) => (
                                                                        <div key={j} className="flex gap-2 items-start opacity-70 hover:opacity-100 transition-opacity">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1 shrink-0" />
                                                                            <div>
                                                                                <p className="text-[10px] font-bold text-slate-300 leading-none">{p.step}</p>
                                                                                <p className="text-[9px] text-slate-500 mt-0.5">{p.action}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Hypothesis */}
                                                            <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <Sparkles className="w-3 h-3 text-purple-400" />
                                                                    <span className="text-[8px] font-black uppercase text-purple-400 tracking-widest">Hipótesis Activa</span>
                                                                </div>
                                                                <p className="text-[10px] text-slate-300 font-medium italic leading-relaxed">
                                                                    "{msg.metadata.reasoning.hypothesis}"
                                                                </p>
                                                            </div>

                                                            {/* Confidence & Action */}
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="p-2 rounded-lg bg-slate-900 border border-white/5">
                                                                    <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block mb-1">Confianza</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                                            <div
                                                                                className={cn(
                                                                                    "h-full transition-all duration-1000",
                                                                                    msg.metadata.reasoning.confidenceLevel === "Alta" ? "bg-emerald-500 w-[90%]" : "bg-rose-500 w-[30%]"
                                                                                )}
                                                                            />
                                                                        </div>
                                                                        <span className="text-[10px] font-bold text-slate-300">{msg.metadata.reasoning.confidenceLevel}</span>
                                                                    </div>
                                                                </div>

                                                                {msg.metadata.reasoning.suggestedAction && (
                                                                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                                                        <span className="text-[8px] font-black uppercase text-emerald-400 tracking-widest block mb-1">Recomendación</span>
                                                                        <p className="text-[10px] text-emerald-500 font-bold truncate">
                                                                            {msg.metadata.reasoning.suggestedAction}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* SQL Trace */}
                                                            {msg.metadata.reasoning.queriesExecuted?.length > 0 && (
                                                                <div className="bg-black/60 p-2 rounded-lg font-mono border border-white/5">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className="text-[8px] font-bold text-slate-700 uppercase">Trazabilidad SQL</span>
                                                                    </div>
                                                                    <div className="text-[8px] text-emerald-500/50 overflow-x-auto whitespace-normal break-all italic">
                                                                        {msg.metadata.reasoning.queriesExecuted[0]}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                <ReactMarkdown
                                                    components={{
                                                        h2: ({ node, ...props }) => <h2 className="text-lg font-black uppercase tracking-tight text-white mb-2" {...props} />,
                                                        h3: ({ node, ...props }) => <h3 className="text-sm font-bold text-purple-400 mb-1" {...props} />,
                                                        strong: ({ node, ...props }) => <span className="font-bold text-purple-300 underline decoration-purple-500/30" {...props} />,
                                                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1 mb-3" {...props} />,
                                                        li: ({ node, ...props }) => <li className="marker:text-purple-500" {...props} />,
                                                        blockquote: ({ node, ...props }) => <div className="border-l-2 border-emerald-500/50 bg-emerald-500/5 p-3 rounded-r-lg my-4 text-[11px] font-medium text-emerald-300 italic" {...props} />
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex gap-3"
                            >
                                <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Ejecutando Razonamiento...</span>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-6 bg-slate-900/50 backdrop-blur-md border-t border-white/5 shrink-0">
                    <div className="relative">
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Preguntar al motor cognitivo..."
                            className="bg-slate-950 border-slate-800 focus:border-purple-500/50 h-12 pl-4 pr-14 text-sm transition-all shadow-inner"
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!inputValue.trim() || isLoading}
                            size="icon"
                            className="absolute right-1 top-1 w-10 h-10 bg-purple-600 hover:bg-purple-700 shadow-lg text-white"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                    </div>
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
                        {["¿Quién es el mejor proveedor?", "¿Cuál es el stock mínimo?", "Analizar mermas"].map((s) => (
                            <button
                                key={s}
                                onClick={() => setInputValue(s)}
                                className="text-[10px] font-bold uppercase tracking-tighter px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/30 transition-all"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
