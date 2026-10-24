import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin.js';
import type { FulfillmentStatus } from './calebnet.js';

export async function recordCalebNetAnalytics(
    orderRef: FirebaseFirestore.DocumentReference,
    orderData: any,
    newStatus: FulfillmentStatus
) {
    if (!orderData || !orderData.createdAt) return;
    if (orderData.analyticsFinalState === newStatus) return; // Idempotent

    const dateStr = new Date(
        orderData.createdAt.toDate ? orderData.createdAt.toDate() : orderData.createdAt
    ).toISOString().split('T')[0];
    
    const dailyRef = adminDb().collection('calebnet_analytics_daily').doc(dateStr);

    try {
        await adminDb().runTransaction(async (tx) => {
            const orderSnap = await tx.get(orderRef);
            if (!orderSnap.exists) return;
            
            const freshOrder = orderSnap.data()!;
            if (freshOrder.analyticsFinalState === newStatus) return;

            // Initialize updates recursively to avoid overwriting maps
            const updates: any = {
                date: dateStr,
                updatedAt: FieldValue.serverTimestamp(),
            };
            const updatePaths: Record<string, any> = {};

            const setIncrement = (path: string, value: number) => {
                if (value === 0) return;
                updatePaths[path] = FieldValue.increment(value);
            };

            const adjust = (status: FulfillmentStatus, multiplier: number) => {
                if (status === 'SUCCESSFUL' && freshOrder.paymentStatus === 'PAID') {
                    const revenue = Number(freshOrder.amountPaid || 0);
                    const cost = Number(freshOrder.providerCost || 0);
                    const profit = Number(freshOrder.profit || 0);
                    
                    setIncrement('totalRevenue', revenue * multiplier);
                    setIncrement('totalProviderCost', cost * multiplier);
                    setIncrement('totalProfit', profit * multiplier);
                    setIncrement('successfulTransactions', 1 * multiplier);
                    
                    if (freshOrder.type === 'DATA') setIncrement('totalDataOrders', 1 * multiplier);
                    else if (freshOrder.type === 'AIRTIME') setIncrement('totalAirtimeOrders', 1 * multiplier);

                    if (freshOrder.network) {
                        setIncrement(`byNetwork.${freshOrder.network}.revenue`, revenue * multiplier);
                        setIncrement(`byNetwork.${freshOrder.network}.cost`, cost * multiplier);
                        setIncrement(`byNetwork.${freshOrder.network}.profit`, profit * multiplier);
                        setIncrement(`byNetwork.${freshOrder.network}.count`, 1 * multiplier);
                    }

                    if (freshOrder.type) {
                        setIncrement(`byType.${freshOrder.type}.revenue`, revenue * multiplier);
                        setIncrement(`byType.${freshOrder.type}.cost`, cost * multiplier);
                        setIncrement(`byType.${freshOrder.type}.profit`, profit * multiplier);
                        setIncrement(`byType.${freshOrder.type}.count`, 1 * multiplier);
                    }

                    if (freshOrder.type === 'DATA' && freshOrder.planId) {
                        updates[`topPlans.${freshOrder.planId}.planName`] = freshOrder.planName || 'Unknown Plan';
                        setIncrement(`topPlans.${freshOrder.planId}.count`, 1 * multiplier);
                        setIncrement(`topPlans.${freshOrder.planId}.revenue`, revenue * multiplier);
                        setIncrement(`topPlans.${freshOrder.planId}.profit`, profit * multiplier);
                    }

                    if (freshOrder.provider) {
                        setIncrement(`provider.${freshOrder.provider}.successCount`, 1 * multiplier);
                    }
                } else if (status === 'FAILED' || status === 'REFUNDED') {
                    setIncrement('failedTransactions', 1 * multiplier);
                    if (freshOrder.provider) setIncrement(`provider.${freshOrder.provider}.failedCount`, 1 * multiplier);
                } else if (status === 'PENDING_PROVIDER') {
                    setIncrement('pendingTransactions', 1 * multiplier);
                    if (freshOrder.provider) setIncrement(`provider.${freshOrder.provider}.pendingCount`, 1 * multiplier);
                } else if (status === 'REFUND_REQUIRED') {
                    setIncrement('refundRequired', 1 * multiplier);
                }
            };

            const oldStatus = freshOrder.analyticsFinalState;
            if (oldStatus) {
                adjust(oldStatus, -1);
            }
            adjust(newStatus, 1);

            // Set top-level fields
            tx.set(dailyRef, updates, { merge: true });
            
            // If there are paths to increment, apply them via update
            // However, update fails if document doesn't exist, so we must safely set the doc first
            const finalDocUpdate = { ...updates, ...updatePaths };
            tx.set(dailyRef, finalDocUpdate, { merge: true });

            tx.update(orderRef, { analyticsFinalState: newStatus });
        });
    } catch (error) {
        console.error('[CalebNet Analytics] Failed to update metrics:', error);
    }
}
