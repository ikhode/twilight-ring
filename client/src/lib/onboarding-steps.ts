
import {
    Package,
    TrendingUp,
    ShoppingCart,
    DollarSign,
    Users,
    Workflow,
    Truck,
    FileText
} from 'lucide-react';

export interface OnboardingStep {
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
        // NEW: Action based triggers
        actionTrigger?: string; // Event name that automatically triggers "Next"
        actionRequirement?: string; // If present, "Next" button is hidden until this event occurs
    }[];
}

export const onboardingSteps: OnboardingStep[] = [
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
                position: 'right',
                actionTrigger: 'nav_/inventory'
            },
            {
                element: '[data-tour="add-product-btn"]',
                intro: '<strong>✨ ¡Ahora crea tu producto!</strong><br/><br/>Haz clic en este botón para abrir el formulario de registro y crear un ítem real.',
                position: 'bottom',
                actionTrigger: 'modal_opened_inventory'
            },
            {
                element: '[data-tour="product-name-field"]',
                intro: '<strong>🏷️ Nombre del Ítem</strong><br/><br/>Escribe un nombre real (ej: "Camisa Oxford XL"). Esto servirá para identificarlo en ventas.',
                position: 'right'
            },
            {
                element: '[data-tour="product-cost-field"]',
                intro: '<strong>💰 Costo y Margen</strong><br/><br/>Ingresa el costo unitario. Este dato es vital para:<br/>• Calcular margen real por unidad<br/>• Detectar variaciones de precio<br/>• Valorizar tu inventario',
                position: 'right'
            },
            {
                element: '[data-tour="product-save-footer"]',
                intro: '<strong>✅ Confirmar Registro</strong><br/><br/>Al guardar, el producto estará disponible para ventas y reportes inmediatos.',
                position: 'top',
                actionRequirement: 'product_created'
            },
            {
                element: '[data-tour="product-list"]',
                intro: '<strong>✅ Inventario Activo</strong><br/><br/>Tu producto ya es monitoreado. Desde aquí podrás ver su rotación y stock en tiempo real.',
                position: 'top'
            },
            {
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2 text-green-500">✅ Paso 1 Completado</h3><p class="text-lg">Producto operativo.<br/>Siguiente: Configurar un cliente para venta.</p></div>',
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
                intro: '<strong>Socios de Negocio</strong><br/>Aquí administras socios, clientes, proveedores y oportunidades.<br/><br/>👉 <em>Haz clic para entrar</em>',
                position: 'right',
                actionTrigger: 'nav_/crm'
            },
            {
                element: '[data-tour="customers-list"]',
                intro: '<strong>Base de Clientes</strong><br/>Aquí verás todos tus clientes con su historial completo de compras y cotizaciones.',
                position: 'top'
            },
            {
                element: '[data-tour="new-customer-btn"]',
                intro: '<strong>✨ ¡Crea tu primer cliente!</strong><br/><br/>Haz clic para abrir el formulario y registrar datos reales.',
                position: 'bottom',
                actionTrigger: 'modal_opened_crm'
            },
            {
                element: '[data-tour="customer-save-btn"]',
                intro: '<strong>💾 Guardar Cliente</strong><br/><br/>Ingresa el nombre y email. Al guardar, el cliente quedará vinculado a tu historial comercial.',
                position: 'top',
                actionRequirement: 'customer_created'
            },
            {
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2 text-green-500">✅ Paso 2 Completado</h3><p class="text-lg">Ya tienes un cliente registrado.<br/>Ahora sí, ¡vamos a hacer tu primera venta!</p></div>',
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
                position: 'right',
                actionTrigger: 'nav_/sales'
            },
            {
                element: '[data-tour="new-sale-btn"]',
                intro: '<strong>💰 Finalizar Venta</strong><br/><br/>Selecciona el cliente y producto, luego haz clic aquí para procesar el pago y cerrar la transacción.',
                position: 'bottom',
                actionRequirement: 'sale_completed'
            },
            {
                element: '[data-tour="sales-dashboard"]',
                intro: '<strong>✅ ¡Tu primera venta!</strong><br/><br/>Aquí verás:<br/>• Ventas del día/semana/mes<br/>• Productos más vendidos<br/>• Tendencias de ingresos<br/><br/>Inventario y contabilidad actualizados en tiempo real.',
                position: 'top'
            },
            {
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2 text-green-500">🎉 Paso 3 Completado</h3><p class="text-lg">¡Felicidades! Ya procesaste tu primera venta.<br/>Ahora veamos cómo gestionar compras a proveedores.</p></div>',
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
                intro: '<strong>✨ Crea una orden de compra</strong><br/><br/>1. Selecciona el proveedor<br/>2. Agrega productos a comprar<br/>3. Define cantidades y precios<br/>4. Genera la orden<br/><br/>Recepción actualiza stock y promedio de costos.',
                position: 'bottom'
            },
            {
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2 text-green-500">✅ Paso 4 Completado</h3><p class="text-lg">Ya sabes gestionar compras y proveedores.<br/>Continuemos con la gestión de empleados.</p></div>',
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
                intro: '<strong>Control de Asistencia</strong><br/><br/>Registra entradas/salidas:<br/>• Manualmente<br/>• Con terminales biométricas<br/>• Importando datos<br/><br/>Las asistencias se usan para calcular la nómina.',
                position: 'top'
            },
            {
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2 text-green-500">✅ Paso 5 Completado</h3><p class="text-lg">Ya tienes empleados registrados.<br/>Ahora veamos cómo procesar la nómina.</p></div>',
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
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2 text-green-500">✅ Paso 6 Completado</h3><p class="text-lg">Ya sabes procesar nómina eficientemente.<br/>Ahora automaticemos procesos con flujos.</p></div>',
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
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2 text-green-500">✅ Paso 7 Completado</h3><p class="text-lg">Los flujos te ahorrarán horas de trabajo.<br/>Veamos logística y entregas.</p></div>',
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
                intro: '<div class="text-center"><h3 class="text-xl font-bold mb-2 text-green-500">✅ Paso 8 Completado</h3><p class="text-lg">Tu logística está optimizada.<br/>Último paso: Gestión documental.</p></div>',
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
                intro: '<strong>✨ Sube documentos</strong><br/><br/>Arrastra archivos o haz clic:<br/>• PDFs<br/>• Imágenes<br/>• Excel/Word<br/>• Contratos<br/><br/>Clasificación automática por tipo de documento.',
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
