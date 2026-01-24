import { useCallback } from 'react';

export function useCanvas() {
  // Fixed issues #18, #30, #31, #76, #80 - added error handling
  const generateCanvas = useCallback(async (sourceImage, adjustments, transform, selectedFilter) => {
    if (!sourceImage) return null;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('Failed to get canvas 2d context');
        return null;
      }
      
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = sourceImage.preview || sourceImage.url;

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Image load timeout')), 30000);
        img.onload = () => { clearTimeout(timeout); resolve(); };
        img.onerror = (e) => { clearTimeout(timeout); reject(e); };
      });

    // Handle rotation dimensions
    if (transform.rotate === 90 || transform.rotate === 270) {
      canvas.width = img.height;
      canvas.height = img.width;
    } else {
      canvas.width = img.width;
      canvas.height = img.height;
    }

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((transform.rotate * Math.PI) / 180);
    ctx.scale(transform.flipH ? -1 : 1, transform.flipV ? -1 : 1);

    // Construct CSS Filter String
    const filters = [];
    if (adjustments.brightness !== 0) filters.push(`brightness(${100 + adjustments.brightness}%)`);
    if (adjustments.contrast !== 0) filters.push(`contrast(${100 + adjustments.contrast}%)`);
    if (adjustments.saturation !== 0) filters.push(`saturate(${100 + adjustments.saturation}%)`);
    if (adjustments.blur > 0) filters.push(`blur(${adjustments.blur}px)`);
    if (adjustments.hue !== 0) filters.push(`hue-rotate(${adjustments.hue}deg)`);
    if (adjustments.sepia > 0) filters.push(`sepia(${adjustments.sepia}%)`);
    if (adjustments.grayscale > 0) filters.push(`grayscale(${adjustments.grayscale}%)`);

    if (selectedFilter && selectedFilter.id !== "none") {
      filters.push(selectedFilter.filter);
    }

    ctx.filter = filters.join(" ") || "none";

    // Draw image centered in the transformed context
    ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);

      ctx.restore();
      return canvas;
    } catch (error) {
      console.error('Canvas generation failed:', error);
      return null;
    }
  }, []);

  const getProcessedImageBlob = useCallback(async (sourceImage, adjustments, transform, selectedFilter) => {
    try {
      const canvas = await generateCanvas(sourceImage, adjustments, transform, selectedFilter);
      if (!canvas) return null;
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/png', 1.0);
      });
    } catch (error) {
      console.error('Image blob generation failed:', error);
      return null;
    }
  }, [generateCanvas]);

  return { generateCanvas, getProcessedImageBlob };
}