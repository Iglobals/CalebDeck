import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, setDoc, deleteDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface BusinessVendor {
  id: string;
  vendorId: string;
  businessName: string;
  description: string;
  category: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  subscriptionPlan: string;
  subscriptionStartDate: any; // Timestamp
  subscriptionEndDate: any;   // Timestamp
  accessCodePlain?: string;   // Only available right after generation
  imageUrl?: string;
  createdAt: any;
  updatedAt: any;
}

export interface BusinessProduct {
  id: string;
  productId: string;
  vendorId: string;
  vendorBusinessName: string;
  vendorPhone: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  inStock: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface BusinessReferral {
  id: string;
  vendorId: string;
  productId: string;
  productName: string;
  vendorBusinessName: string;
  userId?: string;
  timestamp: any;
}

// Subscribe to all vendors (Admin)
export const subscribeToBusinessVendors = (callback: (vendors: BusinessVendor[]) => void) => {
  const q = query(collection(db, 'business_vendors'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const vendors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BusinessVendor));
    callback(vendors);
  });
};

// Subscribe to all products (Admin)
export const subscribeToBusinessProducts = (callback: (products: BusinessProduct[]) => void) => {
  const q = query(collection(db, 'business_products'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BusinessProduct));
    callback(products);
  });
};

// Subscribe to active products only (Customer-facing, filters by active subscription)
export const subscribeToActiveBusinessProducts = (callback: (products: BusinessProduct[]) => void) => {
  const vendorsQ = query(collection(db, 'business_vendors'));
  const productsQ = query(collection(db, 'business_products'), orderBy('createdAt', 'desc'));
  
  let currentVendors: BusinessVendor[] = [];
  let currentProducts: BusinessProduct[] = [];

  const updateActiveProducts = () => {
    const now = new Date();
    // Filter to vendors whose subscription is active
    const activeVendorIds = new Set(
      currentVendors
        .filter(v => v.subscriptionEndDate && v.subscriptionEndDate.toDate() > now)
        .map(v => v.id)
    );

    // Filter products to those belonging to active vendors
    const activeProducts = currentProducts.filter(p => activeVendorIds.has(p.vendorId));
    callback(activeProducts);
  };

  const unsubVendors = onSnapshot(vendorsQ, (snapshot) => {
    currentVendors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BusinessVendor));
    updateActiveProducts();
  });

  const unsubProducts = onSnapshot(productsQ, (snapshot) => {
    currentProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BusinessProduct));
    updateActiveProducts();
  });

  return () => {
    unsubVendors();
    unsubProducts();
  };
};

export const generateAccessCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid lookalikes like I, 1, O, 0
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Format as XXXX-XXXX-XXXX
  return code.match(/.{1,4}/g)?.join('-') || code;
};

export const getNextVendorId = async (): Promise<string> => {
  const snapshot = await getDocs(collection(db, 'business_vendors'));
  let maxId = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.vendorId && data.vendorId.startsWith('CBDK-V-')) {
      const num = parseInt(data.vendorId.split('-')[2], 10);
      if (num > maxId) maxId = num;
    }
  });
  const nextNum = maxId + 1;
  return `CBDK-V-${nextNum.toString().padStart(6, '0')}`;
};

export const getNextProductId = async (): Promise<string> => {
  const snapshot = await getDocs(collection(db, 'business_products'));
  let maxId = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.productId && data.productId.startsWith('CBDK-P-')) {
      const num = parseInt(data.productId.split('-')[2], 10);
      if (num > maxId) maxId = num;
    }
  });
  const nextNum = maxId + 1;
  return `CBDK-P-${nextNum.toString().padStart(6, '0')}`;
};

export const addBusinessVendor = async (data: Omit<BusinessVendor, 'id' | 'createdAt' | 'updatedAt' | 'vendorId'>) => {
  const vendorId = await getNextVendorId();
  return addDoc(collection(db, 'business_vendors'), {
    ...data,
    vendorId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const updateBusinessVendor = (id: string, data: Partial<BusinessVendor>) => {
  return updateDoc(doc(db, 'business_vendors', id), {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteBusinessVendor = (id: string) => {
  return deleteDoc(doc(db, 'business_vendors', id));
};

export const addBusinessProduct = async (data: Omit<BusinessProduct, 'id' | 'createdAt' | 'updatedAt' | 'productId'>) => {
  const productId = await getNextProductId();
  return addDoc(collection(db, 'business_products'), {
    ...data,
    productId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const updateBusinessProduct = (id: string, data: Partial<BusinessProduct>) => {
  return updateDoc(doc(db, 'business_products', id), {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteBusinessProduct = (id: string) => {
  return deleteDoc(doc(db, 'business_products', id));
};

export const logReferralTap = async (
  vendorId: string, 
  productId: string, 
  productName: string, 
  vendorBusinessName: string, 
  userId?: string
) => {
  return addDoc(collection(db, 'business_referrals'), {
    vendorId,
    productId,
    productName,
    vendorBusinessName,
    userId: userId || null,
    timestamp: serverTimestamp()
  });
};

export const subscribeToVendorReferrals = (vendorId: string, callback: (referrals: BusinessReferral[]) => void) => {
  const q = query(collection(db, 'business_referrals')); // Would add where('vendorId', '==', vendorId) if indexing is ready, but filter client side for now to avoid requiring new indices instantly
  return onSnapshot(q, (snapshot) => {
    const refs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as BusinessReferral))
        .filter(ref => ref.vendorId === vendorId);
    callback(refs);
  });
};

export const subscribeToAllReferrals = (callback: (referrals: BusinessReferral[]) => void) => {
  const q = query(collection(db, 'business_referrals'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const refs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BusinessReferral));
    callback(refs);
  });
};
