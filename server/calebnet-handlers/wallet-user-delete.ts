import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../firebase-admin.js';
import { requireAdmin } from '../calebnet.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const admin = await requireAdmin(req);
    if (!admin) return res.status(403).json({ error: 'Admin access required' });

    const userId = String(req.body?.userId || '').trim();
    if (!userId) return res.status(400).json({ error: 'User ID is required' });
    if (userId === admin.uid) return res.status(400).json({ error: 'You cannot delete your own admin profile here.' });

    const db = adminDb();
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const userData = userSnap.data() || {};

    if (Number(userData.walletBalance || 0) > 0) {
      return res.status(400).json({ error: 'This wallet still has a balance. Resolve the balance before removing CalebNet access.' });
    }

    const patch: Record<string, any> = {
      isCalebNetUser: FieldValue.delete(),
      walletBalance: FieldValue.delete(),
      phoneNumber: FieldValue.delete(),
      calebNetRemovedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (userData.role === 'STUDENT') patch.role = FieldValue.delete();
    if (userSnap.exists) await userRef.set(patch, { merge: true });

    return res.status(200).json({
      success: true,
      authDeleted: false,
      profileDeleted: false,
      calebNetAccessRemoved: userSnap.exists,
      message: 'CalebNet access removed. Main login remains active.',
    });
  } catch (error: any) {
    console.error('[CalebNet Wallet User Delete]', error);
    return res.status(500).json({ error: error?.message || 'Could not delete wallet user.' });
  }
}
