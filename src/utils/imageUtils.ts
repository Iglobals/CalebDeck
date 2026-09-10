/**
 * Utility functions for image processing and ML-based background removal
 */

/**
 * Clean background removal processing pipeline for uploaded product photos.
 * Uses canvas edge color sampling and alpha masking to remove solid/near-solid photo backdrops,
 * returning a clean transparent PNG data URL suitable for catalog brand backdrops.
 *
 * FAIL-SOFT: This function NEVER rejects. If any step fails or produces a larger
 * result than the original, it silently falls back to the original uploaded image.
 * This ensures image uploads are never blocked by background removal failures.
 */
export async function removeBackgroundML(imageFile: File | Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => {
      // Fail-soft: can't even read the file — create an object URL as last resort
      console.warn('[removeBackgroundML] FileReader error, falling back to object URL');
      resolve(URL.createObjectURL(imageFile));
    };

    reader.onload = (e) => {
      const originalDataUrl = e.target?.result as string;
      if (!originalDataUrl) {
        console.warn('[removeBackgroundML] Empty reader result, falling back to object URL');
        resolve(URL.createObjectURL(imageFile));
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onerror = () => {
        // Fail-soft: image couldn't load (corrupt, unsupported format, etc.)
        console.warn('[removeBackgroundML] Image load error, using original');
        resolve(originalDataUrl);
      };

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(originalDataUrl);
            return;
          }

          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Sample corner pixels to determine background tint (top-left, top-right, bottom-left)
          const bgR = (data[0] + data[(canvas.width - 1) * 4] + data[(canvas.height - 1) * canvas.width * 4]) / 3;
          const bgG = (data[1] + data[(canvas.width - 1) * 4 + 1] + data[(canvas.height - 1) * canvas.width * 4 + 1]) / 3;
          const bgB = (data[2] + data[(canvas.width - 1) * 4 + 2] + data[(canvas.height - 1) * canvas.width * 4 + 2]) / 3;

          const threshold = 35; // Sensitivity threshold for backdrop isolation
          let pixelsModified = 0;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const diff = Math.sqrt(
              Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2)
            );

            if (diff < threshold) {
              // Smooth alpha transition for soft cutout edges
              const alphaFactor = Math.max(0, (diff / threshold));
              data[i + 3] = Math.floor(data[i + 3] * alphaFactor);
              pixelsModified++;
            }
          }

          // If the algorithm barely touched the image (< 1% of pixels), the background
          // isn't a simple solid — skip removal and return the original untouched.
          const totalPixels = data.length / 4;
          if (pixelsModified < totalPixels * 0.01) {
            console.info('[removeBackgroundML] Background not detected (< 1% match), using original');
            resolve(originalDataUrl);
            return;
          }

          ctx.putImageData(imageData, 0, 0);
          const processedDataUrl = canvas.toDataURL('image/png');

          // Size guard: if the processed PNG is bigger than the original, the conversion
          // bloated the file (common with photos). Use the original to avoid hitting
          // Firestore's 1MB doc limit.
          if (processedDataUrl.length > originalDataUrl.length) {
            console.info('[removeBackgroundML] Processed image larger than original, using original');
            resolve(originalDataUrl);
            return;
          }

          resolve(processedDataUrl);
        } catch (err) {
          // Fallback to original image data URL if canvas processing fails
          console.warn('[removeBackgroundML] Canvas processing error, using original:', err);
          resolve(originalDataUrl);
        }
      };
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(imageFile);
  });
}
