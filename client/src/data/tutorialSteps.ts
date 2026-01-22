export type TutorialStep = {
    element: string;
    popover: {
        title: string;
        description: string;
        side?: "top" | "bottom" | "left" | "right";
        align?: "start" | "center" | "end";
    };
};

export const adminSteps: TutorialStep[] = [
    {
        element: "#sidebar-dashboard",
        popover: {
            title: "Comando Central",
            description: "Aquí tienes la vista general de toda tu operación en tiempo real.",
            side: "right",
        }
    },
    {
        element: "#sidebar-workflows",
        popover: {
            title: "Arquitecto de Procesos",
            description: "Diseña, personaliza y optimiza tus flujos de trabajo cognitivos.",
            side: "right",
        }
    },
    {
        element: "#sidebar-analytics",
        popover: {
            title: "Analytics Avanzado",
            description: "Insights predictivos generados por nuestros modelos de ML.",
            side: "right",
        }
    },
    {
        element: "#sidebar-settings",
        popover: {
            title: "Configuración Global",
            description: "Gestiona usuarios, roles y preferencias de la organización.",
            side: "right",
        }
    },
    {
        element: "#copilot-trigger",
        popover: {
            title: "Nexus Copilot",
            description: "Tu asistente de IA siempre disponible para responder preguntas y ejecutar acciones.",
            side: "left",
        }
    }
];

export const managerSteps: TutorialStep[] = [
    {
        element: "#sidebar-dashboard",
        popover: {
            title: "Vista de Supervisión",
            description: "Monitorea el rendimiento de tu equipo y el estado de las operaciones.",
            side: "right",
        }
    },
    {
        element: "#sidebar-employees",
        popover: {
            title: "Gestión de Talento",
            description: "Administra turnos, asignaciones y rendimiento del personal.",
            side: "right",
        }
    },
    {
        element: "#sidebar-reports",
        popover: {
            title: "Reportes Operativos",
            description: "Genera reportes detallados sobre productividad y eficiencia.",
            side: "right",
        }
    }
];

export const operatorSteps: TutorialStep[] = [
    {
        element: "#kiosk-tasks",
        popover: {
            title: "Mis Tareas",
            description: "Aquí encontrarás las actividades asignadas para tu turno.",
            side: "bottom",
        }
    },
    {
        element: "#kiosk-checkin",
        popover: {
            title: "Control de Asistencia",
            description: "Registra tu entrada y salida de forma rápida.",
            side: "bottom",
        }
    }
];

export const driverSteps: TutorialStep[] = [
    {
        element: "#driver-routes",
        popover: {
            title: "Rutas Asignadas",
            description: "Visualiza tus entregas y la ruta optimizada para hoy.",
            side: "bottom",
        }
    },
    {
        element: "#driver-status",
        popover: {
            title: "Estado de Entrega",
            description: "Actualiza el estado de cada envío en tiempo real.",
            side: "bottom",
        }
    }
];
