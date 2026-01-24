import React, { useRef, useEffect, useCallback } from "react";

export default function PaintCanvas({ 
  imageRef, 
  paintStrokes, 
  brushSize, 
  brushColor, 
  brushPreset,
  isPainting,
  zoom 
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const img = imageRef.current;
    const rect = img.getBoundingClientRect();
    
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (paintStrokes.length === 0) return;

    paintStrokes.forEach(stroke => {
      const points = stroke.points;
      if (!points || points.length === 0) return;
      
      const size = stroke.size || brushSize;
      const color = stroke.color || brushColor;
      const opacity = stroke.opacity !== undefined ? stroke.opacity : 1;
      const spacing = stroke.spacing || 25;
      const jitter = stroke.jitter || 0;
      const flow = stroke.flow || 100;
      const wetness = stroke.wetness || 0;
      
      ctx.globalCompositeOperation = 'source-over';
      
      // Convert hex to rgba
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      const finalOpacity = opacity * (flow / 100);
      
      // Wetness affects blur
      if (wetness > 0) {
        ctx.filter = `blur(${wetness / 20}px)`;
      }
      
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${finalOpacity})`;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${finalOpacity})`;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (points.length === 1) {
        ctx.beginPath();
        const jitterX = jitter > 0 ? (Math.random() - 0.5) * jitter * 0.1 : 0;
        const jitterY = jitter > 0 ? (Math.random() - 0.5) * jitter * 0.1 : 0;
        ctx.arc(
          ((points[0].x + jitterX) / 100) * canvas.width, 
          ((points[0].y + jitterY) / 100) * canvas.height, 
          ctx.lineWidth / 2, 
          0, 
          Math.PI * 2
        );
        ctx.fill();
      } else {
        // Apply spacing
        const spacingFactor = Math.max(1, Math.floor(spacing / 10));
        const filteredPoints = points.filter((_, i) => i % spacingFactor === 0);
        
        if (filteredPoints.length > 0) {
          ctx.beginPath();
          const firstPoint = filteredPoints[0];
          ctx.moveTo((firstPoint.x / 100) * canvas.width, (firstPoint.y / 100) * canvas.height);
          
          for (let i = 1; i < filteredPoints.length; i++) {
            const point = filteredPoints[i];
            const jitterX = jitter > 0 ? (Math.random() - 0.5) * jitter * 0.1 : 0;
            const jitterY = jitter > 0 ? (Math.random() - 0.5) * jitter * 0.1 : 0;
            ctx.lineTo(
              ((point.x + jitterX) / 100) * canvas.width, 
              ((point.y + jitterY) / 100) * canvas.height
            );
          }
          
          ctx.stroke();
        }
      }
      
      ctx.filter = 'none';
    });
  }, [paintStrokes, brushSize, brushColor, brushPreset, imageRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none rounded-lg md:rounded-2xl w-full h-full"
      style={{ filter: 'none' }}
    />
  );
}