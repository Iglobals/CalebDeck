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
        import('../../services/monitoring').then(({ reportFrontendError }) => {
            reportFrontendError({
                eventType: 'frontend_error',
                humanTitle: 'The app hit a critical screen error',
                humanSummary: 'A student or admin page crashed and showed the recovery screen.',
                suggestedAction: 'Inspect the component stack in System Health and reproduce the route.',
                errorMessage: error.message,
                stack: `${error.stack || ''}\n${errorInfo.componentStack || ''}`,
                component: 'ErrorBoundary',
            });
        }).catch(() => {});
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
