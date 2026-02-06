-- Database Validation Queries
-- Execute these queries to identify data inconsistencies

-- 1. Productos sin organización válida
SELECT p.id, p.name, p.organization_id
FROM products p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE o.id IS NULL;

-- 2. Compras con proveedor inválido
SELECT pur.id, pur.supplier_id, pur.product_id, pur.created_at
FROM purchases pur
LEFT JOIN suppliers s ON pur.supplier_id = s.id
WHERE s.id IS NULL;

-- 3. Compras con producto inválido
SELECT pur.id, pur.product_id, pur.supplier_id, pur.created_at
FROM purchases pur
LEFT JOIN products p ON pur.product_id = p.id
WHERE p.id IS NULL;

-- 4. Ventas con producto inválido
SELECT s.id, s.product_id, s.customer_id, s.date
FROM sales s
LEFT JOIN products p ON s.product_id = p.id
WHERE p.id IS NULL;

-- 5. Tickets con empleado inválido
SELECT pt.id, pt.employee_id, pt.batch_id, pt.created_at
FROM piecework_tickets pt
LEFT JOIN employees e ON pt.employee_id = e.id
WHERE e.id IS NULL;

-- 6. Tickets con batchId que no existe en compras
SELECT pt.id, pt.batch_id, pt.employee_id, pt.task_name
FROM piecework_tickets pt
LEFT JOIN purchases pur ON pt.batch_id = pur.batch_id
WHERE pur.batch_id IS NULL AND pt.batch_id IS NOT NULL;

-- 7. Compras pagadas sin cuenta bancaria (si método = bank)
SELECT id, supplier_id, payment_method, payment_status, bank_account_id
FROM purchases
WHERE payment_status = 'paid'
  AND payment_method = 'bank'
  AND bank_account_id IS NULL;

-- 8. Ventas con método bank sin cuenta bancaria
SELECT id, customer_id, payment_method, bank_account_id
FROM sales
WHERE payment_method = 'bank'
  AND bank_account_id IS NULL;

-- 9. Productos con stock negativo
SELECT id, name, stock, organization_id
FROM products
WHERE stock < 0;

-- 10. Empleados duplicados por organización
SELECT organization_id, employee_number, COUNT(*) as count
FROM employees
GROUP BY organization_id, employee_number
HAVING COUNT(*) > 1;

-- BONUS: Resumen de integridad por tabla
SELECT 
  'products' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN organization_id IS NULL THEN 1 END) as missing_org
FROM products
UNION ALL
SELECT 
  'purchases',
  COUNT(*),
  COUNT(CASE WHEN supplier_id IS NULL OR product_id IS NULL THEN 1 END)
FROM purchases
UNION ALL
SELECT 
  'sales',
  COUNT(*),
  COUNT(CASE WHEN product_id IS NULL THEN 1 END)
FROM sales
UNION ALL
SELECT 
  'piecework_tickets',
  COUNT(*),
  COUNT(CASE WHEN employee_id IS NULL THEN 1 END)
FROM piecework_tickets;
