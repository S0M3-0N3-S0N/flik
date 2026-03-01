import { useState, useCallback } from 'react';

export function useCanvas() {
  const generateCanvas = async (sourceImage, adjustments, transform, selectedFilter, paintStrokes = []) => {
    if (!sourceImage) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context from canvas');
    const img = new Image();
    const imageUrl = sourceImage.preview || sourceImage.url;
    
    if (!imageUrl) {
      throw new Error('No image URL provided');
    }
    
    if (!imageUrl.startsWith('blob:') && !imageUrl.startsWith('data:')) {
      img.crossOrigin = "anonymous";
    }

    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => {
        console.error('Image load error:', e, 'URL:', imageUrl);
        reject(new Error('Failed to load image'));
      };
      img.src = imageUrl;
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
    // Note: canvas 2D filter blur is supported in modern browsers (Chrome 76+, Firefox 72+, Safari 18+)
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

    // Draw paint strokes on top
    if (paintStrokes.length > 0) {
      // Create a new context without transformations for drawing strokes
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = 'none';
      
      paintStrokes.forEach(stroke => {
        const points = stroke.points || [];
        if (!points.length) return;
        const size = stroke.size;
        const color = stroke.color;
        const opacity = stroke.opacity !== undefined ? stroke.opacity / 100 : 1;
        
        ctx.globalCompositeOperation = stroke.mode === "erase" ? 'destination-out' : 'source-over';
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = stroke.mode === "erase" ? 1 : opacity;
        
        // Convert percentage-based points to canvas pixel coordinates
        if (points.length === 1) {
          const x = (points[0].x / 100) * canvas.width;
          const y = (points[0].y / 100) * canvas.height;
          ctx.beginPath();
          ctx.arc(x, y, size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          const x0 = (points[0].x / 100) * canvas.width;
          const y0 = (points[0].y / 100) * canvas.height;
          ctx.moveTo(x0, y0);
          for (let i = 1; i < points.length; i++) {
            const x = (points[i].x / 100) * canvas.width;
            const y = (points[i].y / 100) * canvas.height;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    return canvas;
  };

  const getProcessedImageBlob = async (sourceImage, adjustments, transform, selectedFilter, paintStrokes = []) => {
    const canvas = await generateCanvas(sourceImage, adjustments, transform, selectedFilter, paintStrokes);
    if (!canvas) return null;
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create image blob'));
        }
      }, 'image/png', 1.0);
    });
  };

  return { generateCanvas, getProcessedImageBlob };
}