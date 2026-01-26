# Plan: Conectar Widgets del Dashboard a Datos Reales

## 🎯 Problema Identificado
Las tarjetas en la sección "Module Grid" (línea 422-446 de Dashboard.tsx) están mostrando "CARGANDO MÓDULO..." en lugar de datos reales.

## 📍 Ubicación
- **Archivo**: `client/src/pages/Dashboard.tsx`
- **Líneas**: 422-446
- **Componente**: Module Grid section

## 🔧 Widgets Afectados (según dashboard-engine.ts)

Estos widgets se generan dinámicamente según el rol:

### Admin
- `sales_funnel` - Embudo de Ventas
- `top_customers` - Clientes VIP  
- `sales_opportunities` - Oportunidades IA
- `market_trends` - Tendencias del Mercado

### Production
- `machine_status` - Estado de Máquinas
- `batch_efficiency` - Eficiencia de Lotes
- `quality_control` - Control de Calidad

### Logistics
- `fleet_tracking` - Tracking de Flota
- `route_optimization` - Optimización de Rutas
- `delivery_performance` - Performance de Entregas

### Sales
- `sales_funnel` - Embudo de Ventas
- `top_customers` - Clientes VIP
- `sales_opportunities` - Oportunidades IA

## ✅ Solución

### Opción 1: Crear Componentes Específicos (RECOMENDADO)
Crear componentes React individuales para cada widget que consuman endpoints reales:

```typescript
// Ejemplo: SalesFunnelWidget.tsx
export function SalesFunnelWidget() {
  const { data } = useQuery({
    queryKey: ["/api/sales/funnel"],
    queryFn: async () => { ... }
  });
  
  return <div><!-- Funnel visual con datos reales --></div>;
}
```

### Opción 2: Datos Inline (RÁPIDO)
Modificar el dashboard para que cada widget haga su propio fetch inline.

## 📊 Endpoints Necesarios

### Ya Existentes ✅
- `/api/dashboard/stats` - Stats generales
- `/api/analytics/kpis` - KPIs dinámicos
-`/api/notifications` - Notificaciones

### Por Crear 🔄
1. `/api/sales/funnel` - Datos del embudo de ventas (leads -> prospects -> customers)
2. `/api/sales/top-customers` - Top 10 clientes por volumen/valor
3. `/api/ai/opportunities` - Oportunidades detectadas por IA
4. `/api/analytics/market-trends` - Tendencias del mercado
5. `/api/production/machines` - Estado de máquinas
6. `/api/logistics/fleet` - Tracking de flota en tiempo real

## 🚀 Implementación Inmediata

Para mostrar información **real YA**:

1. **Embudo de Ventas**: Usar datos de `sales` table agrupados por status
2. **Clientes VIP**: Query de `customers` ordenados por `totalValue` DESC
3. **Oportunidades IA**: Reutilizar `ActionCards` data pero mostrarla diferente
4. **Tendencias**: Gráfica de `sales` agrupadas por semana

## 💡 Siguiente Paso
¿Quieres que implemente estos widgets con datos reales ahora? Puedo empezar por los 4 más importantes:
1. Embudo de Ventas
2. Clientes VIP
3. Oportunidades IA
4. Tendencias del Mercado
