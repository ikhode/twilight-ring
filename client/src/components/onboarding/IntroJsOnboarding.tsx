import { useEffect, useState } from 'react';
import introJs from 'intro.js';
import 'intro.js/introjs.css';
import '@/styles/introjs-custom.css';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot,
    Sparkles,
    Package,
    ShoppingCart,
    DollarSign,
    Users,
    Workflow,
    CheckCircle2,
    Zap,
    ArrowRight,
    Building2,
    ChevronRight as ChevronIcon,
    TrendingUp,
    Truck,
    FileText
} from 'lucide-react';
import { INDUSTRY_TEMPLATES } from '@/lib/industry-templates';
import { useAuth } from '@/hooks/use-auth';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/app-store';
import { apiRequest } from '@/lib/queryClient';

interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    icon: any;
    color: string;
    tourSteps: {
        element?: string;
        intro: string;
        title?: string;
        position?: 'top' | 'bottom' | 'left' | 'right';
    }[];
}

const onboardingSteps: OnboardingStep[] = [
    {
        id: 'products',
        title: '1. Crear Productos',
        description: '¡Comencemos! Crea tu primer producto real en el sistema',
        icon: Package,
        color: 'from-blue-500 to-cyan-500',
        tourSteps: [
            {
                intro: '<div class="text-center"><h2 class="text-2xl font-bold mb-2">🎯 Paso 1: Productos</h2><p class="text-lg">Vamos a crear tu <strong>primer producto real</strong> en el sistema.<br/>Este producto lo usaremos después para crear ventas.</p></div>',
            },
            {
                element: '[data-tour="inventory-nav"]',
                intro: '<strong>Módulo de Inventario</strong><br/>Aquí gestionas todos tus productos, stock y movimientos.<br/><br/>👉 <em>Haz clic para ir a Inventario</em>',
                position: 'right'
            },
            {
                element: '[data-tour="add-product-btn"]',
                intro: '<strong>✨ ¡Ahora crea tu producto!</strong><br/><br/>Haz clic en este botón para abrir el formulario de registro y crear un ítem real.',
                position: 'bottom'
            },
            {
                element: '[data-tour="product-name-field"]',
                intro: '<strong>🏷️ Nombre del Ítem</strong><br/><br/>Escribe un nombre real (ej: "Camisa Oxford XL"). Esto servirá para identificarlo en ventas.',
                position: 'right'
            },
            {
                element: '[data-tour="product-cost-field"]',
                intro: '<strong>💰 Costo y Margen</strong><br/><br/>Ingresa el costo unitario de compra o producción. La IA lo usará para calcular tu rentabilidad.',
                position: 'right'
            },
            {
                element: '[data-tour="product-save-footer"]',
                intro: '<strong>✅ ¡Listo para guardar!</strong><br/><br/>Haz clic en "Confirmar Registro" para dar de alta el producto. Después de guardarlo, aparecerá en tu lista principal.',
                position: 'top'
            },
            {
                element: '[data-tour="product-list"]',
                intro: '<strong>✅ ¡Excelente!</strong><br/><br/>Aquí verás el producto que acabas de crear. Ya tienes tu primer activo registrado.',
                position: 'top'
            },
            {
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2 text-green-500">✅ ¡Paso 1 Completado!</h3><p class="text-lg">Ya tienes tu primer producto.<br/>Ahora vamos a crear un cliente para poder venderle.</p></div>',
            }
        ]
    },
    {
        id: 'crm',
        title: '2. Crear Cliente',
        description: 'Registra tu primer cliente para poder hacer ventas',
        icon: TrendingUp,
        color: 'from-indigo-500 to-purple-500',
        tourSteps: [
            {
                intro: '<div class="text-center"><h2 class="text-2xl font-bold mb-2">🎯 Paso 2: Clientes</h2><p class="text-lg">Ahora vamos a crear un <strong>cliente real</strong>.<br/>Lo necesitamos para poder registrar ventas.</p></div>',
            },
            {
                element: '[data-tour="crm-nav"]',
                intro: '<strong>Módulo CRM</strong><br/>Aquí administras clientes, cotizaciones y oportunidades de venta.<br/><br/>👉 <em>Haz clic para ir a CRM</em>',
                position: 'right'
            },
            {
                element: '[data-tour="customers-list"]',
                intro: '<strong>Base de Clientes</strong><br/>Aquí verás todos tus clientes con su historial completo de compras y cotizaciones.',
                position: 'top'
            },
            {
                element: '[data-tour="new-customer-btn"]',
                intro: '<strong>✨ ¡Crea tu primer cliente!</strong><br/><br/>Registra un cliente real con:<br/>• Nombre o razón social<br/>• Email<br/>• Teléfono<br/>• Dirección<br/><br/>⚠️ <strong>Importante:</strong> Guarda el cliente antes de continuar.',
                position: 'bottom'
            },
            {
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2 text-green-500">✅ ¡Paso 2 Completado!</h3><p class="text-lg">Ya tienes un cliente registrado.<br/>Ahora sí, ¡vamos a hacer tu primera venta!</p></div>',
            }
        ]
    },
    {
        id: 'sales',
        title: '3. Procesar Primera Venta',
        description: 'Usa el producto y cliente que creaste para hacer una venta real',
        icon: ShoppingCart,
        color: 'from-green-500 to-emerald-500',
        tourSteps: [
            {
                intro: '<div class="text-center"><h2 class="text-2xl font-bold mb-2">💰 Paso 3: Primera Venta</h2><p class="text-lg">¡Momento emocionante!<br/>Vamos a procesar una <strong>venta real</strong> usando:<br/>✓ El producto que creaste<br/>✓ El cliente que registraste</p></div>',
            },
            {
                element: '[data-tour="sales-nav"]',
                intro: '<strong>Módulo de Ventas</strong><br/>Desde aquí gestionas todas tus ventas, cotizaciones y órdenes.<br/><br/>👉 <em>Haz clic para ir a Ventas</em>',
                position: 'right'
            },
            {
                element: '[data-tour="new-sale-btn"]',
                intro: '<strong>✨ ¡Crea tu primera venta!</strong><br/><br/>1. Selecciona el cliente que creaste<br/>2. Agrega el producto que registraste<br/>3. Define la cantidad<br/>4. Genera la factura<br/><br/>⚠️ <strong>Importante:</strong> Completa la venta antes de continuar.',
                position: 'bottom'
            },
            {
                element: '[data-tour="sales-dashboard"]',
                intro: '<strong>✅ ¡Tu primera venta!</strong><br/><br/>Aquí verás:<br/>• Ventas del día/semana/mes<br/>• Productos más vendidos<br/>• Tendencias de ingresos<br/><br/>El stock de tu producto se actualizó automáticamente.',
                position: 'top'
            },
            {
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2 text-green-500">🎉 ¡Paso 3 Completado!</h3><p class="text-lg">¡Felicidades! Ya procesaste tu primera venta.<br/>Ahora veamos cómo gestionar compras a proveedores.</p></div>',
            }
        ]
    },
    {
        id: 'purchases',
        title: '4. Gestionar Compras',
        description: 'Crea proveedores y órdenes de compra para reabastecer inventario',
        icon: DollarSign,
        color: 'from-purple-500 to-pink-500',
        tourSteps: [
            {
                intro: '<div class="text-center"><h2 class="text-2xl font-bold mb-2">🛒 Paso 4: Compras</h2><p class="text-lg">Aprende a gestionar <strong>proveedores</strong> y crear<br/><strong>órdenes de compra</strong> para reabastecer inventario.</p></div>',
            },
            {
                element: '[data-tour="purchases-nav"]',
                intro: '<strong>Módulo de Compras</strong><br/>Gestiona órdenes de compra, recepción de mercancía y pagos a proveedores.<br/><br/>👉 <em>Haz clic para ir a Compras</em>',
                position: 'right'
            },
            {
                element: '[data-tour="suppliers-section"]',
                intro: '<strong>Proveedores</strong><br/><br/>Primero registra un proveedor con:<br/>• Nombre de la empresa<br/>• Contacto<br/>• Términos de pago<br/>• Productos que suministra',
                position: 'top'
            },
            {
                element: '[data-tour="new-purchase-btn"]',
                intro: '<strong>✨ Crea una orden de compra</strong><br/><br/>1. Selecciona el proveedor<br/>2. Agrega productos a comprar<br/>3. Define cantidades y precios<br/>4. Genera la orden<br/><br/>Cuando recibas la mercancía, el stock se actualizará automáticamente.',
                position: 'bottom'
            },
            {
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2 text-green-500">✅ ¡Paso 4 Completado!</h3><p class="text-lg">Ya sabes gestionar compras y proveedores.<br/>Continuemos con la gestión de empleados.</p></div>',
            }
        ]
    },
    {
        id: 'employees',
        title: '5. Registrar Empleados',
        description: 'Agrega empleados al sistema para gestionar nómina y asistencias',
        icon: Users,
        color: 'from-teal-500 to-green-500',
        tourSteps: [
            {
                intro: '<div class="text-center"><h2 class="text-2xl font-bold mb-2">👥 Paso 5: Empleados</h2><p class="text-lg">Registra a tu equipo en el sistema para poder<br/>gestionar asistencias y procesar nómina.</p></div>',
            },
            {
                element: '[data-tour="employees-nav"]',
                intro: '<strong>Módulo de Empleados</strong><br/>Gestiona tu equipo, asistencias, roles y permisos.<br/><br/>👉 <em>Haz clic para ir a Empleados</em>',
                position: 'right'
            },
            {
                element: '[data-tour="add-employee-btn"]',
                intro: '<strong>✨ Registra un empleado</strong><br/><br/>Agrega información:<br/>• Nombre completo<br/>• Puesto<br/>• Salario<br/>• Fecha de ingreso<br/>• Datos de contacto<br/><br/>⚠️ <strong>Importante:</strong> Guarda el empleado antes de continuar.',
                position: 'bottom'
            },
            {
                element: '[data-tour="attendance-section"]',
                intro: '<strong>Control de Asistencia</strong><br/><br/>Registra entradas/salidas:<br/>• Manualmente<br/>• Con terminales cognitivas (facial recognition)<br/>• Importando datos<br/><br/>Las asistencias se usan para calcular la nómina.',
                position: 'top'
            },
            {
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2 text-green-500">✅ ¡Paso 5 Completado!</h3><p class="text-lg">Ya tienes empleados registrados.<br/>Ahora veamos cómo procesar la nómina.</p></div>',
            }
        ]
    },
    {
        id: 'payroll',
        title: '6. Procesar Nómina',
        description: 'Calcula y genera pagos de nómina automáticamente',
        icon: DollarSign,
        color: 'from-emerald-500 to-teal-500',
        tourSteps: [
            {
                intro: '<div class="text-center"><h2 class="text-2xl font-bold mb-2">💼 Paso 6: Nómina</h2><p class="text-lg">Aprende a procesar pagos de nómina<br/>usando los empleados que registraste.</p></div>',
            },
            {
                element: '[data-tour="payroll-nav"]',
                intro: '<strong>Módulo de Nómina</strong><br/>Procesa pagos, calcula deducciones y genera recibos automáticamente.<br/><br/>👉 <em>Haz clic para ir a Nómina</em>',
                position: 'right'
            },
            {
                element: '[data-tour="payroll-process-btn"]',
                intro: '<strong>✨ Procesar Nómina</strong><br/><br/>El sistema calcula automáticamente:<br/>• Salarios base<br/>• Horas extras<br/>• Deducciones (IMSS, ISR)<br/>• Bonos y comisiones<br/><br/>Genera recibos y exporta a CFDI.',
                position: 'bottom'
            },
            {
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2 text-green-500">✅ ¡Paso 6 Completado!</h3><p class="text-lg">Ya sabes procesar nómina eficientemente.<br/>Ahora automaticemos procesos con flujos.</p></div>',
            }
        ]
    },
    {
        id: 'workflows',
        title: '7. Automatizar con Flujos',
        description: 'Crea flujos visuales para automatizar procesos repetitivos',
        icon: Workflow,
        color: 'from-orange-500 to-red-500',
        tourSteps: [
            {
                intro: '<div class="text-center"><h2 class="text-2xl font-bold mb-2">⚡ Paso 7: Flujos de Trabajo</h2><p class="text-lg">Automatiza procesos repetitivos con<br/>flujos visuales sin código.</p></div>',
            },
            {
                element: '[data-tour="workflows-nav"]',
                intro: '<strong>Editor de Flujos</strong><br/>Crea flujos que automatizan tareas y conectan módulos.<br/><br/>👉 <em>Haz clic para ir a Flujos</em>',
                position: 'right'
            },
            {
                element: '[data-tour="workflow-templates"]',
                intro: '<strong>Plantillas de Flujos</strong><br/><br/>Usa plantillas predefinidas:<br/>• Notificar cuando stock bajo<br/>• Aprobar órdenes de compra<br/>• Generar reportes automáticos<br/>• Y más...',
                position: 'left'
            },
            {
                element: '[data-tour="workflow-canvas"]',
                intro: '<strong>Canvas de Diseño</strong><br/><br/>Arrastra y conecta nodos:<br/>• Triggers (disparadores)<br/>• Condiciones (if/else)<br/>• Acciones (enviar email, crear registro)<br/>• Dispositivos IoT',
                position: 'top'
            },
            {
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2 text-green-500">✅ ¡Paso 7 Completado!</h3><p class="text-lg">Los flujos te ahorrarán horas de trabajo.<br/>Veamos logística y entregas.</p></div>',
            }
        ]
    },
    {
        id: 'logistics',
        title: '8. Logística y Entregas',
        description: 'Gestiona rutas, flotas y entregas en tiempo real',
        icon: Truck,
        color: 'from-yellow-500 to-orange-500',
        tourSteps: [
            {
                intro: '<div class="text-center"><h2 class="text-2xl font-bold mb-2">🚚 Paso 8: Logística</h2><p class="text-lg">Optimiza entregas y gestiona tu flota<br/>con rastreo GPS en tiempo real.</p></div>',
            },
            {
                element: '[data-tour="logistics-nav"]',
                intro: '<strong>Módulo de Logística</strong><br/>Gestiona rutas, vehículos, conductores y entregas.<br/><br/>👉 <em>Haz clic para ir a Logística</em>',
                position: 'right'
            },
            {
                element: '[data-tour="fleet-map"]',
                intro: '<strong>Mapa de Flota</strong><br/><br/>Visualiza en tiempo real:<br/>• Ubicación de vehículos<br/>• Estado de entregas<br/>• Rutas activas<br/>• Alertas de mantenimiento',
                position: 'top'
            },
            {
                element: '[data-tour="routes-section"]',
                intro: '<strong>Rutas Optimizadas</strong><br/><br/>El sistema calcula rutas eficientes:<br/>• Menor distancia<br/>• Menos tiempo<br/>• Ahorro de combustible<br/>• Asignación automática a conductores',
                position: 'left'
            },
            {
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2 text-green-500">✅ ¡Paso 8 Completado!</h3><p class="text-lg">Tu logística está optimizada.<br/>Último paso: Gestión documental.</p></div>',
            }
        ]
    },
    {
        id: 'documents',
        title: '9. Organizar Documentos',
        description: 'Digitaliza y organiza toda tu documentación empresarial',
        icon: FileText,
        color: 'from-pink-500 to-rose-500',
        tourSteps: [
            {
                intro: '<div class="text-center"><h2 class="text-2xl font-bold mb-2">📄 Paso 9: Documentos</h2><p class="text-lg">Digitaliza y organiza toda tu documentación<br/>de forma segura y accesible.</p></div>',
            },
            {
                element: '[data-tour="documents-nav"]',
                intro: '<strong>Gestión Documental</strong><br/>Almacena, organiza y comparte documentos de forma segura.<br/><br/>👉 <em>Haz clic para ir a Documentos</em>',
                position: 'right'
            },
            {
                element: '[data-tour="upload-doc-btn"]',
                intro: '<strong>✨ Sube documentos</strong><br/><br/>Arrastra archivos o haz clic:<br/>• PDFs<br/>• Imágenes<br/>• Excel/Word<br/>• Contratos<br/><br/>Se categorizan automáticamente con IA.',
                position: 'bottom'
            },
            {
                element: '[data-tour="doc-categories"]',
                intro: '<strong>Categorías</strong><br/><br/>Organiza por tipo:<br/>• Contratos<br/>• Facturas<br/>• Expedientes de empleados<br/>• Documentos legales<br/>• Y más...',
                position: 'top'
            },
            {
                intro: '<div class="text-center"><h2 class="text-2xl font-bold mb-2 text-green-500">🎉 ¡Felicidades!</h2><p class="text-xl mb-4">Has completado el onboarding completo.</p><p class="text-lg">Ya tienes:<br/>✓ Productos creados<br/>✓ Clientes registrados<br/>✓ Ventas procesadas<br/>✓ Compras gestionadas<br/>✓ Empleados y nómina<br/>✓ Flujos automatizados<br/>✓ Logística optimizada<br/>✓ Documentos organizados</p><br/><p class="text-xl font-bold text-primary">¡Estás listo para usar Nexus ERP al máximo!</p></div>',
            }
        ]
    }
];

export function IntroJsOnboarding() {
    const [, setLocation] = useLocation();
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const store = useAppStore();
    const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null);
    const [completedSteps, setCompletedSteps] = useState<string[]>([]);
    const [showWelcome, setShowWelcome] = useState(true);
    const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Check if user has completed onboarding
        const hasCompletedOnboarding = localStorage.getItem('nexus_introjs_completed');
        if (hasCompletedOnboarding) {
            setLocation('/dashboard');
        }
    }, [setLocation]);

    const handleIndustrySelect = async (industryKey: string) => {
        setIsSaving(true);
        setSelectedIndustry(industryKey);

        // Optimistic Update: Apply template locally immediately
        store.applyIndustryTemplate(industryKey);

        try {
            const template = INDUSTRY_TEMPLATES[industryKey];
            await apiRequest('PATCH', '/api/organization', {
                industry: industryKey,
                settings: {
                    productCategories: template.categories,
                    defaultUnits: template.units,
                    industryName: template.name
                }
            }, {
                'Authorization': `Bearer ${session?.access_token}`
            });

            // Invalidate configurations to reflect new categories and trigger data fetch
            queryClient.invalidateQueries({ queryKey: ["/api/config"] });
            queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
            queryClient.invalidateQueries({ queryKey: ["/api/organization"] });

        } catch (error) {
            console.error("Error setting industry:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const startTour = (stepIndex: number) => {
        const step = onboardingSteps[stepIndex];
        setCurrentStepIndex(stepIndex);
        setShowWelcome(false);

        // Navigate to the appropriate page based on the step
        const navigationMap: Record<string, string> = {
            'products': '/inventory',
            'sales': '/sales',
            'purchases': '/purchases',
            'workflows': '/workflows',
            'payroll': '/finance/payroll',
            'crm': '/crm',
            'logistics': '/logistics',
            'documents': '/documents'
        };

        const targetPath = navigationMap[step.id];
        if (targetPath) {
            setLocation(targetPath);
        }

        // Wait for navigation and DOM to be ready
        setTimeout(() => {
            const intro = introJs();

            intro.setOptions({
                steps: step.tourSteps,
                showProgress: true,
                showBullets: false,
                exitOnOverlayClick: false,
                dontShowAgain: false,
                nextLabel: 'Siguiente →',
                prevLabel: '← Anterior',
                doneLabel: '✓ Completar',
                skipLabel: 'Saltar',
            });

            intro.oncomplete(() => {
                setCompletedSteps(prev => [...prev, step.id]);

                // If this is the last step, mark onboarding as complete
                if (stepIndex === onboardingSteps.length - 1) {
                    localStorage.setItem('nexus_introjs_completed', 'true');
                    setLocation('/dashboard');
                } else {
                    // Show the welcome screen again to select next module
                    setShowWelcome(true);
                    setCurrentStepIndex(null);
                }
            });

            intro.onexit(() => {
                setShowWelcome(true);
                setCurrentStepIndex(null);
            });

            intro.start();
        }, 500);
    };

    const skipOnboarding = () => {
        localStorage.setItem('nexus_introjs_completed', 'true');
        setLocation('/dashboard');
    };

    if (!showWelcome) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)]" />
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px]" />

            {/* Floating Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-primary/30 rounded-full"
                        initial={{
                            x: Math.random() * window.innerWidth,
                            y: Math.random() * window.innerHeight,
                        }}
                        animate={{
                            y: [null, Math.random() * window.innerHeight],
                            x: [null, Math.random() * window.innerWidth],
                        }}
                        transition={{
                            duration: Math.random() * 10 + 10,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                    />
                ))}
            </div>

            {/* Header */}
            <header className="relative z-20 p-6 flex justify-between items-center bg-slate-950/50 backdrop-blur-md border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                        <Bot className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="font-black text-2xl tracking-tighter uppercase italic leading-none">
                            Nexus <span className="text-primary">Onboarding</span>
                        </h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                            Sistema de Aprendizaje Interactivo
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    onClick={skipOnboarding}
                    className="text-slate-400 hover:text-white"
                >
                    Saltar Tutorial
                </Button>
            </header>

            {/* Main Content */}
            <main className="flex-1 relative z-10 p-8 overflow-y-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="max-w-7xl mx-auto"
                    >
                        {/* Welcome Section */}
                        <div className="text-center mb-12">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6"
                            >
                                <Sparkles className="w-4 h-4 text-primary" />
                                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                                    {selectedIndustry ? `Nexus ERP para ${INDUSTRY_TEMPLATES[selectedIndustry].name}` : 'Bienvenido a Nexus ERP'}
                                </span>
                            </motion.div>

                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-5xl font-black uppercase italic tracking-tighter mb-4"
                            >
                                {selectedIndustry
                                    ? <>Aprende a <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">Dominar</span> tu Negocio</>
                                    : <>Configura tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">Experiencia</span></>
                                }
                            </motion.h2>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="text-slate-400 text-lg max-w-2xl mx-auto"
                            >
                                {selectedIndustry
                                    ? "Selecciona un módulo para comenzar un tour interactivo personalizado para tu industria."
                                    : "Para ofrecerte una experiencia personalizada, cuéntanos: ¿Cuál es el giro de tu negocio?"
                                }
                            </motion.p>
                        </div>

                        {!selectedIndustry ? (
                            /* Industry Selection Grid */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                                {Object.entries(INDUSTRY_TEMPLATES).map(([key, template], idx) => (
                                    <motion.div
                                        key={key}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        onClick={() => handleIndustrySelect(key)}
                                        className="group relative cursor-pointer"
                                    >
                                        <Card className="bg-slate-900/40 border-slate-800 hover:border-primary/50 transition-all duration-300 p-6 h-full flex flex-col items-center text-center group-hover:bg-slate-900/60 overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <Building2 className="w-8 h-8 text-primary" />
                                            </div>
                                            <h3 className="text-xl font-bold mb-2">{template.name}</h3>
                                            <p className="text-xs text-slate-400 mb-4 px-4 line-clamp-2">
                                                Incluye categorías como: {template.categories.slice(0, 3).join(", ")} y más.
                                            </p>
                                            <div className="mt-auto flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 group-hover:gap-3 transition-all">
                                                Seleccionar <ChevronIcon className="w-4 h-4" />
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            /* Modules Grid (Original logic with minor tweaks) */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {onboardingSteps.map((step, index) => {
                                    const Icon = step.icon;
                                    const isCompleted = completedSteps.includes(step.id);

                                    return (
                                        <motion.div
                                            key={step.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 * index }}
                                        >
                                            <Card
                                                className={`
                                                    group relative overflow-hidden bg-slate-900/40 border-slate-800 
                                                    hover:border-primary/50 transition-all duration-300 cursor-pointer
                                                    hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] hover:scale-105
                                                    ${isCompleted ? 'border-green-500/50 bg-green-500/5' : ''}
                                                `}
                                                onClick={() => startTour(index)}
                                            >
                                                {/* Gradient Background */}
                                                <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-10 transition-opacity`} />

                                                {/* Completed Badge */}
                                                {isCompleted && (
                                                    <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                                        <span className="text-white text-xs">✓</span>
                                                    </div>
                                                )}

                                                <CardContent className="p-6 relative z-10">
                                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} p-0.5 mb-4`}>
                                                        <div className="w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center">
                                                            <Icon className="w-7 h-7 text-white" />
                                                        </div>
                                                    </div>

                                                    <h3 className="text-lg font-black uppercase tracking-tight mb-2">
                                                        {step.title}
                                                    </h3>

                                                    <p className="text-sm text-slate-400 leading-relaxed mb-4">
                                                        {step.description}
                                                    </p>

                                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary group-hover:gap-3 transition-all">
                                                        {isCompleted ? 'Revisar Tour' : 'Iniciar Tour'}
                                                        <ArrowRight className="w-4 h-4" />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Complete Onboarding Button */}
                        {completedSteps.length === onboardingSteps.length && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-12 text-center"
                            >
                                <Button
                                    onClick={skipOnboarding}
                                    className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white font-black uppercase tracking-wider text-sm h-14 px-8 rounded-2xl shadow-[0_0_40px_rgba(59,130,246,0.4)] group"
                                >
                                    <Sparkles className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                                    Ir al Dashboard
                                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </motion.div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}
