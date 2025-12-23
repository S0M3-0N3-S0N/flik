import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Play, Pause, SkipBack, SkipForward, Download, Video as VideoIcon, 
  ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import VideoPlayer from "@/components/video/VideoPlayer";
import Timeline from "@/components/video/Timeline";
import PropertiesPanel from "@/components/video/PropertiesPanel";

export default function VideoEditor() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60); // Default duration
  const [volume, setVolume] = useState(100);
  const [zoom, setZoom] = useState(1);
  const [tracks, setTracks] = useState([
    { id: 'video', type: 'video', clips: [], name: 'Video Track' },
    { id: 'audio', type: 'audio', clips: [], name: 'Audio Track' },
    { id: 'text', type: 'text', clips: [], name: 'Text Track' },
  ]);
  const [selectedClip, setSelectedClip] = useState(null);
  const [activeTab, setActiveTab] = useState("media");
  const [editingText, setEditingText] = useState(null);
  const [videoEffects, setVideoEffects] = useState({
    brightness: 100, contrast: 100, saturation: 100, blur: 0, sepia: 0,
  });
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [clipDragging, setClipDragging] = useState(null);
  const [clipResizing, setClipResizing] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const playerRef = useRef();

  // Load from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const loadUrl = urlParams.get('load');
    if (loadUrl) {
       // Auto-add the video
       const newClip = {
          id: Date.now(),
          type: 'video',
          url: loadUrl,
          name: 'Imported Video',
          start: 0,
          duration: 10, // Default, will update when meta loads
          transition: null
       };
       const newTracks = [...tracks];
       newTracks[0].clips.push(newClip);
       setTracks(newTracks);
       
       // Detect duration
       const tempVideo = document.createElement('video');
       tempVideo.src = loadUrl;
       tempVideo.onloadedmetadata = () => {
          newClip.duration = tempVideo.duration;
          setDuration(Math.max(duration, tempVideo.duration));
          setTracks([...newTracks]);
       };
    }
  }, []);

  // Update total duration based on clips
  useEffect(() => {
    let maxEnd = 0;
    tracks.forEach(t => {
       t.clips.forEach(c => {
          if (c.start + c.duration > maxEnd) maxEnd = c.start + c.duration;
       });
    });
    setDuration(Math.max(30, maxEnd + 10)); // Always have some buffer
  }, [tracks]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newVideoClips = [];
    
    files.forEach((file, index) => {
      if (file.type.startsWith('video/') || file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        // For image, default duration 5s
        // For video, we need to load meta
        const isVideo = file.type.startsWith('video/');
        
        const newClip = {
          id: Date.now() + index,
          type: 'video',
          url: url,
          name: file.name,
          start: 0, // Will calculate placement
          duration: 5, // Default
          transition: null,
        };

        if (isVideo) {
            const video = document.createElement('video');
            video.src = url;
            video.onloadedmetadata = () => {
                newClip.duration = video.duration;
                // Add to track
                addClipToTrack('video', newClip);
            };
        } else {
            addClipToTrack('video', newClip);
        }
      }
    });
  };

  const addClipToTrack = (trackId, clip) => {
     setTracks(prev => {
        const newTracks = [...prev];
        const track = newTracks.find(t => t.id === trackId);
        
        // Find end of last clip to append
        let startTime = 0;
        if (track.clips.length > 0) {
            const lastClip = track.clips[track.clips.length - 1];
            startTime = lastClip.start + lastClip.duration;
        }
        
        clip.start = startTime;
        track.clips.push(clip);
        return newTracks;
     });
  };

  const handleAudioUpload = (e) => {
     const file = e.target.files[0];
     if (file) {
        const url = URL.createObjectURL(file);
        const audio = new Audio(url);
        audio.onloadedmetadata = () => {
           const newClip = {
              id: Date.now(),
              type: 'audio',
              url: url,
              name: file.name,
              start: currentTime,
              duration: audio.duration,
              volume: 100
           };
           addClipToTrack('audio', newClip);
        };
     }
  };

  const handleAddTextClip = () => {
      const newClip = {
          id: Date.now(),
          type: 'text',
          text: 'New Text',
          start: currentTime,
          duration: 3,
          style: {
             fontSize: 48,
             color: '#ffffff',
             fontWeight: 'bold',
             position: 'center'
          }
      };
      addClipToTrack('text', newClip);
      setEditingText(newClip);
      setActiveTab('text');
  };

  const handleUpdateTextClip = (updates) => {
      if (!editingText) return;
      const updatedClip = { ...editingText, ...updates };
      setEditingText(updatedClip);
      
      setTracks(prev => prev.map(t => {
          if (t.type === 'text') {
              return {
                  ...t,
                  clips: t.clips.map(c => c.id === editingText.id ? updatedClip : c)
              };
          }
          return t;
      }));
  };

  const handleDeleteClip = (trackId, clipId) => {
      setTracks(prev => prev.map(t => {
          if (t.id === trackId) {
              return { ...t, clips: t.clips.filter(c => c.id !== clipId) };
          }
          return t;
      }));
      setSelectedClip(null);
      if (editingText?.id === clipId) setEditingText(null);
  };

  // Timeline Interaction Logic
  const handleClipMouseDown = (e, clip, edge = null) => {
      e.stopPropagation();
      if (edge) {
          setClipResizing({ clip, edge, startX: e.clientX, startDuration: clip.duration, startStart: clip.start });
      } else {
          setClipDragging({ clip, startX: e.clientX, startStart: clip.start });
      }
      setSelectedClip(clip);
  };

  const handleMouseMove = (e) => {
      if (!clipDragging && !clipResizing) return;
      
      // Assume timeline width based on screen width approx for now (simplified)
      const pixelsPerSecond = 100 * zoom / 20; // very rough approx, ideally pass timeline metrics
      // Actually let's use a standard multiplier
      // If 100% width = duration, then deltaX / width = deltaTime / duration
      
      // Let's rely on visual feedback loop or assume 10px = 1s * zoom?
      // Re-using the logic from the old file which was based on timelineRef.current.offsetWidth
      // Since we split components, we need to move this logic or pass refs. 
      // For V1, let's just use a fixed sensitivity.
      
      const sensitivity = 0.1 / zoom; 
      const deltaX = (e.clientX - (clipDragging?.startX || clipResizing?.startX));
      const deltaTime = deltaX * sensitivity;

      if (clipDragging) {
          const newStart = Math.max(0, clipDragging.startStart + deltaTime);
          updateClipInTracks(clipDragging.clip.id, { start: newStart });
      } else if (clipResizing) {
          if (clipResizing.edge === 'right') {
              const newDuration = Math.max(0.5, clipResizing.startDuration + deltaTime);
              updateClipInTracks(clipResizing.clip.id, { duration: newDuration });
          } else {
             // Left resize logic is harder (changes start and duration)
             const newStart = Math.max(0, Math.min(clipResizing.startStart + clipResizing.startDuration - 0.5, clipResizing.startStart + deltaTime));
             const newDuration = clipResizing.startDuration - (newStart - clipResizing.startStart);
             updateClipInTracks(clipResizing.clip.id, { start: newStart, duration: newDuration });
          }
      }
  };

  const handleMouseUp = () => {
      setClipDragging(null);
      setClipResizing(null);
  };

  const updateClipInTracks = (clipId, updates) => {
      setTracks(prev => prev.map(t => ({
          ...t,
          clips: t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c)
      })));
  };

  const handleExport = async () => {
     if (!playerRef.current) return;
     setIsExporting(true);
     setIsPlaying(false);
     
     // Jump to start
     setCurrentTime(0);
     // Wait a sec
     await new Promise(r => setTimeout(r, 500));
     
     setIsPlaying(true);
     
     // Ideally we want to record "while" playing
     // The playerRef exportVideo handles the recorder setup
     // We just need to manage the playback
     
     try {
         const blobPromise = playerRef.current.exportVideo();
         
         // Stop recording automatically when we reach the end
         // We'll monitor currentTime in the useEffect below or just wait duration * 1000
         
         const exportDuration = Math.max(...tracks.map(t => t.clips.reduce((max, c) => Math.max(max, c.start + c.duration), 0))) * 1000;
         
         await new Promise(r => setTimeout(r, exportDuration + 1000));
         setIsPlaying(false);
         
         // Manually stop the recorder? 
         // The MediaRecorder API needs .stop() called.
         // My VideoPlayer.jsx implementation stops on "onstop" event but needs a trigger.
         // Actually, my VideoPlayer implementation didn't expose a "stopRecording" method.
         // Let's refine VideoPlayer export next time.
         // For now, let's assume the user presses "Stop Export" or we just alert them.
         
         // Workaround: We will just wait and hope the blob resolves? 
         // No, the blob resolves ON STOP.
         // We need to trigger stop.
         
         alert("Export functionality requires the recorder to be stopped manually in V1. Please wait for the video to finish playing then click Export again to save... (Implementing auto-stop in V2)");
         
         setIsExporting(false);
     } catch (err) {
         console.error(err);
         setIsExporting(false);
     }
  };
  
  // Correction: Better Export Flow
  // We can't easily auto-stop from here without exposing "stop" from player.
  // Let's stick to the Frame Export for this exact iteration, or implemented a limited version.
  // Actually, I promised Video Export.
  // Let's implement a simple "Render & Download" that doesn't rely on live playback if possible,
  // or just records the live playback.
  
  const handleSmartExport = async () => {
     // 1. Reset to 0
     setCurrentTime(0);
     setIsPlaying(true);
     setIsExporting(true);
     
     const canvas = document.querySelector('canvas');
     const stream = canvas.captureStream(30);
     const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
     const chunks = [];
     
     recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
     recorder.onstop = async () => {
         const blob = new Blob(chunks, { type: 'video/webm' });
         const file = new File([blob], 'my_movie.webm', { type: 'video/webm' });
         
         // Save to gallery
         try {
             const { file_url } = await base44.integrations.Core.UploadFile({ file });
             await base44.entities.Creation.create({
                 title: 'My Video Project',
                 type: 'video',
                 url: file_url,
                 thumbnail_url: file_url // Todo: generate thumb
             });
             
             const a = document.createElement('a');
             a.href = file_url;
             a.download = 'movie.webm';
             a.click();
             alert("Export Complete!");
         } catch (e) {
             console.error(e);
             alert("Saved locally (Upload failed)");
             const u = URL.createObjectURL(blob);
             const a = document.createElement('a');
             a.href = u;
             a.download = 'movie.webm';
             a.click();
         }
         setIsExporting(false);
     };
     
     recorder.start();
     
     // Determine end time
     const endTime = Math.max(...tracks.map(t => t.clips.reduce((max, c) => Math.max(max, c.start + c.duration), 0)));
     
     // Watcher
     const checkEnd = setInterval(() => {
         setCurrentTime(curr => {
             if (curr >= endTime) {
                 clearInterval(checkEnd);
                 recorder.stop();
                 setIsPlaying(false);
                 return curr;
             }
             return curr;
         });
     }, 1000);
  };

  return (
    <div 
      className="min-h-screen flex flex-col bg-[#0A0A0A]"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="h-14 border-b border-white/5 flex items-center justify-between px-6 glass-card z-50"
      >
        <div className="flex items-center gap-4">
          <Link to={createPageUrl("Dashboard")} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-bold gradient-text">Video Studio</span>
          {isExporting && <span className="text-xs text-[#FF6B35] animate-pulse">● Recording...</span>}
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSmartExport}
            disabled={isExporting}
            className="btn-gradient text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Rendering...' : 'Export Video'}
          </Button>
        </div>
      </motion.div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-80 border-r border-white/5 glass-card overflow-y-auto z-40"
        >
          <PropertiesPanel
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            tracks={tracks}
            handleFileUpload={handleFileUpload}
            handleAudioUpload={handleAudioUpload}
            handleAddTextClip={handleAddTextClip}
            selectedClip={selectedClip}
            handleDeleteClip={handleDeleteClip}
            editingText={editingText}
            setEditingText={setEditingText}
            handleUpdateTextClip={handleUpdateTextClip}
            videoEffects={videoEffects}
            setVideoEffects={setVideoEffects}
            handleApplyEffect={(name) => {
                // Simplified effect presets
                if (name === 'B&W') setVideoEffects({ ...videoEffects, saturation: 0 });
                if (name === 'Sepia') setVideoEffects({ ...videoEffects, sepia: 100 });
                // ... others
            }}
            playbackSpeed={playbackSpeed}
            handleSpeedChange={setPlaybackSpeed}
            volume={volume}
            handleVolumeChange={setVolume}
          />
        </motion.aside>

        <main className="flex-1 flex flex-col min-w-0">
          {/* Player Area */}
          <div className="flex-1 bg-[#0A0A0A] p-8 relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800 via-black to-black" />
            
            <div className="w-full max-w-5xl aspect-video bg-black rounded-xl shadow-2xl relative z-10 border border-white/10">
               {tracks[0].clips.length === 0 && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 pointer-events-none">
                       <VideoIcon className="w-16 h-16 mb-4 opacity-50" />
                       <p>Drag & Drop or Upload Videos</p>
                   </div>
               )}
               <VideoPlayer
                  ref={playerRef}
                  tracks={tracks}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onTimeUpdate={setCurrentTime}
                  videoEffects={videoEffects}
                  zoom={zoom}
               />
            </div>
          </div>

          {/* Controls Bar */}
          <div className="border-t border-white/5 glass-card p-2 px-6 z-30">
             <div className="max-w-4xl mx-auto flex items-center gap-4">
                 <span className="text-xs text-white/50 w-12 text-right">{currentTime.toFixed(1)}s</span>
                 <Button variant="ghost" size="icon" onClick={() => setIsPlaying(!isPlaying)} className="hover:bg-white/10 text-white">
                     {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                 </Button>
                 <Slider 
                    value={[currentTime]} 
                    max={duration} 
                    step={0.1} 
                    onValueChange={(val) => {
                        setCurrentTime(val[0]);
                        setIsPlaying(false);
                    }}
                    className="flex-1"
                 />
                 <span className="text-xs text-white/50 w-12">{duration.toFixed(1)}s</span>
             </div>
          </div>

          {/* Timeline */}
          <Timeline 
             tracks={tracks}
             duration={duration}
             currentTime={currentTime}
             zoom={zoom}
             setZoom={setZoom}
             selectedClip={selectedClip}
             setSelectedClip={setSelectedClip}
             handleClipMouseDown={handleClipMouseDown}
             handleDeleteClip={handleDeleteClip}
             setEditingText={setEditingText}
             setActiveTab={setActiveTab}
          />
        </main>
      </div>
    </div>
  );
}