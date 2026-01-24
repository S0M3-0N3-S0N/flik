import { useCallback } from 'react';

export const useLayersComposite = () => {
  const generateCompositeCanvas = useCallback(async (layers, containerWidth = 1920, containerHeight = 1080) => {
    if (!layers || layers.length === 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sort layers by order (bottom to top)
    const sortedLayers = [...layers].filter(l => l.visible);

    for (const layer of sortedLayers) {
      if (!layer.image) continue;

      try {
        // Load image
        const img = await new Promise((resolve, reject) => {
          const image = new Image();
          image.crossOrigin = 'anonymous';
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = layer.image.preview || layer.image.url || layer.image;
        });

        // Save context
        ctx.save();

        // Apply layer opacity and blend mode
        ctx.globalAlpha = (layer.opacity || 100) / 100;
        ctx.globalCompositeOperation = layer.blendMode || 'source-over';

        // Calculate dimensions
        const layerWidth = layer.width || canvas.width;
        const layerHeight = layer.height || canvas.height;
        const x = layer.x || 0;
        const y = layer.y || 0;

        // Apply transforms
        const centerX = x + layerWidth / 2;
        const centerY = y + layerHeight / 2;
        
        ctx.translate(centerX, centerY);
        
        if (layer.transform?.rotate) {
          ctx.rotate((layer.transform.rotate * Math.PI) / 180);
        }
        if (layer.transform?.flipH) {
          ctx.scale(-1, 1);
        }
        if (layer.transform?.flipV) {
          ctx.scale(1, -1);
        }

        // Apply filters
        const filters = [];
        if (layer.adjustments) {
          if (layer.adjustments.brightness !== 0) filters.push(`brightness(${100 + layer.adjustments.brightness}%)`);
          if (layer.adjustments.contrast !== 0) filters.push(`contrast(${100 + layer.adjustments.contrast}%)`);
          if (layer.adjustments.saturation !== 0) filters.push(`saturate(${100 + layer.adjustments.saturation}%)`);
          if (layer.adjustments.blur > 0) filters.push(`blur(${layer.adjustments.blur}px)`);
          if (layer.adjustments.hue !== 0) filters.push(`hue-rotate(${layer.adjustments.hue}deg)`);
          if (layer.adjustments.sepia > 0) filters.push(`sepia(${layer.adjustments.sepia}%)`);
          if (layer.adjustments.grayscale > 0) filters.push(`grayscale(${layer.adjustments.grayscale}%)`);
        }
        if (layer.filter && layer.filter.id !== 'none') {
          filters.push(layer.filter.filter);
        }
        ctx.filter = filters.length > 0 ? filters.join(' ') : 'none';

        // Draw image
        ctx.drawImage(img, -layerWidth / 2, -layerHeight / 2, layerWidth, layerHeight);

        // Restore context
        ctx.restore();
      } catch (error) {
        console.error('Error rendering layer:', layer.name, error);
      }
    }

    return canvas;
  }, []);

  const getCompositeBlob = useCallback(async (layers, containerWidth, containerHeight) => {
    const canvas = await generateCompositeCanvas(layers, containerWidth, containerHeight);
    if (!canvas) return null;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
    });
  }, [generateCompositeCanvas]);

  return { generateCompositeCanvas, getCompositeBlob };
};