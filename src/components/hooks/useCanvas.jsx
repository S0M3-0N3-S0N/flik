import { useState, useCallback } from 'react';

export function useCanvas() {
  const generateCanvas = async (sourceImage, adjustments, transform, selectedFilter) => {
    if (!sourceImage) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context from canvas');
    const img = new Image();
    if (!sourceImage.url.startsWith('blob:')) {
      img.crossOrigin = "anonymous";
    }
    img.src = sourceImage.preview || sourceImage.url;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // Handle rotation dimensions
    const rotationAngle = ((transform.rotate % 360) + 360) % 360;
    if (rotationAngle === 90 || rotationAngle === 270) {
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
  };

  const getProcessedImageBlob = async (sourceImage, adjustments, transform, selectedFilter) => {
    const canvas = await generateCanvas(sourceImage, adjustments, transform, selectedFilter);
    if (!canvas) return null;
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png', 1.0);
    });
  };

  return { generateCanvas, getProcessedImageBlob };
}