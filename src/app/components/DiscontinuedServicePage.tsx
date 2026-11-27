import React from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, Shirt, Sparkles, Receipt } from 'lucide-react';
import SEO from './SEO';
import { Logo } from './design-system/Logo';
import { Button } from './design-system/Button';
import { PRODUCTS_CONFIG } from '../../config/brand';

export type DiscontinuedServiceName =
  | 'CalebDeck Food Delivery'
  | 'CalebDeck Mart'
  | 'CalebNet';

interface DiscontinuedServicePageProps {
  serviceName: DiscontinuedServiceName;
  canonicalPath?: string;
  customNote?: string;
}

export const DiscontinuedServicePage: React.FC<DiscontinuedServicePageProps> = ({
  serviceName,
  canonicalPath,
  customNote,
}) => {
  const description =
    customNote ||
    `Thank you for being part of our journey. ${serviceName} has been discontinued as CalebDeck transitions into its next chapter. You can continue exploring our active offerings through ${PRODUCTS_CONFIG.fashion.name}.`;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAF9F6] dark:bg-[#0F0F11] text-gray-900 dark:text-[#FAF9F6] px-4 py-8 sm:py-12">
      <SEO
        title={`${serviceName} — Service Transition | CalebDeck`}
        description={description}
        canonical={canonicalPath ? `https://calebdeck.com${canonicalPath}` : undefined}
        robots="noindex,follow"
      />

      <header className="max-w-3xl w-full mx-auto flex items-center justify-between">
        <Logo size="md" />
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          CalebDeck Home
        </Link>
      </header>

      <main className="max-w-xl w-full mx-auto my-12">
        <div className="bg-white dark:bg-[#17171A] border border-gray-200/90 dark:border-white/10 rounded-3xl p-8 sm:p-10 shadow-sm">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Next Chapter Notice
          </div>

          <h1
            className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-[#FAF9F6] mb-4 leading-tight"
            style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
          >
            {serviceName} has concluded its chapter.
          </h1>

          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            {description}
          </p>

          <div className="rounded-2xl bg-[#FAF9F6] dark:bg-white/[0.04] border border-gray-200/80 dark:border-white/10 p-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-8">
            <p className="font-semibold text-gray-900 dark:text-[#FAF9F6] mb-1">
              Historical orders & i-CON Wallet records remain safe
            </p>
            <p>
              All previous {serviceName} receipts, order records, and wallet balances remain preserved and accessible in your account history.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Link to={PRODUCTS_CONFIG.fashion.path} className="flex-1">
              <Button
                variant="primary"
                className="w-full justify-center gap-2 py-3.5 bg-[#121212] text-[#FAF9F6] dark:bg-[#FAF9F6] dark:text-[#121212] hover:opacity-90 border-none"
              >
                <Shirt className="w-4 h-4" />
                Explore {PRODUCTS_CONFIG.fashion.name}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/" className="sm:w-auto">
              <Button variant="outline" className="w-full justify-center gap-2 py-3.5">
                Discover What’s Next
              </Button>
            </Link>
          </div>

          <div className="pt-5 border-t border-gray-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
            <Link
              to="/my-orders"
              className="inline-flex items-center gap-1.5 font-semibold text-[#7C3AED] dark:text-[#A78BFA] hover:underline"
            >
              <Receipt className="w-4 h-4" />
              View Past Order History
            </Link>
            <Link
              to="/support"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Need help with a past order? Contact Support
            </Link>
          </div>
        </div>
      </main>

      <footer className="max-w-3xl w-full mx-auto text-center text-xs text-gray-400 dark:text-gray-500">
        © {new Date().getFullYear()} CalebDeck · An IGLOBALS TECHNOLOGY Brand
      </footer>
    </div>
  );
};
