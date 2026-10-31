import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export const ANNOUNCEMENTS_DOC_PATH = { collection: 'settings', id: 'customer_announcements' };
export const PAYMENT_RESOLUTION_ANNOUNCEMENT_ID = 'payment-issues-resolved-2026-10';

export interface CustomerAnnouncement {
  id: string;
  title: string;
  body: string;
  published: boolean;
  unpublishedByAdmin?: boolean;
  dismissible?: boolean;
  audience?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

const DISMISS_PREFIX = 'calebdeck_announcement_dismissed_';

export const DEFAULT_PAYMENT_ANNOUNCEMENT: CustomerAnnouncement = {
  id: PAYMENT_RESOLUTION_ANNOUNCEMENT_ID,
  title: 'Payment Issues Resolved',
  body: "We're sorry for the inconvenience caused by the payment issues some of you experienced over the past few days.\n\nThe issue has now been resolved, and you can continue placing orders and making payments on CalebDeck.\n\nThank you for your patience and for bearing with us. We appreciate you!",
  published: false,
  dismissible: true,
  audience: 'all',
};

export function dismissedAnnouncementIds(): string[] {
  try {
    const ids: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DISMISS_PREFIX) && localStorage.getItem(key) === '1') {
        ids.push(key.slice(DISMISS_PREFIX.length));
      }
    }
    return ids;
  } catch {
    return [];
  }
}

export function dismissAnnouncement(id: string) {
  try {
    localStorage.setItem(`${DISMISS_PREFIX}${id}`, '1');
  } catch {
    // Ignore storage failures; the banner can be dismissed for this session only.
  }
}

export function isAnnouncementDismissed(id: string) {
  try {
    return localStorage.getItem(`${DISMISS_PREFIX}${id}`) === '1';
  } catch {
    return false;
  }
}

export const subscribeToAnnouncements = (callback: (items: CustomerAnnouncement[]) => void) => {
  const ref = doc(db, ANNOUNCEMENTS_DOC_PATH.collection, ANNOUNCEMENTS_DOC_PATH.id);
  return onSnapshot(ref, (snap) => {
    const items = Array.isArray(snap.data()?.items) ? snap.data()!.items : [];
    callback(items as CustomerAnnouncement[]);
  }, () => callback([]));
};

export async function saveAnnouncements(items: CustomerAnnouncement[]) {
  const ref = doc(db, ANNOUNCEMENTS_DOC_PATH.collection, ANNOUNCEMENTS_DOC_PATH.id);
  await setDoc(ref, {
    items,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}
