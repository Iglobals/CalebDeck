import React from 'react';
import { Outlet } from 'react-router';
import { PageTracker } from '../components/PageTracker';

export default function RootLayout() {
    return (
        <>
            <PageTracker />
            <Outlet />
        </>
    );
}
