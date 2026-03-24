import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FAF9F6] dark:bg-[#121212]">
                    <div className="max-w-md w-full text-center space-y-6">
                        {/* Logo */}
                        <div className="w-20 h-20 rounded-3xl overflow-hidden mx-auto shadow-lg">
                            <img src="/calebdeck-logo.jpeg" alt="CalebDeck" className="w-full h-full object-cover" />
                        </div>

                        {/* Illustration */}
                        <div className="w-24 h-24 mx-auto rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>

                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                                Something Went Wrong
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                                An unexpected error occurred. This could be due to a poor network connection or a temporary issue. Please try again.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button
                                onClick={this.handleReload}
                                className="flex-1 px-6 py-3.5 rounded-2xl bg-[#7C3AED] text-white font-bold text-sm shadow-lg shadow-[#7C3AED]/20 hover:bg-[#6D28D9] active:scale-[0.98] transition-all"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="flex-1 px-6 py-3.5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] transition-all"
                            >
                                Go Home
                            </button>
                        </div>

                        <p className="text-xs text-gray-400 dark:text-gray-600 pt-4">
                            If this keeps happening, close the app and reopen it, or clear your browser cache.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
