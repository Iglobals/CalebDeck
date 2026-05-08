import { collection, getDocs, query, where, doc, setDoc, updateDoc, onSnapshot, orderBy, addDoc, serverTimestamp, deleteDoc, getDoc, writeBatch, limit, Timestamp, runTransaction, arrayUnion } from 'firebase/firestore';
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
    sectionId?: 'front' | 'back' | 'none';
}

export interface Hostel {
    id: string;
    name: string;
    assignedRiderIds: string[];
    defaultRiderId?: string;
    assistantRiderId?: string;
    isActive: boolean;
}

export interface Review {
    id?: string;
    orderId: string;
    studentName: string;
    rating: number; // 1 to 5
    feedback: string;
    cafeteria: string;
    riderName: string;
    createdAt?: any;
}

// Hostels
export const getActiveHostels = async (): Promise<Hostel[]> => {
    const q = query(collection(db, 'hostels'), where('isActive', '==', true), limit(50));
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
    const q = query(collection(db, 'hostels'), where('isActive', '==', true), limit(50));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hostel)));
    }, (error) => {
        console.error('subscribeToHostels error:', error);
        callback([]);
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
    const q = query(collection(db, 'menu_items'), where('isAvailable', '==', true), limit(150));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
};

export const getAllMenuItems = async (): Promise<MenuItem[]> => {
    const q = query(collection(db, 'menu_items'), orderBy('category', 'asc'), limit(250));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
};

// Orders (Admin - All) — filter to active statuses only (not TRASHED/DELIVERED/CANCELLED)
export const subscribeToAllOrders = (callback: (orders: any[]) => void) => {
    const q = query(
        collection(db, 'orders'),
        where('status', 'in', ['PAID', 'OUT_FOR_DELIVERY', 'ON_THE_WAY', 'PREPARING']),
        orderBy('createdAt', 'desc'),
        limit(150)
    );
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
        console.error('subscribeToAllOrders error:', error);
        callback([]);
    });
};

// Orders (Admin - History/Analytics) — scoped to last 30 days with limit
export const subscribeToOrderHistory = (callback: (orders: any[]) => void) => {
    const historyStart = new Date();
    historyStart.setDate(historyStart.getDate() - 30);
    const q = query(
        collection(db, 'orders'),
        where('createdAt', '>=', Timestamp.fromDate(historyStart)),
        orderBy('createdAt', 'desc'),
        limit(200)
    );
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
        console.error('subscribeToOrderHistory error:', error);
        callback([]);
    });
};

export const getRecentOrderHistory = async (days = 30, max = 200): Promise<any[]> => {
    const historyStart = new Date();
    historyStart.setDate(historyStart.getDate() - days);
    const q = query(
        collection(db, 'orders'),
        where('createdAt', '>=', Timestamp.fromDate(historyStart)),
        orderBy('createdAt', 'desc'),
        limit(max)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
        orderBy('createdAt', 'desc'),
        limit(100)
    );
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
        console.error('subscribeToHostelOrders error:', error);
        callback([]);
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
        where('hostelId', 'in', hostelIds.slice(0, 10)),
        where('status', 'in', ['PAID', 'OUT_FOR_DELIVERY', 'DELIVERED']),
        orderBy('createdAt', 'desc'),
        limit(100)
    );
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
        console.error('subscribeToRiderOrdersByHostels error:', error);
        callback([]);
    });
};
// Create Order
export const createOrder = async (orderData: any) => {
    const docRef = await addDoc(collection(db, 'orders'), {
        ...orderData,
        assignedRiderId: null,
        batchId: null,
        status: 'PAID',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    try {
        const name = orderData.studentName || orderData.fullName;
        const validName = (name && name !== 'undefined' && name !== 'null') ? name : 'A student';

        await createNotification({
            userId: 'admin',
            title: 'New Order Received',
            message: `${validName} just ordered from ${orderData.hostelName || orderData.hostel}`,
            type: 'order',
            link: '/admin/orders',
            isRead: false
        });
    } catch (err) {
        console.error('Failed to dispatch admin notification:', err);
    }

    return docRef;
};


export const getOrderById = async (id: string): Promise<any> => {
    const docRef = doc(db, 'orders', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
};


export const subscribeToRiderOrders = (riderId: string, callback: (orders: any[]) => void) => {
    const q = query(
        collection(db, 'orders'),
        where('assignedRiderId', '==', riderId),
        where('status', 'in', ['OUT_FOR_DELIVERY', 'ON_THE_WAY', 'DELIVERED']),
        limit(100)
    );
    return onSnapshot(q, (snapshot) => {
        const sortedDocs = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a: any, b: any) => {
                const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime();
                const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime();
                return (dateB || 0) - (dateA || 0);
            });
        callback(sortedDocs);
    });
};

// Reviews
export const submitReview = async (review: Review) => {
    return addDoc(collection(db, 'reviews'), {
        ...review,
        createdAt: serverTimestamp()
    });
};

export const subscribeToReviews = (callback: (reviews: Review[]) => void) => {
    const q = query(
        collection(db, 'reviews'),
        orderBy('createdAt', 'desc'),
        limit(100)
    );
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
    }, (error) => {
        console.error('subscribeToReviews error:', error);
        callback([]);
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
    isEmergency?: boolean;
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
        orderBy('createdAt', 'desc'),
        limit(50)
    );
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Batch)));
    }, (error) => {
        console.error('subscribeToBatches error:', error);
        callback([]);
    });
};

export const updateBatch = async (batchId: string, updates: Partial<Batch>) => {
    const batchRef = doc(db, 'batches', batchId);
    await updateDoc(batchRef, updates);
};

export const dispatchBatch = async (hostelId: string, hostelName: string, rider: Rider, orders: any[], isEmergency: boolean = false) => {
    const dispatchOrders = orders.filter(o => o?.id);
    const orderRefs = dispatchOrders.map(o => doc(db, 'orders', o.id));

    const result = await runTransaction(db, async (transaction) => {
        const snapshots: any[] = [];
        for (const orderRef of orderRefs) {
            snapshots.push(await transaction.get(orderRef));
        }

        const eligibleOrders = snapshots
            .map((snapshot, index) => ({ snapshot, order: dispatchOrders[index], ref: orderRefs[index] }))
            .filter(({ snapshot }) => {
                if (!snapshot.exists()) return false;
                const data = snapshot.data();
                return data.status === 'PAID' && !data.batchId && !data.assignedRiderId;
            });

        if (eligibleOrders.length === 0) return null;

        const batchRef = doc(collection(db, 'batches'));
        const batchOrders = eligibleOrders.map(({ order }) => order);
        const batchId = batchRef.id;

        transaction.set(batchRef, {
            hostelId,
            hostelName,
            riderId: rider.id,
            riderName: rider.name,
            orderIds: batchOrders.map(o => o.id),
            orderCount: batchOrders.length,
            plateCount: batchOrders.reduce((sum, o) => sum + (o.type === 'combo' ? (o.quantity || 1) : o.type === 'mart' ? ((o.items || []).reduce((itemSum: number, item: any) => itemSum + (item.quantity || 1), 0)) : (o.plates?.length || 0)), 0),
            status: 'OUT_FOR_DELIVERY',
            isEmergency,
            createdAt: new Date().toISOString(),
        });

        eligibleOrders.forEach(({ ref }) => {
            transaction.update(ref, {
                status: 'OUT_FOR_DELIVERY',
                assignedRiderId: rider.id,
                batchId,
                isEmergency,
                updatedAt: serverTimestamp(),
            });
        });

        return { batchId, orderCount: batchOrders.length };
    });

    if (!result) return null;

    try {
        await createNotification({
            userId: rider.id,
            title: 'New Batch Assigned',
            message: `You have new orders ready for pickup and delivery to ${hostelName}.`,
            type: 'batch',
            link: '/rider/batches',
            isRead: false
        });
    } catch (err) {
        console.error('Failed to notify rider of new batch', err);
    }

    return result.batchId;
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
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
}

export const getRiderById = async (riderId: string): Promise<Rider | null> => {
    const riderRef = doc(db, 'riders', riderId);
    const snapshot = await getDoc(riderRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Rider : null;
};

// Riders
export const subscribeToRiders = (callback: (riders: Rider[]) => void) => {
    const q = query(collection(db, 'riders'), orderBy('name', 'asc'), limit(100));
    return onSnapshot(q, (snapshot) => {
        const riders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rider));
        callback(riders);
    }, (error) => {
        console.error('subscribeToRiders error:', error);
        callback([]);
    });
};

export const addRider = async (rider: Omit<Rider, 'id' | 'status' | 'isActive'>) => {
    const docRef = await addDoc(collection(db, 'riders'), {
        ...rider,
        status: 'offline',
        isActive: false,
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
    const itemRef = doc(db, 'menu_items', id);
    return await updateDoc(itemRef, updates);
};

export const addMenuItem = async (item: Omit<MenuItem, 'id'>) => {
    const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const cafId = item.cafeteriaId || 'old';
    // Old Cafe has no front/back sections
    const secId = cafId === 'old' ? 'none' : (item.sectionId || 'front');
    const docId = `${cafId}_${secId}_${slug}`;

    const docRef = doc(db, 'menu_items', docId);
    await setDoc(docRef, { ...item, cafeteriaId: cafId, sectionId: secId }, { merge: true });
    return docId;
};

export const deleteMenuItem = async (id: string) => {
    const menuRef = doc(db, 'menu_items', id);
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

// ─── Platform Settings ───
export interface PlatformSettings {
    riderRatePerDelivery: number;
    comboRatePerDelivery?: number;
    groupRatePerDelivery?: number;
    premiumDeliveryFee?: number;
    premiumSoloRiderRate?: number;  // NEW - for premium solo orders
    premiumComboRiderRate?: number; // NEW - for premium combo orders
    premiumGroupRiderRate?: number;
    premiumRiderRate?: number;
    martRatePerDelivery?: number; // NEW - for CalebMart orders
    isAcceptingOrders?: boolean;
    isMartComingSoon?: boolean;
    isCalebNetComingSoon?: boolean;
    isIPizzaComingSoon?: boolean;
    systemOpeningHour?: number;
    systemClosingHour?: number;
    [key: string]: any;
}

export const getPlatformSettings = async (): Promise<PlatformSettings> => {
    const settingsRef = doc(db, 'settings', 'platform');
    const snapshot = await getDoc(settingsRef);
    if (snapshot.exists()) {
        return snapshot.data() as PlatformSettings;
    }
    // Default settings
    return { riderRatePerDelivery: 300, premiumDeliveryFee: 1250, premiumRiderRate: 750, martRatePerDelivery: 500, isAcceptingOrders: true, isMartComingSoon: false, isCalebNetComingSoon: true, isIPizzaComingSoon: true, systemOpeningHour: 10, systemClosingHour: 18 };
};

export const subscribeToPlatformSettings = (callback: (settings: PlatformSettings) => void) => {
    const settingsRef = doc(db, 'settings', 'platform');
    return onSnapshot(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data() as PlatformSettings;
            if (!data.premiumDeliveryFee) data.premiumDeliveryFee = 1250;
            if (!data.premiumRiderRate) data.premiumRiderRate = 750;
            if (data.isAcceptingOrders === undefined) data.isAcceptingOrders = true;
            if (data.isCalebNetComingSoon === undefined) data.isCalebNetComingSoon = true;
            if (data.systemOpeningHour === undefined) data.systemOpeningHour = 10;
            if (data.systemClosingHour === undefined) data.systemClosingHour = 18;
            callback(data);
        } else {
            callback({ riderRatePerDelivery: 300, premiumDeliveryFee: 1250, premiumRiderRate: 750, martRatePerDelivery: 500, isAcceptingOrders: true, isMartComingSoon: false, isCalebNetComingSoon: true, isIPizzaComingSoon: true, systemOpeningHour: 10, systemClosingHour: 18 });
        }
    }, (error) => {
        console.error('subscribeToPlatformSettings error:', error);
        callback({ riderRatePerDelivery: 300, premiumDeliveryFee: 1250, premiumRiderRate: 750, martRatePerDelivery: 500, isAcceptingOrders: true, isMartComingSoon: false, isCalebNetComingSoon: true, isIPizzaComingSoon: true, systemOpeningHour: 10, systemClosingHour: 18 });
    });
};

export const updatePlatformSettings = async (updates: Partial<PlatformSettings>) => {
    const settingsRef = doc(db, 'settings', 'platform');
    await setDoc(settingsRef, updates, { merge: true });
};

// ─── Notifications Management ───
export interface Notification {
    id?: string;
    userId: string;
    title: string;
    message: string;
    type: 'order' | 'batch' | 'system';
    isRead: boolean;
    link?: string;
    createdAt: any;
}

export const createNotification = async (data: Omit<Notification, 'id' | 'createdAt'>) => {
    try {
        const docRef = await addDoc(collection(db, 'notifications'), {
            ...data,
            isRead: false,
            createdAt: serverTimestamp()
        });

        // Trigger Push Notification Automatically
        try {
            let tokens: string[] = [];
            if (data.userId === 'admin') {
                const adminsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'ADMIN'), limit(10)));
                adminsSnap.forEach(doc => {
                    const adminData = doc.data();
                    if (adminData.fcmTokens) tokens.push(...adminData.fcmTokens);
                });
            } else {
                const riderDoc = await getDoc(doc(db, 'riders', data.userId));
                if (riderDoc.exists() && riderDoc.data().fcmTokens) {
                    tokens.push(...riderDoc.data().fcmTokens);
                }
            }
            if (tokens.length > 0) {
                tokens = [...new Set(tokens)]; // Deduplicate
                fetch('/api/send-push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Api-Key': import.meta.env.VITE_INTERNAL_API_KEY || '' },
                    body: JSON.stringify({ tokens, title: data.title, body: data.message, link: data.link || '/' })
                }).catch(err => console.warn('Push API failed (likely missing Vercel environment local)', err));
            }
        } catch (pushErr) {
            console.error('Error fetching FCM tokens for push:', pushErr);
        }

        return docRef.id;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};

export const subscribeToUserNotifications = (userId: string, callback: (notifs: Notification[]) => void) => {
    const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(25)
    );
    return onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Notification));
        callback(notifs);
    }, (error) => {
        console.error('subscribeToUserNotifications error:', error);
        callback([]);
    });
};

export const markNotificationAsRead = async (notificationId: string) => {
    try {
        const notifRef = doc(db, 'notifications', notificationId);
        await updateDoc(notifRef, { isRead: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
};

export const markAllNotificationsAsRead = async (userId: string) => {
    try {
        const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('isRead', '==', false));
        const snapshot = await getDocs(q);
        const BATCH_LIMIT = 499;
        for (let i = 0; i < snapshot.docs.length; i += BATCH_LIMIT) {
            const chunk = snapshot.docs.slice(i, i + BATCH_LIMIT);
            const batch = writeBatch(db);
            chunk.forEach(doc => {
                batch.update(doc.ref, { isRead: true });
            });
            await batch.commit();
        }
    } catch (error) {
        console.error('Error marking all as read:', error);
    }
};

// ─── Combo Packs Management ───
export interface ComboItem {
    name: string;
    quantity: number;
    price?: number;
}

export interface ComboDefinition {
    id: string;
    name: string;
    tagline: string;
    cafeteria: 'new' | 'old';
    section: 'all' | 'front' | 'back' | 'none';
    items: ComboItem[];
    basePrice: number;
    imageName: string;
    image?: string; // base64 or URL for combo card image
}

export const subscribeToCombos = (callback: (combos: ComboDefinition[]) => void) => {
    const q = query(collection(db, 'combo_packs'), orderBy('name', 'asc'), limit(100));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ComboDefinition)));
    }, (error) => {
        console.error('subscribeToCombos error:', error);
        callback([]);
    });
};

export const getCombosForCafeteria = async (cafeteriaId: string, sectionId: string): Promise<ComboDefinition[]> => {
    const snapshot = await getDocs(query(collection(db, 'combo_packs'), orderBy('name', 'asc'), limit(100)));
    const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ComboDefinition));
    return all.filter(c => {
        if (cafeteriaId === 'new_cafe' && c.cafeteria === 'new') {
            return c.section === 'all' || c.section === sectionId;
        }
        if (cafeteriaId === 'old' && c.cafeteria === 'old') return true;
        if (c.cafeteria === cafeteriaId) {
            return c.section === 'all' || c.section === sectionId;
        }
        return false;
    });
};

export const addCombo = async (combo: Omit<ComboDefinition, 'id'>) => {
    const docRef = await addDoc(collection(db, 'combo_packs'), {
        ...combo,
        createdAt: serverTimestamp()
    });
    return docRef.id;
};

export const updateCombo = async (id: string, updates: Partial<ComboDefinition>) => {
    const comboRef = doc(db, 'combo_packs', id);
    await updateDoc(comboRef, { ...updates, updatedAt: serverTimestamp() });
};

export const deleteCombo = async (id: string) => {
    await deleteDoc(doc(db, 'combo_packs', id));
};

export const seedCombos = async (combos: Omit<ComboDefinition, 'id'>[]) => {
    const snapshot = await getDocs(query(collection(db, 'combo_packs'), limit(1)));
    if (!snapshot.empty) return 0; // Already seeded
    let count = 0;
    for (const combo of combos) {
        await addDoc(collection(db, 'combo_packs'), {
            ...combo,
            createdAt: serverTimestamp()
        });
        count++;
    }
    return count;
};

// ─── Rider Tracking & Earnings ───
export interface RiderWeeklyStats {
    totalDeliveries: number;
    activeDays: number;
    dailyTrips: Record<string, number>;
    completedOrderIds: string[];
}

export interface RiderDailyEarnings {
    date: string;
    totalEarned: number;
    totalDeliveries: number;
    completedOrderIds: string[];
}

export interface BonusClaim {
    id: string;
    riderId: string;
    riderName: string;
    rewardType: 'REFUEL_DECK' | 'REFUEL_DECK_PLUS';
    weekId: string;
    status: 'PENDING' | 'SORTED';
    createdAt: any;
    sortedAt?: any;
}

export const getIsoWeek = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

export const recordDelivery = async (riderId: string, orderId: string, isBonusOrder: boolean, amountEarned: number) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA');
    const weekId = getIsoWeek(now);

    const statsRef = doc(db, 'riderStats', riderId, 'weekly', weekId);
    const earningsRef = doc(db, 'riderEarnings', riderId, 'daily', dateStr);

    try {
        await runTransaction(db, async (transaction) => {
            // ALL READS FIRST — Firestore requires reads before writes
            const statsDoc = await transaction.get(statsRef);
            const earningsDoc = await transaction.get(earningsRef);
            const riderRef = doc(db, 'riders', riderId);
            const riderDoc = await transaction.get(riderRef);

            const statsData = statsDoc.exists() ? statsDoc.data() : null;
            const earningsData = earningsDoc.exists() ? earningsDoc.data() : null;

            const sCompleted = statsData ? (statsData.completedOrderIds || []) : [];
            if (sCompleted.includes(orderId)) {
                return; // Already processed
            }

            // 1. Update Weekly Stats
            const dailyTrips = statsData ? (statsData.dailyTrips || {}) : {};
            const todaysTrips = (dailyTrips[dateStr] || 0) + 1;
            dailyTrips[dateStr] = todaysTrips;

            const nextActiveDays = Object.keys(dailyTrips).length;
            const nextTotalDeliveries = (statsData ? statsData.totalDeliveries || 0 : 0) + 1;

            if (!statsDoc.exists()) {
                transaction.set(statsRef, {
                    totalDeliveries: 1,
                    activeDays: 1,
                    dailyTrips: { [dateStr]: 1 },
                    completedOrderIds: [orderId]
                });
            } else {
                transaction.update(statsRef, {
                    totalDeliveries: nextTotalDeliveries,
                    activeDays: nextActiveDays,
                    dailyTrips,
                    completedOrderIds: arrayUnion(orderId)
                });
            }

            // 2. Update Daily Earnings (skip if bonus order)
            if (!isBonusOrder) {
                const nextEarning = (earningsData ? earningsData.totalEarned || 0 : 0) + amountEarned;
                const nextDailyDeliv = (earningsData ? earningsData.totalDeliveries || 0 : 0) + 1;
                
                if (!earningsDoc.exists()) {
                    transaction.set(earningsRef, {
                        date: dateStr,
                        totalEarned: nextEarning,
                        totalDeliveries: 1,
                        completedOrderIds: [orderId]
                    });
                } else {
                    transaction.update(earningsRef, {
                        totalEarned: nextEarning,
                        totalDeliveries: nextDailyDeliv,
                        completedOrderIds: arrayUnion(orderId)
                    });
                }

                // 3. Update lifetime earnings on rider doc
                if (riderDoc.exists()) {
                    const rData = riderDoc.data();
                    transaction.update(riderRef, {
                        earnings: (rData.earnings || 0) + amountEarned
                    });
                }
            }
        });

        // 4. Store the actual payout amount on the order document for refund calculations
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, { payout: amountEarned });
    } catch (e) {
        console.error("Error recording delivery stats/earnings:", e);
    }
};

export const recordRefund = async (riderId: string, orderId: string, amountToDeduct: number) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA');
    const weekId = getIsoWeek(now);

    const statsRef = doc(db, 'riderStats', riderId, 'weekly', weekId);
    const earningsRef = doc(db, 'riderEarnings', riderId, 'daily', dateStr);

    try {
        await runTransaction(db, async (transaction) => {
            const statsDoc = await transaction.get(statsRef);
            const earningsDoc = await transaction.get(earningsRef);
            const riderRef = doc(db, 'riders', riderId);
            const riderDoc = await transaction.get(riderRef);

            // 1. Update Weekly Stats (decrement totalDeliveries, but leave dailyTrips count? 
            // Actually dailyTrips is for visual, but totalDeliveries affects payouts/bonuses)
            if (statsDoc.exists()) {
                const statsData = statsDoc.data();
                const completed = statsData.completedOrderIds || [];
                if (completed.includes(orderId)) {
                    transaction.update(statsRef, {
                        totalDeliveries: Math.max(0, (statsData.totalDeliveries || 0) - 1),
                        // We keep the order in completedOrderIds but maybe mark it? 
                        // Actually let's just keep it so it's not double-refunded
                    });
                }
            }

            // 2. Update Daily Earnings
            if (earningsDoc.exists()) {
                const earningsData = earningsDoc.data();
                transaction.update(earningsRef, {
                    totalEarned: Math.max(-99999, (earningsData.totalEarned || 0) - amountToDeduct),
                    totalDeliveries: Math.max(0, (earningsData.totalDeliveries || 0) - 1),
                });
            }

            // 3. Update lifetime earnings on rider doc
            if (riderDoc.exists()) {
                const rData = riderDoc.data();
                transaction.update(riderRef, {
                    earnings: (rData.earnings || 0) - amountToDeduct
                });
            }
        });
    } catch (e) {
        console.error("Error recording refund stats/earnings:", e);
    }
};

export const markOrderRefunded = async (orderId: string) => {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return;

    const order = orderSnap.data();
    if (order.status === 'REFUNDED') return;

    await updateDoc(orderRef, {
        status: 'REFUNDED',
        refundedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    // If it was already assigned/delivered, we need to deduct from the rider
    if (order.assignedRiderId && order.status === 'DELIVERED') {
        // Use the stored payout if available, fallback to a standard rate if not (for legacy orders)
        const amountToDeduct = order.payout || 0;
        if (amountToDeduct > 0) {
            await recordRefund(order.assignedRiderId, orderId, amountToDeduct);
        }
    }
};

export const subscribeToRiderWeeklyStats = (riderId: string, weekId: string, callback: (stats: RiderWeeklyStats | null) => void) => {
    const statsRef = doc(db, 'riderStats', riderId, 'weekly', weekId);
    return onSnapshot(statsRef, (docSnap) => {
        if (docSnap.exists()) callback(docSnap.data() as RiderWeeklyStats);
        else callback(null);
    }, (error) => {
        console.error('subscribeToRiderWeeklyStats error:', error);
        callback(null);
    });
};

export const subscribeToRiderDailyEarnings = (riderId: string, callback: (earnings: RiderDailyEarnings[]) => void) => {
    const q = query(collection(db, 'riderEarnings', riderId, 'daily'), orderBy('date', 'desc'), limit(14));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => doc.data() as RiderDailyEarnings));
    }, (error) => {
        console.error('subscribeToRiderDailyEarnings error:', error);
        callback([]);
    });
};

export const claimRiderBonus = async (riderId: string, riderName: string, rewardType: 'REFUEL_DECK' | 'REFUEL_DECK_PLUS', weekId: string) => {
    const q = query(collection(db, 'bonus_claims'), where('riderId', '==', riderId), where('weekId', '==', weekId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) throw new Error('Bonus already claimed for this week.');

    await addDoc(collection(db, 'bonus_claims'), {
        riderId,
        riderName,
        rewardType,
        weekId,
        status: 'PENDING',
        createdAt: serverTimestamp()
    });

    try {
        await addDoc(collection(db, 'notifications'), {
            userId: 'admin',
            title: 'New Bonus Claimed 🎁',
            message: `${riderName} has claimed a ${rewardType === 'REFUEL_DECK' ? 'Refuel Deck' : 'Refuel Deck Plus'} bonus.`,
            type: 'system',
            isRead: false,
            link: '/admin/riders',
            createdAt: serverTimestamp()
        });
    } catch (e) {}
};

export const subscribeToPendingBonusClaims = (callback: (claims: BonusClaim[]) => void) => {
    const q = query(collection(db, 'bonus_claims'), where('status', '==', 'PENDING'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
         callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BonusClaim)));
    }, (error) => {
        console.error('subscribeToPendingBonusClaims error:', error);
        callback([]);
    });
};

export const getRiderBonusClaims = async (riderId: string, weekId: string): Promise<BonusClaim[]> => {
    const q = query(collection(db, 'bonus_claims'), where('riderId', '==', riderId), where('weekId', '==', weekId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BonusClaim));
};

export const subscribeToRiderBonusClaims = (riderId: string, callback: (claims: BonusClaim[]) => void) => {
    const q = query(collection(db, 'bonus_claims'), where('riderId', '==', riderId), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
         callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BonusClaim)));
    }, (error) => {
        console.error('subscribeToRiderBonusClaims error:', error);
        callback([]);
    });
};

export const markBonusClaimSorted = async (claimId: string) => {
    const claimRef = doc(db, 'bonus_claims', claimId);
    await updateDoc(claimRef, { status: 'SORTED', sortedAt: serverTimestamp() });
};

// ─── Rider Payout Management ───
export interface RiderPayout {
    id: string;
    riderId: string;
    riderName: string;
    amount: number;
    paidAt: any;
}

export const markRiderPaidOut = async (riderId: string, riderName: string, amount: number) => {
    if (amount <= 0) throw new Error('No earnings to pay out');

    // 1. Record the payout transaction
    await addDoc(collection(db, 'rider_payouts'), {
        riderId,
        riderName,
        amount,
        paidAt: serverTimestamp()
    });

    // 2. Reset rider earnings to 0
    const riderRef = doc(db, 'riders', riderId);
    await updateDoc(riderRef, { earnings: 0 });
};

export const subscribeToRiderPayouts = (riderId: string, callback: (payouts: RiderPayout[]) => void) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const q = query(
        collection(db, 'rider_payouts'),
        where('riderId', '==', riderId),
        where('paidAt', '>=', Timestamp.fromDate(thirtyDaysAgo)),
        orderBy('paidAt', 'desc'),
        limit(50)
    );
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RiderPayout)));
    }, (error) => {
        console.error('subscribeToRiderPayouts error:', error);
        callback([]);
    });
};

// For admin: get all payouts across all riders (last 30 days)
export const subscribeToAllRiderPayouts = (callback: (payouts: RiderPayout[]) => void) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const q = query(
        collection(db, 'rider_payouts'),
        where('paidAt', '>=', Timestamp.fromDate(thirtyDaysAgo)),
        orderBy('paidAt', 'desc'),
        limit(100)
    );
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RiderPayout)));
    }, (error) => {
        console.error('subscribeToAllRiderPayouts error:', error);
        callback([]);
    });
};
