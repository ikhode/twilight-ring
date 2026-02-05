---
trigger: always_on
---

# REGLAS DEL AGENTE - SISTEMA DE PRODUCCIÓN

## 🏗️ ARQUITECTURA Y CÓDIGO

1. **Reutilización de código**: Siempre identificar y reutilizar componentes, funciones y lógica existente antes de crear nuevos elementos.

2. **Tipado fuerte**: Utilizar TypeScript con tipos explícitos. Definir interfaces/types para todas las entidades de datos, props de componentes y respuestas de API.

3. **Modularidad**: Dividir el código en archivos con responsabilidades únicas:
   - `/components` - Componentes UI reutilizables
   - `/hooks` - Custom hooks para lógica compartida
   - `/services` - Lógica de negocio y llamadas a API
   - `/types` - Definiciones de tipos TypeScript
   - `/utils` - Funciones utilitarias
   - `/stores` - Estado global (Zustand/Context)

4. **No duplicación**: Eliminar código duplicado. Si dos archivos tienen propósitos similares, consolidar en uno solo o abstraer la lógica común.

## 🗄️ BASE DE DATOS (SUPABASE)

5. **Uso de MCP Server de Supabase**: 
   - Consultar el esquema de la DB antes de hacer cambios
   - Realizar cambios consistentes en paralelo: DB + código local
   - Validar que las estructuras de datos coincidan

6. **Migraciones SQL**: 
   - Todos los cambios de DB deben hacerse mediante migraciones versionadas
   - Ubicación: `/supabase/migrations/`
   - Nombrado: `YYYYMMDDHHMMSS_descripcion_cambio.sql`
   - Nunca modificar la DB manualmente sin migración

7. **Relaciones de tablas**:
   - Definir foreign keys explícitamente en la DB
   - Mantener las mismas relaciones reflejadas en el frontend (types/interfaces)
   - Documentar relaciones complejas

8. **Multi-tenancy**: 
   - Todas las tablas deben tener `organization_id` o `empresa_id`
   - Implementar Row Level Security (RLS) policies en Supabase
   - Filtrar siempre por organización en todas las queries
   - Validar aislamiento de datos entre organizaciones

## ⚛️ FRONTEND (REACT)

9. **Estado global y reactividad**:
   - Usar Zustand o React Context para estado global
   - Implementar Supabase Realtime para sincronización automática
   - Subscripciones a cambios de DB para actualización en tiempo real

10. **Componentes UI**:
    - Seguir principios de composición
    - Props tipadas con TypeScript
    - Componentes puros cuando sea posible (sin side effects)

11. **Tooltips informativos**: 
    - Agregar tooltips en TODOS los elementos clave:
      * Paneles de métricas
      * KPIs e indicadores
      * Gráficas y visualizaciones
      * Resultados finales y totales
    - Los tooltips deben explicar:
      * Qué representa el valor
      * Cómo se calcula (fórmula si aplica)
      * Fuente de los datos

12. **Diseño cognitivo**: 
    - La UI debe ser intuitiva y no requerir esfuerzo mental excesivo
    - Jerarquía visual clara
    - Información agrupada lógicamente
    - Feedback visual inmediato para acciones del usuario
    - Estados de carga y errores bien comunicados

## 📊 DATOS Y LÓGICA DE NEGOCIO

13. **Datos 100% reales**: 
    - NUNCA inventar, simular o generar datos falsos
    - Toda la información debe venir de la base de datos
    - Si no hay datos, mostrar estado vacío apropiado
    - No usar datos de ejemplo en producción

14. **Coherencia end-to-end**:
    - Mantener consistencia entre:
      * Esquema de DB ↔ Types de TypeScript
      * Nombres de campos en DB ↔ Nombres en frontend
      * Lógica de negocio ↔ Validaciones en DB (constraints, triggers)
    - Validación tanto en frontend como backend

15. **Enfoque realista y operacional**:
    - Diseñar para casos de uso reales del negocio
    - Cubrir flujos completos de operación
    - No agregar funcionalidades innecesarias que abrumen
    - Priorizar lo esencial sobre lo "nice to have"

## 🔧 MEJORES PRÁCTICAS

16. **Supabase**:
    - Usar Row Level Security (RLS) policies
    - Aprovechar funciones de PostgreSQL cuando sea apropiado
    - Implementar índices para queries frecuentes
    - Usar tipos nativos de PostgreSQL (jsonb, arrays, etc.)

17. **React**:
    - Hooks personalizados para lógica reutilizable
    - Memoización (useMemo, useCallback) donde mejore performance
    - Lazy loading para componentes pesados
    - Error boundaries para manejo robusto de errores

18. **Proceso de desarrollo**:
```
    1. Consultar esquema de DB con MCP
    2. Crear/modificar migración SQL
    3. Aplicar migración a DB
    4. Actualizar tipos TypeScript
    5. Implementar lógica de negocio
    6. Crear/actualizar componentes UI
    7. Probar con datos reales
    8. Verificar aislamiento multi-tenant
```

## ✅ CHECKLIST ANTES DE COMMIT

- [ ] Código reutiliza componentes/funciones existentes
- [ ] TypeScript sin errores, tipos explícitos
- [ ] Código organizado en archivos apropiados
- [ ] Sin duplicación de código
- [ ] Migraciones creadas para cambios de DB
- [ ] Tipos actualizados según esquema de DB
- [ ] Tooltips agregados en elementos clave
- [ ] UI clara y sin complejidad cognitiva
- [ ] Estado reactivo implementado
- [ ] Subscripciones Realtime configuradas
- [ ] RLS policies verificadas
- [ ] Multi-tenancy validado
- [ ] Datos 100% desde DB real
- [ ] Flujos operacionales completos probados