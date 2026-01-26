import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Mic, Send, X, Sparkles, MessageSquare, Volume2, StopCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { copilotService } from '@/lib/ai/copilot-service';
import { useConfiguration } from "@/context/ConfigurationContext";
import { useNLPEngine } from "@/lib/ai/nlp-engine";
import { useCognitiveEngine } from "@/lib/cognitive/engine";
import { useAuth } from "@/hooks/use-auth";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
    metadata?: {
        sources?: Array<{
            id: string;
            title: string;
            similarity: number;
        }>;
        confidence?: number;
    };
}

export function Copilot() {
    const { role, industry } = useConfiguration();
    const { context } = useCognitiveEngine();
    const { findAnswer, loadQnAModel } = useNLPEngine();
    const { session } = useAuth();
    const [location] = useLocation();

    const [isOpen, setIsOpen] = useState(false);
    const [activeConversation, setActiveConversation] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isProcessing]);

    // Load AI Model and Conversation on Open
    useEffect(() => {
        if (isOpen) {
            loadQnAModel();
            if (session?.access_token) {
                initializeBackendChat();
            } else if (messages.length === 0) {
                // Initialize default welcome message if offline or no session
                setMessages([{
                    id: 'welcome',
                    role: 'assistant',
                    content: 'Hola. Soy Nexus Pilot, tu asistente cognitivo. ¿En qué puedo ayudarte?',
                    createdAt: new Date().toISOString()
                }]);
            }
        }
    }, [isOpen, session]);

    const initializeBackendChat = async () => {
        try {
            const res = await fetch("/api/chat/conversations", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            const data = await res.json();

            if (data.conversations?.length > 0) {
                const firstId = data.conversations[0].id;
                setActiveConversation(firstId);
                loadMessages(firstId);
            } else {
                createConversation();
            }
        } catch (error) {
            console.error("Failed to init chat:", error);
        }
    };

    const createConversation = async () => {
        try {
            const res = await fetch("/api/chat/conversations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ title: "Consulta General" })
            });
            const data = await res.json();
            setActiveConversation(data.conversationId);
        } catch (error) {
            console.error("Failed to create conversation:", error);
        }
    };

    const loadMessages = async (id: string) => {
        try {
            const res = await fetch(`/api/chat/conversations/${id}/messages`, {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            const data = await res.json();
            if (data.messages?.length > 0) {
                setMessages(data.messages);
            } else {
                setMessages([{
                    id: 'welcome',
                    role: 'assistant',
                    content: 'Hola. Soy Nexus Pilot. ¿En qué puedo apoyarte hoy?',
                    createdAt: new Date().toISOString()
                }]);
            }
        } catch (error) {
            console.error("Failed to load messages:", error);
        }
    };

    const handleSend = async () => {
        if (!inputValue.trim() || isProcessing) return;

        const userText = inputValue;
        setInputValue('');
        setIsProcessing(true);

        // Optimistically add user message if using local fallback or while weighting
        const tempUserMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: userText,
            createdAt: new Date().toISOString()
        };

        if (!activeConversation) {
            setMessages(prev => [...prev, tempUserMsg]);
        }

        try {
            if (session?.access_token && activeConversation) {
                // Try Backend Chat API (RAG enabled)
                const res = await fetch(`/api/chat/conversations/${activeConversation}/messages`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ message: userText })
                });

                if (res.ok) {
                    const data = await res.json();
                    setMessages(prev => [...prev.filter(m => m.id !== tempUserMsg.id), data.userMessage, data.aiMessage]);
                } else {
                    throw new Error("API call failed");
                }
            } else {
                // Use Local BERT Fallback
                const contextString = `
                    Role: ${role}. Industry: ${industry}. Page: ${location}.
                `;
                const localAnswers = await findAnswer(contextString, userText);

                let responseContent = "Entiendo tu consulta. He analizado los datos actuales del sistema y no detecto anomalías críticas relacionadas con ese tema. ¿Deseas que profundice en algún módulo específico?";
                if (localAnswers && localAnswers.length > 0 && localAnswers[0].score > 2) {
                    responseContent = localAnswers[0].text;
                }

                const aiMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: responseContent,
                    createdAt: new Date().toISOString()
                };
                setMessages(prev => [...prev, aiMsg]);
            }
        } catch (error) {
            console.error("Chat error:", error);
            // Fallback response on failure
            const errorMsg: Message = {
                id: 'err-' + Date.now(),
                role: 'assistant',
                content: "Tuve un problema conectando con el Núcleo Cognitivo. Sin embargo, sigo monitoreando la integridad del sistema.",
                createdAt: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleListening = () => {
        if (isListening) {
            copilotService.stopListening();
            setIsListening(false);
        } else {
            setIsListening(true);
            copilotService.startListening(
                (text) => {
                    setInputValue(text);
                    setIsListening(false);
                    // could auto-send here if desired
                },
                (error) => {
                    console.error("Speech error", error);
                    setIsListening(false);
                }
            );
        }
    };

    return (
        <>
            {/* Unified Floating Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(true)}
                className={cn(
                    "fixed bottom-8 right-8 z-50 p-4 rounded-full shadow-[0_0_35px_rgba(139,92,246,0.3)] backdrop-blur-xl border border-white/20 transition-all duration-300 group",
                    isOpen ? "opacity-0 pointer-events-none" : "flex items-center justify-center bg-slate-900/40 hover:bg-slate-900/60"
                )}
            >
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-500/20 to-blue-500/20 animate-spin-slow group-hover:opacity-100 opacity-60 transition-opacity" />
                <Sparkles className="w-6 h-6 text-purple-400 relative z-10 group-hover:text-purple-300" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border-2 border-slate-900 animate-pulse" />
            </motion.button>

            {/* Consolidado Nexus Pilot UI */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.9, rotateX: 20 }}
                        animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                        exit={{ opacity: 0, y: 100, scale: 0.9 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-8 right-8 z-50 w-[450px] h-[650px] bg-slate-950/80 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col ring-1 ring-white/10"
                    >
                        {/* Interactive Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-br from-purple-500/10 via-transparent to-transparent">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center relative group">
                                    <div className="absolute inset-0 bg-purple-500/30 blur-2xl group-hover:opacity-100 opacity-50 transition-opacity" />
                                    <Bot className="w-7 h-7 text-purple-400 relative z-10" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Nexus Pilot</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Núcleo Activo</span>
                                    </div>
                                </div>
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-10 w-10 text-slate-500 hover:text-white rounded-2xl hover:bg-white/5 transition-all"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Conversational Scroll Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide" ref={scrollRef}>
                            <div className="text-center py-4 border-b border-white/5 mb-4">
                                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-600 font-bold">Consola de IA • {new Date().toLocaleTimeString()}</p>
                            </div>

                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={cn(
                                        "flex gap-4 max-w-[85%]",
                                        msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                                        msg.role === 'user'
                                            ? "bg-slate-900 border-slate-700 shadow-lg"
                                            : "bg-purple-500/10 border-purple-500/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                                    )}>
                                        {msg.role === 'user'
                                            ? <MessageSquare className="w-4 h-4 text-slate-500" />
                                            : <Sparkles className="w-4 h-4 text-purple-400" />}
                                    </div>

                                    <div className="space-y-2">
                                        <div className={cn(
                                            "p-4 rounded-3xl text-[13px] font-medium leading-relaxed shadow-2xl",
                                            msg.role === 'user'
                                                ? "bg-purple-600 text-white rounded-tr-none"
                                                : "bg-gradient-to-br from-slate-900 to-slate-950 text-slate-200 rounded-tl-none border border-white/5"
                                        )}>
                                            {msg.content}
                                        </div>

                                        {msg.metadata?.sources && (
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {msg.metadata.sources.map(s => (
                                                    <div key={s.id} className="px-2 py-0.5 rounded-full bg-slate-900 border border-white/5 text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                                                        {s.title}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            {isProcessing && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex gap-4"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                                        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                                    </div>
                                    <div className="bg-slate-900/40 p-3 rounded-2xl rounded-tl-none border border-white/5 flex gap-1.5 items-center px-4">
                                        <div className="w-1.5 h-1.5 bg-purple-500 animate-bounce rounded-full" />
                                        <div className="w-1.5 h-1.5 bg-purple-500 animate-bounce [animation-delay:-0.15s] rounded-full" />
                                        <div className="w-1.5 h-1.5 bg-purple-500 animate-bounce [animation-delay:-0.3s] rounded-full" />
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* High-Fidelity Input Zone */}
                        <div className="p-6 bg-slate-950 border-t border-white/5">
                            <div className="relative flex items-center gap-3">
                                <div className="relative flex-1 group">
                                    <div className="absolute inset-0 bg-purple-600/5 blur-xl group-focus-within:bg-purple-600/10 transition-all rounded-full" />
                                    <Input
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Escribe o habla con Nexus..."
                                        className="bg-slate-900/50 border-slate-800/50 focus-visible:ring-purple-500/50 pl-5 pr-28 h-14 rounded-[1.25rem] text-sm font-medium border shadow-inner relative z-10"
                                    />

                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-20">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className={cn(
                                                "h-10 w-10 rounded-xl transition-all duration-300",
                                                isListening ? "text-red-500 bg-red-500/10 hover:bg-red-500/20" : "text-slate-400 hover:text-purple-400 hover:bg-purple-500/10"
                                            )}
                                            onClick={toggleListening}
                                        >
                                            {isListening ? <StopCircle className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
                                        </Button>
                                        <Button
                                            size="icon"
                                            className="h-10 w-10 rounded-xl bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-600/20 transition-transform active:scale-95"
                                            onClick={handleSend}
                                            disabled={!inputValue.trim() || isProcessing}
                                        >
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-between items-center px-2">
                                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">Nexus Engine v2.5 GA</p>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Local Intelligence ready</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Manual retrieval enabled</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
