import { collection, getDocs, query, where, doc, setDoc, updateDoc, onSnapshot, orderBy, addDoc, serverTimestamp, deleteDoc, getDoc } from 'firebase/firestore';
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

export const getAllMenuItems = async (): Promise<MenuItem[]> => {
    const q = query(collection(db, 'menu_items'), orderBy('category', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
};

// Orders (Admin - All)
export const subscribeToAllOrders = (callback: (orders: any[]) => void) => {
    const q = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
};

export const updateOrder = async (orderId: string, updates: any) => {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, { ...updates, updatedAt: serverTimestamp() });
};

// Orders (Admin - by Hostel)
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
export const subscribeToRiderOrdersByHostels = (hostelIds: string[], callback: (orders: any[]) => void) => {
    if (!hostelIds || hostelIds.length === 0) {
        callback([]);
        return () => { };
    }
    const q = query(
        collection(db, 'orders'),
        where('hostelId', 'in', hostelIds.slice(0, 10)), // Firestore 'in' limit is 10
        where('status', 'in', ['PAID', 'OUT_FOR_DELIVERY', 'DELIVERED']),
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

// Riders Management
export interface Rider {
    id: string;
    name: string;
    phone: string;
    dept: string;
    status: 'available' | 'busy' | 'offline';
    assignedHostelIds: string[];
}

export const getRiderById = async (riderId: string): Promise<Rider | null> => {
    const riderRef = doc(db, 'riders', riderId);
    const snapshot = await getDoc(riderRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Rider : null;
};

// Riders
export const subscribeToRiders = (callback: (riders: Rider[]) => void) => {
    const q = query(collection(db, 'riders'), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
        const riders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rider));
        callback(riders);
    });
};

export const addRider = async (rider: Omit<Rider, 'id' | 'status'>) => {
    const docRef = await addDoc(collection(db, 'riders'), {
        ...rider,
        status: 'offline',
        role: 'rider',
        createdAt: serverTimestamp()
    });
    return docRef.id;
};

export const updateRider = async (id: string, updates: Partial<Rider>) => {
    const riderRef = doc(db, 'riders', id);
    await updateDoc(riderRef, updates);
};

export const deleteRider = async (riderId: string) => {
    const riderRef = doc(db, 'riders', riderId);
    // Note: Should also remove from hostels assignedRiderIds
    return await updateDoc(riderRef, { isActive: false }); // Or actual delete
};

// Menu Management
export const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    const itemRef = doc(db, 'menu_items', id); // Original collection name was 'menu_items'
    return await updateDoc(itemRef, updates);
};

export const addMenuItem = async (item: Omit<MenuItem, 'id'>) => {
    // Generate a readable, structured ID: e.g. "old_front_jollof_rice"
    const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const cafId = item.cafeteriaId || 'old';
    const secId = item.sectionId || 'front';
    const docId = `${cafId}_${secId}_${slug}`;

    const docRef = doc(db, 'menu_items', docId);
    await setDoc(docRef, { ...item, cafeteriaId: cafId, sectionId: secId }, { merge: true });
    return docId;
};

export const deleteMenuItem = async (id: string) => {
    const menuRef = doc(db, 'menu_items', id); // Original collection name was 'menu_items'
    await deleteDoc(menuRef);
};

// Order Trash Management
export const trashOrder = async (orderId: string, previousStatus: string) => {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, { status: 'TRASHED', previousStatus, updatedAt: serverTimestamp() });
};

export const recoverOrder = async (orderId: string) => {
    const orderRef = doc(db, 'orders', orderId);
    const snap = await getDoc(orderRef);
    const prev = snap.exists() ? snap.data().previousStatus || 'PAID' : 'PAID';
    await updateDoc(orderRef, { status: prev, previousStatus: null, updatedAt: serverTimestamp() });
};

export const permanentlyDeleteOrder = async (orderId: string) => {
    const orderRef = doc(db, 'orders', orderId);
    await deleteDoc(orderRef);
};

// Migration: fix 'main' category → 'base'
export const migrateMainToBase = async (): Promise<number> => {
    const q = query(collection(db, 'menu_items'), where('category', '==', 'main'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return 0;

    const { writeBatch } = await import('firebase/firestore');
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => {
        batch.update(d.ref, { category: 'base' });
    });
    await batch.commit();
    return snapshot.size;
};
