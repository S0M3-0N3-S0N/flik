import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

const VideoPlayer = forwardRef(({ 
  tracks, 
  currentTime, 
  isPlaying, 
  onTimeUpdate, 
  onDurationChange,
  videoEffects,
  zoom,
  volume = 100,
  aspectRatio = "16:9"
}, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [videoElements, setVideoElements] = useState({});
  const [loadedClips, setLoadedClips] = useState(new Set());
  const requestRef = useRef();
  const startTimeRef = useRef();
  
  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    startRecording: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // 1. Get Video Stream
      const videoStream = canvas.captureStream(30);
      
      // 2. Get Audio Stream
      const audioStream = audioDestRef.current ? audioDestRef.current.stream : null;
      
      // 3. Combine Tracks
      const combinedTracks = [
          ...videoStream.getVideoTracks(),
          ...(audioStream ? audioStream.getAudioTracks() : [])
      ];
      const combinedStream = new MediaStream(combinedTracks);

      const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
      const recorder = new MediaRecorder(combinedStream, { mimeType });
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      
      recorder.start();
      
      containerRef.current.recorder = recorder;
      containerRef.current.chunks = chunks;
      
      // Resume audio context if suspended
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
      }
    },
    stopRecording: async () => {
       const recorder = containerRef.current?.recorder;
       const chunks = containerRef.current?.chunks;
       if (!recorder) return null;
       
       return new Promise(resolve => {
          recorder.onstop = () => {
             const blob = new Blob(chunks, { type: 'video/webm' });
             resolve(blob);
          };
          recorder.stop();
       });
    }
  }));

  const audioCtxRef = useRef(null);
  const audioDestRef = useRef(null);
  const sourceNodesRef = useRef({});

  // Initialize Audio Context
  useEffect(() => {
    if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContext();
        audioDestRef.current = audioCtxRef.current.createMediaStreamDestination();
    }
  }, []);

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
        
        // Critical for audio capture: muted must be false for the element, 
        // but we don't want to hear it twice (element + context). 
        // We mute the element but capture the stream? 
        // No, createMediaElementSource requires the element to play audio. 
        // We typically connect source -> destination (speakers) AND source -> streamDest (recorder).
        // If we want to control volume, we use gain nodes.
        
        video.volume = (clip.volume || 100) / 100;

        video.onloadedmetadata = () => {
          setLoadedClips(prev => new Set([...prev, clip.id]));
        };

        // Audio Graph Setup
        if (audioCtxRef.current && !sourceNodesRef.current[clip.id]) {
             try {
                const source = audioCtxRef.current.createMediaElementSource(video);
                const gainNode = audioCtxRef.current.createGain();
                
                source.connect(gainNode);
                gainNode.connect(audioCtxRef.current.destination); // For playback hearing
                gainNode.connect(audioDestRef.current); // For recording
                
                sourceNodesRef.current[clip.id] = { source, gainNode };
             } catch (e) {
                console.warn("Audio setup failed for clip", clip.id, e);
             }
        }
        
        newVideoElements[clip.id] = video;
        hasChanges = true;
      } else {
         // Update volume if changed
         const nodes = sourceNodesRef.current[clip.id];
         if (nodes && nodes.gainNode) {
             nodes.gainNode.gain.value = (clip.volume ?? 100) / 100;
         }
      }
    });

    // Cleanup removed clips
    Object.keys(newVideoElements).forEach(clipId => {
      if (!videoTrack.clips.find(c => c.id.toString() === clipId.toString())) {
        // Cleanup audio nodes? They are bound to the element, enabling garbage collection usually works if element is gone.
        // We should disconnect if possible.
        if (sourceNodesRef.current[clipId]) {
            // sourceNodesRef.current[clipId].gainNode.disconnect();
            // sourceNodesRef.current[clipId].source.disconnect();
            delete sourceNodesRef.current[clipId];
        }
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

    // Generic Render Loop based on Track Order
    tracks.forEach(track => {
       if (track.muted) return;

       // Filter active clips
       const activeClips = track.clips.filter(clip => 
          currentTime >= clip.start && currentTime < clip.start + clip.duration
       );

       if (track.type === 'video') {
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
                // Sync
                const clipTime = (currentTime - clip.start) + (clip.offset || 0);
                if (Math.abs(video.currentTime - clipTime) > 0.3) video.currentTime = clipTime;

                // Draw Helper
                const drawClip = (alpha = 1, transform = {}) => {
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    
                    const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
                    let x = (canvas.width / 2) - (video.videoWidth / 2) * scale;
                    let y = (canvas.height / 2) - (video.videoHeight / 2) * scale;

                    if (transform.translateX) x += transform.translateX;
                    
                    if (transform.clipRect) {
                       const { cx, cy, cw, ch } = transform.clipRect;
                       ctx.beginPath();
                       ctx.rect(cx, cy, cw, ch);
                       ctx.clip();
                    }

                    ctx.drawImage(video, x, y, video.videoWidth * scale, video.videoHeight * scale);
                    ctx.restore();
                };

                // Transition Logic
                const transitionDuration = clip.transitionDuration || 1;
                const timeInClip = currentTime - clip.start;
                const progress = Math.min(1, Math.max(0, timeInClip / transitionDuration));

                if (clip.transition && clip.transition !== 'none' && timeInClip < transitionDuration) {
                    if (clip.transition === 'fade') drawClip(progress);
                    else if (clip.transition === 'wipe') drawClip(1, { clipRect: { cx: 0, cy: 0, cw: canvas.width * progress, ch: canvas.height } });
                    else if (clip.transition === 'slide') drawClip(1, { translateX: canvas.width * (1 - progress) });
                    else drawClip(1);
                } else {
                    drawClip(1);
                }
              }
           });
           ctx.filter = 'none';
       } else if (track.type === 'text') {
           activeClips.forEach(clip => {
                ctx.save();
                
                // Transition Logic for Text
                const transitionDuration = clip.transitionDuration || 1;
                const timeInClip = currentTime - clip.start;
                const progress = Math.min(1, Math.max(0, timeInClip / transitionDuration));
                
                if (clip.transition && clip.transition !== 'none' && timeInClip < transitionDuration) {
                    if (clip.transition === 'fade') ctx.globalAlpha = progress;
                    else if (clip.transition === 'slide') ctx.translate(canvas.width * (1 - progress), 0);
                }

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
                ctx.restore();
           });
       }
    });
  };

  // Animation Loop
  useEffect(() => {
    let lastTime = performance.now();
    
    const animate = (time) => {
      // Sync volume for all videos
      Object.values(videoElements).forEach(v => {
          v.volume = volume / 100;
      });

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




  // Determine dims
  const [width, height] = aspectRatio.split(':').map(Number);
  const baseHeight = 1080;
  const baseWidth = (baseHeight * width) / height;

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden rounded-lg shadow-2xl">
      <canvas 
        ref={canvasRef}
        width={baseWidth}
        height={baseHeight}
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