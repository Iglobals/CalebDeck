import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from './_lib/calebnet';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(res, 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    return res.status(410).json({
        error: 'CalebNet blind retry is disabled. Use admin requery first, then resolve manually if provider confirms failure.',
    });
}
