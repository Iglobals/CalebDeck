import { FieldValue } from 'firebase-admin/firestore';

type ConfirmBatchReservationArgs = {
    db: any;
    orderRef: any;
    reference: string;
    paidAmount: number;
};

export async function confirmFoodBatchReservation({
    db,
    orderRef,
    reference,
    paidAmount,
}: ConfirmBatchReservationArgs): Promise<boolean> {
    return db.runTransaction(async (transaction: any) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists) return false;

        const order = orderSnap.data();
        if (!order.foodBatchDayId) return false;
        if (order.batchReservationConfirmed === true) return true;

        const batchDayRef = db.collection('food_batch_days').doc(order.foodBatchDayId);
        const batchDaySnap = await transaction.get(batchDayRef);
        if (!batchDaySnap.exists) return false;

        const batchDay = batchDaySnap.data();
        const pendingReservations = Array.isArray(batchDay.pendingReservations)
            ? batchDay.pendingReservations
            : [];
        const matchingReservations = pendingReservations.filter(
            (reservation: any) => reservation.reference === reference
        );

        if (matchingReservations.length === 0) {
            transaction.set(orderRef, {
                batchReservationConfirmed: true,
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            return true;
        }

        const remainingReservations = pendingReservations.filter(
            (reservation: any) => reservation.reference !== reference
        );
        const reservedSlots = Math.max(
            0,
            Number(batchDay.reservedSlots || 0) - matchingReservations.length
        );

        transaction.update(batchDayRef, {
            confirmedOrders: FieldValue.increment(1),
            reservedSlots,
            revenue: FieldValue.increment(paidAmount),
            [`hostelCounts.${order.hostel || 'unknown'}`]: FieldValue.increment(1),
            [`cafeteriaCounts.${order.cafeteriaId || 'unknown'}`]: FieldValue.increment(1),
            pendingReservations: remainingReservations,
            updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.set(orderRef, {
            batchReservationConfirmed: true,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        return true;
    });
}
