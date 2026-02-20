import React, { useState } from 'react';
import { Logo } from '../../components/design-system/Logo';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Phone, Lock, ChevronRight, Bike } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function RiderLogin() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [pin, setPin] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Auth logic here later
        navigate('/rider');
    };

    return (
        <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 w-[60%] h-full bg-[#7C3AED]/5 -skew-x-12 translate-x-32 hidden lg:block"></div>

            <div className="w-full max-w-xl relative z-10">
                <div className="mb-12">
                    <Logo size="lg" />
                    <div className="flex items-center gap-3 mt-6">
                        <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shadow-lg shadow-[#7C3AED]/20">
                            <Bike className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-black text-[#121212] tracking-[0.2em] uppercase italic">Fleet Portal Login</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-1 gap-12">
                    <div>
                        <h1 className="text-5xl lg:text-7xl font-black text-[#121212] tracking-tighter mb-8 leading-[0.9]">
                            READY TO <br />
                            <span className="text-[#7C3AED] italic">DISPATCH.</span>
                        </h1>

                        <form onSubmit={handleLogin} className="space-y-6 max-w-md">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-[#9C8F7F] uppercase tracking-widest ml-1">Rider Phone Number</label>
                                <div className="relative group">
                                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9C8F7F] group-focus-within:text-[#7C3AED] transition-colors" />
                                    <input
                                        type="tel"
                                        required
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        placeholder="080 000 0000"
                                        className="w-full pl-14 pr-6 py-5 bg-white border-2 border-[#E5E2DC] rounded-[2rem] text-[#121212] focus:border-[#7C3AED] outline-none transition-all font-bold placeholder:text-[#E5E2DC] shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-[#9C8F7F] uppercase tracking-widest ml-1">Fleet Access Pin</label>
                                <div className="relative group">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9C8F7F] group-focus-within:text-[#7C3AED] transition-colors" />
                                    <input
                                        type="password"
                                        required
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        placeholder="••••"
                                        className="w-full pl-14 pr-6 py-5 bg-white border-2 border-[#E5E2DC] rounded-[2rem] text-[#121212] focus:border-[#7C3AED] outline-none transition-all font-bold placeholder:text-[#E5E2DC] shadow-sm tracking-[0.5em]"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                className="w-full py-5 rounded-[2rem] italic font-black text-xl uppercase tracking-widest flex items-center justify-center gap-4 shadow-2xl shadow-[#7C3AED]/30 hover:translate-y-[-2px] active:translate-y-[0px] transition-all bg-[#121212] border-none text-white hover:bg-[#7C3AED]"
                            >
                                Log In to Console
                                <ChevronRight className="w-6 h-6" />
                            </Button>
                        </form>

                        <div className="mt-12 flex items-center gap-6">
                            <div className="flex -space-x-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full bg-[#E5E2DC] border-2 border-[#FAF9F6] flex items-center justify-center font-black text-xs">R{i}</div>
                                ))}
                            </div>
                            <p className="text-xs font-bold text-[#9C8F7F]">Join 8+ active riders today.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
