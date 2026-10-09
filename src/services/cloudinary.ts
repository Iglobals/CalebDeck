import { auth } from './firebase';

const CLOUDINARY_CLOUD_NAME = 'dpwx4djzx';
const UPLOAD_PRESET = 'calebdeck';

export interface UploadProgressEvent {
  loaded: number;
  total: number;
}

export const uploadMediaToCloudinary = async (
  file: File, 
  onProgress?: (progress: number) => void
): Promise<{ url: string; publicId: string; type: 'image' | 'video'; format: string; width: number; height: number }> => {
  if (!auth.currentUser) throw new Error('Must be logged in to upload');
  
  let fileToUpload = file;
  if (file.type.startsWith('image/')) {
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('Image exceeds the 20MB upload limit. Please select a smaller file.');
    }
    fileToUpload = await compressImage(file);
    if (fileToUpload.size > 8 * 1024 * 1024) {
       throw new Error('Image is still larger than 8MB after compression. Please select a smaller image.');
    }
  } else if (file.type.startsWith('video/')) {
    // 20MB limit for videos and ~20s duration
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('Video must be less than 20MB to conserve bandwidth.');
    }
    const duration = await getVideoDuration(file);
    if (duration > 22) { // Allow slight 2s leeway
      throw new Error(`Video is too long (${Math.round(duration)}s). Maximum allowed is 20 seconds.`);
    }
  }

  // Get token for auth with our Vercel function
  const token = await auth.currentUser.getIdToken();

  // Get signature from our backend
  const timestamp = Math.round(new Date().getTime() / 1000);
  const sigRes = await fetch('/api/utils/cloudinary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      paramsToSign: { timestamp, upload_preset: UPLOAD_PRESET }
    })
  });
  
  if (!sigRes.ok) throw new Error('Failed to get upload signature');
  const { signature, apiKey } = await sigRes.json();

  if (!apiKey) throw new Error('API key missing from signature response');

  // Upload to Cloudinary using XMLHttpRequest for progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
    
    xhr.open('POST', url, true);
    xhr.timeout = 120000;
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({
            url: response.secure_url,
            publicId: response.public_id,
            type: response.resource_type as 'image' | 'video',
            format: response.format,
            width: response.width,
            height: response.height
          });
        } catch {
          reject(new Error('Cloudinary returned an invalid upload response'));
        }
      } else {
        let message = `Upload failed (${xhr.status}): ${xhr.statusText || 'Cloudinary request failed'}`;
        try {
          const response = JSON.parse(xhr.responseText);
          message = response.error?.message || message;
        } catch {
          // Keep the HTTP error when Cloudinary returns a non-JSON response.
        }
        reject(new Error(message));
      }
    };
    
    xhr.onerror = () => reject(new Error('Network error while uploading to Cloudinary'));
    xhr.ontimeout = () => reject(new Error('Cloudinary upload timed out. Please try again.'));
    xhr.onabort = () => reject(new Error('Cloudinary upload was cancelled'));

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('signature', signature);
    
    xhr.send(formData);
  });
};

export const deleteMediaFromCloudinary = async (publicId: string, resourceType: 'image' | 'video' = 'image') => {
  if (!auth.currentUser) throw new Error('Must be logged in to delete');
  const token = await auth.currentUser.getIdToken();

  const res = await fetch(`/api/utils/cloudinary?action=cloudinary&public_id=${encodeURIComponent(publicId)}&resource_type=${resourceType}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) throw new Error('Failed to delete media');
  return res.json();
};

export const getOptimizedDeliveryUrl = (url: string, width?: number) => {
  if (!url.includes('cloudinary.com')) return url;
  
  const transforms = ['f_auto', 'q_auto'];
  if (width) transforms.push(`w_${width}`);
  
  const insertIndex = url.indexOf('/upload/') + 8;
  return url.slice(0, insertIndex) + transforms.join(',') + '/' + url.slice(insertIndex);
};

export const getVideoPosterUrl = (url: string) => {
  if (!url.includes('cloudinary.com') || !url.match(/\.(mp4|mov|webm)$/i)) return url;
  
  // Replace extension with jpg and add poster transforms
  return getOptimizedDeliveryUrl(url.replace(/\.[^/.]+$/, '.jpg'), 800);
};

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const MAX_WIDTH = 2000;
      let width = img.width;
      let height = img.height;
      
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(file);
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (!blob) return resolve(file);
        // Create new file with .webp extension
        const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
        const newFile = new File([blob], newFileName, {
          type: 'image/webp',
          lastModified: Date.now(),
        });
        resolve(newFile);
      }, 'image/webp', 0.84);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback to original if error
    };
  });
};

const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Invalid video file'));
    };
    
    video.src = URL.createObjectURL(file);
  });
};
