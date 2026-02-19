import React, { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useTheme } from '../../context/ThemeContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function StudentRoleWrapper() {
    const { studentTheme, toggleStudentTheme, applyTheme } = useTheme();

    useEffect(() => {
        applyTheme('student');
    }, [studentTheme, applyTheme]);

    return (
        <div className={`min-h-screen transition-colors duration-300 ${studentTheme === 'dark' ? 'bg-[#121212]' : 'bg-[#FAF9F6]'}`}>
            <Outlet />
            <ThemeToggle theme={studentTheme} onToggle={toggleStudentTheme} />
            <ToastContainer position="top-right" autoClose={3000} />
        </div>
    );
}
