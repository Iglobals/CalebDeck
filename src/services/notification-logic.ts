import { db } from './firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';

export const checkAdminNotificationThreshold = async (hostelId: string) => {

    try {
        const q = query(
            collection(db, 'orders'),
            where('hostelId', '==', hostelId),
            where('status', '==', 'PAID'),
            where('assignedRiderId', '==', null)
        );

        const snapshot = await getCountFromServer(q);
        const count = snapshot.data().count;

        console.log(`[Notification Logic] Hostel ${hostelId} has ${count} pending orders.`);

        if (count >= 2) {
            console.log("TRIGGER: Admin Notification - Batch Ready!");
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error checking notification threshold", error);
        return false;
    }
};
