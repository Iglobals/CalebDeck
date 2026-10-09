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
}

/**
 * Migration Script to move base64 encoded media from Firestore into Cloudinary.
 * We fetch all items, find any that use old string-based base64 fields, 
 * upload them via Cloudinary signed endpoints, and update the document.
 */
export const migrateFashionMediaToCloudinary = async (onProgress: (progress: FashionMigrationProgress) => void) => {
  onProgress({ message: 'Fetching fashion items...', progress: 0, completed: 0, total: 0, status: 'running' });
  const snapshot = await getDocs(collection(db, 'fashion_inventory'));
  const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as FashionItem[];

  const total = items.length;
  let migratedCount = 0;
  let failedCount = 0;

  onProgress({
    message: `Found ${total} items. Scanning for base64 media...`,
    progress: total === 0 ? 100 : 0,
    completed: 0,
    total,
    status: 'running'
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
        status: 'running'
      });
    };
    
    try {
      // Helper to upload a base64 string
      const uploadBase64 = async (b64: string, type: 'image'|'video', isMain: boolean = false, itemName: string) => {
        // Convert base64 to file
        const res = await fetch(b64);
        const blob = await res.blob();
        const file = new File([blob], `migrated_${item.id}_${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`, { type: blob.type });
        const result = await uploadMediaToCloudinary(file, (progress) => {
          const itemProgress = assetCount ? (completedAssets + progress / 100) / assetCount : 0;
          reportProgress(`Uploading ${type} for ${itemName}... ${progress}%`, itemProgress);
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
        const media = await uploadBase64(item.imageUrl, 'image', true, item.name);
        newMedia.push(media);
        item.imageUrl = media.url; // Keep legacy field updated for backwards compatibility
        needsUpdate = true;
      }

      // 2. Check videoUrl
      if (item.videoUrl && item.videoUrl.startsWith('data:')) {
        reportProgress(`Preparing video for ${item.name}...`, assetCount ? completedAssets / assetCount : 0);
        const media = await uploadBase64(item.videoUrl, 'video', false, item.name);
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
            const media = await uploadBase64(mUrl, 'image', false, item.name);
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
          imageUrl: item.imageUrl,
          videoUrl: item.videoUrl,
          mediaUrls: item.mediaUrls,
          media: newMedia
        });
        migratedCount++;
      } else {
        reportProgress(`Checked ${item.name}; no migration needed.`, 1);
      }
    } catch (err) {
      console.error(`Failed to migrate item ${item.id}`, err);
      failedCount++;
      reportProgress(`Failed to migrate ${item.name}: ${err instanceof Error ? err.message : 'unknown error'}`, 1);
    }
  }

  onProgress({
    message: failedCount
      ? `Migration finished: ${migratedCount} items updated, ${failedCount} failed. You can retry the failed items.`
      : `Migration complete! Successfully updated ${migratedCount} items.`,
    progress: 100,
    completed: total,
    total,
    status: failedCount ? 'error' : 'complete'
  });
};
