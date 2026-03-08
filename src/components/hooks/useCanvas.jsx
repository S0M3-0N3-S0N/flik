import { useCallback } from "react";

function buildFilterString(adjustments, selectedFilter) {
  const filters = [];
  if (adjustments?.brightness !== 0) filters.push(`brightness(${100 + (adjustments?.brightness || 0)}%)`);
  if (adjustments?.contrast !== 0) filters.push(`contrast(${100 + (adjustments?.contrast || 0)}%)`);
  if (adjustments?.saturation !== 0) filters.push(`saturate(${100 + (adjustments?.saturation || 0)}%)`);
  if (adjustments?.blur > 0) filters.push(`blur(${adjustments.blur}px)`);
  if (adjustments?.hue !== 0) filters.push(`hue-rotate(${adjustments?.hue || 0}deg)`);
  if (adjustments?.sepia > 0) filters.push(`sepia(${adjustments.sepia}%)`);
  if (adjustments?.grayscale > 0) filters.push(`grayscale(${adjustments.grayscale}%)`);
  if (selectedFilter && selectedFilter.id !== "none" && selectedFilter.filter) {
    filters.push(selectedFilter.filter);
  }
  return filters.length > 0 ? filters.join(" ") : "none";
}

export function useCanvas() {
  const generateCanvas = useCallback(async (currentImage, adjustments, transform, selectedFilter, strokes) => {
    return new Promise((resolve, reject) => {
      if (!currentImage) { resolve(null); return; }

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const rotate = transform?.rotate || 0;
        const isRotated90 = Math.abs(rotate % 360) === 90 || Math.abs(rotate % 360) === 270;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (isRotated90) {
          canvas.width = img.naturalHeight;
          canvas.height = img.naturalWidth;
        } else {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
        }

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);

        if (rotate !== 0) ctx.rotate((rotate * Math.PI) / 180);
        if (transform?.flipH) ctx.scale(-1, 1);
        if (transform?.flipV) ctx.scale(1, -1);

        // Apply adjustments + filters using ctx.filter BEFORE drawing the image
        const filterStr = buildFilterString(adjustments, selectedFilter);
        ctx.filter = filterStr;

        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2, img.naturalWidth, img.naturalHeight);

        ctx.restore();
        ctx.filter = "none";

        // Draw paint/brush strokes on top
        if (strokes && strokes.length > 0) {
          strokes.forEach(stroke => {
            const points = stroke.points || stroke;
            if (!points || points.length === 0) return;

            const isErase = stroke.type === 'erase' || stroke.mode === 'erase';
            const size = stroke.size || 30;
            const color = stroke.color || "rgba(255, 107, 53, 0.8)";
            const opacity = stroke.opacity !== undefined ? stroke.opacity / 100 : 1;

            ctx.globalCompositeOperation = isErase ? 'destination-out' : 'source-over';
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = isErase ? 1 : opacity;

            if (points.length === 1) {
              ctx.beginPath();
              ctx.arc(
                (points[0].x / 100) * canvas.width,
                (points[0].y / 100) * canvas.height,
                size / 2, 0, Math.PI * 2
              );
              ctx.fill();
            } else {
              ctx.beginPath();
              ctx.moveTo((points[0].x / 100) * canvas.width, (points[0].y / 100) * canvas.height);
              for (let i = 1; i < points.length; i++) {
                ctx.lineTo((points[i].x / 100) * canvas.width, (points[i].y / 100) * canvas.height);
              }
              ctx.stroke();
            }
          });

          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }

        resolve(canvas);
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = currentImage.preview || currentImage.url;
    });
  }, []);

  const getProcessedImageBlob = useCallback(async (currentImage, adjustments, transform, selectedFilter, strokes) => {
    const canvas = await generateCanvas(currentImage, adjustments, transform, selectedFilter, strokes);
    if (!canvas) return null;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
    });
  }, [generateCanvas]);

  return { generateCanvas, getProcessedImageBlob };
}