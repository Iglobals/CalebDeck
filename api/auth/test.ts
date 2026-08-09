import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const results: Record<string, string> = {};

    // Test 1: Basic response
    results['basic'] = 'OK';

    // Test 2: Environment variables
    results['ICA_BASE_URL'] = process.env.ICA_BASE_URL ? 'SET' : 'MISSING';
    results['ICA_CLIENT_ID'] = process.env.ICA_CLIENT_ID ? 'SET' : 'MISSING';
    results['ICA_CLIENT_SECRET'] = process.env.ICA_CLIENT_SECRET ? 'SET' : 'MISSING';
    results['FB_SA_PROJECT_ID'] = process.env.FB_SA_PROJECT_ID ? 'SET' : 'MISSING';

    // Test 3: Cookie import
    try {
        const cookie = await import('cookie');
        results['cookie_import'] = 'OK';
        results['cookie_exports'] = Object.keys(cookie).join(', ');
    } catch (e: any) {
        results['cookie_import'] = `FAIL: ${e.message}`;
    }

    // Test 4: iglobals-auth-client import
    try {
        const ica = await import('iglobals-auth-client');
        results['ica_import'] = 'OK';
        results['ica_exports'] = Object.keys(ica).join(', ');
    } catch (e: any) {
        results['ica_import'] = `FAIL: ${e.message}`;
    }

    res.status(200).json(results);
}
