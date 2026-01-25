import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Mic, Send, X, Sparkles, MessageSquare, Volume2, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { copilotService, ChatMessage } from '@/lib/ai/copilot-service';

import { useConfiguration } from "@/context/ConfigurationContext";

import { useNLPEngine } from "@/lib/ai/nlp-engine";
import { useCognitiveEngine } from "@/lib/cognitive/engine";

export function Copilot() {
    const { role, industry } = useConfiguration();
    const { context } = useCognitiveEngine();
    const { findAnswer, loadQnAModel, isQnALoading } = useNLPEngine();

    const [isOpen, setIsOpen] = useState(false);

    // Load model on mount or open
    useEffect(() => {
        if (isOpen) loadQnAModel();
    }, [isOpen]);

    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            sender: 'ai',
            text: 'Hola. Soy Nexus, tu asistente cognitivo. ¿En qué puedo ayudarte?',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [location, setLocation] = useLocation();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            sender: 'user',
            text: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsProcessing(true);

        try {
            // Build Context String from Cognitive Engine
            const contextString = `
                User Role: ${role}. 
                Industry: ${industry}. 
                Active Modules: ${context.activeModules.join(", ")}.
                Current Page: ${location}.
                User Organization ID: ${context.organizationId}.
            `;

            // Use BERT Model
            const answers = await findAnswer(contextString, userMsg.text);

            let responseText = "No estoy seguro de entender.";
            if (answers && answers.length > 0) {
                responseText = answers[0].text;
            } else {
                // Fallback to basic logic or "I don't know"
                // For now, simpler fallback response
                responseText = `He procesado tu pregunta: "${userMsg.text}". (BERT Confidence: Low)`;
            }

            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: responseText,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMsg]);


            // Execute action if present
            // Execute action if present (Disabled for NLP v1)
            /*
            const action = response.action;
            if (action) {
                if (action.type === 'navigate') {
                    setTimeout(() => {
                        setLocation(String(action.payload));
                    }, 1000); 
                }
            }
            */

            // Auto-speak response if voice was used (optional)
            // copilotService.speak(aiMsg.text); 
        } catch (error) {
            console.error("Copilot error:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleListening = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            // Browser doesn't support speech recognition
            const aiMsg: ChatMessage = {
                id: Date.now().toString(),
                sender: 'ai',
                text: 'Lo siento, tu navegador no soporta reconocimiento de voz. Intenta usar Chrome o Edge.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
            return;
        }

        if (isListening) {
            copilotService.stopListening();
            setIsListening(false);
        } else {
            setIsListening(true);
            copilotService.startListening(
                (text) => {
                    setInputValue(text);
                },
                (error) => {
                    console.error("Speech error", error);
                    setIsListening(false);
                    // Show error in chat if it's a critical failure, but usually just stop listening
                    if (error !== 'aborted') {
                        // Optional: notify user
                    }
                }
            );
        }
    };

    return (
        <>
            {/* Floating Trigger Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(true)}
                className={cn(
                    "fixed bottom-8 right-8 z-50 p-4 rounded-full shadow-[0_0_30px_rgba(59,130,246,0.3)] backdrop-blur-xl border border-white/20 transition-all duration-300 group",
                    isOpen ? "hidden" : "flex items-center justify-center bg-slate-900/80"
                )}
            >
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 to-purple-500/20 animate-spin-slow group-hover:opacity-100 opacity-50 transition-opacity" />
                <Sparkles className="w-6 h-6 text-primary relative z-10" />
            </motion.button>

            {/* Main Interface */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-8 right-8 z-50 w-[400px] h-[600px] bg-slate-950/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse" />
                                    <Bot className="w-6 h-6 text-primary relative z-10" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Nexus Pilot</h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Online</span>
                                    </div>
                                </div>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-white rounded-full hover:bg-white/5" onClick={() => setIsOpen(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                            <div className="text-center py-6">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-600 font-black">Inicio de sesión cognitiva: {new Date().toLocaleTimeString()}</p>
                            </div>

                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "flex gap-3 max-w-[90%]",
                                        msg.sender === 'user' ? "ml-auto flex-row-reverse" : ""
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                                        msg.sender === 'user' ? "bg-slate-800 border-slate-700" : "bg-primary/10 border-primary/20"
                                    )}>
                                        {msg.sender === 'user' ? <MessageSquare className="w-4 h-4 text-slate-400" /> : <Bot className="w-4 h-4 text-primary" />}
                                    </div>

                                    <div className={cn(
                                        "p-3 rounded-2xl text-sm font-medium leading-relaxed",
                                        msg.sender === 'user'
                                            ? "bg-slate-800 text-slate-200 rounded-tr-none border border-slate-700"
                                            : "bg-gradient-to-br from-slate-900 to-slate-900/50 text-slate-100 rounded-tl-none border border-white/5 shadow-xl"
                                    )}>
                                        {msg.text}
                                    </div>
                                </motion.div>
                            ))}

                            {isProcessing && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex gap-3"
                                >
                                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                        <Sparkles className="w-4 h-4 text-primary animate-spin" />
                                    </div>
                                    <div className="bg-slate-900/50 p-3 rounded-2xl rounded-tl-none border border-white/5 flex gap-1 items-center h-[44px]">
                                        <span className="w-1.5 h-1.5 bg-primary animate-bounce rounded-full" />
                                        <span className="w-1.5 h-1.5 bg-primary animate-bounce [animation-delay:-0.15s] rounded-full" />
                                        <span className="w-1.5 h-1.5 bg-primary animate-bounce [animation-delay:-0.3s] rounded-full" />
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-slate-900/50 border-t border-white/5 backdrop-blur-md">
                            <div className="relative flex items-center gap-2">
                                <Input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Escribe o habla con Nexus..."
                                    className="bg-slate-950/50 border-slate-800 focus-visible:ring-primary/50 pl-4 pr-24 h-12 rounded-full text-xs font-medium"
                                />

                                <div className="absolute right-1 flex items-center gap-1">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className={cn(
                                            "h-9 w-9 rounded-full transition-all duration-300",
                                            isListening ? "text-red-500 bg-red-500/10 hover:bg-red-500/20" : "text-slate-400 hover:text-primary hover:bg-primary/10"
                                        )}
                                        onClick={toggleListening}
                                    >
                                        {isListening ? <StopCircle className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
                                    </Button>
                                    <Button
                                        size="icon"
                                        className="h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                                        onClick={handleSend}
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="mt-2 flex justify-center">
                                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Powered by Nexus Cognitive Engine v2.0</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
