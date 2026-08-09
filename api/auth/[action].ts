import type { VercelRequest, VercelResponse } from '@vercel/node';
import loginHandler from './_login';
import callbackHandler from './_callback';
import logoutHandler from './_logout';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const action = req.query.action;
    
    if (action === 'login') return loginHandler(req, res);
    if (action === 'callback') return callbackHandler(req, res);
    if (action === 'logout') return logoutHandler(req, res);

    return res.status(404).json({ error: 'Auth route not found', action });
}
