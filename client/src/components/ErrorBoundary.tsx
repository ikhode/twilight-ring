import { Component, ReactNode } from 'react';
import { ErrorBoundary as SentryErrorBoundary } from './lib/sentry';
import { AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

/**
 * Global Error Boundary Component
 * Catches React errors and reports them to Sentry
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                            <h1 className="text-2xl font-bold text-gray-900">
                                Algo salió mal
                            </h1>
                        </div>

                        <p className="text-gray-600 mb-4">
                            Lo sentimos, ocurrió un error inesperado. Nuestro equipo ha sido notificado.
                        </p>

                        {this.state.error && (
                            <details className="mb-4">
                                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                                    Detalles técnicos
                                </summary>
                                <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto">
                                    {this.state.error.message}
                                    {'\n\n'}
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                        >
                            Recargar página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Sentry-integrated Error Boundary
 * Use this for automatic error reporting to Sentry
 */
export function SentryBoundary({ children }: { children: ReactNode }) {
    return (
        <SentryErrorBoundary
            fallback={({ error, resetError }) => (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                            <h1 className="text-2xl font-bold text-gray-900">
                                Error detectado
                            </h1>
                        </div>

                        <p className="text-gray-600 mb-4">
                            Hemos reportado este error automáticamente. Puedes intentar recargar la página.
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={resetError}
                                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 transition-colors"
                            >
                                Reintentar
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                            >
                                Recargar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        >
            {children}
        </SentryErrorBoundary>
    );
}
