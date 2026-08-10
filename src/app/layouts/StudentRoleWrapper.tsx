import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { GlobalCart } from '../components/student/GlobalCart';
import { ToastContainer } from 'react-toastify';
import { MartCartProvider } from '../../context/MartCartContext';
import { BatchTimerProvider } from '../../context/BatchTimerContext';
import { MaintenanceGate } from './MaintenanceGate';
import 'react-toastify/dist/ReactToastify.css';
import { GuestBanner } from '../components/student/GuestBanner';
import { FloatingNav } from '../components/student/FloatingNav';

export default function StudentRoleWrapper() {
    const { studentTheme, toggleStudentTheme, applyTheme } = useTheme();
    const { user } = useAuth();
    const location = useLocation();

    useEffect(() => {
        applyTheme('student');
    }, [studentTheme, applyTheme]);

    useEffect(() => {
        if (user) {
            document.documentElement.classList.add('i-con');
        } else {
            document.documentElement.classList.remove('i-con');
        }
        return () => document.documentElement.classList.remove('i-con');
    }, [user]);

    return (
        <div className={`min-h-screen bg-background transition-colors duration-300 ${user ? 'pb-28 md:pb-0 md:pl-24' : ''}`}>
            <MartCartProvider>
                <BatchTimerProvider>
                    <MaintenanceGate>
                        <Outlet />
                        <GuestBanner />
                        {user && !location.pathname.startsWith('/calebnet') && <GlobalCart />}
                    </MaintenanceGate>
                </BatchTimerProvider>
            </MartCartProvider>
            <FloatingNav />
            <ToastContainer position="top-right" autoClose={3000} />
        </div>
    );
}
