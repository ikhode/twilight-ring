import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorFallbackProps {
    error: Error;
    resetError: () => void;
}

/**
 * Error fallback component displayed when an error boundary catches an error.
 * Provides user-friendly error message and options to recover.
 */
export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
    const isDevelopment = import.meta.env.MODE === 'development';

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <Card className="max-w-2xl w-full">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-8 w-8 text-red-500" />
                        <CardTitle className="text-2xl">Something went wrong</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                        We're sorry, but something unexpected happened. The error has been automatically reported to our team.
                    </p>

                    {isDevelopment && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm font-semibold text-red-900 mb-2">Error Details (Development Only):</p>
                            <pre className="text-xs text-red-800 overflow-auto max-h-64">
                                {error.message}
                                {'\n\n'}
                                {error.stack}
                            </pre>
                        </div>
                    )}

                    <div className="flex gap-3 mt-6">
                        <Button onClick={resetError} className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Try Again
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => window.location.href = '/dashboard'}
                        >
                            Go to Dashboard
                        </Button>
                    </div>

                    <p className="text-xs text-muted-foreground mt-4">
                        If this problem persists, please contact support with the error details.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
