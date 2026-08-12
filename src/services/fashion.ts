import { collection, onSnapshot, query, doc, updateDoc, addDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface FashionItem {
  id: string;
  name: string;
  brand: string;
  brandColor?: string; // Optional accent color for the brand tag
  price: number;
  imageUrl: string;
  category: string;
  inStock: boolean;
  description?: string;
  createdAt: any;
}

export const subscribeToFashionItems = (
  callback: (items: FashionItem[], isFromCache: boolean, error?: Error) => void
) => {
  const q = query(collection(db, 'fashion_inventory'));
  
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FashionItem[];
      
      callback(items, snapshot.metadata.fromCache);
    },
    (error) => {
      console.error('Error fetching fashion items:', error);
      callback([], false, error);
    }
  );
};

export const addFashionItem = async (data: Omit<FashionItem, 'id' | 'createdAt'>) => {
  const colRef = collection(db, 'fashion_inventory');
  return addDoc(colRef, {
    ...data,
    createdAt: serverTimestamp()
  });
};

export const updateFashionItem = async (id: string, data: Partial<FashionItem>) => {
  const docRef = doc(db, 'fashion_inventory', id);
  return updateDoc(docRef, data as any);
};

export const deleteFashionItem = async (id: string) => {
  const docRef = doc(db, 'fashion_inventory', id);
  return deleteDoc(docRef);
};
