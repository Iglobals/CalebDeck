import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';

const MART_ITEMS = 'mart_items';
const MART_ORDERS = 'mart_orders';

export interface MartItem {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  inStock: boolean;
  createdAt: number;
}

export interface MartOrder {
  orderId: string;
  userId: string;
  fullName: string;
  phone: string;
  hostel: string;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl: string;
    category: string;
  }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: 'PAID' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
  createdAt: number;
  assignedRiderId?: string | null;
  riderName?: string | null;
}

// ==========================================
// STUDENT FACING
// ==========================================

export const subscribeToMartItems = (callback: (items: MartItem[]) => void) => {
  const q = query(collection(db, MART_ITEMS), orderBy('createdAt', 'desc'));
  return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.fromCache && snapshot.empty) {
      return; // Ignore empty initial cache read to prevent "No items" flicker
    }
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MartItem));
    callback(items);
  }, (error) => {
    console.error('subscribeToMartItems error:', error);
    callback([]);
  });
};

export const getMartItemsByCategory = async (category: string) => {
  const q = query(collection(db, MART_ITEMS), where('category', '==', category));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as MartItem));
};

export const createMartOrder = async (orderData: Omit<MartOrder, 'createdAt'>) => {
  const orderRef = doc(db, MART_ORDERS, orderData.orderId);
  await setDoc(orderRef, {
    ...orderData,
    createdAt: Date.now()
  });
};

// ==========================================
// ADMIN FACING
// ==========================================

export const subscribeToMartOrders = (callback: (orders: MartOrder[]) => void) => {
  const q = query(collection(db, MART_ORDERS), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({
      orderId: doc.id,
      ...doc.data()
    } as MartOrder));
    callback(orders);
  });
};

export const addMartItem = async (item: Omit<MartItem, 'id' | 'createdAt'>) => {
  const docRef = doc(collection(db, MART_ITEMS));
  await setDoc(docRef, {
    ...item,
    createdAt: Date.now()
  });
  return docRef.id;
};

export const updateMartItem = async (id: string, updates: Partial<MartItem>) => {
  const docRef = doc(db, MART_ITEMS, id);
  await updateDoc(docRef, updates);
};

export const deleteMartItem = async (id: string) => {
  await deleteDoc(doc(db, MART_ITEMS, id));
};

export const toggleMartItemStock = async (id: string, inStock: boolean) => {
  await updateDoc(doc(db, MART_ITEMS, id), { inStock });
};

export const updateMartOrderStatus = async (orderId: string, status: MartOrder['status']) => {
  await updateDoc(doc(db, MART_ORDERS, orderId), { status });
};

export const dispatchMartOrder = async (orderId: string, riderId: string, riderName: string, riderPhone: string) => {
  await updateDoc(doc(db, MART_ORDERS, orderId), {
    status: 'DISPATCHED',
    riderId,
    riderName,
    riderPhone
  });
};
