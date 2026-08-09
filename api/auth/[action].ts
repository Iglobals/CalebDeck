import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const action = req.query.action;

    try {
        if (action === 'login') {
            const { default: loginHandler } = await import('./_login');
            return loginHandler(req, res);
        }
        if (action === 'callback') {
            const { default: callbackHandler } = await import('./_callback');
            return callbackHandler(req, res);
        }
        if (action === 'logout') {
            const { default: logoutHandler } = await import('./_logout');
            return logoutHandler(req, res);
        }

        return res.status(404).json({ error: 'Auth route not found', action });
    } catch (error: any) {
        console.error(`[auth/${action}] Handler crashed:`, error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
