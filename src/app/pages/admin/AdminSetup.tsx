/**
 * Admin Setup Page
 * Visit /admin/setup ONCE to create your default admin account.
 * After the first admin is created, this page will not create another.
 */
import React, { useState } from 'react';
import { Logo } from '../../components/design-system/Logo';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { auth, db } from '../../../services/firebase';

export default function AdminSetup() {
    const [email, setEmail] = useState('admin@calebdeck.com');
    const [password, setPassword] = useState('CalebDeck2025!');
    const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'exists'>('idle');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setError('');

        try {
            const adminsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'ADMIN')));
            if (!adminsSnap.empty) {
                setStatus('exists');
                return;
            }

            let uid: string;
            try {
                const res = await createUserWithEmailAndPassword(auth, email, password);
                uid = res.user.uid;
            } catch (err: any) {
                if (err.code === 'auth/email-already-in-use') {
                    const res = await signInWithEmailAndPassword(auth, email, password);
                    uid = res.user.uid;
                } else {
                    throw err;
                }
            }

            await setDoc(doc(db, 'users', uid), {
                email,
                role: 'ADMIN',
                fullName: 'CalebDeck Admin',
                createdAt: new Date().toISOString(),
            }, { merge: true });

            setStatus('done');
        } catch (err: any) {
            setError(err.message || 'Setup failed.');
            setStatus('idle');
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <Logo size="lg" className="mx-auto" />
                    <div className="flex items-center justify-center gap-2 mt-4">
                        <ShieldCheck className="w-4 h-4 text-[#7C3AED]" />
                        <p className="text-[10px] font-black text-[#9C8F7F] tracking-[0.4em] uppercase">First-Time Setup</p>
                    </div>
                </div>

                <Card className="p-8 bg-[#141414] border-[#222222] rounded-[2.5rem] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#7C3AED] via-[#FCD34D] to-[#7C3AED]"></div>

                    {status === 'done' ? (
                        <div className="text-center py-8 space-y-4">
                            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                            <h2 className="text-xl font-black text-white">Admin Created!</h2>
                            <p className="text-sm text-[#9C8F7F]">You can now log in with your credentials.</p>
                            <div className="bg-[#1A1A1A] rounded-2xl p-4 text-left space-y-2">
                                <p className="text-xs text-[#9C8F7F]"><span className="font-bold text-white">Email:</span> {email}</p>
                                <p className="text-xs text-[#9C8F7F]"><span className="font-bold text-white">Password:</span> {password}</p>
                            </div>
                            <Button
                                variant="primary"
                                onClick={() => navigate('/admin/login')}
                                className="w-full py-4 mt-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] bg-[#7C3AED] text-white"
                            >
                                Go to Admin Login
                            </Button>
                        </div>
                    ) : status === 'exists' ? (
                        <div className="text-center py-8 space-y-4">
                            <ShieldCheck className="w-16 h-16 text-[#FCD34D] mx-auto" />
                            <h2 className="text-xl font-black text-white">Admin Already Exists</h2>
                            <p className="text-sm text-[#9C8F7F]">An admin account has already been created. Please log in.</p>
                            <Button
                                variant="primary"
                                onClick={() => navigate('/admin/login')}
                                className="w-full py-4 mt-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] bg-[#7C3AED] text-white"
                            >
                                Go to Admin Login
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSetup} className="space-y-6">
                            <div className="text-center mb-4">
                                <h2 className="text-xl font-black text-white">Create Admin Account</h2>
                                <p className="text-[10px] font-bold text-[#9C8F7F] uppercase tracking-widest mt-1">Set your admin login credentials</p>
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold text-center">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#9C8F7F] uppercase tracking-widest ml-1">Admin Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-5 py-4 bg-[#1A1A1A] border-2 border-[#222222] rounded-2xl text-white focus:border-[#7C3AED] outline-none transition-all font-bold text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#9C8F7F] uppercase tracking-widest ml-1">Admin Password</label>
                                    <input
                                        type="text"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-5 py-4 bg-[#1A1A1A] border-2 border-[#222222] rounded-2xl text-white focus:border-[#7C3AED] outline-none transition-all font-bold text-sm"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                disabled={status === 'loading'}
                                className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] bg-[#7C3AED] text-white shadow-xl shadow-[#7C3AED]/20"
                            >
                                {status === 'loading' ? 'Creating...' : 'Create Admin Account'}
                            </Button>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    );
}
