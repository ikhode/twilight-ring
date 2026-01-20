import { AppLayout } from "@/components/layout/AppLayout";
import { AdminPanel } from "@/components/admin/AdminPanel";

export default function AdminPage() {
    return (
        <AppLayout
            title="Administración"
            subtitle="Panel de control del sistema de IA"
        >
            <AdminPanel />
        </AppLayout>
    );
}
