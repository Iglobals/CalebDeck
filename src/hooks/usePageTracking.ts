import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { trackPageView } from '../services/analytics';

/**
 * Hook for automatic page view tracking
 * Call this in your root App component to track all page navigation
 */
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Map routes to human-readable page names
    const getPageName = (pathname: string): string => {
      const pathSegments = pathname.split('/').filter(Boolean);
      
      if (pathname === '/') return 'Landing Page';
      if (pathname === '/cafeteria') return 'Cafeteria Selection';
      if (pathname.startsWith('/plate-builder')) return 'Plate Builder';
      if (pathname === '/checkout') return 'Checkout';
      if (pathname === '/order-success') return 'Order Success';
      
      if (pathname === '/admin') return 'Admin Dashboard';
      if (pathname === '/admin/login') return 'Admin Login';
      if (pathname === '/admin/orders') return 'Admin Orders';
      if (pathname === '/admin/riders') return 'Admin Riders';
      if (pathname === '/admin/menu') return 'Admin Menu Management';
      if (pathname === '/admin/analytics') return 'Admin Analytics';
      if (pathname === '/admin/history') return 'Admin Order History';
      
      if (pathname === '/rider') return 'Rider Dashboard';
      if (pathname === '/rider/login') return 'Rider Login';
      if (pathname === '/rider/signup') return 'Rider Signup';
      if (pathname === '/rider/history') return 'Rider Order History';
      if (pathname === '/rider/wallet') return 'Rider Wallet';
      if (pathname === '/rider/batches') return 'Rider Batches';
      
      if (pathname === '/privacy-policy') return 'Privacy Policy';
      if (pathname === '/terms-of-service') return 'Terms of Service';
      if (pathname === '/support') return 'Support';
      if (pathname === '/learn-more') return 'Learn More';
      
      return `Page: ${pathSegments.join(' / ')}`;
    };

    // Track the page view
    const pageName = getPageName(location.pathname);
    trackPageView(pageName, location.pathname);
  }, [location.pathname]);
};
