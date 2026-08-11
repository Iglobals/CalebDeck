import React from 'react';
import { CreditCard, Wallet, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export type PaymentMethod = 'PAYSTACK' | 'WALLET';

interface PaymentSelectorProps {
  amount: number;
  selectedMethod: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  disabled?: boolean;
}

export function PaymentSelector({ amount, selectedMethod, onSelect, disabled }: PaymentSelectorProps) {
  const { user } = useAuth();
  const walletBalance = Number(user?.walletBalance || 0);
  const isInsufficient = walletBalance < amount;

  const handleWalletSelect = () => {
    if (disabled || isInsufficient) return;
    onSelect('WALLET');
  };

  const handlePaystackSelect = () => {
    if (disabled) return;
    onSelect('PAYSTACK');
  };

  const money = (val: number) => `₦${val.toLocaleString()}`;

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm mb-2 text-muted-foreground uppercase tracking-widest">Select Payment Method</h3>
      <div className="grid gap-3">
        
        {/* Paystack (Card/Bank) */}
        <button
          type="button"
          disabled={disabled}
          onClick={handlePaystackSelect}
          className={`relative flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition-all ${
            selectedMethod === 'PAYSTACK'
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-border bg-card hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${selectedMethod === 'PAYSTACK' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className={`font-black ${selectedMethod === 'PAYSTACK' ? 'text-foreground' : 'text-muted-foreground'}`}>
                Card or Bank Transfer
              </p>
              <p className="text-xs font-bold text-muted-foreground mt-0.5">Secure payment via Paystack</p>
            </div>
          </div>
          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'PAYSTACK' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
            {selectedMethod === 'PAYSTACK' && <div className="h-2 w-2 rounded-full bg-white" />}
          </div>
        </button>

        {/* Ecosystem Wallet */}
        <button
          type="button"
          disabled={disabled || isInsufficient}
          onClick={handleWalletSelect}
          className={`relative flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition-all ${
            selectedMethod === 'WALLET'
              ? 'border-[#10B981] bg-[#10B981]/5 shadow-sm'
              : 'border-border bg-card'
          } ${(disabled || isInsufficient) ? 'opacity-60 cursor-not-allowed' : 'hover:border-[#10B981]/50'}`}
        >
          <div className="flex items-center gap-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${selectedMethod === 'WALLET' ? 'bg-[#10B981] text-white' : 'bg-muted text-muted-foreground'}`}>
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className={`font-black ${selectedMethod === 'WALLET' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  i-CON Wallet
                </p>
                <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-black border border-border">
                  {money(walletBalance)}
                </span>
              </div>
              
              {isInsufficient ? (
                <p className="flex items-center gap-1 mt-0.5 text-xs font-bold text-red-500">
                  <ShieldAlert className="w-3 h-3" /> Insufficient balance
                </p>
              ) : (
                <p className="text-xs font-bold text-muted-foreground mt-0.5">Fast, zero-fee atomic checkout</p>
              )}
            </div>
          </div>
          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'WALLET' ? 'border-[#10B981] bg-[#10B981]' : 'border-muted-foreground'}`}>
            {selectedMethod === 'WALLET' && <div className="h-2 w-2 rounded-full bg-white" />}
          </div>
        </button>

      </div>
    </div>
  );
}
