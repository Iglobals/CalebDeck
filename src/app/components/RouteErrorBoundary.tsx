import React, { useState } from 'react';
import { isRouteErrorResponse, useLocation, useNavigate, useRouteError } from 'react-router';
import { RefreshCw, ArrowLeft, WifiOff, Sparkles, Compass } from 'lucide-react';
import { clearChunkReloadGuard, isDynamicImportError } from '../../utils/lazyWithRetry';

interface ErrorViewProps {
  error?: unknown;
  onReset?: () => void;
}

function resolveSectionContext(pathname: string): {
  eyebrow: string;
  homePath: string;
  homeLabel: string;
  sectionPath?: string;
  sectionLabel?: string;
} {
  const clean = (pathname || '/').toLowerCase();
  if (clean.startsWith('/fashion')) {
    return {
      eyebrow: 'CalebDeck Fashion',
      homePath: '/',
      homeLabel: 'Back to CalebDeck',
      sectionPath: clean !== '/fashion' ? '/fashion' : undefined,
      sectionLabel: 'Browse Fashion',
    };
  }
  if (clean.startsWith('/mart') || clean === '/cart') {
    return {
      eyebrow: 'CalebDeck Mart',
      homePath: '/',
      homeLabel: 'Back to CalebDeck',
      sectionPath: clean !== '/mart' ? '/mart' : undefined,
      sectionLabel: 'Back to Mart',
    };
  }
  if (clean.startsWith('/calebnet')) {
    return {
      eyebrow: 'CalebNet',
      homePath: '/',
      homeLabel: 'Back to CalebDeck',
      sectionPath: clean !== '/calebnet' ? '/calebnet' : undefined,
      sectionLabel: 'Open CalebNet',
    };
  }
  if (clean.startsWith('/business')) {
    return {
      eyebrow: 'CalebDeck Business',
      homePath: '/',
      homeLabel: 'Back to CalebDeck',
      sectionPath: clean !== '/business' ? '/business' : undefined,
      sectionLabel: 'Browse Businesses',
    };
  }
  if (clean.startsWith('/admin')) {
    return {
      eyebrow: 'CalebDeck Admin',
      homePath: '/admin',
      homeLabel: 'Back to Admin Dashboard',
    };
  }
  if (clean.startsWith('/rider')) {
    return {
      eyebrow: 'CalebDeck Rider',
      homePath: '/rider',
      homeLabel: 'Back to Rider Hub',
    };
  }
  return {
    eyebrow: 'CalebDeck',
    homePath: '/',
    homeLabel: 'Back to CalebDeck',
  };
}

export function FriendlyErrorFallback({ error, onReset }: ErrorViewProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  let pathname = '/';
  try {
    pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  } catch {
    pathname = '/';
  }

  const section = resolveSectionContext(pathname);
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const isChunkOrModuleError = isDynamicImportError(error);
  const is404 =
    (isRouteErrorResponse(error) && error.status === 404) ||
    (error as any)?.status === 404;

  React.useEffect(() => {
    if (error) {
      console.error('[CalebDeck Error Boundary]', {
        pathname,
        isChunkOrModuleError,
        isOffline,
        error,
      });
    }
  }, [error, pathname, isChunkOrModuleError, isOffline]);

  let title = 'We couldn’t open this page right now';
  let description =
    'It looks like your connection dropped or CalebDeck was just updated. Refresh to load the latest version.';

  if (is404) {
    title = 'We couldn’t find that page';
    description =
      'The link you followed may have moved or no longer exists. Head back to CalebDeck to continue.';
  } else if (isOffline) {
    title = 'You appear to be offline';
    description =
      'Check your mobile data or campus Wi-Fi connection, then tap Try again to continue where you left off.';
  } else if (!isChunkOrModuleError) {
    title = 'We couldn’t load this view right now';
    description =
      'Something interrupted this page while loading. Your account and cart are safe — tap Try again or return to the home screen.';
  }

  const handleRetry = () => {
    if (isRetrying) return;
    setIsRetrying(true);
    clearChunkReloadGuard();

    if (onReset && !isChunkOrModuleError) {
      try {
        onReset();
        setIsRetrying(false);
        return;
      } catch {
        // fall through to full reload
      }
    }

    setTimeout(() => {
      window.location.reload();
    }, 150);
  };

  const handleNavigate = (targetPath: string) => {
    clearChunkReloadGuard();
    if (onReset) {
      try {
        onReset();
      } catch {
        // ignore
      }
    }
    window.location.href = targetPath;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-5 sm:p-6 bg-[#FAF9F6] dark:bg-[#0F0F0F] text-gray-900 dark:text-[#FAF9F6] transition-colors">
      <div className="w-full max-w-[480px] rounded-[2rem] border border-gray-200/80 dark:border-[#262626] bg-white dark:bg-[#171717] p-7 sm:p-9 shadow-2xl shadow-black/5 text-center">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md border border-gray-100 dark:border-[#2A2A2A]">
            <img src="/calebdeck-logo.jpeg" alt="CalebDeck" className="w-full h-full object-cover" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-[0.18em] bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20">
            <Sparkles className="w-3 h-3" />
            {section.eyebrow}
          </span>
        </div>

        {/* Status Icon */}
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
          {is404 ? (
            <Compass className="w-7 h-7" />
          ) : isOffline ? (
            <WifiOff className="w-7 h-7" />
          ) : (
            <RefreshCw className={`w-7 h-7 ${isRetrying ? 'animate-spin' : ''}`} />
          )}
        </div>

        {/* Copy */}
        <h1 className="text-2xl sm:text-[26px] font-black tracking-tight leading-snug mb-3 text-gray-900 dark:text-[#FAF9F6]">
          {title}
        </h1>
        <p className="text-sm sm:text-base font-medium text-gray-600 dark:text-[#9C8F7F] leading-relaxed mb-7">
          {description}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!is404 && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-sm shadow-lg shadow-[#7C3AED]/25 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Refreshing...' : 'Try again'}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleNavigate(section.homePath)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border-2 border-gray-200 dark:border-[#2E2E2E] bg-gray-50/70 dark:bg-[#222222] hover:bg-gray-100 dark:hover:bg-[#2A2A2A] text-gray-800 dark:text-[#FAF9F6] font-bold text-sm active:scale-[0.98] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {section.homeLabel}
          </button>
        </div>

        {section.sectionPath && section.sectionLabel && (
          <button
            type="button"
            onClick={() => handleNavigate(section.sectionPath!)}
            className="mt-3 w-full py-2.5 text-xs font-black uppercase tracking-widest text-[#7C3AED] hover:underline"
          >
            {section.sectionLabel}
          </button>
        )}

        <p className="text-[11px] font-medium text-gray-400 dark:text-[#666666] mt-6 leading-relaxed">
          Your cart, wallet, and active orders remain safe.
        </p>
      </div>
    </div>
  );
}

export function RouteErrorBoundary() {
  const error = useRouteError();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <FriendlyErrorFallback
      error={error}
      onReset={() => {
        navigate(location.pathname + location.search, { replace: true });
      }}
    />
  );
}

export default RouteErrorBoundary;
