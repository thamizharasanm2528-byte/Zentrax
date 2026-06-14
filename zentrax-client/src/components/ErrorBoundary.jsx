import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary] Caught render crash:', error, errorInfo);

        // Detect chunk/module loading failures (happens after Netlify redeploys)
        // Auto-reload the page once to fetch fresh assets
        const msg = error?.message || '';
        const isChunkError =
            msg.includes('Failed to fetch dynamically imported module') ||
            msg.includes('Loading chunk') ||
            msg.includes('Loading CSS chunk') ||
            msg.includes('Importing a module script failed');

        if (isChunkError) {
            const reloadKey = 'zentrax-chunk-reload';
            const lastReload = sessionStorage.getItem(reloadKey);
            const now = Date.now();

            // Only auto-reload once per 30 seconds to avoid infinite loops
            if (!lastReload || now - Number(lastReload) > 30000) {
                sessionStorage.setItem(reloadKey, String(now));
                window.location.reload();
                return;
            }
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#030712' }}>
                    <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
                        <div className="h-16 w-16 mx-auto rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
                            <AlertTriangle className="h-8 w-8 text-red-400" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-white">Something went wrong</h2>
                            <p className="text-sm text-[#94A3B8]">
                                An unexpected error occurred. This has been logged automatically.
                            </p>
                        </div>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <pre className="text-left text-xs p-4 rounded-lg overflow-auto max-h-40" style={{ background: 'rgba(239,68,68,0.06)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}>
                                {this.state.error.toString()}
                            </pre>
                        )}
                        <div className="flex justify-center gap-3">
                            <button onClick={() => window.location.reload()} className="zen-btn-primary flex items-center gap-2">
                                <RotateCcw className="h-4 w-4" /> Reload Page
                            </button>
                            <button onClick={() => window.location.href = '/'} className="zen-btn-secondary">
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
