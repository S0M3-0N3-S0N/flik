import React, { useRef, useEffect, useCallback } from "react";

export default function PaintCanvas({ 
  imageRef, 
  paintStrokes, 
  brushSize, 
  brushColor, 
  brushPreset,
  isPainting,
  zoom,
  layerOpacity = 1,
  blendMode = 'source-over'
}) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  const drawStrokes = useCallback(() => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const img = imageRef.current;
    const rect = img.getBoundingClientRect();
    
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = layerOpacity;
    
    if (paintStrokes.length === 0) return;

    paintStrokes.forEach(stroke => {
      const points = stroke.points;
      if (!points || points.length === 0) return;
      
      const isErase = stroke.type === 'erase';
      const size = stroke.size || brushSize;
      const color = stroke.color || brushColor;
      const opacity = stroke.opacity !== undefined ? stroke.opacity : 1;
      const spacing = stroke.spacing || 25;
      const jitter = stroke.jitter || 0;
      const flow = stroke.flow || 100;
      const wetness = stroke.wetness || 0;
      const pressure = stroke.pressure || 1;
      
      ctx.globalCompositeOperation = isErase ? 'destination-out' : blendMode;
      
      // Convert hex to rgba
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      const finalOpacity = opacity * (flow / 100);
      
      // Smooth the stroke points
      const smoothedPoints = smoothStroke(points);
      
      if (smoothedPoints.length === 1) {
        const point = smoothedPoints[0];
        const pointPressure = point.pressure || pressure;
        const jitterX = jitter > 0 ? (Math.random() - 0.5) * jitter * 0.1 : 0;
        const jitterY = jitter > 0 ? (Math.random() - 0.5) * jitter * 0.1 : 0;
        
        if (wetness > 0) {
          ctx.filter = `blur(${(wetness / 20) * pointPressure}px)`;
        }
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${finalOpacity * pointPressure})`;
        ctx.beginPath();
        ctx.arc(
          ((point.x + jitterX) / 100) * canvas.width, 
          ((point.y + jitterY) / 100) * canvas.height, 
          (size * pointPressure) / 2, 
          0, 
          Math.PI * 2
        );
        ctx.fill();
        ctx.filter = 'none';
      } else {
        // Apply spacing - create stamps at intervals
        const stamps = [];
        let distance = 0;
        const spacingPixels = (size * spacing) / 100;
        
        stamps.push(smoothedPoints[0]);
        
        for (let i = 1; i < smoothedPoints.length; i++) {
          const curr = smoothedPoints[i];
          const prev = smoothedPoints[i - 1];
          
          const dx = ((curr.x - prev.x) / 100) * canvas.width;
          const dy = ((curr.y - prev.y) / 100) * canvas.height;
          const segmentDist = Math.sqrt(dx * dx + dy * dy);
          
          distance += segmentDist;
          
          if (distance >= spacingPixels) {
            stamps.push(curr);
            distance = 0;
          }
        }
        
        // Draw stamps with jitter
        stamps.forEach(point => {
          const pointPressure = point.pressure || pressure;
          const jitterX = jitter > 0 ? (Math.random() - 0.5) * jitter * 0.5 : 0;
          const jitterY = jitter > 0 ? (Math.random() - 0.5) * jitter * 0.5 : 0;
          
          if (wetness > 0) {
            ctx.filter = `blur(${(wetness / 20) * pointPressure}px)`;
          }
          
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${finalOpacity * pointPressure})`;
          ctx.beginPath();
          ctx.arc(
            ((point.x + jitterX) / 100) * canvas.width, 
            ((point.y + jitterY) / 100) * canvas.height, 
            (size * pointPressure) / 2, 
            0, 
            Math.PI * 2
          );
          ctx.fill();
          ctx.filter = 'none';
        });
      }
    });
    
    ctx.globalAlpha = 1;
  }, [paintStrokes, brushSize, brushColor, brushPreset, imageRef, layerOpacity, blendMode]);

  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(drawStrokes);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawStrokes]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none rounded-lg md:rounded-2xl w-full h-full"
      style={{ filter: 'none' }}
    />
  );
}

// Smooth stroke using simple moving average
function smoothStroke(points, windowSize = 3) {
  if (points.length < windowSize) return points;
  
  const smoothed = [];
  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(points.length, i + Math.ceil(windowSize / 2));
    const window = points.slice(start, end);
    
    const avgX = window.reduce((sum, p) => sum + p.x, 0) / window.length;
    const avgY = window.reduce((sum, p) => sum + p.y, 0) / window.length;
    const avgPressure = window.reduce((sum, p) => sum + (p.pressure || 1), 0) / window.length;
    
    smoothed.push({ x: avgX, y: avgY, pressure: avgPressure });
  }
  
  return smoothed;
}