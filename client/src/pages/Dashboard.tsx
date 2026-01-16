import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  ShieldAlert, 
  TrendingUp, 
  MessageSquare, 
  Zap, 
  Target,
  AlertTriangle,
  ChevronRight,
  Activity,
  Globe,
  Lock,
  Search,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard() {
  const [guardianActive, setGuardianActive] = useState(true);
  const [aiMessage, setAiMessage] = useState("Analizando flujos de producción... He detectado una oportunidad de optimización del 12% en el área de pelado.");

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-8 space-y-8 font-sans selection:bg-primary/30">
      {/* Neural Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-2xl border border-primary/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <Brain className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase italic bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
                Cognitive Core <span className="text-primary text-2xl not-italic font-mono">v4.0</span>
              </h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.4em]">Autonomous Enterprise Intelligence</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-2xl border border-slate-800 backdrop-blur-xl">
          <div className="px-4 py-2 text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado Guardian</p>
            <div className="flex items-center gap-2 justify-end">
              <span className="w-2 h-2 rounded-full bg-success animate-ping" />
              <p className="text-sm font-black text-success uppercase">Activo & Vigilando</p>
            </div>
          </div>
          <div className="h-10 w-[1px] bg-slate-800" />
          <Button variant="ghost" className="rounded-xl hover:bg-white/5">
            <Search className="w-5 h-5 opacity-50" />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Predictions & Guardian */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Main Prediction Canvas */}
          <Card className="relative overflow-hidden border-0 bg-slate-950 shadow-2xl group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
            <div className="absolute top-0 right-0 p-8">
               <Zap className="w-12 h-12 text-primary/20" />
            </div>
            
            <CardContent className="p-10 relative z-10 space-y-10">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <Badge className="bg-primary/20 text-primary border-primary/30 mb-2 font-black uppercase tracking-widest text-[10px]">TensorFlow Prediction Engine</Badge>
                  <h2 className="text-5xl font-black tracking-tighter">PRONÓSTICO DE CIERRE</h2>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Confianza del Modelo</p>
                  <p className="text-3xl font-black font-mono text-primary italic">98.4%</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {[
                   { label: "Ingresos Estimados", val: "$1.2M", trend: "+14.2%", color: "text-success" },
                   { label: "Margen Operativo", val: "32.5%", trend: "-1.2%", color: "text-warning" },
                   { label: "Punto de Saturación", val: "Día 24", trend: "Óptimo", color: "text-primary" },
                 ].map((m, i) => (
                   <div key={i} className="space-y-2 p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:border-primary/30 transition-all duration-500">
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{m.label}</p>
                     <p className="text-4xl font-black tracking-tighter italic">{m.val}</p>
                     <p className={cn("text-xs font-bold flex items-center gap-1", m.color)}>
                       <TrendingUp className="w-3 h-3" /> {m.trend}
                     </p>
                   </div>
                 ))}
              </div>

              <div className="h-48 w-full bg-slate-900/50 rounded-[40px] border border-slate-800 flex items-center justify-center relative overflow-hidden group/chart">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#3b82f611_0%,_transparent_70%)] opacity-50" />
                <div className="flex items-baseline gap-2">
                   {[40, 60, 45, 70, 85, 65, 90, 100, 80, 95].map((h, i) => (
                     <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: i * 0.1, duration: 1 }}
                        key={i} 
                        className="w-8 bg-gradient-to-t from-primary/20 to-primary rounded-t-xl opacity-80 group-hover/chart:opacity-100 transition-all"
                     />
                   ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guardian Layer: Anomalies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-[#0f172a] border-warning/20 shadow-xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldAlert className="w-20 h-20 text-warning" />
              </div>
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center border border-warning/30">
                    <ShieldAlert className="w-5 h-5 text-warning" />
                  </div>
                  <h3 className="font-black uppercase tracking-tight text-warning italic">Guardian Layer: Vigilancia</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-warning/5 border border-warning/10 flex gap-4 animate-in fade-in duration-500">
                     <AlertTriangle className="w-6 h-6 text-warning shrink-0" />
                     <div>
                       <p className="text-sm font-bold text-warning uppercase">Anomalía Detectada: Almacén</p>
                       <p className="text-xs text-slate-400 mt-1">Desviación del 15% en merma de copra en Lote-992. Posible falla mecánica en prensa #4.</p>
                     </div>
                  </div>
                  <Button className="w-full bg-warning/10 hover:bg-warning/20 text-warning border border-warning/20 font-bold uppercase tracking-widest text-[10px] h-12 rounded-xl">
                    Iniciar Protocolo de Inspección
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0f172a] border-primary/20 shadow-xl overflow-hidden relative group">
               <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl italic text-primary">AI</div>
               <CardContent className="p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/30">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-black uppercase tracking-tight italic">Flujos Auto-ajustables</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    He detectado saturación en logística. He reconfigurado automáticamente tu dashboard para priorizar el rastreo de envíos y KPIs de última milla.
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="border-primary/30 text-primary text-[9px] uppercase font-black">UI Adaptada</Badge>
                    <Badge variant="outline" className="border-primary/30 text-primary text-[9px] uppercase font-black">KPIs Dinámicos</Badge>
                  </div>
               </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: AI Assistant & Global Context */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Omni Assistant */}
          <Card className="bg-primary shadow-[0_0_50px_rgba(59,130,246,0.2)] border-0 text-white overflow-hidden relative h-[500px]">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#ffffff33_0%,_transparent_60%)]" />
             <CardContent className="p-8 h-full flex flex-col justify-between relative z-10">
               <div className="space-y-6">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 animate-pulse shadow-glow">
                     <Brain className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Omnipresent AI</p>
                     <h3 className="text-2xl font-black tracking-tight italic">Tu Copiloto</h3>
                   </div>
                 </div>

                 <div className="p-6 rounded-3xl bg-black/20 border border-white/10 backdrop-blur-lg italic font-medium leading-relaxed">
                   "{aiMessage}"
                 </div>

                 <div className="space-y-3">
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Sugerencias rápidas</p>
                   {[
                     "¿Cómo va el rendimiento de hoy?",
                     "Optimiza ruta de despacho",
                     "Informe de mermas vs semana pasada"
                   ].map((s, i) => (
                     <button key={i} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-left text-xs font-bold hover:bg-white/10 transition-all flex items-center justify-between group">
                       {s}
                       <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                     </button>
                   ))}
                 </div>
               </div>

               <div className="relative">
                 <input 
                   placeholder="Pregúntale a tu ERP..." 
                   className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 pl-12 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 ring-white/30 transition-all"
                 />
                 <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40" />
               </div>
             </CardContent>
          </Card>

          {/* Living Architecture Status */}
          <Card className="bg-slate-900 border-slate-800 shadow-xl">
            <CardContent className="p-8 space-y-6">
               <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Módulos Activos (Living Arch)</h4>
               <div className="grid grid-cols-2 gap-3">
                 {["Producción", "Finanzas", "Logística", "Recursos Humanos"].map(m => (
                   <div key={m} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                     <span className="text-[10px] font-bold uppercase tracking-tighter">{m}</span>
                   </div>
                 ))}
                 <button className="p-3 rounded-xl border border-dashed border-slate-800 flex items-center gap-2 group hover:border-primary transition-all">
                    <Plus className="w-3 h-3 text-slate-500 group-hover:text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-500 group-hover:text-primary italic">Expandir...</span>
                 </button>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Global Intelligence Ribbon */}
      <footer className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Global Predictive Sync: Latencia 12ms</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Quantum Ledger Security</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <Badge variant="outline" className="border-slate-800 text-slate-500">Living Core v4.2</Badge>
           <p className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.4em]">© 2026 Revolutionary ERP Systems</p>
        </div>
      </footer>
    </div>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
  );
}
