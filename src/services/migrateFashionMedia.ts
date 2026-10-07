import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { FashionItem, FashionMedia } from './fashion';
import { uploadMediaToCloudinary } from './cloudinary';

/**
 * Migration Script to move base64 encoded media from Firestore into Cloudinary.
 * We fetch all items, find any that use old string-based base64 fields, 
 * upload them via Cloudinary signed endpoints, and update the document.
 */
export const migrateFashionMediaToCloudinary = async (onProgress: (msg: string) => void) => {
  onProgress('Fetching all fashion items...');
  const snapshot = await getDocs(collection(db, 'fashion_inventory'));
  const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as FashionItem[];

  onProgress(`Found ${items.length} items to check.`);
  let migratedCount = 0;

  for (const item of items) {
    let needsUpdate = false;
    const newMedia: FashionMedia[] = item.media ? [...item.media] : [];
    
    try {
      // Helper to upload a base64 string
      const uploadBase64 = async (b64: string, type: 'image'|'video', isMain: boolean = false, itemName: string) => {
        // Convert base64 to file
        const res = await fetch(b64);
        const blob = await res.blob();
        const file = new File([blob], `migrated_${item.id}_${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`, { type: blob.type });
        const result = await uploadMediaToCloudinary(file, (progress) => {
          onProgress(`Uploading ${type} for ${itemName}... ${progress}%`);
        });
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
        onProgress(`Preparing main image for ${item.name}...`);
        const media = await uploadBase64(item.imageUrl, 'image', true, item.name);
        newMedia.push(media);
        item.imageUrl = media.url; // Keep legacy field updated for backwards compatibility
        needsUpdate = true;
      }

      // 2. Check videoUrl
      if (item.videoUrl && item.videoUrl.startsWith('data:')) {
        onProgress(`Preparing video for ${item.name}...`);
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
            onProgress(`Preparing additional image ${i+1} for ${item.name}...`);
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
        onProgress(`Saving migrated item ${item.name}...`);
        await updateDoc(doc(db, 'fashion_inventory', item.id), {
          imageUrl: item.imageUrl,
          videoUrl: item.videoUrl,
          mediaUrls: item.mediaUrls,
          media: newMedia
        });
        migratedCount++;
      }
    } catch (err) {
      console.error(`Failed to migrate item ${item.id}`, err);
      onProgress(`ERROR: Failed to migrate ${item.name}. See console.`);
    }
  }

  onProgress(`Migration complete! Successfully updated ${migratedCount} items.`);
};
