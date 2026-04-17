import { usePageTracking } from '../../hooks/usePageTracking';

/**
 * PageTracker Component
 * Automatically tracks page views for all navigation in the app
 * Place this in your App component to enable automatic analytics tracking
 */
export const PageTracker = () => {
  usePageTracking();
  return null; // This component doesn't render anything, just tracks
};
