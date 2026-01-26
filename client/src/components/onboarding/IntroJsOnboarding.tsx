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
    TrendingUp,
    Truck,
    FileText,
    Zap,
    ArrowRight
} from 'lucide-react';

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
        title: 'Crear Productos',
        description: 'Aprende a registrar y gestionar tu catálogo de productos o servicios',
        icon: Package,
        color: 'from-blue-500 to-cyan-500',
        tourSteps: [
            {
                intro: '<div class="text-center"><h2 class="text-2xl font-bold mb-2">🎯 Gestión de Productos</h2><p>Vamos a crear tu primer producto en el sistema</p></div>',
            },
            {
                element: '[data-tour="inventory-nav"]',
                intro: '<strong>Módulo de Inventario</strong><br/>Aquí gestionas todos tus productos, stock y movimientos.',
                position: 'right'
            },
            {
                element: '[data-tour="add-product-btn"]',
                intro: '<strong>Agregar Producto</strong><br/>Haz clic aquí para crear un nuevo producto. Puedes agregar nombre, SKU, precio, stock inicial y más.',
                position: 'bottom'
            },
            {
                element: '[data-tour="product-list"]',
                intro: '<strong>Lista de Productos</strong><br/>Aquí verás todos tus productos. Puedes editarlos, ver su stock en tiempo real y gestionar variantes.',
                position: 'top'
            },
            {
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2">✅ ¡Perfecto!</h3><p>Ya sabes cómo gestionar productos. Continuemos con las ventas.</p></div>',
            }
        ]
    },
    {
        id: 'sales',
        title: 'Procesar Ventas',
        description: 'Descubre cómo registrar ventas, generar facturas y dar seguimiento',
        icon: ShoppingCart,
        color: 'from-green-500 to-emerald-500',
        tourSteps: [
            {
                intro: '<div class="text-center"><h2 class="text-2xl font-bold mb-2">💰 Módulo de Ventas</h2><p>Aprende a procesar ventas y generar órdenes</p></div>',
            },
            {
                element: '[data-tour="sales-nav"]',
                intro: '<strong>Ventas</strong><br/>Desde aquí gestionas todas tus ventas, cotizaciones y órdenes.',
                position: 'right'
            },
            {
                element: '[data-tour="new-sale-btn"]',
                intro: '<strong>Nueva Venta</strong><br/>Crea una venta rápidamente. Selecciona cliente, productos, cantidades y genera la factura.',
                position: 'bottom'
            },
            {
                element: '[data-tour="sales-dashboard"]',
                intro: '<strong>Dashboard de Ventas</strong><br/>Visualiza tus ventas del día, semana y mes. Identifica tendencias y productos más vendidos.',
                position: 'top'
            },
            {
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2">🎉 ¡Excelente!</h3><p>Ahora sabes cómo procesar ventas. Veamos las compras.</p></div>',
            }
        ]
    },
    {
        id: 'purchases',
        title: 'Gestionar Compras',
        description: 'Aprende a crear órdenes de compra y gestionar proveedores',
        icon: DollarSign,
        color: 'from-purple-500 to-pink-500',
        tourSteps: [
            {
                intro: '<div class="text-center"><h2 class="text-2xl font-bold mb-2">🛒 Gestión de Compras</h2><p>Administra tus compras y proveedores</p></div>',
            },
            {
                element: '[data-tour="purchases-nav"]',
                intro: '<strong>Módulo de Compras</strong><br/>Gestiona órdenes de compra, recepción de mercancía y pagos a proveedores.',
                position: 'right'
            },
            {
                element: '[data-tour="new-purchase-btn"]',
                intro: '<strong>Nueva Orden de Compra</strong><br/>Crea órdenes de compra, selecciona proveedor, productos y cantidades.',
                position: 'bottom'
            },
            {
                element: '[data-tour="suppliers-section"]',
                intro: '<strong>Proveedores</strong><br/>Gestiona tu catálogo de proveedores, términos de pago y historial de compras.',
                position: 'top'
            },
            {
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2">✨ ¡Genial!</h3><p>Ya dominas las compras. Ahora veamos los flujos de trabajo.</p></div>',
            }
        ]
    },
    {
        id: 'workflows',
        title: 'Crear Flujos de Trabajo',
        description: 'Automatiza procesos con flujos visuales personalizados',
        icon: Workflow,
        color: 'from-orange-500 to-red-500',
        tourSteps: [
            {
                intro: '<div class="text-center"><h2 class="text-2xl font-bold mb-2">⚡ Flujos de Trabajo</h2><p>Automatiza y optimiza tus procesos de negocio</p></div>',
            },
            {
                element: '[data-tour="workflows-nav"]',
                intro: '<strong>Editor de Flujos</strong><br/>Crea flujos visuales que automatizan tareas repetitivas y conectan diferentes módulos.',
                position: 'right'
            },
            {
                element: '[data-tour="workflow-canvas"]',
                intro: '<strong>Canvas de Diseño</strong><br/>Arrastra y conecta nodos para diseñar tus procesos. Triggers, acciones, condiciones y más.',
                position: 'top'
            },
            {
                element: '[data-tour="workflow-templates"]',
                intro: '<strong>Plantillas</strong><br/>Usa plantillas predefinidas para tu industria o crea flujos desde cero.',
                position: 'left'
            },
            {
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2">🚀 ¡Increíble!</h3><p>Los flujos te ahorrarán horas de trabajo. Continuemos con la nómina.</p></div>',
            }
        ]
    },
    {
        id: 'payroll',
        title: 'Pago de Nómina',
        description: 'Gestiona empleados, asistencias y procesa la nómina',
        icon: Users,
        color: 'from-teal-500 to-green-500',
        tourSteps: [
            {
                intro: '<div class="text-center"><h2 class="text-2xl font-bold mb-2">👥 Gestión de Nómina</h2><p>Administra empleados y procesa pagos</p></div>',
            },
            {
                element: '[data-tour="employees-nav"]',
                intro: '<strong>Empleados</strong><br/>Gestiona tu equipo, asistencias, roles y permisos.',
                position: 'right'
            },
            {
                element: '[data-tour="payroll-nav"]',
                intro: '<strong>Nómina</strong><br/>Procesa pagos de nómina, calcula deducciones y genera recibos automáticamente.',
                position: 'right'
            },
            {
                element: '[data-tour="attendance-section"]',
                intro: '<strong>Control de Asistencia</strong><br/>Registra entradas/salidas con terminales cognitivas o manualmente.',
                position: 'top'
            },
            {
                element: '[data-tour="payroll-process-btn"]',
                intro: '<strong>Procesar Nómina</strong><br/>Calcula y genera la nómina del periodo. Exporta a CFDI o tu sistema contable.',
                position: 'bottom'
            },
            {
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2">💼 ¡Perfecto!</h3><p>Ahora puedes gestionar tu equipo eficientemente. Veamos más módulos.</p></div>',
            }
        ]
    },
    {
        id: 'crm',
        title: 'Gestión de Clientes (CRM)',
        description: 'Administra clientes, cotizaciones y seguimiento de oportunidades',
        icon: TrendingUp,
        color: 'from-indigo-500 to-purple-500',
        tourSteps: [
            {
                intro: '<div class="text-center"><h2 class="text-2xl font-bold mb-2">🎯 CRM - Clientes</h2><p>Gestiona relaciones con tus clientes</p></div>',
            },
            {
                element: '[data-tour="crm-nav"]',
                intro: '<strong>Módulo CRM</strong><br/>Administra clientes, cotizaciones, seguimiento y oportunidades de venta.',
                position: 'right'
            },
            {
                element: '[data-tour="customers-list"]',
                intro: '<strong>Base de Clientes</strong><br/>Visualiza y gestiona toda tu cartera de clientes con historial completo.',
                position: 'top'
            },
            {
                element: '[data-tour="new-quote-btn"]',
                intro: '<strong>Cotizaciones</strong><br/>Genera cotizaciones profesionales y conviértelas en ventas con un clic.',
                position: 'bottom'
            },
            {
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2">📈 ¡Excelente!</h3><p>Tu CRM está listo. Veamos logística.</p></div>',
            }
        ]
    },
    {
        id: 'logistics',
        title: 'Logística y Entregas',
        description: 'Gestiona rutas, flotas y entregas en tiempo real',
        icon: Truck,
        color: 'from-yellow-500 to-orange-500',
        tourSteps: [
            {
                intro: '<div class="text-center"><h2 class="text-2xl font-bold mb-2">🚚 Logística</h2><p>Optimiza entregas y gestiona tu flota</p></div>',
            },
            {
                element: '[data-tour="logistics-nav"]',
                intro: '<strong>Módulo de Logística</strong><br/>Gestiona rutas, vehículos, conductores y entregas en tiempo real.',
                position: 'right'
            },
            {
                element: '[data-tour="fleet-map"]',
                intro: '<strong>Mapa de Flota</strong><br/>Visualiza la ubicación de tus vehículos en tiempo real con GPS.',
                position: 'top'
            },
            {
                element: '[data-tour="routes-section"]',
                intro: '<strong>Rutas Optimizadas</strong><br/>Crea rutas eficientes y asígnalas a conductores con un clic.',
                position: 'left'
            },
            {
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2">🎯 ¡Fantástico!</h3><p>Tu logística está optimizada. Último módulo: Documentos.</p></div>',
            }
        ]
    },
    {
        id: 'documents',
        title: 'Gestión Documental',
        description: 'Organiza y digitaliza documentos empresariales',
        icon: FileText,
        color: 'from-pink-500 to-rose-500',
        tourSteps: [
            {
                intro: '<div class="text-center"><h2 class="text-2xl font-bold mb-2">📄 Documentos</h2><p>Digitaliza y organiza toda tu documentación</p></div>',
            },
            {
                element: '[data-tour="documents-nav"]',
                intro: '<strong>Gestión Documental</strong><br/>Almacena, organiza y comparte documentos de forma segura.',
                position: 'right'
            },
            {
                element: '[data-tour="upload-doc-btn"]',
                intro: '<strong>Subir Documentos</strong><br/>Arrastra archivos o haz clic para subirlos. Categoriza y etiqueta automáticamente.',
                position: 'bottom'
            },
            {
                element: '[data-tour="doc-categories"]',
                intro: '<strong>Categorías</strong><br/>Organiza por tipo: Contratos, Facturas, Expedientes, etc.',
                position: 'top'
            },
            {
                intro: '<div class="text-center"><h2 class="text-2xl font-bold mb-2 text-green-500">🎉 ¡Felicidades!</h2><p class="text-lg">Has completado el onboarding. ¡Ahora estás listo para usar Nexus ERP al máximo!</p></div>',
            }
        ]
    }
];

export function IntroJsOnboarding() {
    const [, setLocation] = useLocation();
    const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null);
    const [completedSteps, setCompletedSteps] = useState<string[]>([]);
    const [showWelcome, setShowWelcome] = useState(true);

    useEffect(() => {
        // Check if user has completed onboarding
        const hasCompletedOnboarding = localStorage.getItem('nexus_introjs_completed');
        if (hasCompletedOnboarding) {
            setLocation('/dashboard');
        }
    }, [setLocation]);

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
                                    Bienvenido a Nexus ERP
                                </span>
                            </motion.div>

                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-5xl font-black uppercase italic tracking-tighter mb-4"
                            >
                                Aprende a <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">Dominar</span> tu Sistema
                            </motion.h2>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="text-slate-400 text-lg max-w-2xl mx-auto"
                            >
                                Selecciona cualquier módulo para comenzar un tour interactivo.
                                Aprende a crear productos, procesar ventas, gestionar nómina y más.
                            </motion.p>

                            {/* Progress Indicator */}
                            {completedSteps.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="mt-6 inline-flex items-center gap-3 px-6 py-3 bg-green-500/10 border border-green-500/20 rounded-full"
                                >
                                    <Zap className="w-5 h-5 text-green-500" />
                                    <span className="text-sm font-bold text-green-500">
                                        {completedSteps.length} de {onboardingSteps.length} módulos completados
                                    </span>
                                </motion.div>
                            )}
                        </div>

                        {/* Onboarding Steps Grid */}
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
