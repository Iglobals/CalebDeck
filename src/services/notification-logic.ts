import { db } from './firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';

// In a real implementation, this would be a Firestore Trigger (onCreate/onUpdate).
// For the frontend interaction layout (if any) or testing seeding, we might simulate it.
// However, since this is purely a backend trigger logic (notify admin when threshold met),
// we don't necessarily need a client-side function for it other than for TESTING purposes.

export const checkAdminNotificationThreshold = async (hostelId: string) => {
    // Logic: Count PAID + UNASSIGNED orders for this hostel
    // If >= 2, return true (signal to send notification)

    try {
        const q = query(
            collection(db, 'orders'),
            where('hostelId', '==', hostelId),
            where('status', '==', 'PAID'),
            where('assignedRiderIds', '==', []) // This might need robust check for empty array
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
