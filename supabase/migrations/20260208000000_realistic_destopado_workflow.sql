-- Migration: 100% Realistic Destopado Workflow
-- Description: Standardizes products and tasks for the Destopado process with real names and rates.

-- 1. Standardize Products (Upsert)
INSERT INTO products (id, organization_id, name, sku, product_type, unit, is_production_input, is_production_output)
VALUES 
  ('coco-materia-prima-pza', 'e2eab19b-16cf-482d-b379-d9a67cea99e1', 'Coco Materia Prima', 'MP-COCO-PZA', 'purchase', 'pza', true, false),
  ('coco-sin-estopa-pza', 'e2eab19b-16cf-482d-b379-d9a67cea99e1', 'Coco sin Estopa', 'SEM-P-COCO', 'both', 'pza', true, true),
  ('estopa-m3', 'e2eab19b-16cf-482d-b379-d9a67cea99e1', 'Estopa de Coco', 'SUB-ESTOPA', 'sale', 'm3', false, true),
  ('agua-de-coco-lt', 'e2eab19b-16cf-482d-b379-d9a67cea99e1', 'Agua de Coco', 'SUB-AGUA', 'sale', 'lt', false, true),
  ('almendra-de-coco-pza', 'e2eab19b-16cf-482d-b379-d9a67cea99e1', 'Almendra de Coco (Hueso)', 'SEM-A-COCO', 'both', 'pza', true, true),
  ('pulpa-de-coco-kg', 'e2eab19b-16cf-482d-b379-d9a67cea99e1', 'Pulpa de Coco (Limpia)', 'PT-PULPA-KG', 'sale', 'kg', false, true)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  sku = EXCLUDED.sku,
  unit = EXCLUDED.unit;

-- 2. Standardize Production Tasks (Upsert)
INSERT INTO production_tasks (id, organization_id, name, unit_price, unit, active)
VALUES 
  ('task-destopado', 'e2eab19b-16cf-482d-b379-d9a67cea99e1', 'Destopado de Coco', 40, 'pza', true),
  ('task-deshuesado', 'e2eab19b-16cf-482d-b379-d9a67cea99e1', 'Deshuesado de Coco', 35, 'pza', true),
  ('task-pelado-raspado', 'e2eab19b-16cf-482d-b379-d9a67cea99e1', 'Pelado y Raspado de Pulpa', 200, 'kg', true)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  unit = EXCLUDED.unit;

-- 3. Insert Realistic Process Template
DELETE FROM processes WHERE id = 'process-destopado-realista';
INSERT INTO processes (id, organization_id, name, description, type, workflow_data)
VALUES (
  'process-destopado-realista', 
  'e2eab19b-16cf-482d-b379-d9a67cea99e1', 
  'Proceso de Destopado (100% Realista)', 
  'Flujo completo desde compra de materia prima hasta pulpa limpia con captura de variables y destajos.',
  'manufacturing',
  '{
    "nodes": [
      { "id": "start-1", "type": "start", "position": { "x": -100, "y": 200 }, "data": { "label": "Compra de Coco", "subLabel": "Materia Prima Inicial", "items": [{ "id": "coco-materia-prima-pza", "type": "product", "yield": 1 }] } },
      { "id": "destopado-1", "type": "process", "position": { "x": 250, "y": 200 }, "data": { "label": "Destopado", "subLabel": "Remoción de Estopa", "pieceworkRate": 0.40, "taskId": "task-destopado", "items": [{ "id": "coco-materia-prima-pza", "type": "product" }], "subproducts": [{ "productId": "coco-sin-estopa-pza", "ratio": 1 }, { "productId": "estopa-m3", "isVariable": true, "unit": "m3" }] } },
      { "id": "decision-1", "type": "decision", "position": { "x": 600, "y": 200 }, "data": { "label": "Control Calidad", "subLabel": "Validación de Lote", "branches": ["Lote Aprobado", "Rechazo/Desecho"] } },
      { "id": "deshuesado-1", "type": "process", "position": { "x": 950, "y": 100 }, "data": { "label": "Deshuesado", "subLabel": "Extracción de Almendra", "pieceworkRate": 0.35, "taskId": "task-deshuesado", "subproducts": [{ "productId": "almendra-de-coco-pza", "ratio": 1 }, { "productId": "agua-de-coco-lt", "isVariable": true, "unit": "L" }] } },
      { "id": "pelado-1", "type": "process", "position": { "x": 1300, "y": 100 }, "data": { "label": "Pelado de Pulpa", "subLabel": "Procesamiento Final", "pieceworkRate": 2.00, "taskId": "task-pelado-raspado", "subproducts": [{ "productId": "pulpa-de-coco-kg", "isVariable": true, "unit": "Kg" }] } },
      { "id": "end-1", "type": "end", "position": { "x": 1650, "y": 200 }, "data": { "label": "Producto Terminado", "subLabel": "Almacén Central" } }
    ],
    "edges": [
      { "id": "e1-2", "source": "start-1", "target": "destopado-1", "animated": true },
      { "id": "e2-3", "source": "destopado-1", "target": "decision-1", "animated": true },
      { "id": "e3-4", "source": "decision-1", "sourceHandle": "branch-0", "target": "deshuesado-1", "animated": true },
      { "id": "e4-5", "source": "deshuesado-1", "target": "pelado-1", "animated": true },
      { "id": "e5-6", "source": "pelado-1", "target": "end-1", "animated": true }
    ]
  }'::jsonb
);
