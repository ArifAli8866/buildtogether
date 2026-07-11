import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Unhandled React Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-surface-800 p-8 rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-700 max-w-lg w-full text-center"
                    >
                        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-500" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-surface-900 dark:text-white mb-4">
                            Something went wrong.
                        </h1>
                        <p className="text-surface-600 dark:text-surface-400 mb-8">
                            We encountered an unexpected error while loading this page. Our team has been notified.
                        </p>
                        {this.state.error && (
                            <div className="mb-8 p-4 bg-surface-100 dark:bg-surface-900 rounded-xl text-left overflow-x-auto">
                                <code className="text-sm text-red-500 font-mono">
                                    {this.state.error.toString()}
                                </code>
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                            >
                                <RefreshCw className="w-5 h-5" />
                                Refresh Page
                            </button>
                            <Link
                                to="/"
                                onClick={() => this.setState({ hasError: false })}
                                className="w-full sm:w-auto px-6 py-3 bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors"
                            >
                                <Home className="w-5 h-5" />
                                Back to Home
                            </Link>
                        </div>
                    </motion.div>
                </div>
            );
        }

        return this.props.children;
    }
}
