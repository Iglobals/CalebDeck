import { randomBytes, timingSafeEqual } from 'crypto';
import { adminDb } from './firebase-admin.js';

export function createTrackingToken(): string {
    return randomBytes(32).toString('hex');
}

export function trackingTokensMatch(expected: unknown, provided: unknown): boolean {
    const left = String(expected || '');
    const right = String(provided || '');
    const leftBuf = Buffer.from(left);
    const rightBuf = Buffer.from(right);
    if (!left || leftBuf.length !== rightBuf.length) {
        if (leftBuf.length > 0) timingSafeEqual(leftBuf, leftBuf);
        return false;
    }
    return timingSafeEqual(leftBuf, rightBuf);
}

export function publicTrackingPayload(orderId: string, data: Record<string, any>) {
    return {
        firestoreOrderId: orderId,
        orderId: data.orderId || null,
        status: data.status || null,
        type: data.type || null,
        orderType: data.orderType || null,
        deliveryType: data.deliveryType || null,
        deliveryMode: data.deliveryMode || 'solo',
        groupSize: data.groupSize || 1,
        cafeteria: data.cafeteria || null,
        cafeteriaId: data.cafeteriaId || null,
        sectionId: data.sectionId || 'none',
        hostelName: data.hostelName || data.hostel || null,
        pickupPoint: data.pickupPoint || null,
        collectionInstruction: data.collectionInstruction || null,
        plateCount: data.plateCount || data.quantity || null,
        foodBatchName: data.foodBatchName || null,
        orderWindowStart: data.orderWindowStart || null,
        orderWindowEnd: data.orderWindowEnd || null,
        deliveryWindowStart: data.deliveryWindowStart || null,
        deliveryWindowEnd: data.deliveryWindowEnd || null,
        assignedRiderId: data.assignedRiderId || null,
    };
}

export async function loadTrackedOrder(orderId: string, trackingToken: string) {
    const snap = await adminDb().collection('orders').doc(orderId).get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    if (!trackingTokensMatch(data.trackingToken, trackingToken)) return null;

    let rider: { name: string; phone: string } | null = null;
    if (data.assignedRiderId) {
        try {
            const riderSnap = await adminDb().collection('riders').doc(String(data.assignedRiderId)).get();
            if (riderSnap.exists) {
                const riderData = riderSnap.data() || {};
                rider = {
                    name: String(riderData.name || riderData.fullName || 'Rider'),
                    phone: String(riderData.phone || ''),
                };
            }
        } catch {
            rider = null;
        }
    }

    return {
        ...publicTrackingPayload(snap.id, data),
        rider,
    };
}
