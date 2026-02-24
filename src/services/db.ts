import { collection, getDocs, query, where, doc, setDoc, updateDoc, onSnapshot, orderBy, addDoc, serverTimestamp, deleteDoc, getDoc, writeBatch } from 'firebase/firestore';
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
    defaultRiderId?: string;
    assistantRiderId?: string;
    isActive: boolean;
}

// Hostels
export const getActiveHostels = async (): Promise<Hostel[]> => {
    const q = query(collection(db, 'hostels'), where('isActive', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hostel));
};

export const getHostelById = async (hostelId: string): Promise<Hostel | null> => {
    const hostelRef = doc(db, 'hostels', hostelId);
    const snapshot = await getDoc(hostelRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Hostel : null;
};

// Live hostel subscription (for admin dashboard real-time updates)
export const subscribeToHostels = (callback: (hostels: Hostel[]) => void) => {
    const q = query(collection(db, 'hostels'), where('isActive', '==', true));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hostel)));
    });
};

// Assign default + assistant rider to a hostel
export const assignHostelRiders = async (hostelId: string, defaultRiderId: string | null, assistantRiderId: string | null) => {
    const hostelRef = doc(db, 'hostels', hostelId);
    const riderIds = [defaultRiderId, assistantRiderId].filter(Boolean) as string[];
    await updateDoc(hostelRef, {
        defaultRiderId: defaultRiderId || null,
        assistantRiderId: assistantRiderId || null,
        assignedRiderIds: riderIds,
    });
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
        assignedRiderId: null,  // Orders are NOT auto-assigned — dispatch does this
        batchId: null,
        status: 'PAID',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
};


// Subscribe to orders assigned to a specific rider
export const subscribeToRiderOrders = (riderId: string, callback: (orders: any[]) => void) => {
    const q = query(
        collection(db, 'orders'),
        where('assignedRiderId', '==', riderId),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
};

// Subscribe to a single order's status (for student order tracking)
export const subscribeToOrderStatus = (orderId: string, callback: (order: any) => void) => {
    const orderRef = doc(db, 'orders', orderId);
    return onSnapshot(orderRef, (snapshot) => {
        if (snapshot.exists()) {
            callback({ id: snapshot.id, ...snapshot.data() });
        }
    });
};

// ─── Batches ───
export interface Batch {
    id: string;
    hostelId: string;
    hostelName: string;
    riderId: string;
    riderName: string;
    orderIds: string[];
    orderCount: number;
    plateCount: number;
    status: 'OUT_FOR_DELIVERY' | 'DELIVERED';
    createdAt: string;
}

export const createBatch = async (batchData: Omit<Batch, 'id'>) => {
    const docRef = await addDoc(collection(db, 'batches'), batchData);
    return docRef.id;
};

export const subscribeToBatches = (riderId: string, callback: (batches: Batch[]) => void) => {
    const q = query(
        collection(db, 'batches'),
        where('riderId', '==', riderId),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Batch)));
    });
};

export const updateBatch = async (batchId: string, updates: Partial<Batch>) => {
    const batchRef = doc(db, 'batches', batchId);
    await updateDoc(batchRef, updates);
};

// Dispatch a hostel batch: create batch doc + update all PAID orders
export const dispatchBatch = async (hostelId: string, hostelName: string, rider: Rider, orders: any[]) => {
    const batchId = await createBatch({
        hostelId,
        hostelName,
        riderId: rider.id,
        riderName: rider.name,
        orderIds: orders.map(o => o.id),
        orderCount: orders.length,
        plateCount: orders.reduce((sum, o) => sum + (o.plates?.length || 0), 0),
        status: 'OUT_FOR_DELIVERY',
        createdAt: new Date().toISOString(),
    });

    // Batch-update all orders
    const batch = writeBatch(db);
    orders.forEach(order => {
        const orderRef = doc(db, 'orders', order.id);
        batch.update(orderRef, {
            status: 'OUT_FOR_DELIVERY',
            assignedRiderId: rider.id,
            batchId,
            updatedAt: new Date().toISOString(),
        });
    });
    await batch.commit();

    return batchId;
};

// ─── Riders Management ───
export interface Rider {
    id: string;
    name: string;
    phone: string;
    dept: string;
    status: 'available' | 'busy' | 'offline';
    isActive: boolean;
    assignedHostelIds: string[];
    earnings?: number;
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

export const addRider = async (rider: Omit<Rider, 'id' | 'status' | 'isActive'>) => {
    const docRef = await addDoc(collection(db, 'riders'), {
        ...rider,
        status: 'offline',
        isActive: false,  // Riders start as pending — admin activates them
        role: 'rider',
        earnings: 0,
        createdAt: serverTimestamp()
    });
    return docRef.id;
};

export const updateRider = async (id: string, updates: Partial<Rider>) => {
    const riderRef = doc(db, 'riders', id);
    await updateDoc(riderRef, updates);
};

export const deleteRider = async (riderId: string) => {
    await deleteDoc(doc(db, 'riders', riderId));
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
