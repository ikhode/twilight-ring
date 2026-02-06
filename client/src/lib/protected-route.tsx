import { useAuth } from "@/hooks/use-auth";
import { Redirect, Route } from "wouter";
import { Loader2 } from "lucide-react";

type Role = 'admin' | 'owner' | 'manager' | 'user' | 'viewer' | 'cashier';

interface ProtectedRouteProps {
    component: React.ComponentType<any>;
    path: string;
    allowedRoles?: Role[];
}

export function ProtectedRoute({ component: Component, path, allowedRoles = ['admin', 'owner', 'manager'] }: ProtectedRouteProps) {
    const { user, loading, profile } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!user) {
        return <Route path={path} component={() => <Redirect to="/login" />} />;
    }

    // Strict Role Check
    // If user has a profile but their role is NOT allowed, kick them to Kiosk
    const userRole = profile?.role as Role;
    const isAllowed = userRole && allowedRoles.includes(userRole);

    if (!isAllowed) {
        // If they are a basic user/employee, send to Kiosk, otherwise just home/landing
        const fallbackPath = userRole === 'user' || userRole === 'cashier' ? '/kiosk' : '/login';
        return <Route path={path} component={() => <Redirect to={fallbackPath} />} />;
    }

    return <Route path={path} component={Component} />;
}
