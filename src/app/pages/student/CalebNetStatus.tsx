import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, CheckCircle2, Clock, Loader2, RefreshCcw, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Logo } from '../../components/design-system/Logo';
import SEO from '../../components/SEO';
import { updateOrderHistoryStatus } from '../../../services/orderHistory';

const MESSAGES: Record<string, { title: string; detail: string; icon: any; badge: 'green' | 'amber' | 'purple' | 'gray' }> = {
  SUCCESSFUL: { title: 'Top-up sent successfully', detail: 'Your CalebNet transaction has been confirmed.', icon: CheckCircle2, badge: 'green' },
  ORDER_RECEIVED: { title: 'Processing your top-up', detail: 'The network has received your transaction and is processing it.', icon: Clock, badge: 'amber' },
  PROCESSING: { title: 'Processing your top-up', detail: 'We are confirming your transaction with the network.', icon: Clock, badge: 'amber' },
  PENDING_PROVIDER: { title: 'Network delay, we are confirming your transaction', detail: 'Please do not pay again. We are checking the network response and will update this page once it is confirmed.', icon: RefreshCcw, badge: 'amber' },
  REFUND_REQUIRED: { title: 'We are reviewing this transaction', detail: 'Delivery was not confirmed, so this has been sent for review. Your wallet will be handled safely once the final status is clear.', icon: AlertTriangle, badge: 'purple' },
  FAILED: { title: 'We are reviewing this transaction', detail: 'Delivery was not confirmed, so this has been sent for review. Your wallet will be handled safely once the final status is clear.', icon: AlertTriangle, badge: 'purple' },
  CANCELLED: { title: 'Transaction could not be completed', detail: 'The network could not complete this transaction. If your wallet has not been refunded yet, our team will review it.', icon: AlertTriangle, badge: 'gray' },
};

export default function CalebNetStatus() {
  const { paymentReference } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStatus = async () => {
    if (!paymentReference) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/calebnet/status?paymentReference=${encodeURIComponent(paymentReference)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to load order status');
      setOrder(data.order);
      // Keep the device-local Order History entry in sync with the live status —
      // otherwise a saved entry stays stuck on PROCESSING after a reload.
      const live = String(data.order?.fulfillmentStatus || '');
      if (live === 'SUCCESSFUL') updateOrderHistoryStatus(paymentReference, 'SUCCESSFUL');
      else if (['FAILED', 'CANCELLED', 'REFUND_REQUIRED'].includes(live)) updateOrderHistoryStatus(paymentReference, 'FAILED');
    } catch (err: any) {
      setError(err.message || 'Unable to load order status');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const timer = window.setInterval(loadStatus, 15000);
    return () => window.clearInterval(timer);
  }, [paymentReference]);

  const status = order?.fulfillmentStatus || 'PROCESSING';
  const baseMessage = MESSAGES[status] || MESSAGES.PROCESSING;
  const serviceName = order?.type === 'AIRTIME' ? 'Airtime' : 'Data';
  const message = status === 'SUCCESSFUL'
    ? { ...baseMessage, title: `${serviceName} sent successfully`, detail: `Your CalebNet ${serviceName.toLowerCase()} top-up has been confirmed.` }
    : order?.walletRefundTransactionId && ['FAILED', 'REFUND_REQUIRED', 'CANCELLED'].includes(status)
      ? { ...baseMessage, title: 'Wallet refunded', detail: `The network could not complete this ${serviceName.toLowerCase()} purchase, so the money has been returned to your CalebNet wallet.` }
    : ['ORDER_RECEIVED', 'PROCESSING'].includes(status)
      ? { ...baseMessage, title: `Processing your ${serviceName.toLowerCase()} purchase` }
      : baseMessage;
  const Icon = message.icon;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="CalebNet Transaction Status | CalebDeck"
        description="Track the current status of a CalebNet data or airtime transaction."
        canonical={paymentReference ? `https://calebdeck.com/calebnet/status/${paymentReference}` : 'https://calebdeck.com/calebnet'}
        robots="noindex,follow"
      />
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Link to="/calebnet" className="flex items-center gap-2 rounded-xl p-2 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-bold">CalebNet</span>
          </Link>
          <Logo size="sm" />
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl items-center justify-center px-5 py-12">
        <Card className="w-full max-w-xl text-center">
          {isLoading && !order ? (
            <div className="py-12">
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-[#7C3AED]" />
              <p className="font-bold text-muted-foreground">Loading transaction...</p>
            </div>
          ) : error ? (
            <div className="py-8">
              <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
              <h1 className="mb-2 text-2xl font-black">Status unavailable</h1>
              <p className="mb-6 text-muted-foreground">{error}</p>
              <Button onClick={loadStatus}>Try Again</Button>
            </div>
          ) : (
            <>
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7C3AED]/10 text-[#7C3AED]">
                <Icon className="h-8 w-8" />
              </div>
              <Badge variant={message.badge} className="mb-4">{status}</Badge>
              <h1 className="mb-3 text-3xl font-black">{message.title}</h1>
              <p className="mb-8 text-muted-foreground">{message.detail}</p>

              <div className="rounded-xl border border-border bg-muted/30 p-4 text-left text-sm">
                <div className="mb-2 grid grid-cols-[92px_1fr] gap-3"><span className="text-muted-foreground">Reference</span><span className="min-w-0 break-all text-right font-mono font-bold">{paymentReference}</span></div>
                <div className="mb-2 flex justify-between"><span className="text-muted-foreground">Network</span><span className="font-bold">{order.network}</span></div>
                <div className="mb-2 flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-mono font-bold">{order.phoneNumber}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold">₦{Number(order.amountPaid || 0).toLocaleString()}</span></div>
                {order.walletRefundTransactionId && (
                  <div className="mt-2 grid grid-cols-[92px_1fr] gap-3 border-t border-border pt-2">
                    <span className="text-muted-foreground">Refund</span>
                    <span className="min-w-0 break-all text-right font-mono font-bold">{order.walletRefundTransactionId}</span>
                  </div>
                )}
              </div>

              {status === 'SUCCESSFUL' && order?.type === 'DATA' && (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-left text-sm">
                  <p className="mb-1 font-black text-amber-600">📱 Didn't get an SMS?</p>
                  <p className="text-muted-foreground">
                    Sometimes your network won't send a confirmation text. To verify your data was delivered, check your data balance — dial <span className="font-bold text-foreground">{order.network === 'MTN' ? '*323#' : order.network === 'GLO' ? '*127*0#' : order.network === 'AIRTEL' ? '*140#' : '*228#'}</span> or check your network app.
                  </p>
                </div>
              )}

              <Button onClick={loadStatus} variant="outline" className="mt-6">
                <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Status
              </Button>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
