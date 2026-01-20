import { AppLayout } from "@/components/layout/AppLayout";
import { NLQueryPanel } from "@/components/query/NLQueryPanel";

export default function QueryPage() {
    return (
        <AppLayout
            title="Consultas de Datos"
            subtitle="Pregunta sobre tus datos en lenguaje natural"
        >
            <NLQueryPanel />
        </AppLayout>
    );
}
