import type { VercelRequest, VercelResponse } from '@vercel/node';
import adminRoleRepairHandler from '../server/calebnet-handlers/admin-role-repair.js';
import catalogHandler from '../server/calebnet-handlers/catalog.js';
import diagnosticsHandler from '../server/calebnet-handlers/diagnostics.js';
import markRefundedHandler from '../server/calebnet-handlers/orders/mark-refunded.js';
import purchaseHandler from '../server/calebnet-handlers/purchase.js';
import resetProviderStatusHandler from '../server/calebnet-handlers/provider-status/reset.js';
import requeryHandler from '../server/calebnet-handlers/requery.js';
import statusHandler from '../server/calebnet-handlers/status.js';
import syncAirtimeDiscountsHandler from '../server/calebnet-handlers/sync-airtime-discounts.js';
import syncProviderPlansHandler from '../server/calebnet-handlers/sync-provider-plans.js';
import walletBalanceHandler from '../server/calebnet-handlers/wallet-balance.js';
import walletFundingCreditHandler from '../server/calebnet-handlers/wallet-funding-credit.js';
import walletProfileHandler from '../server/calebnet-handlers/wallet-profile.js';
import walletUserDeleteHandler from '../server/calebnet-handlers/wallet-user-delete.js';
import verifyCalebnetPaymentHandler from '../server/verify-calebnet-payment.js';

function getPath(req: VercelRequest) {
    const queryPath = req.query.path;
    if (Array.isArray(queryPath)) return queryPath.join('/');
    if (queryPath) return String(queryPath).replace(/^\/+/, '');

    const pathname = (req.url || '').split('?')[0];
    return pathname.replace(/^\/api\/calebnet\/?/, '').replace(/^\/+/, '');
}

export default function handler(req: VercelRequest, res: VercelResponse) {
    const path = getPath(req);

    const run = (promise: any) => {
        Promise.resolve(promise).catch((error) => {
            console.error('[CalebNet API]', { path, error });
            if (!res.headersSent) {
                res.status(500).json({ error: error?.message || 'CalebNet API failed' });
            }
        });
    };

    if (path === 'catalog') return run(catalogHandler(req, res));
    if (path === 'admin-role-repair') return run(adminRoleRepairHandler(req, res));
    if (path === 'diagnostics') return run(diagnosticsHandler(req, res));
    if (path === 'purchase') return run(purchaseHandler(req, res));
    if (path === 'requery') return run(requeryHandler(req, res));
    if (path === 'status') return run(statusHandler(req, res));
    if (path === 'sync-airtime-discounts') return run(syncAirtimeDiscountsHandler(req, res));
    if (path === 'sync-provider-plans') return run(syncProviderPlansHandler(req, res));
    if (path === 'wallet-balance') return run(walletBalanceHandler(req, res));
    if (path === 'wallet-funding/credit') return run(walletFundingCreditHandler(req, res));
    if (path === 'wallet-profile') return run(walletProfileHandler(req, res));
    if (path === 'wallet-users/delete') return run(walletUserDeleteHandler(req, res));
    if (path === 'orders/mark-refunded') return run(markRefundedHandler(req, res));
    if (path === 'provider-status/reset') return run(resetProviderStatusHandler(req, res));
    if (path === 'verify-payment') return run(verifyCalebnetPaymentHandler(req, res));

    return res.status(404).json({ error: 'CalebNet endpoint not found', path });
}
