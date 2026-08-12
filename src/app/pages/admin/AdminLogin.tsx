import React, { useState, useEffect } from 'react';
import { Logo } from '../../components/design-system/Logo';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { ShieldCheck, Lock, Mail, ChevronRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTheme } from '../../../context/ThemeContext';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../services/firebase';
import { useAuth } from '../../../context/AuthContext';
import { trackAdminLoginAttempt } from '../../../services/analytics';

const ADMIN_RECOVERY_EMAILS = ['admin@calebdeck.com'];

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { studentTheme } = useTheme();
    const { user } = useAuth();
    const isDark = studentTheme === 'dark';

    useEffect(() => {
        if (user && user.role === 'ADMIN') {
            navigate('/admin', { replace: true });
        }
    }, [user, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await signInWithEmailAndPassword(auth, email, password);
            const userDoc = await getDoc(doc(db, 'users', res.user.uid));

            const isRecoveryAdmin = ADMIN_RECOVERY_EMAILS.includes(String(res.user.email || '').toLowerCase());
            const repairAdminProfile = async () => {
                const token = await res.user.getIdToken(true);
                const response = await fetch('/api/calebnet/admin-role-repair', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(data.error || 'Could not restore admin access.');
            };

            if (userDoc.exists() && userDoc.data().role === 'ADMIN') {
                trackAdminLoginAttempt(email, true);
            } else if (isRecoveryAdmin) {
                // Auto-repair: the canonical admin account must never be locked out
                // by a missing or accidentally downgraded Firestore role.
                await repairAdminProfile();
                trackAdminLoginAttempt(email, true);
                navigate('/admin');
                return;
            } else {
                setError('Access denied. This account does not have admin privileges.');
                trackAdminLoginAttempt(email, false);
                await auth.signOut();
            }
        } catch (err: any) {
            setError(err?.message?.includes('restore admin access') || err?.message?.includes('approved for admin recovery')
                ? err.message
                : 'Invalid email or password. Please try again.');
            trackAdminLoginAttempt(email, false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-500 ${isDark ? 'bg-[#121212]' : 'bg-[#FAF9F6]'}`}>
            <div className="w-full max-w-md">
                <div className="text-center mb-12">
                    <Logo size="lg" className="mx-auto drop-shadow-2xl" />
                    <div className="flex items-center justify-center gap-3 mt-6">
                        <ShieldCheck className="w-5 h-5 text-secondary" />
                        <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.4em]">Admin Login</p>
                    </div>
                </div>

                <Card className={`p-10 border-none shadow-2xl rounded-[3rem] relative overflow-hidden group transition-all duration-500 ${isDark ? 'bg-muted' : 'bg-white'}`}>
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-secondary to-gold-500"></div>

                    {error && (
                        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-8 relative z-10">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Email Address</label>
                                <div className="relative group/input">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within/input:text-secondary transition-colors" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin@caleb.edu"
                                        className={`w-full pl-16 pr-6 py-6 rounded-2xl outline-none border-2 transition-all font-bold placeholder:opacity-30 ${isDark ? 'bg-background border-border focus:border-secondary' : 'bg-gray-50 border-[#E5E2DC] focus:border-secondary'}`}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Password</label>
                                <div className="relative group/input">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within/input:text-secondary transition-colors" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className={`w-full pl-16 pr-14 py-6 rounded-2xl outline-none border-2 transition-all font-bold placeholder:opacity-30 ${isDark ? 'bg-background border-border focus:border-secondary' : 'bg-gray-50 border-[#E5E2DC] focus:border-secondary'}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-secondary transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            disabled={loading}
                            className="w-full py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                            {!loading && <ChevronRight className="w-5 h-5" />}
                        </Button>

                        <div className="flex flex-col items-center gap-4 pt-2">
                            <div className="w-full h-px bg-border opacity-50"></div>
                            <p className="text-center text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-loose">
                                This system is for authorized personnel only.<br />All access attempts are audited and logged.
                            </p>
                        </div>
                    </form>

                    <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-secondary/10 rounded-full blur-3xl"></div>
                    <div className="absolute -top-24 -left-24 w-56 h-56 bg-gold-500/10 rounded-full blur-3xl"></div>
                </Card>

                <div className="mt-12 text-center">
                    <button
                        onClick={() => navigate('/')}
                        className="group flex items-center justify-center gap-3 mx-auto text-muted-foreground hover:text-secondary text-sm font-bold transition-all"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Back to Student Portal
                    </button>
                </div>
            </div>
        </div>
    );
}
