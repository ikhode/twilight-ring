import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Lock, Eye, Database, CheckCircle2, AlertTriangle, History } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type ConsentType = 'share_metrics' | 'public_profile' | 'marketplace_participation' | 'industry_benchmarks' | 'external_verification';

interface ConsentStatus {
    consentType: ConsentType;
    isActive: boolean;
    grantedAt: string | null;
    revokedAt: string | null;
}

interface ConsentHistory {
    active: Array<{ type: ConsentType; grantedAt: string; version: string }>;
    revoked: Array<{ type: ConsentType; grantedAt: string; revokedAt: string }>;
}

const CONSENT_METADATA: Record<ConsentType, {
    label: string;
    description: string;
    icon: typeof Shield;
    impact: string;
    required: boolean;
}> = {
    share_metrics: {
        label: "Compartir Métricas Operacionales",
        description: "Permite que el sistema calcule tu Trust Score basado en tus datos de ventas, compras y pagos.",
        icon: Database,
        impact: "Sin esto, no se puede calcular tu Trust Score ni participar en el marketplace.",
        required: true
    },
    public_profile: {
        label: "Perfil Público en Marketplace",
        description: "Tu nombre de organización y Trust Score serán visibles para otros participantes del marketplace.",
        icon: Eye,
        impact: "Otros no podrán ver tu organización en el marketplace.",
        required: false
    },
    marketplace_participation: {
        label: "Participación en Marketplace B2B",
        description: "Permite crear listings, ver ofertas de otros y realizar transacciones en el marketplace.",
        icon: Shield,
        impact: "No podrás acceder a ninguna funcionalidad del marketplace.",
        required: true
    },
    industry_benchmarks: {
        label: "Análisis de Datos para Benchmarking",
        description: "Tus métricas (anonimizadas) se usarán para calcular promedios de industria y benchmarks.",
        icon: Database,
        impact: "No contribuirás a los benchmarks de la industria.",
        required: false
    },
    external_verification: {
        label: "Verificación con Contrapartes Externas",
        description: "Permite verificar tu reputación con proveedores y clientes que no están en el sistema.",
        icon: CheckCircle2,
        impact: "No se podrán verificar tus relaciones comerciales externas.",
        required: false
    }
};

export function ConsentManager() {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const [showHistory, setShowHistory] = useState(false);

    // Fetch consent status
    const { data: consentData, isLoading } = useQuery({
        queryKey: ["/api/trust/consent"],
        queryFn: async () => {
            const res = await fetch("/api/trust/consent", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch consent status");
            return res.json() as Promise<{ status: ConsentStatus[], history: ConsentHistory }>;
        },
        enabled: !!session?.access_token
    });

    // Grant consent mutation
    const grantMutation = useMutation({
        mutationFn: async (consentType: ConsentType) => {
            const res = await fetch("/api/trust/consent/grant", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ consentType })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to grant consent");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/trust/consent"] });
            queryClient.invalidateQueries({ queryKey: ["/api/trust/status"] });
        }
    });

    // Revoke consent mutation
    const revokeMutation = useMutation({
        mutationFn: async (consentType: ConsentType) => {
            const res = await fetch("/api/trust/consent/revoke", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ consentType })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to revoke consent");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/trust/consent"] });
            queryClient.invalidateQueries({ queryKey: ["/api/trust/status"] });
        }
    });

    // Grant all marketplace consents
    const grantAllMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/trust/consent/marketplace", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`
                }
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to grant marketplace consents");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/trust/consent"] });
            queryClient.invalidateQueries({ queryKey: ["/api/trust/status"] });
        }
    });

    const handleToggle = (consentType: ConsentType, currentlyActive: boolean) => {
        if (currentlyActive) {
            // Confirm revocation for required consents
            const metadata = CONSENT_METADATA[consentType];
            if (metadata.required) {
                const confirmed = window.confirm(
                    `⚠️ ADVERTENCIA\n\n${metadata.impact}\n\n¿Estás seguro de que deseas revocar este consentimiento?`
                );
                if (!confirmed) return;
            }
            revokeMutation.mutate(consentType);
        } else {
            grantMutation.mutate(consentType);
        }
    };

    const getConsentStatus = (type: ConsentType): boolean => {
        if (!consentData?.status || !Array.isArray(consentData.status)) {
            return false;
        }
        return consentData.status.find(c => c.consentType === type)?.isActive ?? false;
    };

    const hasAllMarketplaceConsents = () => {
        return getConsentStatus('share_metrics') &&
            getConsentStatus('marketplace_participation');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black italic tracking-tighter text-white">
                        CONTROL DE PRIVACIDAD
                    </h2>
                    <p className="text-slate-400 mt-1">
                        Gestiona qué datos compartes y cómo se utilizan
                    </p>
                </div>
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <History className="w-4 h-4" />
                    <span className="text-sm">Historial</span>
                </button>
            </div>

            {/* Quick Action: Enable Marketplace */}
            {!hasAllMarketplaceConsents() && (
                <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-6 border border-blue-500/30">
                    <div className="flex items-start gap-4">
                        <Shield className="w-6 h-6 text-blue-400 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="font-bold text-white mb-2">Activar Marketplace B2B</h3>
                            <p className="text-slate-300 text-sm mb-4">
                                Para participar en el marketplace, necesitas otorgar los consentimientos básicos.
                                Esto permite calcular tu Trust Score y ver ofertas de otros negocios.
                            </p>
                            <button
                                onClick={() => grantAllMutation.mutate()}
                                disabled={grantAllMutation.isPending}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                            >
                                {grantAllMutation.isPending ? "Activando..." : "Activar Marketplace"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Consent Toggles */}
            <div className="grid gap-4">
                {(Object.entries(CONSENT_METADATA) as [ConsentType, typeof CONSENT_METADATA[ConsentType]][]).map(([type, metadata]) => {
                    const isActive = getConsentStatus(type);
                    const Icon = metadata.icon;

                    return (
                        <div
                            key={type}
                            className={`bg-slate-800/50 rounded-xl p-6 border transition-all ${isActive
                                ? 'border-green-500/30 bg-green-500/5'
                                : 'border-slate-700 hover:border-slate-600'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-lg ${isActive ? 'bg-green-500/20' : 'bg-slate-700'}`}>
                                    <Icon className={`w-5 h-5 ${isActive ? 'text-green-400' : 'text-slate-400'}`} />
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-bold text-white">{metadata.label}</h3>
                                        {metadata.required && (
                                            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                                                Requerido
                                            </span>
                                        )}
                                        {isActive && (
                                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Activo
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-slate-300 text-sm mb-3">
                                        {metadata.description}
                                    </p>

                                    {!isActive && (
                                        <div className="flex items-start gap-2 text-sm text-slate-400 mb-3">
                                            <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                                            <span>{metadata.impact}</span>
                                        </div>
                                    )}

                                    {/* Last action timestamp */}
                                    {Array.isArray(consentData?.status) && consentData.status.find(c => c.consentType === type) && (
                                        <p className="text-xs text-slate-500">
                                            {isActive
                                                ? `Otorgado: ${new Date(consentData.status.find(c => c.consentType === type)!.grantedAt!).toLocaleString('es-MX')}`
                                                : consentData.status.find(c => c.consentType === type)!.revokedAt
                                                    ? `Revocado: ${new Date(consentData.status.find(c => c.consentType === type)!.revokedAt!).toLocaleString('es-MX')}`
                                                    : 'Nunca otorgado'
                                            }
                                        </p>
                                    )}
                                </div>

                                {/* Toggle Switch */}
                                <button
                                    onClick={() => handleToggle(type, isActive)}
                                    disabled={grantMutation.isPending || revokeMutation.isPending}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed ${isActive ? 'bg-green-500' : 'bg-slate-600'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* History Panel */}
            {showHistory && consentData?.history && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Historial de Cambios
                    </h3>

                    {(!consentData.history.active || consentData.history.active.length === 0) &&
                        (!consentData.history.revoked || consentData.history.revoked.length === 0) ? (
                        <p className="text-slate-400 text-sm">No hay cambios registrados</p>
                    ) : (
                        <div className="space-y-3">
                            {/* Active consents */}
                            {consentData.history.active.slice(0, 5).map((entry, idx) => (
                                <div key={`active-${idx}`} className="flex items-center gap-3 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-slate-300">
                                        {CONSENT_METADATA[entry.type].label}
                                    </span>
                                    <span className="text-green-400">
                                        Otorgado
                                    </span>
                                    <span className="text-slate-500 ml-auto">
                                        {new Date(entry.grantedAt).toLocaleString('es-MX')}
                                    </span>
                                </div>
                            ))}

                            {/* Revoked consents */}
                            {consentData.history.revoked.slice(0, 5).map((entry, idx) => (
                                <div key={`revoked-${idx}`} className="flex items-center gap-3 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                                    <span className="text-slate-300">
                                        {CONSENT_METADATA[entry.type].label}
                                    </span>
                                    <span className="text-orange-400">
                                        Revocado
                                    </span>
                                    <span className="text-slate-500 ml-auto">
                                        {new Date(entry.revokedAt).toLocaleString('es-MX')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Legal Notice */}
            <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                <p className="text-xs text-slate-400">
                    <Lock className="w-3 h-3 inline mr-1" />
                    Todos los cambios de consentimiento son registrados con timestamp, IP y user agent para cumplimiento legal (LFPDPPP/GDPR).
                    Puedes ejercer tus derechos ARCO en cualquier momento.
                </p>
            </div>
        </div>
    );
}
