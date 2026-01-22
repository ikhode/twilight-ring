import { db } from "../storage";
import { knowledgeBase } from "@shared/schema";
import { chatAgentService } from "../services/chat-agents";
import { documentationService } from "../services/documentation";

/**
 * Seed initial documentation for the ERP system
 */
export async function seedDocumentation() {
  console.log("📚 Seeding documentation...");

  // Initialize chat agents first
  await chatAgentService.initializeAgents();

  const docs = [
    // GraphQL API Documentation
    {
      category: "graphql",
      title: "Introducción a la API GraphQL de NexusERP",
      content: `NexusERP expone una API GraphQL completa que permite consultar y modificar datos del sistema de manera eficiente.

**Endpoint**: \`/graphql/v1\`

**Autenticación**: Todas las peticiones requieren un token JWT en el header Authorization:
\`\`\`
Authorization: Bearer <tu-token>
\`\`\`

**Ejemplo de Query**:
\`\`\`graphql
query {
  organizations {
    id
    name
    industry
    subscriptionTier
  }
}
\`\`\`

**Ejemplo de Mutation**:
\`\`\`graphql
mutation {
  createProduct(input: {
    name: "Producto Ejemplo"
    sku: "PROD-001"
    category: "general"
    price: 10000
    cost: 5000
    stock: 100
  }) {
    id
    name
  }
}
\`\`\``,
      tags: ["graphql", "api", "authentication"],
      accessRoles: ["admin", "manager", "user"],
      metadata: { difficulty: "beginner" }
    },
    {
      category: "graphql",
      title: "Queries de Productos y Ventas",
      content: `Consulta productos y ventas en tu organización.

**Listar Productos**:
\`\`\`graphql
query {
  products(organizationId: "org-id") {
    id
    name
    sku
    category
    price
    cost
    stock
  }
}
\`\`\`

**Buscar Producto por SKU**:
\`\`\`graphql
query {
  product(sku: "PROD-001") {
    id
    name
    price
    stock
  }
}
\`\`\`

**Ventas Recientes**:
\`\`\`graphql
query {
  sales(limit: 10, orderBy: "date_desc") {
    id
    product {
      name
    }
    quantity
    totalPrice
    date
  }
}
\`\`\``,
      tags: ["graphql", "products", "sales"],
      accessRoles: ["admin", "manager", "user"],
      metadata: { difficulty: "intermediate" }
    },

    // Module Documentation
    {
      category: "module",
      title: "Módulo de Inventario - Guía Completa",
      content: `El módulo de inventario te permite gestionar productos, stock, y movimientos.

**Funcionalidades Principales**:
- Registro de productos con SKU único
- Control de stock en tiempo real
- Alertas de stock bajo
- Historial de movimientos
- Integración con ventas y compras

**Cómo Agregar un Producto**:
1. Ve al módulo "Inventario"
2. Click en "Nuevo Producto"
3. Completa los campos requeridos:
   - Nombre
   - SKU (único)
   - Categoría
   - Precio de venta
   - Costo
   - Stock inicial
4. Guarda el producto

**Alertas de Stock**:
El sistema te notificará automáticamente cuando el stock de un producto esté por debajo del mínimo configurado.`,
      tags: ["inventory", "products", "stock"],
      accessRoles: ["admin", "manager", "user"],
      metadata: { module: "inventory" }
    },
    {
      category: "module",
      title: "Módulo de Ventas - Tutorial",
      content: `Registra y gestiona ventas de manera eficiente.

**Registrar una Venta**:
1. Accede al módulo "Ventas"
2. Click en "Nueva Venta"
3. Selecciona el producto
4. Ingresa la cantidad
5. El sistema calculará automáticamente el total
6. Confirma la venta

**Nota**: El stock se actualizará automáticamente al confirmar la venta.

**Reportes de Ventas**:
- Ventas del día
- Ventas por producto
- Ventas por período
- Análisis de tendencias

**Integración con CRM**:
Puedes vincular ventas a clientes específicos para un mejor seguimiento.`,
      tags: ["sales", "revenue", "crm"],
      accessRoles: ["admin", "manager", "user"],
      metadata: { module: "sales" }
    },
    {
      category: "module",
      title: "Módulo de Recursos Humanos",
      content: `Gestiona empleados, asistencia, y nómina.

**Funcionalidades**:
- Registro de empleados
- Control de asistencia
- Gestión de adelantos de nómina
- Reportes de productividad

**Registrar Asistencia**:
Los empleados pueden marcar entrada/salida mediante:
- PIN en terminal
- Tarjeta RFID
- Reconocimiento facial
- Registro manual (gerentes)

**Adelantos de Nómina**:
Los empleados pueden solicitar adelantos que deben ser aprobados por un gerente.`,
      tags: ["hr", "employees", "payroll"],
      accessRoles: ["admin", "manager"],
      metadata: { module: "hr" }
    },

    // Process Documentation
    {
      category: "process",
      title: "Proceso de Onboarding para Nuevos Clientes",
      content: `El proceso de onboarding guía a nuevos clientes en la configuración inicial del sistema.

**Pasos del Onboarding**:
1. **Información de la Organización**: Nombre, industria, tamaño
2. **Selección de Módulos**: Elige los módulos relevantes para tu negocio
3. **Configuración de Procesos**: Define flujos de trabajo usando el Arquitecto de Procesos
4. **Invitación de Usuarios**: Agrega miembros del equipo
5. **Configuración de IA**: Ajusta Guardian, Copilot, y UI Adaptativa

**Arquitecto de Procesos**:
Usa React Flow para diseñar visualmente tus procesos de negocio. El sistema incluye plantillas predefinidas para diferentes industrias.`,
      tags: ["onboarding", "setup", "configuration"],
      accessRoles: ["admin"],
      metadata: { process: "onboarding" }
    },
    {
      category: "process",
      title: "Cognitive Process Engine (CPE)",
      content: `El CPE rastrea y analiza todos los procesos de negocio en tiempo real.

**Características**:
- Trazabilidad completa de procesos
- Detección de anomalías
- Análisis de causa raíz (RCA)
- Optimización automática
- Predicción de problemas

**Cómo Funciona**:
1. Define tus procesos en el sistema
2. El CPE registra cada evento
3. La IA analiza patrones y desviaciones
4. Recibes alertas y recomendaciones

**Ejemplo de RCA**:
Si se detecta merma excesiva en producción, el CPE analiza todos los eventos relacionados y sugiere la causa raíz (ej: falla mecánica, error humano, materia prima defectuosa).`,
      tags: ["cpe", "processes", "ai", "optimization"],
      accessRoles: ["admin", "manager"],
      metadata: { process: "cpe" }
    },

    // Tutorials
    {
      category: "tutorial",
      title: "Cómo Crear tu Primer Producto",
      content: `Tutorial paso a paso para crear un producto en NexusERP.

**Paso 1**: Accede al Dashboard
- Inicia sesión en NexusERP
- Verás el dashboard principal

**Paso 2**: Navega al Módulo de Inventario
- Click en "Módulos" en el menú lateral
- Selecciona "Inventario"

**Paso 3**: Crear Producto
- Click en el botón "Nuevo Producto"
- Completa el formulario:
  - **Nombre**: Nombre descriptivo del producto
  - **SKU**: Código único (ej: PROD-001)
  - **Categoría**: Selecciona o crea una categoría
  - **Precio**: Precio de venta en centavos (ej: 10000 = $100.00)
  - **Costo**: Costo del producto
  - **Stock**: Cantidad inicial en inventario

**Paso 4**: Guardar
- Click en "Guardar"
- El producto aparecerá en tu lista de inventario

**Consejo**: Usa SKUs consistentes para facilitar la búsqueda y organización.`,
      tags: ["tutorial", "products", "beginner"],
      accessRoles: ["admin", "manager", "user", "viewer"],
      metadata: { difficulty: "beginner", duration: "5min" }
    },
    {
      category: "tutorial",
      title: "Configuración de Alertas de Guardian",
      content: `Configura el sistema Guardian para detectar anomalías en tu negocio.

**Qué es Guardian**:
Guardian es la capa de IA que monitorea constantemente tus operaciones y detecta desviaciones anormales.

**Configuración**:
1. Ve a "Configuración" → "IA"
2. Activa "Guardian"
3. Ajusta la sensibilidad (1-10):
   - 1-3: Solo anomalías críticas
   - 4-7: Balance (recomendado)
   - 8-10: Muy sensible, detecta pequeñas desviaciones

**Tipos de Anomalías**:
- Merma excesiva en producción
- Ventas inusuales
- Gastos fuera de lo normal
- Patrones de asistencia irregulares

**Notificaciones**:
Recibirás alertas en tiempo real cuando Guardian detecte algo inusual.`,
      tags: ["tutorial", "ai", "guardian", "configuration"],
      accessRoles: ["admin", "manager"],
      metadata: { difficulty: "intermediate", duration: "10min" }
    },

    // Piecework & Production
    {
      category: "process",
      title: "Manual de Control de Destajo",
      content: `**Resumen**
El módulo de Destajo (Piecework) permite registrar y pagar actividades manuales por unidad producida (ej. Pelado, Deshuese).

**Flujo de Trabajo**:
1. El empleado acude al Kiosco o Supervisor.
2. Se registra el ticket:
   - **Empleado**: Quién hace el trabajo.
   - **Tarea**: Qué actividad (tiene precio definido).
   - **Cantidad**: Unidades procesadas.
   - **Ubicaciones**: Origen (MP) y Destino (PT) para trazabilidad.
3. El ticket queda en estado "Pendiente".
4. El Supervisor puede "Aprobar" o "Rechazar" validando la calidad.
5. Una vez Aprobado, pasa a "Por Pagar" en la nómina semanal.

**Validación de Fraude (CPE)**:
El sistema alerta automáticamente si la cantidad ingresada supera el promedio histórico (Outlier Detection) para prevenir errores de dedo o fraude.`,
      tags: ["manual", "piecework", "production"],
      accessRoles: ["admin", "manager", "user"],
      metadata: { module: "piecework" }
    },
    {
      category: "guide",
      title: "Uso del Kiosco de Producción",
      content: `**Acceso**
El Kiosco está diseñado para pantallas táctiles en planta.
Accede vía: \`/kiosk-terminal/:id\` o escaneando el QR en la estación.

**Funciones**:
- **Registrar Ticket**: Botón "Nuevo Ticket". Selecciona tu nombre y tarea.
- **Consultar Saldos**: Ver cuánto has generado en el día/semana.
- **Imprimir Recibo**: Genera un comprobante térmico para el empleado.

**Solución de Problemas**:
- Si no aparece tu nombre: Contacta a RRHH para verificar tu alta.
- Si no hay conexión: El kiosco guardará los datos localmente y sincronizará al regresar la red.`,
      tags: ["kiosk", "guide", "production"],
      accessRoles: ["admin", "manager", "user"],
      metadata: { module: "kiosks" }
    },

    // FAQs
    {
      category: "faq",
      title: "Preguntas Frecuentes - General",
      content: `**¿Cómo cambio mi contraseña?**
Ve a tu perfil → Configuración → Cambiar contraseña.

**¿Puedo usar NexusERP en móvil?**
Sí, la interfaz es completamente responsive y funciona en cualquier dispositivo.

**¿Cómo invito a miembros de mi equipo?**
Ve a Configuración → Usuarios → Invitar Usuario. Necesitas permisos de administrador.

**¿Qué significa mi nivel y XP?**
El sistema de gamificación te recompensa por usar el ERP. Ganas XP por completar tareas y alcanzar hitos.

**¿Cómo contacto soporte?**
Usa el chat de IA integrado o envía un email a soporte@nexuserp.com.`,
      tags: ["faq", "general", "support"],
      accessRoles: ["admin", "manager", "user", "viewer"],
      metadata: { category: "general" }
    },
    {
      category: "faq",
      title: "Preguntas Frecuentes - Facturación",
      content: `**¿Cuánto cuesta NexusERP?**
Ofrecemos diferentes planes:
- Trial: Gratis por 30 días
- Starter: $29/mes
- Professional: $99/mes
- Enterprise: Precio personalizado

**¿Puedo cambiar de plan?**
Sí, puedes actualizar o degradar tu plan en cualquier momento desde Configuración → Suscripción.

**¿Qué incluye cada plan?**
- Trial: Acceso limitado, 1 usuario
- Starter: Módulos básicos, hasta 5 usuarios
- Professional: Todos los módulos, hasta 25 usuarios, IA completa
- Enterprise: Ilimitado, soporte prioritario, personalización

**¿Hay descuentos por pago anual?**
Sí, 20% de descuento al pagar anualmente.`,
      tags: ["faq", "billing", "pricing"],
      accessRoles: ["admin"],
      metadata: { category: "billing" }
    }
  ];

  // Insert documentation
  for (const doc of docs) {
    const existing = await db.query.knowledgeBase.findFirst({
      where: (kb, { eq, and }) => and(
        eq(kb.title, doc.title),
        eq(kb.category, doc.category)
      )
    });

    if (!existing) {
      await documentationService.addDocument(doc);
      console.log(`  ✅ Added: ${doc.title}`);
    }
  }

  console.log("✅ Documentation seeded successfully!");
}
