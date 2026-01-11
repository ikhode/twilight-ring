export const mockEmployees = [
  { id: 1, name: "Carlos Mendoza", role: "Gerente", department: "Administración", photo: null, status: "active", lastClock: "08:02", email: "carlos@empresa.com" },
  { id: 2, name: "María García", role: "Cajera", department: "Ventas", photo: null, status: "active", lastClock: "08:15", email: "maria@empresa.com" },
  { id: 3, name: "José Hernández", role: "Supervisor", department: "Producción", photo: null, status: "active", lastClock: "07:58", email: "jose@empresa.com" },
  { id: 4, name: "Ana López", role: "Operador", department: "Producción", photo: null, status: "break", lastClock: "08:00", email: "ana@empresa.com" },
  { id: 5, name: "Roberto Sánchez", role: "Conductor", department: "Logística", photo: null, status: "away", lastClock: "06:30", email: "roberto@empresa.com" },
  { id: 6, name: "Laura Martínez", role: "Contadora", department: "Finanzas", photo: null, status: "active", lastClock: "08:05", email: "laura@empresa.com" },
  { id: 7, name: "Diego Torres", role: "Almacenista", department: "Inventario", photo: null, status: "active", lastClock: "07:45", email: "diego@empresa.com" },
  { id: 8, name: "Patricia Ruiz", role: "Recepcionista", department: "Administración", photo: null, status: "active", lastClock: "08:00", email: "patricia@empresa.com" },
];

export const mockKiosks = [
  { id: 1, name: "Reloj Checador - Entrada Principal", type: "timeclock", location: "Entrada", status: "online", lastPing: "Hace 2 min", modules: ["attendance"] },
  { id: 2, name: "Kiosko Supervisor - Producción", type: "supervisor", location: "Planta A", status: "online", lastPing: "Hace 1 min", modules: ["tickets", "production", "employees"] },
  { id: 3, name: "Punto de Venta - Caja 1", type: "pos", location: "Tienda", status: "online", lastPing: "Hace 30 seg", modules: ["sales", "inventory", "cash"] },
  { id: 4, name: "Kiosko Gerencia", type: "management", location: "Oficina Central", status: "online", lastPing: "Hace 5 min", modules: ["reports", "analytics", "employees", "payroll"] },
  { id: 5, name: "Terminal Logística", type: "logistics", location: "Almacén", status: "offline", lastPing: "Hace 2 hrs", modules: ["deliveries", "tracking", "signatures"] },
];

export const mockProducts = [
  { id: 1, name: "Harina de Trigo 1kg", sku: "HAR-001", category: "Materia Prima", stock: 450, unit: "kg", price: 25.00, status: "available" },
  { id: 2, name: "Pan Blanco", sku: "PAN-001", category: "Producto Terminado", stock: 120, unit: "pza", price: 15.00, status: "available" },
  { id: 3, name: "Azúcar Refinada 1kg", sku: "AZU-001", category: "Materia Prima", stock: 80, unit: "kg", price: 32.00, status: "low" },
  { id: 4, name: "Mantequilla 500g", sku: "MAN-001", category: "Materia Prima", stock: 25, unit: "pza", price: 85.00, status: "critical" },
  { id: 5, name: "Pastel Chocolate", sku: "PAS-001", category: "Producto Terminado", stock: 8, unit: "pza", price: 350.00, status: "available" },
  { id: 6, name: "Galletas Surtidas 500g", sku: "GAL-001", category: "Producto Terminado", stock: 45, unit: "pza", price: 65.00, status: "available" },
];

export const mockProcesses = [
  { id: 1, name: "Elaboración de Pan", inputs: ["Harina", "Agua", "Levadura"], outputs: ["Pan Blanco"], duration: "2 hrs", status: "active" },
  { id: 2, name: "Horneado de Pasteles", inputs: ["Harina", "Huevo", "Mantequilla", "Azúcar"], outputs: ["Pastel Chocolate"], duration: "3 hrs", status: "active" },
  { id: 3, name: "Empaquetado", inputs: ["Pan Blanco", "Bolsas"], outputs: ["Pan Empacado"], duration: "30 min", status: "pending" },
  { id: 4, name: "Control de Calidad", inputs: ["Productos"], outputs: ["Productos Aprobados"], duration: "15 min", status: "active" },
];

export const mockClients = [
  { id: 1, name: "Supermercados del Norte", type: "corporativo", contact: "Juan Pérez", phone: "555-1234", balance: 45000, status: "active" },
  { id: 2, name: "Tienda La Esquina", type: "minorista", contact: "Rosa Gómez", phone: "555-5678", balance: 2500, status: "active" },
  { id: 3, name: "Restaurante El Buen Sabor", type: "corporativo", contact: "Chef Miguel", phone: "555-9012", balance: -1500, status: "debt" },
  { id: 4, name: "Cafetería Central", type: "minorista", contact: "Luis Ramírez", phone: "555-3456", balance: 0, status: "active" },
];

export const mockSuppliers = [
  { id: 1, name: "Distribuidora de Harinas MX", contact: "Alberto Flores", phone: "555-1111", balance: -15000, status: "active" },
  { id: 2, name: "Lácteos del Valle", contact: "Carmen Vega", phone: "555-2222", balance: -8000, status: "active" },
  { id: 3, name: "Empaques y Más", contact: "Fernando Díaz", phone: "555-3333", balance: 0, status: "active" },
];

export const mockTransactions = [
  { id: 1, type: "sale", description: "Venta #1234", amount: 2500, date: "2026-01-11 10:30", status: "completed", client: "Supermercados del Norte" },
  { id: 2, type: "expense", description: "Compra de Harina", amount: -5000, date: "2026-01-11 09:15", status: "completed", supplier: "Distribuidora de Harinas MX" },
  { id: 3, type: "sale", description: "Venta #1235", amount: 850, date: "2026-01-11 11:45", status: "pending", client: "Tienda La Esquina" },
  { id: 4, type: "payroll", description: "Adelanto Nómina - Carlos M.", amount: -2000, date: "2026-01-10 16:00", status: "completed", employee: "Carlos Mendoza" },
  { id: 5, type: "sale", description: "Venta #1236", amount: 1200, date: "2026-01-11 14:20", status: "completed", client: "Cafetería Central" },
];

export const mockTickets = [
  { id: 1, employee: "Ana López", process: "Elaboración de Pan", quantity: 50, status: "pending", createdAt: "2026-01-11 08:30", amount: 250 },
  { id: 2, employee: "Diego Torres", process: "Empaquetado", quantity: 100, status: "approved", createdAt: "2026-01-11 09:00", amount: 150 },
  { id: 3, employee: "José Hernández", process: "Control de Calidad", quantity: 30, status: "paid", createdAt: "2026-01-10 17:00", amount: 180 },
];

export const mockDeliveries = [
  { id: 1, order: "ORD-001", client: "Supermercados del Norte", driver: "Roberto Sánchez", status: "in_transit", eta: "11:30 AM", items: 15, signature: null },
  { id: 2, order: "ORD-002", client: "Restaurante El Buen Sabor", driver: "Roberto Sánchez", status: "delivered", eta: "10:00 AM", items: 8, signature: true },
  { id: 3, order: "ORD-003", client: "Tienda La Esquina", driver: null, status: "pending", eta: null, items: 5, signature: null },
];

export const mockVehicles = [
  { id: 1, plate: "ABC-123", type: "Van", driver: "Roberto Sánchez", status: "in_route", lastLocation: "Av. Principal #123", fuel: 75 },
  { id: 2, plate: "DEF-456", type: "Camión", driver: null, status: "available", lastLocation: "Base", fuel: 90 },
  { id: 3, plate: "GHI-789", type: "Moto", driver: null, status: "maintenance", lastLocation: "Taller", fuel: 30 },
];

export const mockAlerts = [
  { id: 1, type: "warning", title: "Stock bajo", message: "Azúcar Refinada está por debajo del mínimo", time: "Hace 10 min" },
  { id: 2, type: "critical", title: "Stock crítico", message: "Mantequilla requiere reorden urgente", time: "Hace 30 min" },
  { id: 3, type: "info", title: "Nuevo pedido", message: "Supermercados del Norte realizó un pedido grande", time: "Hace 1 hr" },
  { id: 4, type: "success", title: "Entrega completada", message: "ORD-002 entregado exitosamente", time: "Hace 2 hrs" },
];

export const mockDashboardStats = {
  totalSales: 125000,
  salesGrowth: 12.5,
  totalExpenses: 78000,
  expensesGrowth: -5.2,
  activeEmployees: 24,
  employeesPresent: 22,
  pendingOrders: 8,
  completedToday: 15,
  cashBalance: 45000,
  receivables: 48000,
  payables: 23000,
};

export const mockModules = [
  { id: "attendance", name: "Reloj Checador", icon: "Clock", description: "Control de asistencia con Face ID", enabled: true },
  { id: "employees", name: "Empleados", icon: "Users", description: "Gestión de personal y nómina", enabled: true },
  { id: "inventory", name: "Inventario", icon: "Package", description: "Control de productos y stock", enabled: true },
  { id: "sales", name: "Ventas", icon: "ShoppingCart", description: "Punto de venta y facturación", enabled: true },
  { id: "production", name: "Producción", icon: "Factory", description: "Procesos y control de calidad", enabled: true },
  { id: "logistics", name: "Logística", icon: "Truck", description: "Entregas, rutas y tracking", enabled: true },
  { id: "finance", name: "Finanzas", icon: "Wallet", description: "Cuentas, gastos y reportes", enabled: true },
  { id: "analytics", name: "Analítica IA", icon: "Brain", description: "Predicciones y detección de anomalías", enabled: false },
  { id: "crm", name: "CRM", icon: "Users", description: "Clientes y proveedores", enabled: true },
];

export const kioskTypes = [
  { id: "timeclock", name: "Reloj Checador", description: "Solo registro de entrada/salida", icon: "Clock", color: "primary" },
  { id: "supervisor", name: "Supervisor", description: "Gestión de tickets y producción", icon: "ClipboardCheck", color: "accent" },
  { id: "pos", name: "Punto de Venta", description: "Caja registradora y ventas", icon: "CreditCard", color: "success" },
  { id: "management", name: "Gerencia", description: "Reportes y administración completa", icon: "BarChart3", color: "warning" },
  { id: "logistics", name: "Logística", description: "Entregas y tracking", icon: "Truck", color: "destructive" },
];
