import React from 'react';
import { Outlet } from 'react-router';
import { PageTracker } from '../components/PageTracker';

/**
 * Root wrapper that includes page tracking
 * This ensures PageTracker is inside Router context
 */
export const RootWrapper = () => {
  return (
    <>
      <PageTracker />
      <Outlet />
    </>
  );
};
