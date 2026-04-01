import React, { useState } from 'react';
import { Card } from './design-system/Card';
import { Button } from './design-system/Button';
import { X, Building, Hash, UserSquare, ShieldCheck } from 'lucide-react';
import { updateRider, Rider } from '../../services/db';

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

interface BankDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    rider: Rider;
}

export function BankDetailsModal({ isOpen, onClose, rider }: BankDetailsModalProps) {
    const [bankName, setBankName] = useState(rider.bankName || '');
    const [accountNumber, setAccountNumber] = useState(rider.accountNumber || '');
    const [accountName, setAccountName] = useState(rider.accountName || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
            setError('All fields are required.');
            return;
        }

        setLoading(true);
        try {
            await updateRider(rider.id, {
                bankName: bankName.trim(),
                accountNumber: accountNumber.trim(),
                accountName: accountName.trim()
            });
            onClose();
        } catch (err: any) {
            console.error(err);
            setError('Failed to update bank details. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Card className="w-full max-w-md bg-[#1A1A1A] border-[#222222] text-white p-6 md:p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#7C3AED] to-[#FCD34D]"></div>
                
                <button 
                    onClick={onClose}
                    className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#222222] flex items-center justify-center text-[#9C8F7F] hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center mb-4">
                        <ShieldCheck className="w-6 h-6 text-[#7C3AED]" />
                    </div>
                    <h2 className="text-2xl font-black">Payout Details</h2>
                    <p className="text-sm font-medium text-[#9C8F7F] mt-1">Set up where you'll receive your earnings and incentives.</p>
                </div>

                {error && <div className="mb-4 p-3 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold text-center border border-red-500/20">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#9C8F7F] ml-1">Bank Name</label>
                        <div className="relative">
                            <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8F7F]" />
                            <input 
                                type="text"
                                list="nigerian-banks"
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                placeholder="Choose or type bank"
                                required
                                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#222222] border-2 border-[#333333] focus:border-[#7C3AED] outline-none transition-colors text-sm font-bold text-white"
                            />
                            <datalist id="nigerian-banks">
                                {NIGERIAN_BANKS.map(bank => <option key={bank} value={bank} />)}
                            </datalist>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#9C8F7F] ml-1">Account Number</label>
                        <div className="relative">
                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8F7F]" />
                            <input 
                                type="text"
                                inputMode="numeric"
                                pattern="^\d{10}$"
                                title="Account number must be exactly 10 digits."
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                                placeholder="10-digit account number"
                                required
                                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#222222] border-2 border-[#333333] focus:border-[#7C3AED] outline-none transition-colors text-sm font-bold tracking-widest text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#9C8F7F] ml-1">Account Name</label>
                        <div className="relative">
                            <UserSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8F7F]" />
                            <input 
                                type="text"
                                value={accountName}
                                onChange={(e) => setAccountName(e.target.value)}
                                placeholder="Name on account"
                                required
                                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#222222] border-2 border-[#333333] focus:border-[#7C3AED] outline-none transition-colors text-sm font-bold text-white"
                            />
                        </div>
                    </div>

                    <Button type="submit" disabled={loading} variant="primary" className="w-full mt-4 py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] bg-[#7C3AED] text-white hover:scale-[1.02] active:scale-95 transition-transform">
                        {loading ? 'Saving...' : 'Save Payout Details'}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
