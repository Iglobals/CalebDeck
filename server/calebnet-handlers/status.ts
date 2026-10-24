import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from '../calebnet.js';
import { isRateLimited, clientIp } from '../rate-limit.js';
import { confirmOrRepairCalebNetOrderRefund } from '../wallet.js';

function studentOrder(data: any, id: string, refundState: { confirmed: boolean; refundTransactionId: string | null }) {
    const isWalletRefunded = Boolean(
        refundState.confirmed ||
        data.paymentStatus === 'REFUNDED' ||
        data.fulfillmentStatus === 'REFUNDED' ||
        data.walletRefundTransactionId
    );
    const effectiveFulfillmentStatus = isWalletRefunded && data.fulfillmentStatus !== 'SUCCESSFUL'
        ? 'REFUNDED'
        : data.fulfillmentStatus;

    return {
        id,
        type: data.type,
        network: data.network,
        phoneNumber: data.phoneNumber,
        planName: data.planName,
        amountPaid: data.amountPaid,
        paymentStatus: isWalletRefunded ? 'REFUNDED' : data.paymentStatus,
        fulfillmentStatus: effectiveFulfillmentStatus,
        walletRefundTransactionId: refundState.refundTransactionId || data.walletRefundTransactionId || null,
        walletRefundConfirmed: isWalletRefunded,
        walletRefundAmount: data.walletRefundAmount ?? (isWalletRefunded ? data.amountPaid : null),
        refundedAt: data.refundedAt || null,
        providerRemark: data.providerRemark || null,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
    };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(res, 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    // Public endpoint — blunt reference-enumeration bursts.
    if (isRateLimited(`calebnet-status:${clientIp(req)}`, 30, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    try {
        const paymentReference = String(req.query.paymentReference || '').trim();
        if (!paymentReference) return res.status(400).json({ error: 'paymentReference is required' });

        const verified = await confirmOrRepairCalebNetOrderRefund(paymentReference);
        if (!verified) return res.status(404).json({ error: 'Order not found' });
        return res.status(200).json({
            success: true,
            order: studentOrder(verified.order, verified.id, {
                confirmed: verified.confirmed,
                refundTransactionId: verified.refundTransactionId,
            }),
        });
    } catch (error: any) {
        console.error('[CalebNet Status]', error);
        return res.status(500).json({ error: 'Unable to fetch CalebNet order status' });
    }
}
