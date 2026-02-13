/**
 * TrustNet - Legal Copy & Consent Texts
 * 
 * Professional, GDPR/LFPDPPP-compliant consent language
 * Designed for government and enterprise trust
 */

export const TRUSTNET_LEGAL_COPY = {
    // Main positioning
    tagline: "TrustNet no decide. TrustNet documenta.",
    subtitle: "Verificación operativa basada en datos que tu organización genera",

    // Trust Score Levels (Professional naming)
    trustLevels: {
        0: { label: "No Verificable", range: "0-399", description: "Datos insuficientes para cálculo" },
        1: { label: "Básico", range: "400-599", description: "Operación inicial verificada" },
        2: { label: "Confiable", range: "600-799", description: "Cumplimiento operativo demostrado" },
        3: { label: "Alto", range: "800-899", description: "Excelencia operativa consistente" },
        4: { label: "Institucional", range: "900-1000", description: "Referente de industria" },
    },

    // Consent Types - Full Legal Text
    consents: {
        share_metrics: {
            title: "Métricas Operacionales",
            required: true,
            shortDescription: "Procesamiento de métricas para cálculo de Trust Score",
            fullText: `
**Consentimiento para el Uso de Métricas Operacionales**

El Usuario autoriza a la Plataforma a procesar métricas operacionales derivadas de su actividad dentro del ERP, incluyendo datos relacionados con:

• Cumplimiento de pagos y entregas
• Resolución de disputas
• Estabilidad operativa relativa

**Exclusivamente para:**
a) El cálculo interno del Trust Score
b) La visualización del desempeño dentro de su propia organización

**Protección de datos:**
• No incluyen montos absolutos
• No incluyen información bancaria sensible
• No incluyen datos personales
• No serán compartidos con terceros sin consentimiento adicional

**Sin este consentimiento:**
No es posible calcular su Trust Score.
      `.trim(),
            internalNote: "🔒 Estas métricas siempre se usan internamente para tu ERP. Tú decides si se usan externamente para TrustNet / Marketplace.",
        },

        public_profile: {
            title: "Perfil Público en Marketplace",
            required: false,
            shortDescription: "Visibilidad de nombre y Trust Score en marketplace",
            fullText: `
**Perfil Público y Participación en Marketplace**

Al habilitar su perfil público, el Usuario autoriza la visualización de:

• Nombre de la organización
• Nivel de Trust Score (rango, no valor exacto)

**No se expone:**
• Información financiera detallada
• Métricas desagregadas
• Datos de transacciones específicas

**Revocación:**
El Usuario puede revocar este consentimiento en cualquier momento.
      `.trim(),
            dependsOn: "marketplace_participation",
            disabledTooltip: "Requiere participación en Marketplace",
        },

        marketplace_participation: {
            title: "Participación en Marketplace B2B",
            required: true, // Required for marketplace features
            shortDescription: "Acceso para crear y ver listings empresariales",
            fullText: `
**Participación en Marketplace B2B**

El Usuario autoriza:

• Crear listings de productos/servicios
• Ver listings de otras organizaciones verificadas
• Participar en transacciones B2B dentro de la plataforma

**Requisitos:**
• Trust Score mínimo calculado
• Consentimiento de métricas operacionales activo

**Transparencia:**
Las transacciones en Marketplace son verificables y contribuyen a su Trust Score.
      `.trim(),
            dependsOn: "share_metrics",
        },

        industry_benchmarks: {
            title: "Análisis de Datos para Benchmarking",
            required: false,
            shortDescription: "Contribución anónima a promedios de industria",
            fullText: `
**Uso de Datos para Benchmarking de Industria**

El Usuario autoriza el uso de métricas **anonimizadas y agregadas** para la generación de indicadores estadísticos de industria.

**Anonimización fuerte:**
• Tus métricas se combinan con las de otras organizaciones
• Se usan de forma agregada para calcular promedios
• En ningún caso permiten identificar directa o indirectamente a tu organización

**Beneficio mutuo:**
• Acceso a benchmarks de tu industria
• Comparación anónima con el mercado
• Mejora continua basada en datos del sector

🛡️ **Protección garantizada:** Cumplimiento total con LFPDPPP y GDPR.
      `.trim(),
            icon: "🧠",
        },

        external_verification: {
            title: "Verificación con Contrapartes Externas",
            required: false,
            shortDescription: "Validación cruzada con clientes/proveedores",
            fullText: `
**Verificación con Contrapartes Externas**

La Plataforma solo realizará procesos de verificación con contrapartes externas **previa acción explícita del Usuario**, por contraparte y por evento.

**Control total:**
• Tú decides cuándo iniciar una verificación
• Tú eliges qué contraparte verificar
• Tú apruebas cada solicitud

**Proceso:**
1. Solicitas verificación de una contraparte específica
2. La plataforma envía solicitud (con tu autorización)
3. La contraparte confirma o rechaza
4. El resultado se refleja en tu Trust Score

**Garantía:**
La Plataforma **no contactará terceros** de forma automática ni sin autorización expresa.
      `.trim(),
            icon: "🤝",
        },
    },

    // Legal Disclaimers
    disclaimers: {
        noDecision: `
**Limitación de Responsabilidad**

El Trust Score es un indicador informativo basado en métricas operativas verificables.

**No constituye:**
• Una evaluación legal, financiera o crediticia
• Un reemplazo de procesos de diligencia debida
• Una auditoría formal
• Una evaluación contractual vinculante

**Uso recomendado:**
Como herramienta complementaria de análisis operativo, no como única fuente de decisión.
    `.trim(),

        dataOwnership: `
**Propiedad de los Datos**

Todos los datos operacionales pertenecen exclusivamente a tu organización.

La Plataforma actúa como procesador, no como propietario.
Puedes exportar o eliminar tus datos en cualquier momento.
    `.trim(),

        auditTrail: `
**Trazabilidad y Auditoría**

Todas las acciones relacionadas con consentimientos y Trust Score son registradas con:
• Timestamp
• Dirección IP
• User Agent
• Usuario responsable

Estos registros están disponibles para auditorías internas o externas.
    `.trim(),
    },

    // Trust Score Dimensions (for breakdown display)
    dimensions: {
        payment_compliance: {
            name: "Cumplimiento Operativo",
            weight: "30%",
            description: "Pagos a tiempo, entregas cumplidas, SLA respetados",
            tooltip: "Gobierno y enterprise compran cumplimiento, no promesas",
        },
        delivery_timeliness: {
            name: "Estabilidad Financiera Relativa",
            weight: "20%",
            description: "Regularidad de pagos, tendencia, ratio disputas/operaciones",
            tooltip: "Comportamiento financiero relativo, sin exponer montos absolutos",
        },
        dispute_rate: {
            name: "Historial de Incidentes",
            weight: "20%",
            description: "Disputas, tiempo de resolución, resoluciones a favor/en contra",
            tooltip: "No castigamos por tener disputas, castigamos por no resolverlas",
            inverted: true,
        },
        order_fulfillment: {
            name: "Verificación Externa",
            weight: "15%",
            description: "Contrapartes verificadas, confirmaciones cruzadas, antigüedad",
            tooltip: "No lo dice el sistema, lo dicen terceros",
        },
        response_time: {
            name: "Transparencia y Consentimiento",
            weight: "15%",
            description: "Nivel de datos compartidos, perfil público, benchmarking",
            tooltip: "Compartir datos habilita más verificación",
        },
    },

    // Marketing Copy (for government/enterprise)
    marketing: {
        governmentPitch: "TrustNet es una capa de verificación operativa basada en datos que el propio ente genera. No sustituye procesos legales, los refuerza con evidencia objetiva.",

        enterprisePitch: "Infraestructura de confianza programable para evaluación de proveedores, onboarding acelerado y benchmarking sectorial.",

        differentiator: "No usamos datos externos ni opiniones. Solo datos operativos verificables.",

        useCases: {
            government: [
                "Precalificación de proveedores",
                "Monitoreo de cumplimiento continuo",
                "Alertas tempranas (no sanciones)",
                "Auditorías con evidencia histórica",
            ],
            enterprise: [
                "Evaluación de proveedores",
                "Onboarding más rápido",
                "Menos riesgo reputacional",
                "Benchmarking sectorial anónimo",
            ],
        },
    },

    // Privacy Modes
    privacyModes: {
        private: {
            label: "Privado",
            description: "Solo ERP interno",
            icon: "🔒",
            features: ["Métricas internas", "Sin exposición externa", "Trust Score privado"],
        },
        observer: {
            label: "Observador",
            description: "Trust Score visible, sin datos",
            icon: "👁️",
            features: ["Trust Score público", "Sin métricas detalladas", "Perfil básico"],
        },
        public: {
            label: "Público",
            description: "Marketplace completo",
            icon: "🌐",
            features: ["Marketplace activo", "Verificación externa", "Benchmarking"],
        },
    },
} as const;

export type ConsentKey = keyof typeof TRUSTNET_LEGAL_COPY.consents;
export type PrivacyMode = keyof typeof TRUSTNET_LEGAL_COPY.privacyModes;
