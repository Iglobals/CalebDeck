import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router';
import { useAuth } from '../../../context/AuthContext';
import { doc, onSnapshot, collection, query, where, limit, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { ArrowLeft, Wallet, CreditCard, RefreshCcw, History, Loader2, ArrowUpRight, ArrowDownLeft, Shield } from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { toast } from 'react-toastify';
import SEO from '../../components/SEO';

interface WalletTransaction {
    id: string;
    type: 'credit' | 'debit';
    amount: number;
    balanceAfter: number;
    purpose: string;
    createdAt: any;
    reference?: string;
    relatedOrderId?: string;
}

const FUNDING_PRESETS = [500, 1000, 2000, 5000, 10000];

function createFundingReference() {
    return `CD-FUND-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export default function WalletPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // The short-fall amount passed via state when redirecting from CalebNet
    const prefillAmount = location.state?.prefillAmount || 1000;

    const [walletBalance, setWalletBalance] = useState(Number(user?.walletBalance || 0));
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(true);
    const [walletLoading, setWalletLoading] = useState(false);
    
    const [fundAmount, setFundAmount] = useState<number | ''>(prefillAmount);
    const [fundingReference, setFundingReference] = useState(createFundingReference());

    useEffect(() => {
        if (!user?.uid) return;

        const userUnsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
            if (snap.exists()) {
                setWalletBalance(Number(snap.data().walletBalance || 0));
            }
        });

        const txQuery = query(collection(db, 'wallet_transactions'), where('userId', '==', user.uid), limit(50));
        const txUnsub = onSnapshot(txQuery, (snap) => {
            const txs = snap.docs
                .map((item) => ({ id: item.id, ...item.data() } as WalletTransaction))
                .sort((a, b) => Number(b.createdAt?.seconds || 0) - Number(a.createdAt?.seconds || 0));
            setTransactions(txs);
            setLoadingTransactions(false);
        }, () => setLoadingTransactions(false));

        return () => {
            userUnsub();
            txUnsub();
        };
    }, [user?.uid]);

    const verifyFunding = async (reference: string) => {
        if (!user) return;
        const token = await user.getIdToken();
        const response = await fetch('/api/wallet/verify-funding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ reference }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Wallet funding failed');
        setWalletBalance(Number(data.balance || 0));
        toast.success(`Wallet funded. New balance: ₦${Number(data.balance).toLocaleString()}`);
    };

    const handleFundWallet = () => {
        const amount = Number(fundAmount);
        if (!amount || amount < 100) return toast.error('Minimum funding amount is ₦100');
        
        setWalletLoading(true);
        initializeFunding({
            onSuccess: (reference: any) => { void (async () => {
                toast.loading('Verifying your payment...', { toastId: 'verify-funding' });
                verifyFunding(reference.reference || fundingReference)
                    .then(() => setFundingReference(createFundingReference()))
                    .catch(() => toast.error('Funding verification delayed. Check back in a few minutes.'))
                    .finally(() => {
                        toast.dismiss('verify-funding');
                        setWalletLoading(false);
                    });
            })(); },
            onClose: () => {
                setWalletLoading(false);
            },
        });
    };

    const refreshWallet = async () => {
        if (!user) return;
        setWalletLoading(true);
        try {
            const snap = await getDoc(doc(db, 'users', user.uid));
            if (snap.exists()) setWalletBalance(Number(snap.data().walletBalance || 0));
            toast.success('Wallet balance refreshed');
        } catch {
            toast.error('Failed to refresh wallet');
        } finally {
            setWalletLoading(false);
        }
    };

    const fundingAmountNumber = Number(fundAmount || 0);
    const fundingConfig = {
        reference: fundingReference,
        email: user?.email || 'student@calebdeck.com',
        amount: fundingAmountNumber * 100,
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        metadata: {
            source: 'calebnet_wallet',
            purpose: 'CALEBNET_WALLET_FUNDING',
            userId: user?.uid || '',
            email: user?.email || '',
            displayName: user?.fullName || user?.displayNameFromProfile || '',
            custom_fields: [
                { display_name: 'Purpose', variable_name: 'purpose', value: 'CALEBNET_WALLET_FUNDING' },
                { display_name: 'User ID', variable_name: 'userId', value: user?.uid || '' },
            ],
        },
    };
    const initializeFunding = usePaystackPayment(fundingConfig as any);

    const money = (val: number) => `₦${val.toLocaleString()}`;

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-24">
            <SEO 
                title="My Wallet - CalebDeck" 
                description="Manage your CalebDeck i-CON wallet balance, review transaction history, and perform instant top-ups." 
                robots="noindex,follow" 
            />
            
            <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl transition-colors hover:bg-muted">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-xl font-bold">i-CON Wallet</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                <div className="grid md:grid-cols-[1fr_340px] gap-8 items-start">
                    
                    {/* Left Column - History */}
                    <div className="space-y-6 order-2 md:order-1">
                        <div className="flex items-center gap-2 mb-4">
                            <History className="h-5 w-5 text-[#10B981]" />
                            <h2 className="text-xl font-black">Transaction History</h2>
                        </div>

                        {loadingTransactions ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : transactions.length === 0 ? (
                            <Card className="p-8 text-center text-muted-foreground border-border bg-card shadow-sm">
                                <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                <p>No wallet activity yet.</p>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {transactions.map((tx) => (
                                    <Card key={tx.id} className="p-4 flex items-center justify-between border-border hover:border-[#10B981]/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                            }`}>
                                                {tx.type === 'credit' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">
                                                    {tx.purpose === 'CALEBNET_WALLET_FUNDING' ? 'Wallet Top-up' :
                                                     tx.purpose === 'CALEBNET_PURCHASE' ? 'CalebNet Purchase' : 
                                                     tx.purpose === 'MART_PURCHASE' ? 'Mart Purchase' :
                                                     tx.purpose.replace(/_/g, ' ')}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString('en-NG', {
                                                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                                                    }) : 'Recently'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-black ${tx.type === 'credit' ? 'text-emerald-500' : 'text-foreground'}`}>
                                                {tx.type === 'credit' ? '+' : '-'}{money(tx.amount)}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground font-mono">
                                                Bal: {money(tx.balanceAfter)}
                                            </p>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column - Balance & Funding */}
                    <div className="order-1 md:order-2 space-y-6">
                        <Card className="p-6 bg-[#10B981]/5 border-[#10B981]/20 sticky top-24">
                            <div className="flex items-center justify-between mb-4 text-[#10B981]">
                                <div className="flex items-center gap-2">
                                    <Wallet className="h-5 w-5" />
                                    <span className="text-sm font-black uppercase tracking-widest">Available Balance</span>
                                </div>
                                <button onClick={refreshWallet} disabled={walletLoading} className="p-1 hover:bg-[#10B981]/10 rounded-md transition-colors text-[#10B981]">
                                    <RefreshCcw className={`h-4 w-4 ${walletLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            <div className="mb-6">
                                <h2 className="text-4xl font-black">{money(walletBalance)}</h2>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-[#10B981]/10">
                                <h3 className="text-sm font-bold text-muted-foreground">Top-up Wallet</h3>
                                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-3 gap-2">
                                    {FUNDING_PRESETS.map((preset) => (
                                        <button 
                                            key={preset} 
                                            type="button" 
                                            onClick={() => setFundAmount(preset)} 
                                            className={`rounded-xl border px-2 py-2 text-xs font-black transition-colors ${
                                                Number(fundAmount) === preset ? 'border-[#10B981] bg-[#10B981] text-white' : 'border-border bg-card hover:border-[#10B981]/50'
                                            }`}
                                        >
                                            {money(preset)}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground">₦</span>
                                    <input 
                                        type="number" 
                                        inputMode="numeric" 
                                        value={fundAmount} 
                                        onChange={(event) => setFundAmount(Number(event.target.value) || '')} 
                                        className="w-full rounded-xl border-2 border-border bg-card py-3 pl-10 pr-4 font-bold outline-none focus:border-[#10B981] transition-colors" 
                                        placeholder="100 - 50,000" 
                                    />
                                </div>
                                <Button 
                                    onClick={handleFundWallet} 
                                    disabled={walletLoading} 
                                    className="w-full py-4 text-sm font-black shadow-lg shadow-[#10B981]/20 bg-[#10B981] hover:bg-[#059669] text-white border-none"
                                >
                                    {walletLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                                    Proceed to Pay
                                </Button>
                                <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
                                    <Shield className="w-3 h-3" /> Secured by Paystack
                                </p>
                            </div>
                        </Card>
                    </div>

                </div>
            </main>
        </div>
    );
}
