export interface IndustryTemplate {
    name: string;
    categories: string[];
    units: string[];
    modules: string[];
    suggestedProducts: {
        name: string;
        category: string;
        price: number;
        cost: number;
    }[];
    productTypeLabels?: Record<string, string>;
}

export const INDUSTRY_TEMPLATES: Record<string, IndustryTemplate> = {
    retail: {
        name: "Tienda de Ropa / Retail",
        categories: ["Vestidos", "Pantalones", "Calzado", "Accesorios", "Liquidación"],
        units: ["pza", "par", "set"],
        modules: ["inventory", "sales", "purchases", "crm", "finance", "employees", "cpe", "logistics", "documents", "shieldline"],
        suggestedProducts: [
            { name: "Vestido Rosa Mango Larga", category: "Vestidos", price: 850, cost: 320 },
            { name: "Jeans Azul Clásico", category: "Pantalones", price: 650, cost: 240 }
        ]
    },
    hospitality: {
        name: "Restaurante / Abarrotes",
        categories: ["Bebidas", "Perecederos", "Abarrotes", "Limpieza", "Congelados"],
        units: ["pza", "kg", "lt", "caja"],
        modules: ["inventory", "sales", "purchases", "crm", "finance", "employees", "cpe", "logistics", "documents", "shieldline"],
        suggestedProducts: [
            { name: "Aceite Vegetal 1L", category: "Abarrotes", price: 45, cost: 32 },
            { name: "Caja de Refrescos (12pza)", category: "Bebidas", price: 280, cost: 210 }
        ]
    },
    manufacturing: {
        name: "Manufactura / Taller",
        categories: ["Materia Prima", "Insumos", "Producto Terminado", "Herramientas", "Desechos"],
        units: ["pza", "kg", "m", "g"],
        modules: ["inventory", "sales", "purchases", "crm", "finance", "employees", "cpe", "logistics", "documents", "production"],
        suggestedProducts: [
            { name: "Rollo de Hilo Reforzado", category: "Materia Prima", price: 120, cost: 80 },
            { name: "Pieza de Motor G-20", category: "Producto Terminado", price: 4500, cost: 2800 }
        ]
    },
    services: {
        name: "Servicios Profesionales",
        categories: ["Consultoría", "Mantenimiento", "Licencias", "Paquetes", "Suscripciones"],
        units: ["hr", "mes", "pza", "licencia"],
        modules: ["inventory", "sales", "purchases", "crm", "finance", "employees", "cpe", "logistics", "documents", "shieldline"],
        suggestedProducts: [
            { name: "Consultoría Estratégica", category: "Consultoría", price: 1500, cost: 0 },
            { name: "Suscripción Anual Soporte", category: "Suscripciones", price: 12000, cost: 2000 }
        ]
    },
    technology: {
        name: "Tecnología / Electrónica",
        categories: ["Hardware", "Software", "Periféricos", "Componentes", "Redes"],
        units: ["pza", "licencia", "m"],
        modules: ["inventory", "sales", "purchases", "crm", "finance", "employees", "cpe", "logistics", "documents", "shieldline"],
        suggestedProducts: [
            { name: "Monitor 24' Pro", category: "Hardware", price: 3200, cost: 2100 },
            { name: "Licencia Antivirus Enterprise", category: "Software", price: 850, cost: 400 }
        ]
    },
    other: {
        name: "Otro / General",
        categories: ["General", "Insumos", "Especiales", "Varios"],
        units: ["pza", "kg", "serv"],
        modules: ["inventory", "sales", "purchases", "crm", "finance", "employees", "cpe", "logistics", "documents", "shieldline"],
        suggestedProducts: [
            { name: "Producto de Ejemplo", category: "General", price: 100, cost: 50 }
        ]
    }
};
