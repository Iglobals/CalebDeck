import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { PageTracker } from '../components/PageTracker';

/**
 * Root wrapper that includes page tracking
 * This ensures PageTracker is inside Router context
 */
export const RootWrapper = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return (
    <>
      <PageTracker />
      <Outlet />
    </>
  );
};
