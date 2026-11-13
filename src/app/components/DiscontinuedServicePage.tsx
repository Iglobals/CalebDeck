import React from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Utensils, Shirt, Receipt, Info } from 'lucide-react';
import { Button } from './design-system/Button';

interface DiscontinuedServicePageProps {
  serviceName: 'CalebNet' | 'CalebDeck Mart';
  description: string;
}

export const DiscontinuedServicePage: React.FC<DiscontinuedServicePageProps> = ({
  serviceName,
  description,
}) => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#FAF9F6] dark:bg-[#121212]">
      <div className="max-w-lg w-full bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-sm text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <Info className="w-7 h-7" />
        </div>

        <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 mb-3">
          Service Update
        </span>

        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-[#FAF9F6] mb-3">
          {serviceName} Has Been Discontinued
        </h1>

        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
          {description}
        </p>

        <div className="rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 p-4 text-left text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-7">
          <p className="font-semibold text-gray-900 dark:text-[#FAF9F6] mb-1">
            Looking for past orders or wallet history?
          </p>
          <p>
            All historical {serviceName} transactions and receipts remain preserved in your order history and i-CON Wallet.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <Link to="/cafeteria">
            <Button variant="primary" className="w-full justify-center gap-2">
              <Utensils className="w-4 h-4" />
              Order Food
            </Button>
          </Link>
          <Link to="/fashion">
            <Button variant="outline" className="w-full justify-center gap-2">
              <Shirt className="w-4 h-4" />
              Explore Fashion
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-5 pt-2 text-sm">
          <Link
            to="/my-orders"
            className="inline-flex items-center gap-1.5 font-semibold text-[#7C3AED] hover:underline"
          >
            <Receipt className="w-4 h-4" />
            My Orders
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-semibold text-gray-600 dark:text-gray-300 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};
