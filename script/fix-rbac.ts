import "dotenv/config";
import { db } from "../server/storage";
import { permissions, rolePermissions } from "../shared/schema";
import { sql } from "drizzle-orm";

const PERMISSIONS = [
    // Inventory
    { id: "inventory.read", name: "Leer Inventario", description: "Ver lista de productos y existencias", category: "inventory" },
    { id: "inventory.write", name: "Modificar Inventario", description: "Crear y editar productos", category: "inventory" },
    { id: "inventory.admin", name: "Administrar Almacén", description: "Ajustar inventario y configuración masiva", category: "inventory" },

    // Finance
    { id: "finance.read", name: "Leer Finanzas", description: "Ver reportes y balances", category: "finance" },
    { id: "finance.write", name: "Registrar Gastos", description: "Crear cuentas por pagar y egresos", category: "finance" },
    { id: "finance.admin", name: "Control Total Financiero", description: "Configurar bancos y arqueos de caja", category: "finance" },

    // Sales
    { id: "sales.read", name: "Leer Ventas", description: "Ver historial de operaciones", category: "sales" },
    { id: "sales.pos", name: "Punto de Venta", description: "Realizar cobros y emitir tickets", category: "sales" },
    { id: "sales.stamp", name: "Timbrado Fiscal", description: "Emitir facturas CFDI oficiales", category: "sales" },
    { id: "sales.admin", name: "Gestión de Precios", description: "Cambiar precios y descuentos", category: "sales" },

    // CRM
    { id: "crm.read", name: "Leer CRM", description: "Ver clientes, negocios y proveedores", category: "crm" },
    { id: "crm.write", name: "Gestionar CRM", description: "Crear y editar clientes, proveedores y negocios", category: "crm" },

    // HR
    { id: "hr.read", name: "Leer Empleados", description: "Ver lista de personal", category: "hr" },
    { id: "hr.write", name: "Gestionar Personal", description: "Registrar asistencias y contratos", category: "hr" },

    // Operations & Manufacturing
    { id: "manufacturing.read", name: "Ver Manufactura", description: "Ver BOMs, órdenes y centros de trabajo", category: "operations" },
    { id: "manufacturing.write", name: "Gestionar Manufactura", description: "Crear BOMs y órdenes de producción", category: "operations" },
    { id: "production.read", name: "Ver Producción", description: "Ver lotes y eventos de taller", category: "operations" },
    { id: "production.write", name: "Gestionar Producción", description: "Iniciar lotes y registrar eventos", category: "operations" },
    { id: "logistics.read", name: "Ver Logística", description: "Ver flota, rutas y mantenimiento", category: "logistics" },
    { id: "logistics.write", name: "Gestionar Logística", description: "Crear rutas e informes de combustible", category: "logistics" },
    { id: "operations.read", name: "Ver Operaciones", description: "Ver bitácora general de actividades", category: "operations" },
    { id: "operations.write", name: "Registrar actividades y tareas", description: "Registrar actividades y tareas", category: "operations" },
    { id: "purchases.read", name: "Ver Compras", description: "Ver órdenes de compra y gastos", category: "finance" },
    { id: "purchases.write", name: "Gestionar Compras", description: "Crear y autorizar órdenes de compra", category: "finance" },
    { id: "piecework.read", name: "Ver Destajos", description: "Ver tickets de producción por trabajador", category: "hr" },
    { id: "piecework.write", name: "Gestionar Destajos", description: "Crear y aprobar tickets de destajo", category: "hr" },

    // Admin & Config
    { id: "system.admin", name: "Administrador del Sistema", description: "Configurar integraciones y módulos", category: "system" },
    { id: "config.write", name: "Modificar Configuración", description: "Cambiar tema, industria y módulos", category: "system" },
    { id: "analytics.read", name: "Ver Analíticas", description: "Ver dashboards y KPIs del negocio", category: "analytics" },
];

const MAPPINGS: Record<string, string[]> = {
    admin: [
        "inventory.read", "inventory.write", "inventory.admin",
        "finance.read", "finance.write", "finance.admin",
        "sales.read", "sales.pos", "sales.stamp", "sales.admin",
        "hr.read", "hr.write",
        "sales.pos",
        "crm.read",
        "crm.write",
        "manufacturing.read",
        "manufacturing.write",
        "production.read",
        "production.write",
        "logistics.read",
        "logistics.write",
        "operations.read",
        "operations.write",
        "purchases.read",
        "purchases.write",
        "piecework.read",
        "piecework.write",
        "config.write",
        "analytics.read"
    ],
    manager: [
        "inventory.read",
        "inventory.write",
        "finance.read",
        "sales.read",
        "sales.pos",
        "crm.read",
        "crm.write",
        "hr.read",
        "manufacturing.read",
        "manufacturing.write",
        "production.read",
        "production.write",
        "logistics.read",
        "logistics.write",
        "operations.read",
        "operations.write",
        "purchases.read",
        "purchases.write",
        "purchases.write",
        "piecework.read",
        "analytics.read"
    ],
    user: [
        "inventory.read",
        "sales.pos",
        "crm.read",
        "production.read",
        "production.write",
        "piecework.write"
    ],
    cashier: [
        "sales.pos",
        "finance.read"
    ],
    viewer: [
        "inventory.read",
        "sales.read",
        "crm.read",
        "production.read",
        "analytics.read"
    ]
};

async function seedRBAC() {
    console.log("🛠️ Seeding Granular RBAC...");

    try {
        // 1. Insert Permissions
        for (const p of PERMISSIONS) {
            await db.insert(permissions).values(p).onConflictDoNothing();
        }
        console.log(`✅ ${PERMISSIONS.length} permissions verified.`);

        // 2. Clear and Insert Role-Permission mappings
        // We use a roleEnum in the DB, so we must be careful with types
        for (const [role, permissionIds] of Object.entries(MAPPINGS)) {
            console.log(`🔗 Mapping permissions for role: ${role}`);

            for (const pId of permissionIds) {
                await db.insert(rolePermissions).values({
                    role: role as any,
                    permissionId: pId
                }).onConflictDoNothing();
            }
        }

        console.log("🏁 RBAC Seeding Finished Successfully!");
    } catch (error) {
        console.error("❌ RBAC Seed Error:", error);
    }
}

seedRBAC().then(() => process.exit(0));
