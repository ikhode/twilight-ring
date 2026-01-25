import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Brain, Command, Search, ArrowRight, Zap, Target } from "lucide-react";
import { useLocation } from "wouter";
import { useNLPEngine, SemanticMatch } from "@/lib/ai/nlp-engine";
import { cn } from "@/lib/utils";

const ACTIONS = [
    { id: "nav-dashboard", text: "Go to Operations Dashboard", keywords: "home main overview stats", path: "/" },
    { id: "nav-crm", text: "Open CRM / Customer Management", keywords: "clients sales customers leads", path: "/crm" },
    { id: "nav-hr", text: "Manage Employees & HR", keywords: "staff workers people hiring", path: "/hr" },
    { id: "nav-logistics", text: "Fleet & Logistics Control", keywords: "trucks vehicles routing delivery map", path: "/logistics" },
    { id: "nav-finance", text: "View Financial Reports", keywords: "money profit expenses cost accounting", path: "/finance" },
    { id: "nav-inventory", text: "Check Inventory Levels", keywords: "stock products warehouse items", path: "/inventory" },
    { id: "action-add-employee", text: "Register New Employee", keywords: "hire add worker new staff", path: "/hr?action=new" },
    { id: "action-add-supplier", text: "Add New Supplier", keywords: "vendor new purchase source", path: "/purchases?action=new" },
    { id: "action-route", text: "Optimize Delivery Routes", keywords: "plan map gps fast route", path: "/logistics?tab=routes" },
];

export function NeuralSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<typeof ACTIONS>([]);
    const [isThinking, setIsThinking] = useState(false);
    const [, setLocation] = useLocation();

    const { findSemanticMatches, loadUSEModel, isUSELoading } = useNLPEngine();

    // Toggle with Cmd+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    // Load model on open
    useEffect(() => {
        if (isOpen) loadUSEModel();
    }, [isOpen]);

    // Analyzing
    useEffect(() => {
        const analyze = async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            setIsThinking(true);
            try {
                // 1. Semantic Search (Deep Learning)
                // We compare the query against the "text" (human readable) AND "keywords" (hidden context)
                // for better robust matching, we construct a "context" string for each action
                const candidates = ACTIONS.map(a => `${a.text} . ${a.keywords}`);

                const matches = await findSemanticMatches(query, candidates);

                // matches is sorted by score. We need to map back to ACTIONS.
                // Since candidates array matches ACTIONS array index-wise:
                const topIndices = matches
                    .map(m => candidates.indexOf(m.text)) // Find index of the matched text
                    .filter(idx => idx !== -1)
                    .slice(0, 5); // Top 5

                const topActions = topIndices.map(idx => ACTIONS[idx]);
                setResults(topActions);

            } catch (e) {
                console.error(e);
            } finally {
                setIsThinking(false);
            }
        };

        const timer = setTimeout(analyze, 300); // Debounce
        return () => clearTimeout(timer);
    }, [query, findSemanticMatches]);

    const handleSelect = (path: string) => {
        setIsOpen(false);
        setLocation(path);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-0 gap-0 max-w-2xl bg-[#0F172A]/95 border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
                <DialogHeader className="hidden">
                    <DialogTitle>Neural Search</DialogTitle>
                    <DialogDescription>Search using natural language.</DialogDescription>
                </DialogHeader>

                <div className="flex items-center border-b border-white/10 px-4 h-16">
                    <Brain className={cn("w-5 h-5 mr-3", isThinking || isUSELoading ? "text-primary animate-pulse" : "text-slate-400")} />
                    <Input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Ask the Core... (e.g. 'My truck is broken', 'Hire a driver')"
                        className="flex-1 bg-transparent border-none text-lg h-full focus-visible:ring-0 placeholder:text-slate-500"
                    />
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="px-2 py-1 rounded bg-white/5 border border-white/5">ESC</span>
                    </div>
                </div>

                <div className="max-h-[500px] overflow-y-auto p-2">
                    {!query && (
                        <div className="p-8 text-center text-slate-500">
                            <Command className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="text-sm">Type anything. The Neural Kernel understands intent.</p>
                        </div>
                    )}

                    {results.map((action, i) => (
                        <div
                            key={action.id}
                            onClick={() => handleSelect(action.path)}
                            className={cn(
                                "flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all group",
                                "hover:bg-primary/10 hover:border-primary/20 border border-transparent"
                            )}
                        >
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary text-slate-400 group-hover:text-white transition-colors">
                                {i === 0 ? <Target className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-slate-200 group-hover:text-white">{action.text}</h4>
                                <p className="text-xs text-slate-500 group-hover:text-primary/80 line-clamp-1">{action.keywords}</p>
                            </div>
                            {i === 0 && (
                                <div className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-1 rounded">
                                    Best Match
                                </div>
                            )}
                            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        </div>
                    ))}

                    {query && results.length === 0 && !isThinking && (
                        <div className="p-4 text-center text-slate-500 text-sm">
                            No neural matches found.
                        </div>
                    )}
                </div>

                <div className="bg-black/40 p-2 px-4 flex justify-between items-center text-[10px] text-slate-600 uppercase tracking-widest font-mono">
                    <span>TFJS Universal Sentence Encoder</span>
                    <span>v5.0.0</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
