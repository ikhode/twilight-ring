# Guía de Atributos data-tour para Intro.js

Este documento lista todos los atributos `data-tour` que deben agregarse a los componentes para que los tours de Intro.js funcionen correctamente.

## Navegación (Sidebar)
- `data-tour="inventory-nav"` - Link a Inventario
- `data-tour="sales-nav"` - Link a Ventas
- `data-tour="purchases-nav"` - Link a Compras
- `data-tour="workflows-nav"` - Link a Flujos de Trabajo
- `data-tour="employees-nav"` - Link a Empleados
- `data-tour="payroll-nav"` - Link a Nómina
- `data-tour="crm-nav"` - Link a CRM
- `data-tour="logistics-nav"` - Link a Logística
- `data-tour="documents-nav"` - Link a Documentos

## Página de Inventario (/inventory)
- `data-tour="add-product-btn"` - Botón "Agregar Producto"
- `data-tour="product-list"` - Tabla/lista de productos

## Página de Ventas (/sales)
- `data-tour="new-sale-btn"` - Botón "Nueva Venta"
- `data-tour="sales-dashboard"` - Dashboard/resumen de ventas

## Página de Compras (/purchases)
- `data-tour="new-purchase-btn"` - Botón "Nueva Orden de Compra"
- `data-tour="suppliers-section"` - Sección de proveedores

## Página de Flujos (/workflows)
- `data-tour="workflow-canvas"` - Canvas de React Flow
- `data-tour="workflow-templates"` - Selector de plantillas

## Página de Empleados (/employees)
- `data-tour="attendance-section"` - Sección de asistencias

## Página de Nómina (/finance/payroll)
- `data-tour="payroll-process-btn"` - Botón "Procesar Nómina"

## Página de CRM (/crm)
- `data-tour="customers-list"` - Lista de clientes
- `data-tour="new-quote-btn"` - Botón "Nueva Cotización"

## Página de Logística (/logistics)
- `data-tour="fleet-map"` - Mapa de flota
- `data-tour="routes-section"` - Sección de rutas

## Página de Documentos (/documents)
- `data-tour="upload-doc-btn"` - Botón "Subir Documento"
- `data-tour="doc-categories"` - Categorías de documentos

## Implementación

Para agregar un atributo data-tour a un elemento:

```tsx
<Button data-tour="add-product-btn" onClick={handleAddProduct}>
  Agregar Producto
</Button>
```

O para contenedores:

```tsx
<div data-tour="product-list" className="...">
  {/* Contenido */}
</div>
```

## Notas Importantes

1. Los atributos deben ser únicos en cada página
2. Usar nombres descriptivos en kebab-case
3. Los elementos deben estar visibles cuando el tour se ejecuta
4. Si un elemento no existe, Intro.js lo saltará automáticamente
