/**
 * Database Validation Script
 * Executes integrity checks and generates report
 */

import { db } from './server/storage';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';

console.log('🔍 Starting Database Validation...\n');

const results = {
    errors: [],
    warnings: [],
    stats: {}
};

async function runValidation() {
    try {
        // 1. Productos sin organización válida
        console.log('1️⃣ Checking products without valid organization...');
        const invalidProducts = await db.execute(sql`
      SELECT p.id, p.name, p.organization_id
      FROM products p
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE o.id IS NULL
    `);
        if (invalidProducts.rows.length > 0) {
            results.errors.push({
                check: 'Products without valid organization',
                count: invalidProducts.rows.length,
                sample: invalidProducts.rows.slice(0, 3)
            });
        }
        console.log(`   ✓ Found ${invalidProducts.rows.length} invalid products\n`);

        // 2. Compras con proveedor inválido
        console.log('2️⃣ Checking purchases with invalid supplier...');
        const invalidPurchaseSupplier = await db.execute(sql`
      SELECT pur.id, pur.supplier_id, pur.product_id
      FROM purchases pur
      LEFT JOIN suppliers s ON pur.supplier_id = s.id
      WHERE s.id IS NULL
    `);
        if (invalidPurchaseSupplier.rows.length > 0) {
            results.errors.push({
                check: 'Purchases with invalid supplier',
                count: invalidPurchaseSupplier.rows.length,
                sample: invalidPurchaseSupplier.rows.slice(0, 3)
            });
        }
        console.log(`   ✓ Found ${invalidPurchaseSupplier.rows.length} invalid purchases\n`);

        // 3. Compras con producto inválido
        console.log('3️⃣ Checking purchases with invalid product...');
        const invalidPurchaseProduct = await db.execute(sql`
      SELECT pur.id, pur.product_id, pur.supplier_id
      FROM purchases pur
      LEFT JOIN products p ON pur.product_id = p.id
      WHERE p.id IS NULL
    `);
        if (invalidPurchaseProduct.rows.length > 0) {
            results.errors.push({
                check: 'Purchases with invalid product',
                count: invalidPurchaseProduct.rows.length,
                sample: invalidPurchaseProduct.rows.slice(0, 3)
            });
        }
        console.log(`   ✓ Found ${invalidPurchaseProduct.rows.length} invalid purchases\n`);

        // 4. Ventas con producto inválido
        console.log('4️⃣ Checking sales with invalid product...');
        const invalidSales = await db.execute(sql`
      SELECT s.id, s.product_id, s.customer_id
      FROM sales s
      LEFT JOIN products p ON s.product_id = p.id
      WHERE p.id IS NULL
    `);
        if (invalidSales.rows.length > 0) {
            results.errors.push({
                check: 'Sales with invalid product',
                count: invalidSales.rows.length,
                sample: invalidSales.rows.slice(0, 3)
            });
        }
        console.log(`   ✓ Found ${invalidSales.rows.length} invalid sales\n`);

        // 5. Tickets con empleado inválido
        console.log('5️⃣ Checking piecework tickets with invalid employee...');
        const invalidTickets = await db.execute(sql`
      SELECT pt.id, pt.employee_id, pt.batch_id
      FROM piecework_tickets pt
      LEFT JOIN employees e ON pt.employee_id = e.id
      WHERE e.id IS NULL
    `);
        if (invalidTickets.rows.length > 0) {
            results.errors.push({
                check: 'Piecework tickets with invalid employee',
                count: invalidTickets.rows.length,
                sample: invalidTickets.rows.slice(0, 3)
            });
        }
        console.log(`   ✓ Found ${invalidTickets.rows.length} invalid tickets\n`);

        // 6. Tickets con batchId que no existe en compras
        console.log('6️⃣ Checking tickets with non-existent batch...');
        const orphanedTickets = await db.execute(sql`
      SELECT pt.id, pt.batch_id, pt.employee_id, pt.task_name
      FROM piecework_tickets pt
      LEFT JOIN purchases pur ON pt.batch_id = pur.batch_id
      WHERE pur.batch_id IS NULL AND pt.batch_id IS NOT NULL
    `);
        if (orphanedTickets.rows.length > 0) {
            results.warnings.push({
                check: 'Tickets with orphaned batch_id',
                count: orphanedTickets.rows.length,
                sample: orphanedTickets.rows.slice(0, 3)
            });
        }
        console.log(`   ✓ Found ${orphanedTickets.rows.length} orphaned tickets\n`);

        // 7. Compras pagadas sin cuenta bancaria (si método = bank)
        console.log('7️⃣ Checking paid purchases without bank account...');
        const purchasesNoBankAccount = await db.execute(sql`
      SELECT id, supplier_id, payment_method, payment_status, bank_account_id
      FROM purchases
      WHERE payment_status = 'paid'
        AND payment_method = 'bank'
        AND bank_account_id IS NULL
    `);
        if (purchasesNoBankAccount.rows.length > 0) {
            results.warnings.push({
                check: 'Paid bank purchases without bank_account_id',
                count: purchasesNoBankAccount.rows.length,
                sample: purchasesNoBankAccount.rows.slice(0, 3)
            });
        }
        console.log(`   ✓ Found ${purchasesNoBankAccount.rows.length} purchases without bank account\n`);

        // 8. Ventas con método bank sin cuenta bancaria
        console.log('8️⃣ Checking sales with bank method but no account...');
        const salesNoBankAccount = await db.execute(sql`
      SELECT id, customer_id, payment_method, bank_account_id
      FROM sales
      WHERE payment_method = 'bank'
        AND bank_account_id IS NULL
    `);
        if (salesNoBankAccount.rows.length > 0) {
            results.warnings.push({
                check: 'Bank sales without bank_account_id',
                count: salesNoBankAccount.rows.length,
                sample: salesNoBankAccount.rows.slice(0, 3)
            });
        }
        console.log(`   ✓ Found ${salesNoBankAccount.rows.length} sales without bank account\n`);

        // 9. Productos con stock negativo
        console.log('9️⃣ Checking products with negative stock...');
        const negativeStock = await db.execute(sql`
      SELECT id, name, stock, organization_id
      FROM products
      WHERE stock < 0
    `);
        if (negativeStock.rows.length > 0) {
            results.errors.push({
                check: 'Products with negative stock',
                count: negativeStock.rows.length,
                sample: negativeStock.rows.slice(0, 3)
            });
        }
        console.log(`   ✓ Found ${negativeStock.rows.length} products with negative stock\n`);

        // 10. Empleados duplicados
        console.log('🔟 Checking for duplicate employees...');
        const duplicateEmployees = await db.execute(sql`
      SELECT organization_id, employee_number, COUNT(*) as count
      FROM employees
      GROUP BY organization_id, employee_number
      HAVING COUNT(*) > 1
    `);
        if (duplicateEmployees.rows.length > 0) {
            results.warnings.push({
                check: 'Duplicate employee numbers',
                count: duplicateEmployees.rows.length,
                sample: duplicateEmployees.rows.slice(0, 3)
            });
        }
        console.log(`   ✓ Found ${duplicateEmployees.rows.length} duplicate employee numbers\n`);

        // Summary stats
        console.log('📊 Gathering summary statistics...');
        const stats = await db.execute(sql`
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
      FROM piecework_tickets
    `);
        results.stats = stats.rows;

        // Print report
        console.log('\n' + '='.repeat(60));
        console.log('📋 VALIDATION REPORT');
        console.log('='.repeat(60) + '\n');

        console.log('🔴 ERRORS (Critical - Must Fix):');
        if (results.errors.length === 0) {
            console.log('   ✅ No critical errors found!\n');
        } else {
            results.errors.forEach(err => {
                console.log(`   ❌ ${err.check}: ${err.count} records`);
                if (err.sample.length > 0) {
                    console.log(`      Sample: ${JSON.stringify(err.sample[0], null, 2)}`);
                }
            });
            console.log('');
        }

        console.log('⚠️  WARNINGS (Should Review):');
        if (results.warnings.length === 0) {
            console.log('   ✅ No warnings!\n');
        } else {
            results.warnings.forEach(warn => {
                console.log(`   ⚠️  ${warn.check}: ${warn.count} records`);
            });
            console.log('');
        }

        console.log('📊 TABLE STATISTICS:');
        results.stats.forEach(stat => {
            console.log(`   ${stat.table_name}: ${stat.total_records} total, ${stat.missing_org} with issues`);
        });

        console.log('\n' + '='.repeat(60));
        console.log(`✅ Validation complete! Found ${results.errors.length} errors and ${results.warnings.length} warnings.`);
        console.log('='.repeat(60) + '\n');

        // Save report to file
        const reportPath = './validation_report.json';
        await import('fs').then(fs => {
            fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
            console.log(`📄 Full report saved to: ${reportPath}\n`);
        });

    } catch (error) {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

runValidation();
