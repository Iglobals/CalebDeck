import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb } from '../server/firebase-admin.js';
import { verifyAdmin } from '../server/verify-admin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { getFashionDeliveryConfig, normaliseFashionDeliveryConfig, seedFashionDeliveryConfig, validateFashionDeliveryConfig } from '../server/fashion-delivery.js';
import fashionDeliveryRequestHandler from '../server/fashion-delivery-request.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.query?.route === 'request') return fashionDeliveryRequestHandler(req, res);
  try {
    const db = adminDb();
    if (req.method === 'GET') {
      if (req.query?.view === 'requests') {
        const admin = await verifyAdmin(req);
        if (!admin) return res.status(403).json({ error: 'Administrator access is required.' });
        const snapshot = await db.collection('fashion_delivery_requests').where('status', '==', 'AWAITING_FEE_CONFIRMATION').limit(50).get();
        return res.status(200).json({ success: true, requests: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
      }
      const config = await getFashionDeliveryConfig(db);
      return res.status(200).json({ success: true, config });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const admin = await verifyAdmin(req);
    if (!admin) return res.status(403).json({ error: 'Administrator access is required.' });
    const action = req.body?.action;
    if (action === 'seed') {
      try {
        const config = await seedFashionDeliveryConfig(db);
        return res.status(200).json({ success: true, config, seeded: true });
      } catch (error: any) {
        if (error?.message === 'FASHION_DELIVERY_ALREADY_SEEDED') return res.status(409).json({ error: 'Initial delivery coverage has already been seeded.' });
        throw error;
      }
    }
    if (action === 'save') {
      const config = normaliseFashionDeliveryConfig(req.body?.config);
      validateFashionDeliveryConfig(config);
      await db.collection('settings').doc('platform').set({ fashionDeliveryConfig: config }, { merge: true });
      return res.status(200).json({ success: true, config });
    }
    if (action === 'confirm-request') {
      const requestId = String(req.body?.requestId || '');
      const fee = Number(req.body?.confirmedFee);
      if (!requestId || !Number.isFinite(fee) || fee <= 0) return res.status(400).json({ error: 'Enter a valid delivery fee.' });
      const requestRef = db.collection('fashion_delivery_requests').doc(requestId);
      const result = await db.runTransaction(async (tx) => {
        const requestSnap = await tx.get(requestRef);
        if (!requestSnap.exists) throw new Error('DELIVERY_REQUEST_NOT_FOUND');
        const request = requestSnap.data()!;
        if (request.status !== 'AWAITING_FEE_CONFIRMATION') throw new Error('DELIVERY_REQUEST_ALREADY_REVIEWED');
        if (fee < Number(request.estimatedMinFee) || fee > Number(request.estimatedMaxFee)) throw new Error('FEE_OUTSIDE_APPROVED_RANGE');
        const confirmedTotal = Number(request.subtotal || 0) + fee;
        tx.update(requestRef, { status: 'AWAITING_CUSTOMER_APPROVAL', confirmedFee: fee, confirmedTotal, confirmedBy: admin.uid, confirmedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        return { confirmedTotal };
      });
      return res.status(200).json({ success: true, ...result });
    }
    return res.status(400).json({ error: 'Unknown delivery settings action.' });
  } catch (error: any) {
    console.error('[Fashion Delivery API]', error);
    return res.status(500).json({ error: error?.message || 'Fashion delivery settings could not be saved.' });
  }
}
