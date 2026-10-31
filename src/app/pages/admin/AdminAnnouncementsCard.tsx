import React, { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import {
  CustomerAnnouncement,
  DEFAULT_PAYMENT_ANNOUNCEMENT,
  PAYMENT_RESOLUTION_ANNOUNCEMENT_ID,
  saveAnnouncements,
  subscribeToAnnouncements,
} from '../../../services/announcements';
import { toast } from 'react-toastify';
import { useTheme } from '../../../context/ThemeContext';

export function AdminAnnouncementsCard() {
  const { adminTheme } = useTheme();
  const isDark = adminTheme === 'dark';
  const [items, setItems] = useState<CustomerAnnouncement[]>([]);
  const [title, setTitle] = useState(DEFAULT_PAYMENT_ANNOUNCEMENT.title);
  const [body, setBody] = useState(DEFAULT_PAYMENT_ANNOUNCEMENT.body);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAnnouncements((next) => {
      setItems(next);
      const current = next.find((item) => item.id === PAYMENT_RESOLUTION_ANNOUNCEMENT_ID) || next[0];
      if (current) {
        setTitle(current.title);
        setBody(current.body);
      }
    });
    return () => unsub();
  }, []);

  const current = items.find((item) => item.id === PAYMENT_RESOLUTION_ANNOUNCEMENT_ID) || items[0];
  const published = Boolean(current?.published);

  const persist = async (nextPublished: boolean) => {
    if (!title.trim() || !body.trim()) {
      toast.error('Add a title and message before publishing.');
      return;
    }
    if (nextPublished && !published) {
      const confirmed = window.confirm(
        'Publish this announcement only after:\n\n1. The root cause is identified.\n2. The fix is deployed to production.\n3. Production checkout was tested with a safe verification.\n4. Payment initialization and verification are working.\n5. Order creation and payment status updates are correct.\n\nStudents will see this immediately. Continue?'
      );
      if (!confirmed) return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const announcement: CustomerAnnouncement = {
        ...(current || DEFAULT_PAYMENT_ANNOUNCEMENT),
        id: current?.id || PAYMENT_RESOLUTION_ANNOUNCEMENT_ID,
        title: title.trim(),
        body: body.trim(),
        published: nextPublished,
        unpublishedByAdmin: !nextPublished,
        dismissible: true,
        audience: 'all',
        createdAt: current?.createdAt || now,
        updatedAt: now,
        publishedAt: nextPublished ? (current?.publishedAt || now) : null,
      };
      const others = items.filter((item) => item.id !== announcement.id);
      await saveAnnouncements([announcement, ...others]);
      toast.success(nextPublished ? 'Announcement published to students.' : 'Announcement unpublished.');
    } catch (error: any) {
      toast.error(error.message || 'Could not save the announcement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={`p-6 border-l-4 ${published ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <Megaphone className={`w-6 h-6 ${published ? 'text-emerald-500' : 'text-amber-500'}`} />
          </div>
          <div>
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Customer announcements</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Shown in-app when students open CalebDeck</p>
          </div>
        </div>
        <Badge variant={published ? 'green' : 'amber'}>{published ? 'Published' : 'Unpublished'}</Badge>
      </div>
      <div className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold outline-none ${isDark ? 'border-[#333] bg-[#2A2A2A] text-white' : 'border-gray-200 bg-white text-gray-900'}`}
          placeholder="Announcement title"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className={`w-full rounded-xl border px-4 py-3 text-sm leading-relaxed outline-none ${isDark ? 'border-[#333] bg-[#2A2A2A] text-white' : 'border-gray-200 bg-white text-gray-900'}`}
          placeholder="Announcement message"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" className="flex-1" disabled={saving} onClick={() => persist(true)}>
            {published ? 'Update published announcement' : 'Publish announcement'}
          </Button>
          <Button variant="outline" className="flex-1" disabled={saving || !published} onClick={() => persist(false)}>
            Unpublish
          </Button>
        </div>
        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          This announcement stays unpublished until an admin publishes it. Successful payments do not auto-publish it. Keep it unpublished while checkout is still broken. Students can dismiss the banner after it is published; it also stays under Profile → Service updates.
        </p>
      </div>
    </Card>
  );
}
