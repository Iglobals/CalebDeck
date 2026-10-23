import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../server/firebase-admin.js';
import { verifyUser } from '../server/verify-user.js';
import { verifyAdmin } from '../server/verify-admin.js';
import { findFashionDeliveryArea, getFashionDeliveryConfig } from '../server/fashion-delivery.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = adminDb();
    if (req.method === 'GET') {
      if (!(await verifyAdmin(req))) return res.status(403).json({ error: 'Administrator access is required.' });
      const snap = await db.collection('fashion_delivery_requests').where('status', '==', 'AWAITING_FEE_CONFIRMATION').limit(50).get();
      return res.status(200).json({ success: true, requests: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
    }
    if (req.method === 'PATCH') {
      const admin = await verifyAdmin(req);
      if (!admin) return res.status(403).json({ error: 'Administrator access is required.' });
      const requestRef = db.collection('fashion_delivery_requests').doc(String(req.body?.requestId || ''));
      const snap = await requestRef.get();
      if (!snap.exists) return res.status(404).json({ error: 'Delivery request not found.' });
      const request = snap.data()!;
      const confirmedFee = Number(req.body?.confirmedFee);
      if (!(confirmedFee >= Number(request.estimatedMinFee) && confirmedFee <= Number(request.estimatedMaxFee))) return res.status(400).json({ error: 'Enter a fee within the approved range.' });
      await requestRef.update({ status: 'FEE_CONFIRMED', confirmedFee, confirmedTotal: (Number(request.subtotal) || 0) + confirmedFee, confirmedBy: admin.uid, confirmedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      await db.collection('notifications').add({ userId: request.userId, title: 'Delivery fee confirmed', message: 'Your Fashion delivery fee is ready to review before payment.', type: 'fashion_delivery_fee', link: `/fashion/checkout?deliveryRequest=${requestRef.id}`, isRead: false, createdAt: FieldValue.serverTimestamp() });
      return res.status(200).json({ success: true });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: 'Please sign in before requesting delivery.' });
    const { items, fullName, phone, state, city, areaId, address, streetAddress = address, addressDetails, instructions, subtotal } = req.body || {};
    if (!fullName || !phone || !state || !city || !areaId || !streetAddress || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Please complete your delivery details before continuing.' });
    const config = await getFashionDeliveryConfig(db);
    if (!config.nonStudentDeliveryEnabled || !config.pilotEnabled) return res.status(403).json({ error: 'Fashion delivery to this address is not available yet.' });
    const match = findFashionDeliveryArea(config, areaId);
    if (!match || !match.zone.enabled || !match.area.enabled) return res.status(400).json({ error: 'That delivery area is not currently available.' });
    if (match.area.pricingMode !== 'RANGE') return res.status(400).json({ error: 'This address has a confirmed delivery fee and can proceed to payment.' });
    const id = `FDR-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    await db.collection('fashion_delivery_requests').doc(id).set({ id, userId: user.uid, status: 'AWAITING_FEE_CONFIRMATION', paymentStatus: 'UNPAID', customerType: 'GENERAL', customerName: String(fullName).trim(), phone: String(phone).trim(), state: String(state).trim(), city: String(city).trim(), areaId, areaName: match.area.name, zoneId: match.zone.id, zoneName: match.zone.name, streetAddress: String(streetAddress).trim(), addressDetails: String(addressDetails || '').trim(), instructions: String(instructions || '').trim(), items, subtotal: Number(subtotal) || 0, estimatedMinFee: match.area.minFee, estimatedMaxFee: match.area.maxFee, confirmedFee: null, confirmedTotal: null, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return res.status(200).json({ success: true, requestId: id, message: 'Your delivery request has been sent. We will confirm the exact delivery fee before payment.' });
  } catch (error: any) {
    console.error('[Fashion delivery request]', error);
    return res.status(500).json({ error: 'We could not save your delivery request. Please try again.' });
  }
}
