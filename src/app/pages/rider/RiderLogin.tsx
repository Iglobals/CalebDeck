import React, { useState, useEffect } from 'react';
import { Logo } from '../../components/design-system/Logo';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Phone, Lock, ChevronRight, Bike, Mail, User, Briefcase, Globe, Eye, EyeOff, ArrowLeft, Building, Hash, UserSquare } from 'lucide-react';
import { useNavigate } from 'react-router';

const NIGERIAN_BANKS = [
    'Access Bank', 'Branch', 'Carbon', 'Ecobank Nigeria', 'FairMoney',
    'Fidelity Bank', 'First Bank of Nigeria', 'First City Monument Bank',
    'Globus Bank', 'Guaranty Trust Bank (GTB)', 'Heritage Bank', 'Jaiz Bank',
    'Keystone Bank', 'Kuda Bank', 'Lotus Bank', 'Moniepoint',
    'Nova Merchant Bank', 'OPay', 'Palmpay', 'Paga', 'Polaris Bank',
    'PremiumTrust Bank', 'Providus Bank', 'Stanbic IBTC Bank',
    'Standard Chartered Bank', 'Sterling Bank', 'SunTrust Bank', 'TajBank',
    'Titan Trust Bank', 'Union Bank of Nigeria', 'United Bank for Africa (UBA)',
    'Unity Bank', 'VFD Microfinance Bank', 'Wema Bank', 'Zenith Bank'
];
import { auth, db } from '../../../services/firebase';
import { useAuth } from '../../../context/AuthContext';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function RiderLogin({ initialMode = 'login' }: { initialMode?: 'login' | 'signup' }) {
    const [mode, setMode] = useState<'login' | 'signup' | 'onboarding'>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        department: '',
        bankName: '',
        accountNumber: '',
        accountName: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { user } = useAuth();

    // If the AuthContext detects a logged-in rider, redirect automatically
    useEffect(() => {
        if (user && user.role === 'RIDER') {
            navigate('/rider', { replace: true });
        }
    }, [user, navigate]);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (mode === 'login') {
                const res = await signInWithEmailAndPassword(auth, email, password);
                // Check if user doc exists and has RIDER role
                const userDoc = await getDoc(doc(db, 'users', res.user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (data.role !== 'RIDER') {
                        setError('This account is not registered as a rider.');
                        await auth.signOut();
                        setLoading(false);
                        return;
                    }
                    // AuthContext onAuthStateChanged will pick this up and set user.role
                    // The useEffect above will handle the redirect
                } else {
                    // User has Firebase Auth but no Firestore profile — show onboarding
                    setMode('onboarding');
                    setLoading(false);
                    return;
                }
            } else {
                // Signup
                await createUserWithEmailAndPassword(auth, email, password);
                setMode('onboarding');
            }
        } catch (err: any) {
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError('Invalid email or password.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('This email is already registered. Try logging in.');
            } else {
                setError(err.message || 'Something went wrong.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setLoading(true);
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            const res = await signInWithPopup(auth, provider);
            const userDoc = await getDoc(doc(db, 'users', res.user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                if (data.role !== 'RIDER') {
                    setError('This account is not registered as a rider.');
                    await auth.signOut();
                    return;
                }
                // useEffect will handle redirect when AuthContext updates
            } else {
                setMode('onboarding');
            }
        } catch (err: any) {
            setError(err.message || 'Google sign-in failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleOnboarding = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) return;
        if (!formData.fullName.trim() || !formData.phone.trim() || !formData.bankName.trim() || !formData.accountNumber.trim() || !formData.accountName.trim()) {
            setError('Please fill in all required fields.');
            return;
        }
        if (formData.accountNumber.trim().length !== 10) {
            setError('Account number must be 10 digits.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            // 1. Create the users doc (for AuthContext role check)
            await setDoc(doc(db, 'users', auth.currentUser.uid), {
                fullName: formData.fullName.trim(),
                phone: formData.phone.trim(),
                department: formData.department.trim(),
                email: auth.currentUser.email,
                role: 'RIDER',
                status: 'offline',
                createdAt: new Date().toISOString()
            });

            // 2. Also create a riders doc (for admin rider management)
            //    Use the auth UID as the rider doc ID so they stay linked
            await setDoc(doc(db, 'riders', auth.currentUser.uid), {
                name: formData.fullName.trim(),
                phone: formData.phone.trim(),
                dept: formData.department.trim(),
                email: auth.currentUser.email,
                authUid: auth.currentUser.uid,
                status: 'offline',
                isActive: false,  // Pending — admin activates
                assignedHostelIds: [],
                earnings: 0,
                bankName: formData.bankName.trim(),
                accountNumber: formData.accountNumber.trim(),
                accountName: formData.accountName.trim(),
                role: 'rider',
                createdAt: new Date().toISOString()
            });

            // Force a page reload so AuthContext picks up the new Firestore doc
            window.location.href = '/rider';
        } catch (err: any) {
            setError(err.message || 'Failed to save profile.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full pl-12 pr-6 py-4 bg-[#1A1A1A] border-2 border-[#222222] rounded-2xl text-white focus:border-[#7C3AED] outline-none transition-all font-bold text-sm placeholder:text-gray-600";

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#7C3AED]/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FCD34D]/5 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-10">
                    <Logo size="lg" className="mx-auto" />
                    <div className="flex items-center justify-center gap-2 mt-4">
                        <Bike className="w-4 h-4 text-[#7C3AED]" />
                        <p className="text-[10px] font-black text-[#9C8F7F] tracking-[0.4em] uppercase">Rider Portal</p>
                    </div>
                </div>

                <Card className="p-8 lg:p-10 bg-[#141414] border-[#222222] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#7C3AED] via-[#FCD34D] to-[#7C3AED]"></div>

                    {mode === 'onboarding' ? (
                        <form onSubmit={handleOnboarding} className="space-y-6">
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-black text-white">Complete Your Profile</h2>
                                <p className="text-[10px] font-bold text-[#9C8F7F] uppercase tracking-widest mt-1">Tell us about yourself</p>
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold text-center">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#9C8F7F] uppercase tracking-widest ml-1">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8F7F]" />
                                        <input
                                            type="text"
                                            required
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                            placeholder="John Doe"
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#9C8F7F] uppercase tracking-widest ml-1">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8F7F]" />
                                        <input
                                            type="tel"
                                            required
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="080 000 0000"
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#9C8F7F] uppercase tracking-widest ml-1">Department (in school)</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8F7F]" />
                                        <input
                                            type="text"
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                            placeholder="e.g. Computer Science"
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#9C8F7F] uppercase tracking-widest ml-1">Bank Name</label>
                                    <div className="relative">
                                        <Building className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8F7F]" />
                                        <input
                                            type="text"
                                            required
                                            list="rider-banks"
                                            value={formData.bankName}
                                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                            placeholder="Choose or type bank"
                                            className={inputClass}
                                        />
                                        <datalist id="rider-banks">
                                            {NIGERIAN_BANKS.map(bank => <option key={bank} value={bank} />)}
                                        </datalist>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#9C8F7F] uppercase tracking-widest ml-1">Account Number</label>
                                    <div className="relative">
                                        <Hash className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8F7F]" />
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="^\d{10}$"
                                            required
                                            value={formData.accountNumber}
                                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                            placeholder="10-digit account number"
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#9C8F7F] uppercase tracking-widest ml-1">Account Name</label>
                                    <div className="relative">
                                        <UserSquare className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8F7F]" />
                                        <input
                                            type="text"
                                            required
                                            value={formData.accountName}
                                            onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                                            placeholder="Name on account"
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                disabled={loading}
                                className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] bg-[#7C3AED] text-white shadow-xl shadow-[#7C3AED]/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                {loading ? 'Saving...' : 'Complete Setup'}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleEmailAuth} className="space-y-6">
                            <div className="flex border-b border-[#222222] mb-6">
                                <button
                                    type="button"
                                    onClick={() => { setMode('login'); setError(''); }}
                                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${mode === 'login' ? 'text-[#7C3AED] border-b-2 border-[#7C3AED]' : 'text-[#9C8F7F]'}`}
                                >
                                    Login
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setMode('signup'); setError(''); }}
                                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${mode === 'signup' ? 'text-[#7C3AED] border-b-2 border-[#7C3AED]' : 'text-[#9C8F7F]'}`}
                                >
                                    Sign Up
                                </button>
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold text-center">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#9C8F7F] uppercase tracking-widest ml-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8F7F]" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="rider@calebdeck.com"
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#9C8F7F] uppercase tracking-widest ml-1">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8F7F]" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className={`${inputClass} pr-12`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9C8F7F] hover:text-[#7C3AED] transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                disabled={loading}
                                className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] bg-[#7C3AED] text-white shadow-xl shadow-[#7C3AED]/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                            </Button>

                            <div className="flex items-center gap-4 py-2">
                                <div className="flex-1 h-px bg-[#222222]"></div>
                                <span className="text-[9px] font-black text-[#444444] uppercase tracking-widest">Or continue with</span>
                                <div className="flex-1 h-px bg-[#222222]"></div>
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleAuth}
                                disabled={loading}
                                className="w-full py-4 rounded-2xl bg-[#1A1A1A] border-2 border-[#222222] flex items-center justify-center gap-3 hover:border-[#7C3AED] transition-all"
                            >
                                <Globe className="w-4 h-4 text-[#FCD34D]" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Google Account</span>
                            </button>
                        </form>
                    )}
                </Card>

                <div className="mt-8 text-center">
                    <button onClick={() => navigate('/')} className="group flex items-center justify-center gap-2 mx-auto text-[#9C8F7F] hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">
                        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                        Back to Student Portal
                    </button>
                </div>
            </div>
        </div>
    );
}
