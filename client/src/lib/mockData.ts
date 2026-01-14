export const mockEmployees = [
  { id: 1, name: "Carlos Mendoza", role: "Gerente General", department: "Administración", photo: null, status: "active", lastClock: "08:02", email: "carlos@cocofactory.com" },
  { id: 2, name: "María García", role: "Compradora Patio", department: "Compras", photo: null, status: "active", lastClock: "08:15", email: "maria@cocofactory.com" },
  { id: 3, name: "José Hernández", role: "Supervisor de Patio", department: "Producción", photo: null, status: "active", lastClock: "07:58", email: "jose@cocofactory.com" },
  { id: 4, name: "Ana López", role: "Operador Destope", department: "Producción", photo: null, status: "break", lastClock: "08:00", email: "ana@cocofactory.com" },
  { id: 5, name: "Roberto Sánchez", role: "Logística Copra", department: "Logística", photo: null, status: "away", lastClock: "06:30", email: "roberto@cocofactory.com" },
  { id: 6, name: "Laura Martínez", role: "Contadora", department: "Finanzas", photo: null, status: "active", lastClock: "08:05", email: "laura@cocofactory.com" },
];

export const mockKiosks = [
  { id: 1, name: "Reloj Checador - Entrada Patio", type: "timeclock", location: "Patio Recepción", status: "online", lastPing: "Hace 2 min", modules: ["attendance"] },
  { id: 2, name: "Kiosko Recepción - Compra", type: "supervisor", location: "Báscula Patio", status: "online", lastPing: "Hace 1 min", modules: ["tickets", "production", "inventory"] },
  { id: 3, name: "Terminal Destope y Deshuese", type: "supervisor", location: "Área Procesado", status: "online", lastPing: "Hace 30 seg", modules: ["tickets", "production"] },
  { id: 4, name: "Punto de Venta - Despacho Copra", type: "pos", location: "Salida Almacén", status: "online", lastPing: "Hace 5 min", modules: ["sales", "inventory"] },
];

export const mockProducts = [
  { id: 1, name: "Coco Entero (Bueno)", sku: "COCO-001", category: "Materia Prima", stock: 15000, unit: "pza", price: 8.50, status: "available" },
  { id: 2, name: "Coco Entero (Desecho)", sku: "COCO-002", category: "Materia Prima", stock: 4500, unit: "pza", price: 3.20, status: "available" },
  { id: 3, name: "Copra Seca", sku: "COP-001", category: "Producto Terminado", stock: 850, unit: "kg", price: 45.00, status: "available" },
  { id: 4, name: "Pulpa de Coco Fresh", sku: "PULP-001", category: "Producto Terminado", stock: 120, unit: "kg", price: 65.00, status: "low" },
  { id: 5, name: "Agua de Coco (Lts)", sku: "H2O-001", category: "Subproducto", stock: 500, unit: "lt", price: 12.00, status: "available" },
  { id: 6, name: "Concha de Coco (Fibra)", sku: "FIB-001", category: "Subproducto", stock: 2500, unit: "kg", price: 1.50, status: "available" },
];

export const mockProcesses = [
  { id: 1, name: "Recepción y Clasificación", inputs: ["Coco Mixto"], outputs: ["Coco Bueno", "Coco Desecho"], duration: "1 hr", status: "active" },
  { id: 2, name: "Destope y Perforación", inputs: ["Coco Bueno"], outputs: ["Agua de Coco", "Coco Perforado"], duration: "2 hrs", status: "active" },
  { id: 3, name: "Deshuese y Pelado", inputs: ["Coco Perforado"], outputs: ["Pulpa", "Concha"], duration: "3 hrs", status: "active" },
  { id: 4, name: "Extracción de Copra", inputs: ["Pulpa"], outputs: ["Copra Seca"], duration: "24 hrs", status: "active" },
];

export const mockClients = [
  { id: 1, name: "Aceites y Jabones Continentales", type: "corporativo", contact: "Ing. Ramírez", phone: "555-1234", balance: 125000, status: "active" },
  { id: 2, name: "Embotelladora Tropical", type: "corporativo", contact: "Rosa Gómez", phone: "555-5678", balance: 15400, status: "active" },
];

export const mockSuppliers = [
  { id: 1, name: "Productores de la Costa S.C.", contact: "Alberto Flores", phone: "555-1111", balance: -45000, status: "active" },
  { id: 2, name: "Fincas Unidas del Sur", contact: "Carmen Vega", phone: "555-2222", balance: -28000, status: "active" },
];

export const mockTransactions = [
  { id: 1, type: "sale", description: "Venta Copra 500kg", amount: 22500, date: "2026-01-14 10:30", status: "completed", client: "Aceites y Jabones Continentales" },
  { id: 2, type: "expense", description: "Compra 5000 cocos mixtos", amount: -25000, date: "2026-01-14 09:15", status: "completed", supplier: "Productores de la Costa S.C." },
  { id: 3, type: "sale", description: "Venta Agua de Coco 200L", amount: 2400, date: "2026-01-14 11:45", status: "pending", client: "Embotelladora Tropical" },
];

export const mockTickets = [
  { id: 1, employee: "Ana López", process: "Destope y Perforación", quantity: 500, status: "pending", createdAt: "2026-01-14 08:30", amount: 150 },
  { id: 2, employee: "José Hernández", process: "Recepción", quantity: 5000, status: "approved", createdAt: "2026-01-14 09:00", amount: 250 },
];

export const mockDeliveries = [
  { id: 1, order: "ENT-992", client: "Aceites y Jabones Continentales", driver: "Roberto Sánchez", status: "in_transit", eta: "14:30 PM", items: 20, signature: null },
];

export const mockVehicles = [
  { id: 1, plate: "CCO-102", type: "Torton 10 Ton", driver: "Roberto Sánchez", status: "in_route", lastLocation: "Carretera Federal 200", fuel: 65 },
  { id: 2, plate: "CCO-554", type: "Camioneta 3.5 Ton", driver: null, status: "available", lastLocation: "Patio de Cargas", fuel: 80 },
];

export const mockAlerts = [
  { id: 1, type: "warning", title: "Patio Lleno", message: "Área de almacenamiento de desecho al 90%", time: "Hace 10 min" },
  { id: 2, type: "critical", title: "Falta Pulpa", message: "Producción de copra detenida por falta de pulpa pelada", time: "Hace 30 min" },
  { id: 3, type: "info", title: "Nuevo Ingreso", message: "Llegó camión con 8,000 cocos de Fincas Unidas", time: "Hace 1 hr" },
];

export const mockDashboardStats = {
  totalSales: 1540000,
  salesGrowth: 18.2,
  totalExpenses: 920000,
  expensesGrowth: 4.5,
  activeEmployees: 45,
  employeesPresent: 42,
  pendingOrders: 12,
  completedToday: 28,
  cashBalance: 620000,
  receivables: 185000,
  payables: 72000,
};

export const mockModules = [
  { id: "attendance", name: "Reloj Checador", icon: "Clock", description: "Control de asistencia con Face ID", enabled: true },
  { id: "employees", name: "Empleados", icon: "Users", description: "Gestión de personal y nómina", enabled: true },
  { id: "inventory", name: "Patios e Inventario", icon: "Package", description: "Control de coco en patio y producto terminado", enabled: true },
  { id: "sales", name: "Ventas", icon: "ShoppingCart", description: "Comercialización de pulpa y agua", enabled: true },
  { id: "production", name: "Procesamiento", icon: "Factory", description: "Destope, deshuace y secado", enabled: true },
  { id: "logistics", name: "Logística", icon: "Truck", description: "Rutas de entrega de copra", enabled: true },
  { id: "finance", name: "Finanzas", icon: "Wallet", description: "Pagos a productores y ventas", enabled: true },
  { id: "analytics", name: "Analítica IA", icon: "Brain", description: "Predicción de rendimiento por lote", enabled: true },
  { id: "crm", name: "Proveedores y Clientes", icon: "Users", description: "Gestión de productores y compradores", enabled: true },
];

export const kioskTypes = [
  { id: "timeclock", name: "Reloj Checador", description: "Registro FaceID para obreros", icon: "Clock", color: "primary" },
  { id: "supervisor", name: "Terminal Patio", description: "Registro de compra y clasificación", icon: "ClipboardCheck", color: "accent" },
  { id: "pos", name: "Despacho", description: "Salida de mercancía y facturación", icon: "CreditCard", color: "success" },
  { id: "management", name: "Administración", description: "Control de costos y rendimiento", icon: "BarChart3", color: "warning" },
  { id: "logistics", name: "Embarque", description: "Gestión de carga y transporte", icon: "Truck", color: "destructive" },
];
