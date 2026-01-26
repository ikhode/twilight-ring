# Auditoría de Datos Mock - Twilight Ring ERP
## Fecha: 2026-01-26

## 🎯 Objetivo
Eliminar TODOS los datos hardcoded, mock y placeholders para tener un sistema 100% conectado a la base de datos real, listo para producción.

## 📊 Áreas Identificadas con Datos Mock

### 🔴 CRÍTICO - Eliminar Inmediatamente

#### 1. **`client/src/lib/mockData.ts`** 
- **Problema**: Archivo completo de datos mock (empleados, kiosks, productos, procesos, clientes, proveedores, transacciones, tickets, deliveries, vehículos, alertas, stats de dashboard, módulos)
- **Acción**: Este archivo debe ser ELIMINADO y todos sus imports reemplazados con llamadas a API reales
- **Impacto**: ALTO - Usado en múltiples componentes

#### 2. **`client/src/lib/cognitive/CognitiveBridge.tsx`**
- **Líneas**: 41-48, 54-59, 65-72
- **Problema**: Datos mock para tensores de ventas, inventario y compras
- **Acción**: Conectar a endpoints reales de datos agregados
- **Impacto**: ALTO - Afecta predicciones AI

#### 3. **`client/src/components/dashboard/DynamicKPIs.tsx`**
- **Líneas**: 36-48
- **Problema**: `mockData` con KPIs hardcoded
- **Acción**: Crear endpoint `/api/analytics/kpis` que calcule KPIs en tiempo real
- **Impacto**: ALTO - Dashboard principal

#### 4. **`client/src/pages/kiosks/ProductionTerminal.tsx`**
- **Líneas**: 56-61
- **Problema**: `mockBatches` para lotes de producción
- **Acción**: Crear endpoint `/api/production/batches` o usar inventario de materia prima
- **Impacto**: MEDIO - Terminal de producción

#### 5. **`client/src/pages/Reports.tsx`**
- **Líneas**: 36-46
- **Problema**: Datos fallback mock para movimientos de inventario
- **Acción**: Implementar endpoint `/api/reports/inventory-movements` completamente
- **Impacto**: MEDIO - Reportes

#### 6. **`client/src/components/layout/Header.tsx`**
- **Líneas**: 69-72, 80-82
- **Problema**: Notificaciones mock y XP/nivel hardcoded
- **Acción**: 
  - Crear `/api/notifications` endpoint
  - Extender `/api/user` con gamificación (xp, level)
- **Impacto**: MEDIO - UX del header

### 🟡 MODERADO - Revisar y Conectar

#### 7. **AI Services**
- **`client/src/lib/ai/guardian-service.ts`** (línea 39, 42): trainMock() 
- **`client/src/lib/ai/copilot-service.ts`** (línea 92): Mock latency
- **Acción**: Usar datos reales para entrenamiento

#### 8. **Components**
- **`client/src/components/documents/EntityDossier.tsx`** (línea 66): mock_url para fileUrl
- **`client/src/components/dashboard/TrustTimeline.tsx`** (línea 66): Simulación de acciones mock
- **`client/src/components/operations/NeuralMaintenanceForecast.tsx`** (línea 18): Fallback a mock

#### 9. **Pages**
- **`client/src/pages/Documents.tsx`** (líneas 64, 73): Mock upload y mock_url
- **`client/src/pages/DriverTerminal.tsx`** (línea 184): Mock GPS
- **`client/src/pages/finance/PayrollManager.tsx`** (línea 77): Mock batch payout
- **`client/src/pages/Piecework.tsx`** (línea 156): Mock average threshold

### 🟢 BAJO - Verificar

#### 10. **Textos Placeholder**
- Revisar todos los "TODO" y "FIXME"
- Asegurar que labels, descripciones y textos sean realistas
- Verificar que los ejemplos sean de casos de uso reales

## 🔧 Plan de Implementación

### Fase 1: Infraestructura de Datos (Endpoints Backend)
- [ ] Crear `/api/analytics/kpis` - KPIs dinámicos en tiempo real
- [ ] Crear `/api/notifications` - Notificaciones del sistema
- [ ] Extender `/api/user` - Agregar gamificación (xp, level)
- [ ] Crear `/api/production/batches` - Lotes de producción activos
- [ ] Implementar `/api/reports/inventory-movements` - Movimientos completos
- [ ] Crear `/api/analytics/tensors` - Datos agregados para AI (ventas, inventario, compras)

### Fase 2: Eliminar Archivo Mock Principal
- [ ] Identificar todos los imports de `mockData.ts`
- [ ] Reemplazarlos con useQuery a endpoints reales
- [ ] Eliminar el archivo `mockData.ts`

### Fase 3: Actualizar Componentes Críticos
- [ ] DynamicKPIs - Conectar a API real
- [ ] CognitiveBridge - Usar datos reales de tensores
- [ ] Header - Notificaciones y gamificación real
- [ ] ProductionTerminal - Batches reales
- [ ] Reports - Sin fallbacks mock

### Fase 4: AI Services
- [ ] Guardian Service - Entrenamiento con datos reales
- [ ] Copilot Service - Eliminar delays artificiales
- [ ] Neural Forecasts - Solo datos reales

### Fase 5: Validación Final
- [ ] Auditar cada página/componente
- [ ] Buscar cualquier hardcoded value
- [ ] Verificar que todos los `useQuery` tienen datos reales
- [ ] Testing end-to-end con datos de producción

## 📈 Métricas de Éxito
- ✅ 0 archivos con "mock" en el nombre
- ✅ 0 variables con "mock" en el nombre  
- ✅ 0 comentarios "TODO" o "FIXME" relacionados con datos
- ✅ 100% de componentes conectados a base de datos
- ✅ Todos los KPIs calculados dinámicamente
- ✅ AI models entrenados con datos reales

## 🚀 Prioridad de Ejecución
1. **Inmediato**: mockData.ts, DynamicKPIs, CognitiveBridge
2. **Hoy**: Header, ProductionTerminal, Reports
3. **Esta semana**: AI Services, Documents, resto de componentes

---
**Status**: 🔴 EN PROGRESO
**Última actualización**: 2026-01-26T06:44:36-06:00
