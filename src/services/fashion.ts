import { collection, onSnapshot, query, doc, updateDoc, addDoc, serverTimestamp, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from './firebase';

export interface FashionMedia {
  url: string;
  type: 'image' | 'video';
  publicId?: string;
  width?: number;
  height?: number;
  isMain?: boolean;
}

export const normalizeFashionCategory = (category: string) => category?.trim().replace(/\s+/g, ' ') || '';

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
  sizes?: string[];
  colors?: string[];
  thumbnails?: string[];
  // Legacy media features
  videoUrl?: string;
  mediaUrls?: string[];
  colorMedia?: Record<string, string>; // Maps color hex to media URL
  colorMediaByIndex?: Record<string, string>;
  variationName?: string;
  variations?: string[];
  variationMediaByIndex?: Record<string, string>;
  variationPricesByIndex?: Record<string, number>;
  sizeChartUrl?: string;
  // New structured media
  media?: FashionMedia[];
  createdAt: any;
}

export const subscribeToFashionItems = (
  callback: (items: FashionItem[], isFromCache: boolean, error?: Error) => void
) => {
  const q = query(collection(db, 'fashion_inventory'), orderBy('createdAt', 'desc'));
  
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data() as FashionItem;
        return {
          id: doc.id,
          ...data,
          category: normalizeFashionCategory(data.category || '')
        };
      }) as FashionItem[];
      
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

export interface FashionCategory {
  id: string;
  name: string;
}

export const subscribeToFashionCategories = (
  callback: (categories: FashionCategory[]) => void
) => {
  const q = query(collection(db, 'fashion_categories'));
  return onSnapshot(
    q,
    (snapshot) => {
      const cats = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      callback(cats);
    },
    (error) => {
      console.error('Error fetching fashion categories:', error);
      callback([]);
    }
  );
};

export const addFashionCategory = async (name: string) => {
  const colRef = collection(db, 'fashion_categories');
  return addDoc(colRef, { name });
};

export const deleteFashionCategory = async (id: string) => {
  const docRef = doc(db, 'fashion_categories', id);
  return deleteDoc(docRef);
};
