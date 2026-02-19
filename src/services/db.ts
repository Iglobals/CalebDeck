import { collection, getDocs, query, where, addDoc, doc, updateDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from './firebase';

// Types
export interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: string;
    isAvailable: boolean;
    cafeteriaId?: string;
    unit?: string;
    image?: string;
    sectionId?: 'front' | 'back';
}

export interface Hostel {
    id: string;
    name: string;
    assignedRiderIds: string[];
    isActive: boolean;
}

// Hostels
export const getActiveHostels = async (): Promise<Hostel[]> => {
    const q = query(collection(db, 'hostels'), where('isActive', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hostel));
};

// Menu
export const getMenu = async (): Promise<MenuItem[]> => {
    const q = query(collection(db, 'menu_items'), where('isAvailable', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
};

// Orders (Admin)
export const subscribeToHostelOrders = (hostelId: string, callback: (orders: any[]) => void) => {
    const q = query(
        collection(db, 'orders'),
        where('hostelId', '==', hostelId),
        where('status', 'in', ['PAID', 'ASSIGNED']),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
};

// Orders (Rider)
export const subscribeToRiderOrders = (riderId: string, callback: (orders: any[]) => void) => {
    // Note: This requires an index usually if combining array-contains with orderBy
    const q = query(
        collection(db, 'orders'),
        where('assignedRiderIds', 'array-contains', riderId),
        where('status', 'in', ['ASSIGNED', 'DELIVERED']), // Maybe just all?
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
};
// Create Order
export const createOrder = async (orderData: any) => {
    return await addDoc(collection(db, 'orders'), {
        ...orderData,
        status: 'PAID',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
};
