import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://calebdeck.com';
const VALID_NETWORKS = ['mtn', 'airtel', 'glo', '9mobile'];

// In-memory cache with stale-while-revalidate
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes fresh
const STALE_TTL = 1000 * 60 * 60; // 1 hour stale (still usable if VTpass is down)

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const network = (req.query.network as string || '').trim();

    if (!network) {
        return res.status(400).json({ error: 'Network is required' });
    }

    // Validate network against known list
    const normalizedNetwork = network.toLowerCase();
    if (!VALID_NETWORKS.includes(normalizedNetwork)) {
        return res.status(400).json({ error: `Invalid network. Must be one of: MTN, Airtel, Glo, 9Mobile` });
    }

    const serviceID = `${normalizedNetwork}-data`;

    // Check fresh cache first
    if (cache[serviceID] && (Date.now() - cache[serviceID].timestamp < CACHE_TTL)) {
        return res.status(200).json({ success: true, plans: cache[serviceID].data, cached: true });
    }

    const VTPASS_BASE_URL = process.env.VTPASS_BASE_URL || 'https://sandbox.vtpass.com/api';
    const apiKey = process.env.VTPASS_API_KEY || '';
    const secretKey = process.env.VTPASS_SECRET || '';

    try {
        const response = await axios.get(`${VTPASS_BASE_URL}/service-variations?serviceID=${serviceID}`, {
            headers: {
                'api-key': apiKey,
                'secret-key': secretKey,
            },
            timeout: 10000, // 10s timeout
        });

        if (response.data.response_description !== '000' && !response.data.content) {
            // VTpass returned an error — serve stale cache if available
            if (cache[serviceID] && (Date.now() - cache[serviceID].timestamp < STALE_TTL)) {
                console.warn(`[CalebNet Plans] VTpass returned error for ${serviceID}, serving stale cache`);
                return res.status(200).json({ success: true, plans: cache[serviceID].data, cached: true, stale: true });
            }
            return res.status(400).json({ error: 'Failed to fetch plans from provider', details: response.data.response_description });
        }

        // VTpass uses "varations" (their typo) in some endpoints
        const variations = response.data.content?.varations || response.data.content?.variations || [];

        // Update cache
        cache[serviceID] = {
            data: variations,
            timestamp: Date.now()
        };

        return res.status(200).json({ success: true, plans: variations });

    } catch (err: any) {
        console.error(`[CalebNet Plans] Error fetching plans for ${serviceID}:`, err.code || err.message);

        // Serve stale cache on network error (VTpass down, timeout, etc.)
        if (cache[serviceID] && (Date.now() - cache[serviceID].timestamp < STALE_TTL)) {
            console.warn(`[CalebNet Plans] VTpass unreachable for ${serviceID}, serving stale cache`);
            return res.status(200).json({ success: true, plans: cache[serviceID].data, cached: true, stale: true });
        }

        if (err.code === 'ECONNABORTED') {
            return res.status(504).json({ error: 'Provider timeout. Please try again.' });
        }

        return res.status(500).json({ error: 'Unable to reach data provider. Please try again later.' });
    }
}
