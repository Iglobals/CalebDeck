import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FriendlyErrorFallback } from './RouteErrorBoundary';
import { attemptGuardedReload, isDynamicImportError } from '../../utils/lazyWithRetry';

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
        console.error('[ErrorBoundary] Caught runtime error:', error, errorInfo);
        if (isDynamicImportError(error)) {
            attemptGuardedReload('ErrorBoundary');
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <FriendlyErrorFallback
                    error={this.state.error}
                    onReset={this.handleReset}
                />
            );
        }

        return this.props.children;
    }
}
