import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, ensureFirebaseAdmin } from '../firebase-admin.js';

const DEFAULT_RECOVERY_EMAILS = ['admin@calebdeck.com'];

function recoveryEmails() {
  return (process.env.ADMIN_RECOVERY_EMAILS || DEFAULT_RECOVERY_EMAILS.join(','))
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function bearerToken(req: VercelRequest) {
  const header = req.headers.authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    ensureFirebaseAdmin();
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: 'Sign in again to repair this admin account.' });

    const decoded = await getAuth().verifyIdToken(token);
    const email = String(decoded.email || '').toLowerCase();
    if (!email || !recoveryEmails().includes(email)) {
      return res.status(403).json({ error: 'This account is not approved for admin recovery.' });
    }

    await adminDb().collection('users').doc(decoded.uid).set({
      email,
      role: 'ADMIN',
      fullName: 'CalebDeck Admin',
      adminRoleRepairedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.status(200).json({ success: true, message: 'Admin access restored.' });
  } catch (error: any) {
    console.error('[Admin Role Repair]', error);
    return res.status(500).json({ error: error?.message || 'Could not repair admin access.' });
  }
}
