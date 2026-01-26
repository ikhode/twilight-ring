# Audit: Textos en Inglés para Traducir
**Fecha**: 2026-01-26
**Estado**: 🔄 En Progreso

## 🎯 Objetivo
Identificar y traducir al español TODOS los textos visibles al usuario que estén en inglés.

## ✅ Ya Traducido

### DailyBriefing Component
- ✅ "Daily Briefing" → "Resumen Diario"
- ✅ "Pendientes" (ya estaba en español, mejorado con plural)

## 📋 Pendientes de Traducir

### Buscar en los siguientes archivos:
Utilizar este comando para encontrar textos comunes en inglés:

```bash
# Buscar textos en inglés comunes
grep -r "Loading\|Error\|Success\|Failed\|Delete\|Edit\|Save\|Cancel\|Confirm\|Warning" client/src --include="*.tsx" --include="*.ts"
```

### Categorías a Revisar:

#### 1. Botones y Acciones
- [ ] "Save", "Cancel", "Delete", "Edit", "Update", "Create", "Add", "Remove"
- [ ] "Submit", "Confirm", "Proceed", "Continue"
- [ ] "Download", "Upload", "Export", "Import"

#### 2. Estados del Sistema
- [ ] "Loading...", "Processing...", "Saving..."
- [ ] "Success", "Error", "Warning", "Info"
- [ ] "Failed to...", "Unable to..."

#### 3. Etiquetas de Formularios
- [ ] "Name", "Email", "Password", "Phone"
- [ ] "Address", "City", "State", "Country"
- [ ] "Date", "Time", "Amount", "Quantity"

#### 4. Mensajes de Validación
- [ ] "Required field", "Invalid format"
- [ ] "Too short", "Too long"
- [ ] "Must be...", "Should be..."

#### 5. Navegación
- [ ] "Home", "Dashboard", "Settings", "Profile"
- [ ] "Next", "Previous", "Back", "Forward"
- [ ] "Search", "Filter", "Sort"

#### 6. Títulos y Encabezados
- [ ] Revisar todos los `<CardTitle>`, `<h1>`, `<h2>`, etc.

#### 7. Descripciones y Ayudas
- [ ] Tooltips
- [ ] Placeholder texts
- [ ] Help texts

#### 8. Notificaciones y Toasts
- [ ] Mensajes de éxito/error
- [ ] Confirmaciones

#### 9. Componentes Específicos Vistos en Imágenes
- [ ] "Grow Your Network" (si existe)
- [ ] "Start Building Your CRM" (si existe)
- [ ] "Inventory Empty" (si existe)
- [ ] "Suggestion" → "Sugerencia"

## 🔧 Estrategia de Implementación

### Fase 1: Crear Objeto de Traducciones
Crear archivo `client/src/lib/i18n/es.ts`:
```typescript
export const es = {
  common: {
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    // ... etc
  },
  dashboard: {
    // traducciones específicas
  }
}
```

### Fase 2: Buscar y Reemplazar Sistemáticamente
1. Buscar por archivo `.tsx` y `.ts`
2. Identificar strings literales user-facing
3. Reemplazar con referencias a objeto de traducciones
4. Validar que no se rompan funcionamientos

### Fase 3: Validación
- [ ] Revisar cada pantalla visualmente
- [ ] Verificar que NO haya textos en inglés
- [ ] Confirmar que plurales funcionen correctamente
- [ ] Verificar fechas en formato español

## 📊 Progreso
- Completado: 1 componente
- Total estimado: ~50-100 componentes
- Progreso: ~1%

---
**Próximo paso**: Ejecutar búsqueda sistemática de patrones en inglés
