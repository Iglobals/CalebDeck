import React, { useState } from 'react';
import { Logo } from '../../components/design-system/Logo';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Phone, Lock, ChevronRight, Bike, Mail, User, Briefcase, Globe } from 'lucide-react';
import { useNavigate } from 'react-router';
import { auth, db } from '../../../services/firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function RiderLogin() {
    const [mode, setMode] = useState<'login' | 'signup' | 'onboarding'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        department: 'Logistics',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const checkUserRoleAndNavigate = async (uid: string) => {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.role === 'RIDER') {
                navigate('/rider');
            } else {
                setError('Unauthorized: This account is not registered as a Rider.');
            }
        } else {
            setMode('onboarding');
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (mode === 'login') {
                const res = await signInWithEmailAndPassword(auth, email, password);
                await checkUserRoleAndNavigate(res.user.uid);
            } else {
                const res = await createUserWithEmailAndPassword(auth, email, password);
                setMode('onboarding');
            }
        } catch (err: any) {
            setError(err.message);
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
            await checkUserRoleAndNavigate(res.user.uid);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOnboarding = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) return;
        setLoading(true);
        try {
            await setDoc(doc(db, 'users', auth.currentUser.uid), {
                ...formData,
                email: auth.currentUser.email,
                role: 'RIDER',
                assignedHostelIds: [],
                status: 'offline',
                createdAt: new Date().toISOString()
            });
            navigate('/rider');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#7C3AED]/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FCD34D]/5 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-10">
                    <Logo size="lg" className="mx-auto" />
                    <div className="flex items-center justify-center gap-2 mt-4">
                        <Bike className="w-4 h-4 text-[#7C3AED]" />
                        <p className="text-[10px] font-black text-[#9C8F7F] tracking-[0.4em] uppercase">Fleet Intelligence System</p>
                    </div>
                </div>

                <Card className="p-8 lg:p-10 bg-[#141414] border-[#222222] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#7C3AED] via-[#FCD34D] to-[#7C3AED]"></div>

                    {mode === 'onboarding' ? (
                        <form onSubmit={handleOnboarding} className="space-y-6">
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-black text-white uppercase tracking-widest">Complete Enlistment</h2>
                                <p className="text-[10px] font-bold text-[#9C8F7F] uppercase tracking-widest mt-1">Personnel Detail Acquisition</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#9C8F7F] uppercase tracking-widest ml-1">Full Legal Name</label>
                                    <div className="relative">
                                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8F7F]" />
                                        <input
                                            type="text"
                                            required
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                            placeholder="John Doe"
                                            className="w-full pl-12 pr-6 py-4 bg-[#1A1A1A] border-2 border-[#222222] rounded-2xl text-white focus:border-[#7C3AED] outline-none transition-all font-bold text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#9C8F7F] uppercase tracking-widest ml-1">Phone Connectivity</label>
                                    <div className="relative">
                                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8F7F]" />
                                        <input
                                            type="tel"
                                            required
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="080 000 0000"
                                            className="w-full pl-12 pr-6 py-4 bg-[#1A1A1A] border-2 border-[#222222] rounded-2xl text-white focus:border-[#7C3AED] outline-none transition-all font-bold text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#9C8F7F] uppercase tracking-widest ml-1">Assigned Department</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8F7F]" />
                                        <select
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                            className="w-full pl-12 pr-6 py-4 bg-[#1A1A1A] border-2 border-[#222222] rounded-2xl text-white focus:border-[#7C3AED] outline-none transition-all font-bold text-sm appearance-none"
                                        >
                                            <option value="Logistics">Logistics Division</option>
                                            <option value="Fleet Management">Fleet Management</option>
                                            <option value="Express Delivery">Express Delivery</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                disabled={loading}
                                className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] bg-[#7C3AED] text-white shadow-xl shadow-[#7C3AED]/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                {loading ? 'Acquiring...' : 'Finalize Activation'}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleEmailAuth} className="space-y-6">
                            <div className="flex border-b border-[#222222] mb-6">
                                <button
                                    type="button"
                                    onClick={() => setMode('login')}
                                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${mode === 'login' ? 'text-[#7C3AED] border-b-2 border-[#7C3AED]' : 'text-[#9C8F7F]'}`}
                                >
                                    Login
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('signup')}
                                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${mode === 'signup' ? 'text-[#7C3AED] border-b-2 border-[#7C3AED]' : 'text-[#9C8F7F]'}`}
                                >
                                    Signup
                                </button>
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold text-center">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#9C8F7F] uppercase tracking-widest ml-1">Fleet Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8F7F]" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="rider@calebdeck.com"
                                            className="w-full pl-12 pr-6 py-4 bg-[#1A1A1A] border-2 border-[#222222] rounded-2xl text-white focus:border-[#7C3AED] outline-none transition-all font-bold text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#9C8F7F] uppercase tracking-widest ml-1">Secure Passkey</label>
                                    <div className="relative">
                                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8F7F]" />
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-12 pr-6 py-4 bg-[#1A1A1A] border-2 border-[#222222] rounded-2xl text-white focus:border-[#7C3AED] outline-none transition-all font-bold text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                disabled={loading}
                                className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] bg-white text-black hover:bg-[#7C3AED] hover:text-white transition-all"
                            >
                                {loading ? 'Processing...' : mode === 'login' ? 'Establish Link' : 'Register Asset'}
                            </Button>

                            <div className="flex items-center gap-4 py-2">
                                <div className="flex-1 h-px bg-[#222222]"></div>
                                <span className="text-[9px] font-black text-[#444444] uppercase tracking-widest">Or Secure Via</span>
                                <div className="flex-1 h-px bg-[#222222]"></div>
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleAuth}
                                className="w-full py-4 rounded-2xl bg-[#1A1A1A] border-2 border-[#222222] flex items-center justify-center gap-3 hover:border-[#FCD34D] transition-all group/google"
                            >
                                <Globe className="w-4 h-4 text-[#FCD34D]" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Google Identity</span>
                            </button>
                        </form>
                    )}
                </Card>

                <div className="mt-8 text-center">
                    <button onClick={() => navigate('/')} className="text-[#444444] hover:text-white text-[9px] font-black uppercase tracking-widest transition-all">
                        ← Exit to Neutral Zone
                    </button>
                </div>
            </div>
        </div>
    );
}
