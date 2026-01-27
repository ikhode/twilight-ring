
import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RefreshCcw, Trash2, AlertTriangle } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    autoRecovering: boolean;
    countdown: number;
}

/**
 * Global Error Boundary to catch runtime errors and offer recovery options.
 * Specifically handles state corruption by allowing a full reset.
 */
export class GlobalErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
    }

    state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
        autoRecovering: false,
        countdown: 5
    };

    /**
     * Updates state when an error is thrown in a child component.
     * @param {Error} error The error thrown.
     * @returns {State} New state.
     */
    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
            autoRecovering: false,
            countdown: 5
        };
    }

    /**
     * Component Lifecycle method called when an error is caught.
     * Checks for critical errors to trigger auto-recovery.
     * @param {Error} error The error object.
     * @param {ErrorInfo} errorInfo Logic stack trace.
     */
    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);

        // Check for specific critical errors to auto-recover immediately
        // Note: React.Children.only was removed from critical list after fixing root causes
        const isCritical =
            error.message.includes("Minified React error") ||
            error.message.includes("Rendered more hooks than during the previous render") ||
            error.message.includes("Maximum update depth exceeded");

        this.setState({ errorInfo });

        if (isCritical) {
            console.warn("💀 Critical State Corruption detected. Initiating Auto-Recovery sequence...");
            this.initiateAutoRecovery(errorInfo);
        } else {
            // For non-critical errors, wait 15 seconds before deciding to auto-recover
            // This assumes that if the user hasn't recovered or the app is stuck, we force a reset.
            // Ideally we shouldn't force reset on minor UI errors, but the user requested:
            // "System Auto-Recovery solo si nuestro sistema no se renderizo pasados 15 segundos"

            // We can simulate this by setting a timeout. If the component unmounts (recovered), clear it.
            // But ErrorBoundary doesn't unmount on error.
            // We'll set a delayed trigger.
            setTimeout(() => {
                // Check if we are still in error state (which we likely are if this boundary is catching it)
                // and if user hasn't manually recovered.
                if (this.state.hasError && !this.state.autoRecovering) {
                    console.warn("⏳ 15s timeout reached with active error. Initiating System Auto-Recovery...");
                    this.initiateAutoRecovery(errorInfo);
                }
            }, 15000);
        }
    }

    initiateAutoRecovery = (errorInfo: ErrorInfo) => {
        this.setState({ errorInfo, autoRecovering: true });

        // Immediate cleanup
        this.performCleanup();

        // Coundown and Reload
        let count = 5;
        const timer = setInterval(() => {
            count--;
            this.setState({ countdown: count });
            if (count <= 0) {
                clearInterval(timer);
                window.location.href = "/login";
            }
        }, 1000);
    }

    /**
     * Clears application-specific storage while preserving Supabase auth session.
     * This is more selective than a full clear to avoid unnecessary logouts.
     */
    performCleanup = () => {
        console.log("🧹 Clearing Application State...");

        // Selective cleanup: Only clear app-specific keys, preserve Supabase auth
        const keysToPreserve = ['sb-', 'supabase']; // Supabase auth keys
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && !keysToPreserve.some(prefix => key.startsWith(prefix))) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Clear session storage completely (usually transient data)
        sessionStorage.clear();
    };

    /**
     * Manually triggers the reset and reload flow.
     */
    handleReset = () => {
        this.performCleanup();
        window.location.href = "/";
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            const { autoRecovering, countdown } = this.state;

            return (
                <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-200 p-4">
                    <Card className={`w-full max-w-md backdrop-blur-xl transition-colors duration-500 ${autoRecovering ? 'border-amber-500/50 bg-amber-950/20' : 'border-red-900/50 bg-slate-900/50'}`}>
                        <CardHeader className="text-center">
                            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${autoRecovering ? 'bg-amber-500/20 animate-pulse' : 'bg-red-900/20'}`}>
                                {autoRecovering ? <RefreshCcw className="w-6 h-6 text-amber-500 animate-spin" /> : <AlertTriangle className="w-6 h-6 text-red-500" />}
                            </div>
                            <CardTitle className="text-xl font-bold text-red-100">
                                {autoRecovering ? "System Auto-Recovery" : "System Error"}
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                {autoRecovering
                                    ? `Critical state corruption detected. Cleaning caches and restarting in ${countdown}s...`
                                    : "The application encountered an unexpected error."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!autoRecovering && (
                                <div className="p-3 bg-red-950/30 rounded border border-red-900/30 text-xs font-mono text-red-300 overflow-auto max-h-32">
                                    {this.state.error?.toString()}
                                </div>
                            )}

                            {autoRecovering && (
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className="bg-amber-500 h-full transition-all duration-1000 ease-linear"
                                        style={{ width: `${(countdown / 5) * 100}%` }}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={this.handleReload}
                                    className="border-slate-700 hover:bg-slate-800"
                                    disabled={autoRecovering}
                                >
                                    <RefreshCcw className="w-4 h-4 mr-2" />
                                    Reload Page
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={this.handleReset}
                                    className="bg-red-900 hover:bg-red-800 text-red-100"
                                    disabled={autoRecovering}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Reset & Clear
                                </Button>
                            </div>
                            <p className="text-[10px] text-center text-slate-500 mt-4">
                                Use "Reset & Clear" if the error persists. This will clear your local session data.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
