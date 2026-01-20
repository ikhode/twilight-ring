import { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CognitiveButtonProps extends ButtonProps {
    onCognitiveClick?: () => Promise<void>;
    riskLevel?: "low" | "medium" | "high";
}

export function CognitiveButton({ children, onCognitiveClick, riskLevel = "low", className, ...props }: CognitiveButtonProps) {
    const [status, setStatus] = useState<"idle" | "analyzing" | "approved" | "rejected">("idle");

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        if (props.onClick) props.onClick(e);
        if (!onCognitiveClick) return;

        setStatus("analyzing");

        // Simulate AI analysis
        setTimeout(async () => {
            try {
                await onCognitiveClick();
                setStatus("approved");
                setTimeout(() => setStatus("idle"), 2000);
            } catch (error) {
                setStatus("rejected");
                setTimeout(() => setStatus("idle"), 2000);
            }
        }, 1500);
    };

    return (
        <Button
            {...props}
            onClick={handleClick}
            disabled={status === "analyzing" || props.disabled}
            className={cn("relative overflow-hidden transition-all duration-300", className)}
        >
            <AnimatePresence mode="wait">
                {status === "idle" && (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                    >
                        {children}
                    </motion.div>
                )}

                {status === "analyzing" && (
                    <motion.div
                        key="analyzing"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                    >
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Validando IA...
                    </motion.div>
                )}

                {status === "approved" && (
                    <motion.div
                        key="approved"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.5, opacity: 0 }}
                        className="flex items-center gap-2 text-green-500 font-bold"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-widest">Aprobado</span>
                    </motion.div>
                )}

                {status === "rejected" && (
                    <motion.div
                        key="rejected"
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-red-500 font-bold"
                    >
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-widest">Bloqueado</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Background Progress Effect */}
            {status === "analyzing" && (
                <motion.div
                    className="absolute bottom-0 left-0 h-0.5 bg-primary/50"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.5, ease: "linear" }}
                />
            )}
        </Button>
    );
}
