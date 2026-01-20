import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

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

interface Conversation {
    id: string;
    title: string;
    lastMessageAt: string;
    agent: {
        name: string;
        description: string;
    };
}

export function ChatInterface() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Load conversations on mount
    useEffect(() => {
        if (isOpen) {
            loadConversations();
        }
    }, [isOpen]);

    // Load messages when conversation changes
    useEffect(() => {
        if (activeConversation) {
            loadMessages(activeConversation);
        }
    }, [activeConversation]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const loadConversations = async () => {
        try {
            const response = await fetch("/api/chat/conversations", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            const data = await response.json();
            setConversations(data.conversations || []);

            // Auto-select first conversation or create new one
            if (data.conversations?.length > 0) {
                setActiveConversation(data.conversations[0].id);
            } else {
                createNewConversation();
            }
        } catch (error) {
            console.error("Failed to load conversations:", error);
        }
    };

    const loadMessages = async (conversationId: string) => {
        try {
            const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            const data = await response.json();
            setMessages(data.messages || []);
        } catch (error) {
            console.error("Failed to load messages:", error);
        }
    };

    const createNewConversation = async () => {
        try {
            const response = await fetch("/api/chat/conversations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ title: "Nueva conversación" })
            });
            const data = await response.json();
            setActiveConversation(data.conversationId);
            loadConversations();
        } catch (error) {
            console.error("Failed to create conversation:", error);
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || !activeConversation || isLoading) return;

        const userMessage = input.trim();
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch(`/api/chat/conversations/${activeConversation}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ message: userMessage })
            });

            const data = await response.json();

            // Add both user and AI messages
            setMessages(prev => [...prev, data.userMessage, data.aiMessage]);

            // Reload conversations to update last message time
            loadConversations();
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 z-50"
                size="icon"
            >
                <Bot className="h-6 w-6" />
            </Button>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed bottom-6 right-6 w-[450px] h-[600px] bg-background border border-border rounded-lg shadow-2xl flex flex-col z-50 overflow-hidden"
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                        <Bot className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">NexusAI Assistant</h3>
                        <p className="text-xs text-white/80">Asistente de documentación</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:bg-white/20"
                >
                    <X className="h-5 w-5" />
                </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <AnimatePresence>
                    {messages.map((message, idx) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`mb-4 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div className={`flex gap-2 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === "user"
                                        ? "bg-blue-600"
                                        : "bg-gradient-to-br from-purple-600 to-blue-600"
                                    }`}>
                                    {message.role === "user" ? (
                                        <User className="h-4 w-4 text-white" />
                                    ) : (
                                        <Bot className="h-4 w-4 text-white" />
                                    )}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Card className={`p-3 ${message.role === "user"
                                            ? "bg-blue-600 text-white"
                                            : "bg-muted"
                                        }`}>
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    </Card>

                                    {/* Sources */}
                                    {message.metadata?.sources && message.metadata.sources.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {message.metadata.sources.map((source) => (
                                                <Badge
                                                    key={source.id}
                                                    variant="outline"
                                                    className="text-xs flex items-center gap-1"
                                                >
                                                    <FileText className="h-3 w-3" />
                                                    {source.title}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}

                                    {/* Confidence */}
                                    {message.metadata?.confidence !== undefined && (
                                        <p className="text-xs text-muted-foreground">
                                            Confianza: {(message.metadata.confidence * 100).toFixed(0)}%
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 text-muted-foreground"
                    >
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <p className="text-sm">Pensando...</p>
                    </motion.div>
                )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Pregunta sobre el ERP..."
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        size="icon"
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    Presiona Enter para enviar, Shift+Enter para nueva línea
                </p>
            </div>
        </motion.div>
    );
}
