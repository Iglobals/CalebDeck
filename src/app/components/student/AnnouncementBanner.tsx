import React, { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import {
  CustomerAnnouncement,
  dismissAnnouncement,
  isAnnouncementDismissed,
  subscribeToAnnouncements,
} from '../../../services/announcements';

export function AnnouncementBanner() {
  const [items, setItems] = useState<CustomerAnnouncement[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  useEffect(() => {
    const unsub = subscribeToAnnouncements(setItems);
    return () => unsub();
  }, []);

  const visible = items.filter((item) =>
    item.published &&
    !isAnnouncementDismissed(item.id) &&
    !hiddenIds.includes(item.id)
  );

  if (visible.length === 0) return null;

  const current = visible[0];

  const handleDismiss = () => {
    if (current.dismissible !== false) {
      dismissAnnouncement(current.id);
      setHiddenIds((prev) => [...prev, current.id]);
    }
  };

  return (
    <div className="fixed top-3 left-1/2 z-[70] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 md:top-4">
      <div className="rounded-2xl border border-emerald-200 bg-white/95 p-4 shadow-xl shadow-emerald-900/10 backdrop-blur dark:border-emerald-900/40 dark:bg-[#1A1A1A]/95">
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
            <Megaphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{current.title}</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-[#E8E0D4]">{current.body}</p>
          </div>
          {current.dismissible !== false && (
            <button
              type="button"
              onClick={handleDismiss}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-[#2A2A2A]"
              aria-label="Dismiss announcement"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AnnouncementHistory() {
  const [items, setItems] = useState<CustomerAnnouncement[]>([]);

  useEffect(() => {
    const unsub = subscribeToAnnouncements(setItems);
    return () => unsub();
  }, []);

  const published = items.filter((item) => item.published);
  if (published.length === 0) return null;

  return (
    <div className="space-y-3">
      {published.map((item) => (
        <div key={item.id} className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-bold">{item.title}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{item.body}</p>
        </div>
      ))}
    </div>
  );
}
