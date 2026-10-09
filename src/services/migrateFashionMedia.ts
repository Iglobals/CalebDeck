import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { FashionItem, FashionMedia } from './fashion';
import { uploadMediaToCloudinary } from './cloudinary';

export interface FashionMigrationProgress {
  message: string;
  progress: number;
  completed: number;
  total: number;
  status: 'running' | 'complete' | 'error';
  failedItems: Array<{ id: string; name: string; error: string }>;
}

/**
 * Migration Script to move base64 encoded media from Firestore into Cloudinary.
 * We fetch all items, find any that use old string-based base64 fields, 
 * upload them via Cloudinary signed endpoints, and update the document.
 */
export const migrateFashionMediaToCloudinary = async (
  onProgress: (progress: FashionMigrationProgress) => void,
  itemIds?: string[]
) => {
  onProgress({ message: 'Fetching fashion items...', progress: 0, completed: 0, total: 0, status: 'running', failedItems: [] });
  const snapshot = await getDocs(collection(db, 'fashion_inventory'));
  const fetchedItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as FashionItem[];
  const selectedIds = itemIds ? new Set(itemIds) : null;
  const items = selectedIds ? fetchedItems.filter(item => selectedIds.has(item.id)) : fetchedItems;

  const total = items.length;
  let migratedCount = 0;
  const failedItems: FashionMigrationProgress['failedItems'] = [];

  onProgress({
    message: `Found ${total} items. Scanning for base64 media...`,
    progress: total === 0 ? 100 : 0,
    completed: 0,
    total,
    status: 'running',
    failedItems
  });

  for (const [itemIndex, item] of items.entries()) {
    let needsUpdate = false;
    const newMedia: FashionMedia[] = item.media ? [...item.media] : [];
    const assetCount = Number(item.imageUrl?.startsWith('data:'))
      + Number(item.videoUrl?.startsWith('data:'))
      + (item.mediaUrls || []).filter(url => url.startsWith('data:')).length;
    let completedAssets = 0;

    const reportProgress = (message: string, itemProgress = 0) => {
      const overallProgress = total === 0 ? 100 : Math.round(((itemIndex + itemProgress) / total) * 100);
      onProgress({
        message,
        progress: overallProgress,
        completed: itemIndex,
        total,
        status: 'running',
        failedItems: [...failedItems]
      });
    };
    
    try {
      // Helper to upload a base64 string
      const uploadBase64 = async (b64: string, type: 'image'|'video', isMain: boolean, itemName: string, assetKey: string) => {
        // Convert base64 to file
        const res = await fetch(b64);
        const blob = await res.blob();
        const file = new File([blob], `migrated_${item.id}_${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`, { type: blob.type });
        const result = await uploadMediaToCloudinary(file, (progress) => {
          const itemProgress = assetCount ? (completedAssets + progress / 100) / assetCount : 0;
          reportProgress(`Uploading ${type} for ${itemName}... ${progress}%`, itemProgress);
        }, {
          publicId: `fashion_migration/${item.id}_${assetKey}`,
          overwrite: true
        });
        completedAssets++;
        return {
          url: result.url,
          type: result.type,
          publicId: result.publicId,
          width: result.width,
          height: result.height,
          isMain
        };
      };

      // 1. Check main imageUrl
      if (item.imageUrl && item.imageUrl.startsWith('data:')) {
        reportProgress(`Preparing main image for ${item.name}...`, assetCount ? completedAssets / assetCount : 0);
        const media = await uploadBase64(item.imageUrl, 'image', true, item.name, 'main');
        newMedia.push(media);
        item.imageUrl = media.url; // Keep legacy field updated for backwards compatibility
        needsUpdate = true;
      }

      // 2. Check videoUrl
      if (item.videoUrl && item.videoUrl.startsWith('data:')) {
        reportProgress(`Preparing video for ${item.name}...`, assetCount ? completedAssets / assetCount : 0);
        const media = await uploadBase64(item.videoUrl, 'video', false, item.name, 'video');
        newMedia.push(media);
        item.videoUrl = media.url;
        needsUpdate = true;
      }

      // 3. Check mediaUrls (additional images)
      if (item.mediaUrls && item.mediaUrls.length > 0) {
        const newMediaUrls = [];
        for (let i = 0; i < item.mediaUrls.length; i++) {
          const mUrl = item.mediaUrls[i];
          if (mUrl.startsWith('data:')) {
            reportProgress(`Preparing additional image ${i+1} for ${item.name}...`, assetCount ? completedAssets / assetCount : 0);
            const media = await uploadBase64(mUrl, 'image', false, item.name, `media_${i}`);
            newMedia.push(media);
            newMediaUrls.push(media.url);
            needsUpdate = true;
          } else {
            newMediaUrls.push(mUrl);
          }
        }
        item.mediaUrls = newMediaUrls;
      }

      // If we made changes, save it
      if (needsUpdate) {
        reportProgress(`Saving migrated item ${item.name}...`, 1);
        await updateDoc(doc(db, 'fashion_inventory', item.id), {
          ...(item.imageUrl !== undefined && { imageUrl: item.imageUrl }),
          ...(item.videoUrl !== undefined && { videoUrl: item.videoUrl }),
          ...(item.mediaUrls !== undefined && { mediaUrls: item.mediaUrls }),
          media: newMedia
        });
        migratedCount++;
      } else {
        reportProgress(`Checked ${item.name}; no migration needed.`, 1);
      }
    } catch (err) {
      console.error(`Failed to migrate item ${item.id}`, err);
      const error = err instanceof Error ? err.message : 'unknown error';
      failedItems.push({ id: item.id, name: item.name, error });
      reportProgress(`Failed to migrate ${item.name}: ${error}`, 1);
    }
  }

  onProgress({
    message: failedItems.length
      ? `Migration finished: ${migratedCount} items updated, ${failedItems.length} failed. Review the failures and retry only those items.`
      : `Migration complete! Successfully updated ${migratedCount} items.`,
    progress: 100,
    completed: total,
    total,
    status: failedItems.length ? 'error' : 'complete',
    failedItems: [...failedItems]
  });
};
