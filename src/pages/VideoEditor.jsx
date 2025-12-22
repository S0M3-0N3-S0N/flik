import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

// Sub-components
import EditorSidebar from "../components/video/EditorSidebar";
import ResourcePanel from "../components/video/ResourcePanel";
import VideoPlayer from "../components/video/VideoPlayer";
import VideoTimeline from "../components/video/VideoTimeline";

export default function VideoEditor() {
  // --- State Management (Lifted from original file) ---
  const [videoFile, setVideoFile] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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
  const [removeStrokes, setRemoveStrokes] = useState([]);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [undoHistory, setUndoHistory] = useState([]);

  // Refs
  const videoRef = useRef(null);
  const timelineRef = useRef(null);
  const audioRefs = useRef({});
  const canvasRef = useRef(null);

  // --- Effects (Lifted & Adapted) ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const loadUrl = urlParams.get('load');
    if (loadUrl) {
      setVideoFile({ url: loadUrl, name: 'loaded_project.mp4' });
    }
  }, []);

  useEffect(() => {
    if (videoFile && videoRef.current) {
      const video = videoRef.current;
      video.onloadedmetadata = () => {
        const dur = video.duration || 10;
        setDuration(dur);
        const newClip = {
          id: Date.now(),
          type: 'video',
          url: videoFile.url,
          name: videoFile.name,
          start: 0,
          duration: dur,
        };
        const newTracks = [...tracks];
        newTracks[0].clips = [newClip];
        setTracks(newTracks);
      };
    }
  }, [videoFile]);

  // Audio Sync Logic
  useEffect(() => {
    const audioTrack = tracks.find(t => t.type === 'audio');
    if (!audioTrack) return;
    audioTrack.clips.forEach(clip => {
      const audio = audioRefs.current[clip.id];
      if (!audio) return;
      if (currentTime >= clip.start && currentTime < clip.start + clip.duration) {
        if (audio.paused && isPlaying) {
          audio.currentTime = currentTime - clip.start;
          audio.volume = (clip.volume || 100) / 100 * (volume / 100);
          audio.playbackRate = playbackSpeed;
          audio.play().catch(() => {});
        }
      } else {
        if (!audio.paused) audio.pause();
      }
    });
  }, [currentTime, isPlaying, tracks, volume, playbackSpeed]);

  // --- Handlers (Lifted) ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        if (!videoFile) {
            setVideoFile({ url, file, name: file.name });
        } else {
            // Add as new clip logic
            const video = document.createElement('video');
            video.src = url;
            video.onloadedmetadata = () => {
                 const newClip = {
                    id: Date.now(),
                    type: 'video',
                    url: url,
                    name: file.name,
                    start: duration, // Append to end
                    duration: video.duration,
                    transition: null,
                 };
                 const newTracks = [...tracks];
                 newTracks[0].clips.push(newClip);
                 setTracks(newTracks);
                 setDuration(duration + video.duration);
            };
        }
    }
  };

  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('audio/')) {
        const url = URL.createObjectURL(file);
        const audio = new Audio(url);
        audio.addEventListener('loadedmetadata', () => {
            const newClip = {
                id: Date.now(),
                type: 'audio',
                url,
                name: file.name,
                start: currentTime,
                duration: audio.duration,
                volume: 100,
            };
            audioRefs.current[newClip.id] = audio;
            const newTracks = [...tracks];
            newTracks.find(t => t.type === 'audio').clips.push(newClip);
            setTracks(newTracks);
        });
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        Object.values(audioRefs.current).forEach(a => a.pause());
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
        if (videoRef.current.currentTime >= videoRef.current.duration - 0.1) {
            setIsPlaying(false);
            videoRef.current.currentTime = 0;
            setCurrentTime(0);
        }
    }
  };

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
    // Re-implemented simplified drag logic
    if (clipDragging) {
      const deltaX = e.clientX - clipDragging.startX;
      const timelineWidth = timelineRef.current?.offsetWidth || 1000;
      const deltaTime = (deltaX / timelineWidth) * (duration || 60);
      const newStart = Math.max(0, clipDragging.startStart + deltaTime);

      setTracks(tracks.map(t => ({
          ...t,
          clips: t.clips.map(c => c.id === clipDragging.clip.id ? { ...c, start: newStart } : c)
      })));
    } else if (clipResizing) {
       // Similar resize logic...
       const deltaX = e.clientX - clipResizing.startX;
       const timelineWidth = timelineRef.current?.offsetWidth || 1000;
       const deltaTime = (deltaX / timelineWidth) * (duration || 60);
       
       setTracks(tracks.map(t => ({
           ...t,
           clips: t.clips.map(c => {
               if (c.id === clipResizing.clip.id) {
                   if (clipResizing.edge === 'left') {
                       const newStart = Math.max(0, clipResizing.startStart + deltaTime);
                       const newDuration = clipResizing.startDuration - (newStart - clipResizing.startStart);
                       return { ...c, start: newStart, duration: Math.max(0.5, newDuration) };
                   } else {
                       const newDuration = Math.max(0.5, clipResizing.startDuration + deltaTime);
                       return { ...c, duration: newDuration };
                   }
               }
               return c;
           })
       })));
    }
  };

  const handleMouseUp = () => {
    setClipDragging(null);
    setClipResizing(null);
  };

  const handleAddText = () => {
      const newClip = {
          id: Date.now(), type: 'text', text: 'New Text', start: currentTime, duration: 3,
          style: { fontSize: 48, color: '#ffffff', fontWeight: 'bold', position: 'center' }
      };
      const newTracks = [...tracks];
      newTracks.find(t => t.type === 'text').clips.push(newClip);
      setTracks(newTracks);
      setEditingText(newClip);
  };

  const handleUpdateText = (updates) => {
      setTracks(tracks.map(t => t.type === 'text' ? {
          ...t,
          clips: t.clips.map(c => c.id === editingText.id ? { ...c, ...updates } : c)
      } : t));
      setEditingText({ ...editingText, ...updates });
  };

  const handleDeleteClip = (trackId, clipId) => {
      const updatedTracks = tracks.map(t => ({
          ...t,
          clips: t.clips.filter(c => c.id !== clipId)
      }));
      setTracks(updatedTracks);
      setSelectedClip(null);
      setEditingText(null);
  };

  // Video Filter Style Construction
  const getVideoFilterStyle = () => {
    const filters = [];
    if (videoEffects.brightness !== 100) filters.push(`brightness(${videoEffects.brightness}%)`);
    if (videoEffects.contrast !== 100) filters.push(`contrast(${videoEffects.contrast}%)`);
    if (videoEffects.saturation !== 100) filters.push(`saturate(${videoEffects.saturation}%)`);
    if (videoEffects.blur > 0) filters.push(`blur(${videoEffects.blur}px)`);
    if (videoEffects.sepia > 0) filters.push(`sepia(${videoEffects.sepia}%)`);
    return filters.join(' ');
  };
  
  const handleApplyEffect = (name) => {
      // Simplified effect mapping
      if (name === 'B&W') setVideoEffects({ ...videoEffects, saturation: 0 });
      // ... others
  };

  const handleExport = () => {
      // Keep existing export logic concept, maybe simplify for now
      alert("Export functionality would go here - combining canvas draw of video + overlays");
  };

  return (
    <div 
        className="h-screen w-screen flex flex-col bg-[#0A0A0A] overflow-hidden text-white font-sans select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
    >
      {/* Top Header */}
      <header className="h-14 border-b border-white/10 bg-[#141414] flex items-center justify-between px-4 shrink-0 z-50">
          <div className="flex items-center gap-4">
              <Link to={createPageUrl("Home")} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
                  <ChevronLeft className="w-5 h-5" />
              </Link>
              <h1 className="font-semibold text-sm tracking-wide">
                  {videoFile ? videoFile.name : "Untitled Project"}
              </h1>
          </div>
          <Button onClick={handleExport} className="bg-[#FF6B35] hover:bg-[#F72C25] text-white rounded-full px-6 h-8 text-xs font-bold shadow-lg shadow-orange-500/20">
              <Download className="w-3 h-3 mr-2" />
              Export Video
          </Button>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
          <EditorSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
          
          <ResourcePanel 
             activeTab={activeTab}
             videoFile={videoFile}
             tracks={tracks}
             onFileUpload={handleFileUpload}
             onAudioUpload={handleAudioUpload}
             onAddText={handleAddText}
             editingText={editingText}
             setEditingText={setEditingText}
             onUpdateText={handleUpdateText}
             onDeleteClip={handleDeleteClip}
             videoEffects={videoEffects}
             setVideoEffects={setVideoEffects}
             onApplyEffect={handleApplyEffect}
             selectedClip={selectedClip}
             isProcessing={isProcessing}
          />

          <div className="flex-1 flex flex-col min-w-0">
              <VideoPlayer 
                 videoRef={videoRef}
                 canvasRef={canvasRef}
                 videoFile={videoFile}
                 isPlaying={isPlaying}
                 onPlayPause={handlePlayPause}
                 currentTime={currentTime}
                 duration={duration}
                 onSkipBack={() => videoRef.current && (videoRef.current.currentTime -= 5)}
                 onSkipForward={() => videoRef.current && (videoRef.current.currentTime += 5)}
                 volume={volume}
                 onVolumeChange={(v) => { setVolume(v[0]); if(videoRef.current) videoRef.current.volume = v[0]/100; }}
                 videoFilterStyle={getVideoFilterStyle()}
                 tracks={tracks}
                 handleCanvasMouseDown={() => {}} // TODO: Connect paint logic
                 handleCanvasMouseMove={() => {}}
                 handleMouseUp={() => {}}
              />
              
              <VideoTimeline 
                 tracks={tracks}
                 currentTime={currentTime}
                 duration={duration}
                 zoom={zoom}
                 setZoom={setZoom}
                 selectedClip={selectedClip}
                 setSelectedClip={setSelectedClip}
                 onClipMouseDown={handleClipMouseDown}
                 onDeleteClip={handleDeleteClip}
                 onUndo={() => {}} // TODO: Connect undo
                 undoHistory={undoHistory}
                 timelineRef={timelineRef}
              />
          </div>
      </div>
    </div>
  );
}