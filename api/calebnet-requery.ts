import type { VercelRequest, VercelResponse } from '@vercel/node';
import requeryHandler from './calebnet/requery';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.body?.reference && !req.body.paymentReference) {
        req.body.paymentReference = req.body.reference;
    }
    return requeryHandler(req, res);
}
