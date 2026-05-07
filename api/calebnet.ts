import type { VercelRequest, VercelResponse } from '@vercel/node';
import catalogHandler from '../server/calebnet-handlers/catalog';
import diagnosticsHandler from '../server/calebnet-handlers/diagnostics';
import markRefundedHandler from '../server/calebnet-handlers/orders/mark-refunded';
import resetProviderStatusHandler from '../server/calebnet-handlers/provider-status/reset';
import requeryHandler from '../server/calebnet-handlers/requery';
import statusHandler from '../server/calebnet-handlers/status';
import syncAirtimeDiscountsHandler from '../server/calebnet-handlers/sync-airtime-discounts';
import syncProviderPlansHandler from '../server/calebnet-handlers/sync-provider-plans';
import walletBalanceHandler from '../server/calebnet-handlers/wallet-balance';

function getPath(req: VercelRequest) {
    const queryPath = req.query.path;
    if (Array.isArray(queryPath)) return queryPath.join('/');
    if (queryPath) return String(queryPath).replace(/^\/+/, '');

    const pathname = (req.url || '').split('?')[0];
    return pathname.replace(/^\/api\/calebnet\/?/, '').replace(/^\/+/, '');
}

export default function handler(req: VercelRequest, res: VercelResponse) {
    const path = getPath(req);

    if (path === 'catalog') return catalogHandler(req, res);
    if (path === 'diagnostics') return diagnosticsHandler(req, res);
    if (path === 'requery') return requeryHandler(req, res);
    if (path === 'status') return statusHandler(req, res);
    if (path === 'sync-airtime-discounts') return syncAirtimeDiscountsHandler(req, res);
    if (path === 'sync-provider-plans') return syncProviderPlansHandler(req, res);
    if (path === 'wallet-balance') return walletBalanceHandler(req, res);
    if (path === 'orders/mark-refunded') return markRefundedHandler(req, res);
    if (path === 'provider-status/reset') return resetProviderStatusHandler(req, res);

    return res.status(404).json({ error: 'CalebNet endpoint not found', path });
}
