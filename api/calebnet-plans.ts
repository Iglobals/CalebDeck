import type { VercelRequest, VercelResponse } from '@vercel/node';
import catalogHandler from './calebnet/catalog';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    req.query.type = req.query.type || 'DATA';
    return catalogHandler(req, res);
}
