import React, { useRef, useEffect } from 'react';

export default function VideoPlayer({ 
  videoFile, 
  isPlaying, 
  currentTime, 
  onTimeUpdate, 
  onEnded,
  effects,
  tracks,
  removeStrokes
}) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const requestRef = useRef();

  // Initialize video
  useEffect(() => {
    if (videoFile && videoRef.current) {
      videoRef.current.src = videoFile.url;
      videoRef.current.load();
    }
  }, [videoFile]);

  // Handle Play/Pause
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(e => console.error("Play failed:", e));
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Handle Seeking
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // The Render Loop - The Heart of the "Real" Editor
  const render = () => {
    if (!canvasRef.current || !videoRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    const video = videoRef.current;
    
    // Sync sizes
    if (canvasRef.current.width !== video.videoWidth) {
      canvasRef.current.width = video.videoWidth || 1920;
      canvasRef.current.height = video.videoHeight || 1080;
    }

    // 1. Clear Screen
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // 2. Apply Global Effects
    const filterString = [
      `brightness(${effects.brightness}%)`,
      `contrast(${effects.contrast}%)`,
      `saturate(${effects.saturation}%)`,
      `blur(${effects.blur}px)`,
      `sepia(${effects.sepia}%)`
    ].join(' ');
    ctx.filter = filterString;

    // 3. Draw Video Layer
    if (video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    
    // Reset filter for overlays
    ctx.filter = 'none';

    // 4. Draw Text Layers (Burned in!)
    const currentT = video.currentTime;
    const textTrack = tracks.find(t => t.type === 'text');
    
    if (textTrack) {
      textTrack.clips.forEach(clip => {
        if (currentT >= clip.start && currentT < clip.start + clip.duration) {
          ctx.font = `${clip.style.fontWeight} ${clip.style.fontSize * 2}px Arial`; // Scale up for canvas
          ctx.fillStyle = clip.style.color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Add shadow for visibility
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;

          let x = canvasRef.current.width / 2;
          let y = canvasRef.current.height / 2;

          if (clip.style.position === 'top') y = canvasRef.current.height * 0.15;
          if (clip.style.position === 'bottom') y = canvasRef.current.height * 0.85;

          ctx.fillText(clip.text, x, y);
          
          // Reset shadow
          ctx.shadowColor = 'transparent';
        }
      });
    }

    // 5. Draw Removal Strokes (for Magic Erase)
    if (removeStrokes.length > 0) {
      ctx.strokeStyle = 'rgba(255, 107, 53, 0.8)';
      ctx.lineWidth = 20;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      removeStrokes.forEach(stroke => {
        if (stroke.length < 2) return;
        ctx.beginPath();
        // Convert percentages back to pixels
        ctx.moveTo((stroke[0].x / 100) * canvasRef.current.width, (stroke[0].y / 100) * canvasRef.current.height);
        stroke.forEach(point => {
          ctx.lineTo((point.x / 100) * canvasRef.current.width, (point.y / 100) * canvasRef.current.height);
        });
        ctx.stroke();
      });
    }

    // Update parent time state roughly every frame
    if (isPlaying) {
       onTimeUpdate(video.currentTime);
    }

    requestRef.current = requestAnimationFrame(render);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current);
  });

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black/50 rounded-2xl overflow-hidden">
      {/* Hidden Video Source */}
      <video
        ref={videoRef}
        className="hidden"
        onEnded={onEnded}
        onLoadedMetadata={() => {
           // Trigger a re-render to size canvas correctly
           if(canvasRef.current && videoRef.current) {
               canvasRef.current.width = videoRef.current.videoWidth;
               canvasRef.current.height = videoRef.current.videoHeight;
           }
        }}
        playsInline
      />
      
      {/* The Main Stage */}
      <canvas 
        ref={canvasRef}
        className="max-w-full max-h-full object-contain shadow-2xl"
      />
    </div>
  );
}