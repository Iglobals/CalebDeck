import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { PageTracker } from '../components/PageTracker';
import { reportFrontendError } from '../../services/monitoring';

/**
 * Root wrapper that includes page tracking
 * This ensures PageTracker is inside Router context
 */
export const RootWrapper = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reportFrontendError({
        eventType: 'frontend_error',
        humanTitle: 'A customer-facing script error occurred',
        humanSummary: 'The app reported an uncaught error from a browser session.',
        errorMessage: event.message,
        stack: event.error?.stack,
        component: 'window.onerror',
        path: pathname,
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      reportFrontendError({
        eventType: 'unhandled_rejection',
        humanTitle: 'An unhandled app promise failed',
        humanSummary: 'A background request or script failed without being caught.',
        errorMessage: reason?.message || String(reason || 'Unhandled rejection'),
        stack: reason?.stack,
        component: 'unhandledrejection',
        path: pathname,
      });
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [pathname]);

  return (
    <>
      <PageTracker />
      <Outlet />
    </>
  );
};
