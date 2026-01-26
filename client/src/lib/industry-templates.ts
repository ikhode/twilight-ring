export interface IndustryTemplate {
    name: string;
    categories: string[];
    units: string[];
    productTypeLabels: Record<string, { label: string, context: string }>;
    suggestedProducts: {
        name: string;
        category: string;
        price: number;
        cost: number;
    }[];
}

export const INDUSTRY_TEMPLATES: Record<string, IndustryTemplate> = {
    retail: {
        name: "Tienda de Ropa / Retail",
        categories: ["Vestidos", "Pantalones", "Calzado", "Accesorios", "Liquidación"],
        units: ["pza", "par", "set"],
        productTypeLabels: {
            both: {
                label: "Mercancía de Reventa",
                context: "Se activará el cálculo de margen real y alertas de rotación estacional."
            },
            sale: {
                label: "Prenda de Diseño Propio",
                context: "Se habilitará el seguimiento exclusivo de éxito de diseño y valor agregado."
            },
            purchase: {
                label: "Insumo Operativo (Bolsas/Ganchos)",
                context: "Se monitoreará el stock crítico para no interrumpir la atención al cliente."
            },
            internal: {
                label: "Mantenimiento / Activo",
                context: "Se controlará como gasto operativo y depreciación de equipo de tienda."
            }
        },
        suggestedProducts: [
            { name: "Vestido Rosa Mango Larga", category: "Vestidos", price: 850, cost: 320 },
            { name: "Jeans Azul Clásico", category: "Pantalones", price: 650, cost: 240 }
        ]
    },
    hospitality: {
        name: "Restaurante / Abarrotes",
        categories: ["Bebidas", "Perecederos", "Abarrotes", "Limpieza", "Congelados"],
        units: ["pza", "kg", "lt", "caja"],
        productTypeLabels: {
            purchase: {
                label: "Ingrediente / Materia Prima",
                context: "Se usará para medir mermas y proyectar pedidos automáticos a proveedores."
            },
            sale: {
                label: "Platillo / Bebida Preparada",
                context: "Se analizará el costo por receta y popularidad en el menú dinámico."
            },
            both: {
                label: "Producto de Reventa (Refrescos/Postres)",
                context: "Se comparará el margen de reventa directa contra productos preparados."
            },
            internal: {
                label: "Suministro de Mesa / Limpieza",
                context: "Se rastreará el consumo operativo por comensal o jornada."
            }
        },
        suggestedProducts: [
            { name: "Aceite Vegetal 1L", category: "Abarrotes", price: 45, cost: 32 },
            { name: "Caja de Refrescos (12pza)", category: "Bebidas", price: 280, cost: 210 }
        ]
    },
    manufacturing: {
        name: "Manufactura / Taller",
        categories: ["Materia Prima", "Insumos", "Producto Terminado", "Herramientas", "Desechos"],
        units: ["pza", "kg", "m", "g"],
        productTypeLabels: {
            purchase: {
                label: "Materia Prima Cruda",
                context: "Se integrará en alertas de paro de línea por falta de suministros."
            },
            sale: {
                label: "Producto Terminado",
                context: "Se calculará el costo de producción total y tiempos de entrega estimados."
            },
            both: {
                label: "Subensamble / Componente",
                context: "Se gestionará la trazabilidad por lotes en la cadena de montaje."
            },
            internal: {
                label: "Herramental / Consumible",
                context: "Se programarán alertas de mantenimiento y reposición de herramientas."
            }
        },
        suggestedProducts: [
            { name: "Rollo de Hilo Reforzado", category: "Materia Prima", price: 120, cost: 80 },
            { name: "Pieza de Motor G-20", category: "Producto Terminado", price: 4500, cost: 2800 }
        ]
    },
    services: {
        name: "Servicios Profesionales",
        categories: ["Consultoría", "Mantenimiento", "Licencias", "Paquetes", "Suscripciones"],
        units: ["hr", "mes", "pza", "licencia"],
        productTypeLabels: {
            sale: {
                label: "Servicio Profesional / Hora",
                context: "Se medirá la rentabilidad por proyecto y horas de consultoría facturadas."
            },
            both: {
                label: "Licenciamiento / Software",
                context: "Se automatizarán las renovaciones y el control de comisiones por reventa."
            },
            purchase: {
                label: "Servicio de Terceros (Subcontrato)",
                context: "Se auditará el costo de tercerización contra el valor del entregable."
            },
            internal: {
                label: "Gasto Administrativo",
                context: "Se clasificará como costo fijo de operación para el reporte de utilidad neta."
            }
        },
        suggestedProducts: [
            { name: "Consultoría Estratégica", category: "Consultoría", price: 1500, cost: 0 },
            { name: "Suscripción Anual Soporte", category: "Suscripciones", price: 12000, cost: 2000 }
        ]
    },
    technology: {
        name: "Tecnología / Electrónica",
        categories: ["Hardware", "Software", "Periféricos", "Componentes", "Redes"],
        units: ["pza", "licencia", "m"],
        productTypeLabels: {
            both: {
                label: "Hardware para Distribución",
                context: "Se activará el rastreo de garantías y ciclos de obsolescencia técnica."
            },
            purchase: {
                label: "Componente Electrónico",
                context: "Se gestionará por lotes para auditorías de calidad de hardware."
            },
            sale: {
                label: "SaaS / Desarrollo Propio",
                context: "Se medirá el valor de vida del cliente (LTV) y tasa de cancelación."
            },
            internal: {
                label: "Activo Tecnológico (Laptop/Servidor)",
                context: "Se controlará el ciclo de vida del equipo y necesidades de renovación."
            }
        },
        suggestedProducts: [
            { name: "Monitor 24' Pro", category: "Hardware", price: 3200, cost: 2100 },
            { name: "Licencia Antivirus Enterprise", category: "Software", price: 850, cost: 400 }
        ]
    },
    other: {
        name: "Otro / General",
        categories: ["General", "Insumos", "Especiales", "Varios"],
        units: ["pza", "kg", "serv"],
        productTypeLabels: {
            both: {
                label: "Compra y Venta",
                context: "Se habilitará la conciliación básica de flujo de caja y stock."
            },
            purchase: {
                label: "Materia Prima",
                context: "Se usará para el control simple de inventario de entrada."
            },
            sale: {
                label: "Producto Final",
                context: "Se optimizarán los precios según el histórico de ventas."
            },
            internal: {
                label: "Uso Interno",
                context: "Se registrará como gasto de suministro general."
            }
        },
        suggestedProducts: [
            { name: "Producto de Ejemplo", category: "General", price: 100, cost: 50 }
        ]
    }
};
