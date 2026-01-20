import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Crown, ArrowRight, PartyPopper } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";

export default function SubscriptionSuccess() {
    const { profile } = useAuth();
    const [, setLocation] = useLocation();

    return (
        <AppLayout title="¡Suscripción Exitosa!" subtitle="Tu organización ha sido actualizada al siguiente nivel">
            <div className="max-w-2xl mx-auto py-12">
                <Card className="border-primary/20 bg-primary/5 shadow-2xl shadow-primary/10 animate-in zoom-in-95 duration-500">
                    <CardHeader className="text-center pb-2">
                        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-primary/30">
                            <Crown className="w-10 h-10 text-primary animate-bounce" />
                        </div>
                        <CardTitle className="text-4xl font-display font-black uppercase italic tracking-tighter text-white">
                            ¡Bienvenido a {profile?.organization?.subscriptionTier || 'Profesional'}!
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-8">
                        <div className="space-y-4">
                            <p className="text-slate-300 text-lg">
                                Felicidades **{profile?.user?.name}**. El sistema cognitivo de **{profile?.organization?.name}**
                                ha sido desbloqueado con capacidades premium.
                            </p>
                            <div className="flex items-center justify-center gap-2 text-success font-bold uppercase tracking-widest text-xs">
                                <CheckCircle2 className="w-4 h-4" />
                                Pago procesado correctamente
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-left space-y-2">
                                <p className="text-[10px] font-black uppercase text-primary tracking-widest">Capacidad</p>
                                <p className="text-sm text-slate-400">Terminales Ilimitadas habilitadas en toda la red.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-left space-y-2">
                                <p className="text-[10px] font-black uppercase text-primary tracking-widest">Inteligencia</p>
                                <p className="text-sm text-slate-400">Gobernanza de IA y Guardian Pro activados.</p>
                            </div>
                        </div>

                        <div className="pt-6 flex flex-col gap-3">
                            <Button asChild className="h-14 bg-primary hover:bg-primary/90 text-lg font-black uppercase tracking-widest glow-sm">
                                <Link href="/dashboard">
                                    Ir al Dashboard <ArrowRight className="ml-2 w-5 h-5" />
                                </Link>
                            </Button>
                            <Button variant="ghost" asChild className="text-slate-500 hover:text-white">
                                <Link href="/settings?tab=subscription">Ver detalles de facturación</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="mt-12 flex justify-center gap-12 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
                    {/* Mock partner logos or trust badges */}
                    <div className="font-display font-black italic text-xl">STRIPE</div>
                    <div className="font-display font-black italic text-xl">NEXUS AI</div>
                    <div className="font-display font-black italic text-xl">SaaS OS</div>
                </div>
            </div>
        </AppLayout>
    );
}
