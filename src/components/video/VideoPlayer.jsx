import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

const VideoPlayer = forwardRef(({ 
  tracks, 
  currentTime, 
  isPlaying, 
  onTimeUpdate, 
  onDurationChange,
  videoEffects,
  zoom 
}, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [videoElements, setVideoElements] = useState({});
  const [loadedClips, setLoadedClips] = useState(new Set());
  const requestRef = useRef();
  const startTimeRef = useRef();
  
  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    exportVideo: handleExportVideo
  }));

  // Manage video elements for each clip
  useEffect(() => {
    const videoTrack = tracks.find(t => t.type === 'video');
    if (!videoTrack) return;

    const newVideoElements = { ...videoElements };
    let hasChanges = false;

    // Create new video elements for new clips
    videoTrack.clips.forEach(clip => {
      if (!newVideoElements[clip.id]) {
        const video = document.createElement('video');
        video.src = clip.url;
        video.crossOrigin = "anonymous";
        video.preload = "auto";
        video.muted = true; // We handle audio separately or rely on tracks
        
        video.onloadedmetadata = () => {
          setLoadedClips(prev => new Set([...prev, clip.id]));
        };
        
        newVideoElements[clip.id] = video;
        hasChanges = true;
      }
    });

    // Cleanup removed clips
    Object.keys(newVideoElements).forEach(clipId => {
      if (!videoTrack.clips.find(c => c.id.toString() === clipId.toString())) {
        delete newVideoElements[clipId];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setVideoElements(newVideoElements);
    }
  }, [tracks]);

  // Main Render Loop
  const renderFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const videoTrack = tracks.find(t => t.type === 'video');
    const textTrack = tracks.find(t => t.type === 'text');

    // 1. Render Video Layer
    if (videoTrack) {
      // Find active clips
      const activeClips = videoTrack.clips.filter(clip => 
        currentTime >= clip.start && currentTime < clip.start + clip.duration
      );

      // Apply Effects
      const filters = [];
      if (videoEffects.brightness !== 100) filters.push(`brightness(${videoEffects.brightness}%)`);
      if (videoEffects.contrast !== 100) filters.push(`contrast(${videoEffects.contrast}%)`);
      if (videoEffects.saturation !== 100) filters.push(`saturate(${videoEffects.saturation}%)`);
      if (videoEffects.blur > 0) filters.push(`blur(${videoEffects.blur}px)`);
      if (videoEffects.sepia > 0) filters.push(`sepia(${videoEffects.sepia}%)`);
      ctx.filter = filters.join(' ') || 'none';

      activeClips.forEach(clip => {
        const video = videoElements[clip.id];
        if (video && video.readyState >= 2) {
          // Sync video time
          const clipTime = currentTime - clip.start;
          // Only seek if significantly off (to prevent jitter during playback)
          if (Math.abs(video.currentTime - clipTime) > 0.3) {
             video.currentTime = clipTime;
          }

          // Handle Transitions (Simple Cross Dissolve for now)
          let opacity = 1;
          if (clip.transition) {
            const transitionDuration = 1; // 1 second transition
            const timeInClip = currentTime - clip.start;
            const timeLeft = (clip.start + clip.duration) - currentTime;
            
            if (timeInClip < transitionDuration) {
               // Fade in
               opacity = timeInClip / transitionDuration;
            } else if (timeLeft < transitionDuration) {
               // Fade out
               opacity = timeLeft / transitionDuration;
            }
          }
          
          ctx.globalAlpha = opacity;
          
          // Draw image centered and contained
          const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
          const x = (canvas.width / 2) - (video.videoWidth / 2) * scale;
          const y = (canvas.height / 2) - (video.videoHeight / 2) * scale;
          
          ctx.drawImage(video, x, y, video.videoWidth * scale, video.videoHeight * scale);
          ctx.globalAlpha = 1;
        }
      });
      ctx.filter = 'none';
    }

    // 2. Render Text Layer
    if (textTrack) {
      textTrack.clips.forEach(clip => {
        if (currentTime >= clip.start && currentTime < clip.start + clip.duration) {
            ctx.font = `${clip.style.fontWeight} ${clip.style.fontSize}px Arial`;
            ctx.fillStyle = clip.style.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let x = canvas.width / 2;
            let y = canvas.height / 2;
            
            if (clip.style.position === 'top') y = 100;
            if (clip.style.position === 'bottom') y = canvas.height - 100;
            
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 10;
            ctx.fillText(clip.text, x, y);
            ctx.shadowBlur = 0;
        }
      });
    }
  };

  // Animation Loop
  useEffect(() => {
    let lastTime = performance.now();
    
    const animate = (time) => {
      if (isPlaying) {
        const deltaTime = (time - lastTime) / 1000;
        // Update time in parent
        onTimeUpdate(prev => prev + deltaTime);
        
        // Sync videos
        const videoTrack = tracks.find(t => t.type === 'video');
        if (videoTrack) {
            videoTrack.clips.forEach(clip => {
                const video = videoElements[clip.id];
                if (video) {
                     // Check if this clip SHOULD be playing
                     if (currentTime >= clip.start && currentTime < clip.start + clip.duration) {
                         if (video.paused) video.play().catch(() => {});
                     } else {
                         if (!video.paused) video.pause();
                     }
                }
            });
        }
      } else {
         // Pause all videos if global playback is stopped
         Object.values(videoElements).forEach(v => {
             if (!v.paused) v.pause();
         });
      }
      
      renderFrame();
      lastTime = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, currentTime, tracks, videoEffects, videoElements]);


  // Handle Export
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Setup MediaRecorder
    const stream = canvas.captureStream(30); // 30 FPS
    
    // Add audio tracks if available
    // (For V1 we focus on visual render, audio would need WebAudioContext mixing)
    
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks = [];
    
    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    
    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };

      // 2. Start Recording
      recorder.start();
      
      // 3. Play through timeline specifically for rendering
      // We need to detach the main loop or handle this separately.
      // For simplicity in V1, we'll do a "Realtime Render" where we just play.
      // But user interaction should be blocked.
      
      // Let's assume the parent handles the "Playing" state for export
      // This function just sets up the recorder.
    });
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden rounded-lg shadow-2xl">
      <canvas 
        ref={canvasRef}
        width={1920}
        height={1080}
        className="w-full h-full object-contain"
      />
      {/* Hidden container for video elements */}
      <div className="hidden">
        {/* Videos are managed in memory/DOM by the effect, but we could render them here if needed for React compat */}
      </div>
    </div>
  );
});

export default VideoPlayer;