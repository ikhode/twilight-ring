# Sistema de Onboarding con Intro.js

## Descripción

Hemos implementado un sistema de onboarding interactivo usando **Intro.js** que reemplaza el flujo de onboarding anterior. Este nuevo sistema permite a los usuarios aprender a usar el sistema de forma práctica, guiándolos paso a paso a través de cada módulo.

## Características Principales

### 🎯 Tours Interactivos por Módulo

El sistema incluye tours guiados para los siguientes módulos:

1. **Productos (Inventario)** - Aprende a crear y gestionar productos
2. **Ventas** - Procesa ventas y genera facturas
3. **Compras** - Gestiona órdenes de compra y proveedores
4. **Flujos de Trabajo** - Automatiza procesos con flujos visuales
5. **Nómina** - Gestiona empleados y procesa pagos
6. **CRM** - Administra clientes y cotizaciones
7. **Logística** - Optimiza rutas y entregas
8. **Documentos** - Organiza documentación empresarial

### ✨ Características del Sistema

- **Progreso Guardado**: El sistema recuerda qué módulos ya completaste
- **Navegación Automática**: Te lleva automáticamente a la página correcta para cada tour
- **Diseño Atractivo**: Interfaz moderna con animaciones y efectos visuales
- **Personalización**: Tours adaptados a cada módulo con pasos específicos
- **Omitible**: Los usuarios pueden saltar el onboarding si lo desean

## Estructura de Archivos

```
client/src/
├── components/
│   └── onboarding/
│       └── IntroJsOnboarding.tsx    # Componente principal de onboarding
├── styles/
│   └── introjs-custom.css           # Estilos personalizados para Intro.js
└── App.tsx                          # Ruta actualizada para usar nuevo onboarding

docs/
└── data-tour-guide.md               # Guía de atributos data-tour
```

## Uso

### Para Usuarios

1. Al registrarse, los usuarios son dirigidos a `/onboarding`
2. Se muestra una pantalla con todos los módulos disponibles
3. Al hacer clic en un módulo, se inicia el tour interactivo
4. El sistema navega automáticamente a la página correcta
5. Los pasos se muestran uno por uno con explicaciones
6. Al completar todos los tours, pueden ir al dashboard

### Para Desarrolladores

#### Agregar un Nuevo Tour

1. Edita `IntroJsOnboarding.tsx`
2. Agrega un nuevo objeto al array `onboardingSteps`:

```tsx
{
    id: 'mi-modulo',
    title: 'Mi Módulo',
    description: 'Descripción del módulo',
    icon: MiIcono,
    color: 'from-blue-500 to-cyan-500',
    tourSteps: [
        {
            intro: '<h2>Bienvenido</h2><p>Descripción inicial</p>',
        },
        {
            element: '[data-tour="mi-elemento"]',
            intro: 'Explicación del elemento',
            position: 'bottom'
        },
        // ... más pasos
    ]
}
```

#### Agregar Atributos data-tour

Para que Intro.js pueda identificar elementos, agrega el atributo `data-tour`:

```tsx
<Button data-tour="mi-boton">
  Mi Botón
</Button>
```

Consulta `docs/data-tour-guide.md` para ver todos los atributos disponibles.

## Personalización de Estilos

Los estilos de Intro.js están personalizados en `client/src/styles/introjs-custom.css` para coincidir con el tema oscuro de Nexus ERP:

- **Colores**: Azul primario (#3b82f6) y degradados
- **Tema**: Oscuro con glassmorphism
- **Animaciones**: Transiciones suaves y efectos hover
- **Responsive**: Adaptado para móviles y tablets

## Configuración de Intro.js

Las opciones de Intro.js se configuran en el componente:

```tsx
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
```

## Flujo de Onboarding

```
Usuario se registra
    ↓
Redirigido a /onboarding
    ↓
Pantalla de selección de módulos
    ↓
Usuario selecciona un módulo
    ↓
Sistema navega a la página del módulo
    ↓
Intro.js inicia el tour
    ↓
Usuario completa el tour
    ↓
Regresa a pantalla de selección
    ↓
Repite hasta completar todos los módulos
    ↓
Redirigido a /dashboard
```

## Almacenamiento Local

El sistema usa `localStorage` para guardar el progreso:

- `nexus_introjs_completed`: Marca si el onboarding está completo
- Los módulos completados se rastrean en el estado del componente

## Próximos Pasos

### Tareas Pendientes

- [ ] Agregar atributos `data-tour` a todas las páginas (ver `data-tour-guide.md`)
- [ ] Crear tours más detallados para cada módulo
- [ ] Agregar videos o GIFs demostrativos en los tours
- [ ] Implementar hints (pistas) para funciones avanzadas
- [ ] Agregar analytics para rastrear qué tours completan los usuarios
- [ ] Crear tours contextuales que se activen automáticamente

### Mejoras Futuras

- **Tours Contextuales**: Mostrar tours cuando el usuario accede a una función por primera vez
- **Hints Persistentes**: Pequeños indicadores que muestran tips sobre funciones avanzadas
- **Tours Personalizados**: Diferentes tours según el rol del usuario (admin, manager, operator)
- **Modo Práctica**: Permitir a los usuarios repetir tours en cualquier momento
- **Certificación**: Dar insignias o certificados al completar todos los tours

## Soporte

Para agregar o modificar tours, consulta:
- Documentación de Intro.js: https://introjs.com/docs
- Guía de atributos data-tour: `docs/data-tour-guide.md`
- Ejemplos en: `client/src/components/onboarding/IntroJsOnboarding.tsx`
