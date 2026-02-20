import React, { useState, useEffect } from 'react';
import { Logo } from '../../components/design-system/Logo';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { ShieldCheck, Lock, Mail, ChevronRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTheme } from '../../../context/ThemeContext';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const { studentTheme } = useTheme();

    const isDark = studentTheme === 'dark';

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Auth logic here later
        navigate('/admin');
    };

    return (
        <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-500 ${isDark ? 'bg-[#121212] bg-[url("https://www.transparenttextures.com/patterns/dark-matter.png")]' : 'bg-[#FAF9F6] bg-[url("https://www.transparenttextures.com/patterns/white-diamond.png")]'
            }`}>
            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center mb-12">
                    <Logo size="lg" className="mx-auto drop-shadow-2xl" />
                    <div className="flex items-center justify-center gap-3 mt-6">
                        <ShieldCheck className="w-5 h-5 text-secondary" />
                        <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.4em]">Executive Portal Access</p>
                    </div>
                </div>

                <Card className={`p-10 border-none shadow-2xl rounded-[3rem] relative overflow-hidden group transition-all duration-500 ${isDark ? 'bg-muted' : 'bg-white'
                    }`}>
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-secondary to-gold-500"></div>

                    <form onSubmit={handleLogin} className="space-y-8 relative z-10">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Administrative Credentials</label>
                                <div className="relative group/input">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within/input:text-secondary transition-colors" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin@caleb.edu"
                                        className={`w-full pl-16 pr-6 py-6 rounded-2xl outline-none border-2 transition-all font-bold placeholder:opacity-30 ${isDark ? 'bg-background border-border focus:border-secondary' : 'bg-gray-50 border-[#E5E2DC] focus:border-secondary'
                                            }`}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Secure Access Key</label>
                                <div className="relative group/input">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within/input:text-secondary transition-colors" />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className={`w-full pl-16 pr-6 py-6 rounded-2xl outline-none border-2 transition-all font-bold placeholder:opacity-30 ${isDark ? 'bg-background border-border focus:border-secondary' : 'bg-gray-50 border-[#E5E2DC] focus:border-secondary'
                                            }`}
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            Establish Connection
                            <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </Button>

                        <div className="flex flex-col items-center gap-4 pt-2">
                            <div className="w-full h-px bg-border opacity-50"></div>
                            <p className="text-center text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-loose">
                                This system is for authorized personnel only.<br />All access attempts are audited and logged.
                            </p>
                        </div>
                    </form>

                    {/* Sophisticated background glow */}
                    <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-secondary/10 rounded-full blur-3xl transition-opacity group-hover:opacity-20"></div>
                    <div className="absolute -top-24 -left-24 w-56 h-56 bg-gold-500/10 rounded-full blur-3xl transition-opacity group-hover:opacity-20"></div>
                </Card>

                <div className="mt-12 text-center">
                    <button
                        onClick={() => navigate('/')}
                        className="group flex items-center justify-center gap-3 mx-auto text-muted-foreground hover:text-secondary text-sm font-bold transition-all"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Exit to Client Domain
                    </button>
                </div>
            </div>
        </div>
    );
}
