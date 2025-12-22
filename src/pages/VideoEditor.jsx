import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Upload, Play, Pause, SkipBack, SkipForward, Scissors, 
  Download, Volume2, ZoomIn, ZoomOut, Plus, Trash2,
  Image, Music, Type, Sparkles, Wand2, Layers, Video, Edit2, X, Sliders, Zap
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function VideoEditor() {
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
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    sepia: 0,
  });
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [clipDragging, setClipDragging] = useState(null);
  const [clipResizing, setClipResizing] = useState(null);
  const [removeStrokes, setRemoveStrokes] = useState([]);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef(null);
  const timelineRef = useRef(null);
  const audioRefs = useRef({});
  const canvasRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.src = url;
      video.onloadedmetadata = () => {
        const newClip = {
          id: Date.now(),
          type: 'video',
          url: url,
          name: file.name,
          start: duration,
          duration: video.duration,
          transition: null,
        };
        
        const newTracks = [...tracks];
        const videoTrack = newTracks.find(t => t.type === 'video');
        if (videoTrack) {
          videoTrack.clips.push(newClip);
          setTracks(newTracks);
          setDuration(duration + video.duration);
        }
        
        if (!videoFile) {
          setVideoFile({ url, file, name: file.name });
        }
      };
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
          url: url,
          name: file.name,
          start: currentTime,
          duration: audio.duration,
          volume: 100,
        };
        
        audioRefs.current[newClip.id] = audio;
        
        const newTracks = [...tracks];
        const audioTrack = newTracks.find(t => t.type === 'audio');
        if (audioTrack) {
          audioTrack.clips.push(newClip);
          setTracks(newTracks);
        }
      });
    }
  };

  useEffect(() => {
    if (videoFile && videoRef.current) {
      const video = videoRef.current;
      video.onloadedmetadata = () => {
        setDuration(video.duration);
        
        const newClip = {
          id: Date.now(),
          type: 'video',
          url: videoFile.url,
          name: videoFile.name,
          start: 0,
          duration: video.duration,
        };
        
        const newTracks = [...tracks];
        newTracks[0].clips = [newClip];
        setTracks(newTracks);
      };
    }
  }, [videoFile]);

  useEffect(() => {
    const audioTrack = tracks.find(t => t.type === 'audio');
    if (!audioTrack) return;

    audioTrack.clips.forEach(clip => {
      const audio = audioRefs.current[clip.id];
      if (!audio) return;

      if (currentTime >= clip.start && currentTime < clip.start + clip.duration) {
        if (audio.paused && isPlaying) {
          audio.currentTime = currentTime - clip.start;
          audio.volume = (clip.volume / 100) * (volume / 100);
          audio.playbackRate = playbackSpeed;
          audio.play().catch(() => {});
        }
      } else {
        if (!audio.paused) {
          audio.pause();
        }
      }
    });
  }, [currentTime, isPlaying, tracks, volume, playbackSpeed]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        Object.values(audioRefs.current).forEach(audio => audio.pause());
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSeek = (value) => {
    const time = value[0];
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    Object.values(audioRefs.current).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  };

  const handleVolumeChange = (value) => {
    setVolume(value[0]);
    if (videoRef.current) {
      videoRef.current.volume = value[0] / 100;
    }
  };

  const handleSkipBack = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, currentTime - 5);
    }
  };

  const handleSkipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, currentTime + 5);
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleAddTextClip = () => {
    if (!videoFile) return;
    
    const newClip = {
      id: Date.now(),
      type: 'text',
      text: 'Your Text Here',
      start: currentTime,
      duration: 3,
      style: {
        fontSize: 48,
        color: '#ffffff',
        fontWeight: 'bold',
        position: 'center',
      }
    };
    
    const newTracks = [...tracks];
    const textTrack = newTracks.find(t => t.type === 'text');
    if (textTrack) {
      textTrack.clips.push(newClip);
      setTracks(newTracks);
      setEditingText(newClip);
    }
  };

  const handleUpdateTextClip = (updates) => {
    const newTracks = tracks.map(track => {
      if (track.type === 'text') {
        return {
          ...track,
          clips: track.clips.map(clip => 
            clip.id === editingText.id ? { ...clip, ...updates } : clip
          )
        };
      }
      return track;
    });
    setTracks(newTracks);
    setEditingText({ ...editingText, ...updates });
  };

  const handleDeleteClip = (trackId, clipId) => {
    if (audioRefs.current[clipId]) {
      audioRefs.current[clipId].pause();
      delete audioRefs.current[clipId];
    }
    
    const newTracks = tracks.map(track => {
      if (track.id === trackId) {
        return {
          ...track,
          clips: track.clips.filter(clip => clip.id !== clipId)
        };
      }
      return track;
    });
    setTracks(newTracks);
    setSelectedClip(null);
  };

  const handleSplitClip = () => {
    if (!selectedClip) return;
    
    const track = tracks.find(t => t.clips.some(c => c.id === selectedClip.id));
    if (!track) return;

    const clip = track.clips.find(c => c.id === selectedClip.id);
    const splitPoint = currentTime - clip.start;

    if (splitPoint <= 0.1 || splitPoint >= clip.duration - 0.1) return;

    const clip1 = { ...clip, id: Date.now(), duration: splitPoint };
    const clip2 = { ...clip, id: Date.now() + 1, start: clip.start + splitPoint, duration: clip.duration - splitPoint };

    const newTracks = tracks.map(t => {
      if (t.id === track.id) {
        return {
          ...t,
          clips: t.clips.flatMap(c => c.id === clip.id ? [clip1, clip2] : [c])
        };
      }
      return t;
    });

    setTracks(newTracks);
    setSelectedClip(null);
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
    if (clipDragging) {
      const deltaX = e.clientX - clipDragging.startX;
      const deltaTime = (deltaX / (timelineRef.current?.offsetWidth || 1000)) * duration;
      const newStart = Math.max(0, Math.min(duration - clipDragging.clip.duration, clipDragging.startStart + deltaTime));

      const track = tracks.find(t => t.clips.some(c => c.id === clipDragging.clip.id));
      if (track) {
        const newTracks = tracks.map(t => {
          if (t.id === track.id) {
            return {
              ...t,
              clips: t.clips.map(c => c.id === clipDragging.clip.id ? { ...c, start: newStart } : c)
            };
          }
          return t;
        });
        setTracks(newTracks);
        setClipDragging({ ...clipDragging, startX: e.clientX, startStart: newStart });
      }
    } else if (clipResizing) {
      const deltaX = e.clientX - clipResizing.startX;
      const deltaTime = (deltaX / (timelineRef.current?.offsetWidth || 1000)) * duration;

      const track = tracks.find(t => t.clips.some(c => c.id === clipResizing.clip.id));
      if (track) {
        const newTracks = tracks.map(t => {
          if (t.id === track.id) {
            return {
              ...t,
              clips: t.clips.map(c => {
                if (c.id === clipResizing.clip.id) {
                  if (clipResizing.edge === 'left') {
                    const newStart = Math.max(0, clipResizing.startStart + deltaTime);
                    const newDuration = clipResizing.startDuration - (newStart - clipResizing.startStart);
                    return { ...c, start: newStart, duration: Math.max(0.5, newDuration) };
                  } else {
                    const newDuration = Math.max(0.5, clipResizing.startDuration + deltaTime);
                    return { ...c, duration: Math.min(duration - c.start, newDuration) };
                  }
                }
                return c;
              })
            };
          }
          return t;
        });
        setTracks(newTracks);
      }
    }
  };

  const handleMouseUp = () => {
    setClipDragging(null);
    setClipResizing(null);
  };

  const handleCanvasMouseDown = (e) => {
    if (!isRemoving || !videoRef.current) return;
    const rect = videoRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setRemoveStrokes([...removeStrokes, [{ x, y }]]);
  };

  const handleCanvasMouseMove = (e) => {
    if (!isRemoving || removeStrokes.length === 0 || !videoRef.current) return;
    const rect = videoRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newStrokes = [...removeStrokes];
    newStrokes[newStrokes.length - 1].push({ x, y });
    setRemoveStrokes(newStrokes);
  };

  useEffect(() => {
    if (!canvasRef.current || !videoRef.current || activeTab !== 'remove') return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const rect = video.getBoundingClientRect();
    
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (removeStrokes.length === 0) return;
    
    ctx.strokeStyle = 'rgba(255, 107, 53, 0.8)';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    removeStrokes.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo((stroke[0].x / 100) * canvas.width, (stroke[0].y / 100) * canvas.height);
      stroke.forEach(point => {
        ctx.lineTo((point.x / 100) * canvas.width, (point.y / 100) * canvas.height);
      });
      ctx.stroke();
    });
  }, [removeStrokes, activeTab]);

  const handleApplyEffect = (effectName) => {
    let newEffects = { ...videoEffects };
    
    switch(effectName) {
      case 'Blur':
        newEffects.blur = newEffects.blur === 0 ? 5 : 0;
        break;
      case 'B&W':
        newEffects.saturation = newEffects.saturation === 100 ? 0 : 100;
        break;
      case 'Sepia':
        newEffects.sepia = newEffects.sepia === 0 ? 100 : 0;
        break;
      case 'Vintage':
        newEffects = { brightness: 90, contrast: 110, saturation: 80, sepia: 30, blur: 0 };
        break;
      case 'Glow':
        newEffects = { brightness: 110, contrast: 105, saturation: 110, sepia: 0, blur: 0 };
        break;
      case 'Sharpen':
        newEffects = { brightness: 105, contrast: 120, saturation: 105, sepia: 0, blur: 0 };
        break;
    }
    
    setVideoEffects(newEffects);
  };

  const handleExport = () => {
    if (!videoFile) return;

    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    video.pause();
    const originalTime = video.currentTime;
    video.currentTime = currentTime;
    
    video.onseeked = () => {
      const filters = [];
      if (videoEffects.brightness !== 100) filters.push(`brightness(${videoEffects.brightness}%)`);
      if (videoEffects.contrast !== 100) filters.push(`contrast(${videoEffects.contrast}%)`);
      if (videoEffects.saturation !== 100) filters.push(`saturate(${videoEffects.saturation}%)`);
      if (videoEffects.blur > 0) filters.push(`blur(${videoEffects.blur}px)`);
      if (videoEffects.sepia > 0) filters.push(`sepia(${videoEffects.sepia}%)`);
      
      ctx.filter = filters.join(' ');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const textTrack = tracks.find(t => t.type === 'text');
      if (textTrack) {
        textTrack.clips.forEach(clip => {
          if (currentTime >= clip.start && currentTime < clip.start + clip.duration) {
            ctx.filter = 'none';
            ctx.font = `${clip.style.fontWeight} ${clip.style.fontSize}px Arial`;
            ctx.fillStyle = clip.style.color;
            ctx.textAlign = 'center';
            
            let y = canvas.height / 2;
            if (clip.style.position === 'top') y = 100;
            if (clip.style.position === 'bottom') y = canvas.height - 100;
            
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 10;
            ctx.fillText(clip.text, canvas.width / 2, y);
          }
        });
      }
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `flik_frame_${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
        
        video.currentTime = originalTime;
        if (isPlaying) video.play();
      });
    };
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVideoFilterStyle = () => {
    const filters = [];
    if (videoEffects.brightness !== 100) filters.push(`brightness(${videoEffects.brightness}%)`);
    if (videoEffects.contrast !== 100) filters.push(`contrast(${videoEffects.contrast}%)`);
    if (videoEffects.saturation !== 100) filters.push(`saturate(${videoEffects.saturation}%)`);
    if (videoEffects.blur > 0) filters.push(`blur(${videoEffects.blur}px)`);
    if (videoEffects.sepia > 0) filters.push(`sepia(${videoEffects.sepia}%)`);
    return filters.join(' ');
  };

  const getTextPosition = (position) => {
    switch(position) {
      case 'top': return 'top-8 left-1/2 -translate-x-1/2';
      case 'center': return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case 'bottom': return 'bottom-8 left-1/2 -translate-x-1/2';
      default: return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col bg-[#0A0A0A]"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="h-14 border-b border-white/5 flex items-center justify-between px-6 glass-card"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg btn-gradient flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">Video Editor</span>
          </div>
          
          {videoFile && (
            <span className="text-sm text-white/40">{videoFile.name}</span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {selectedClip && selectedClip.type === 'video' && (
            <Button
              onClick={handleSplitClip}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Scissors className="w-4 h-4 mr-2" />
              Split
            </Button>
          )}
          <Button
            onClick={handleExport}
            disabled={!videoFile}
            className="btn-gradient border-0 text-white disabled:opacity-30"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Frame
          </Button>
        </div>
      </motion.div>

      <div className="flex-1 flex overflow-hidden">
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-80 border-r border-white/5 glass-card overflow-y-auto"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-6 bg-white/5 m-4">
              <TabsTrigger value="media"><Layers className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="text"><Type className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="remove"><Wand2 className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="transitions"><Zap className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="effects"><Sparkles className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="speed"><Sliders className="w-4 h-4" /></TabsTrigger>
            </TabsList>

            <div className="px-4 pb-4">
              <TabsContent value="media" className="mt-0">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Media</h3>
                
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-white/20 rounded-xl p-6 hover:border-white/40 transition-colors">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-[#FF6B35]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Upload Video</p>
                        <p className="text-xs text-white/50 mt-1">MP4, MOV, AVI</p>
                      </div>
                    </div>
                  </div>
                  <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
                </label>

                {videoFile && (
                  <div className="mt-4 space-y-2">
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-white/60 mb-2">Project</p>
                      <p className="text-sm text-white truncate">{videoFile.name}</p>
                      <p className="text-xs text-white/40 mt-1">{formatTime(duration)}</p>
                    </div>
                    
                    <label className="block cursor-pointer">
                      <div className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-[#FF6B35]" />
                          <p className="text-sm text-white">Add More Videos</p>
                        </div>
                      </div>
                      <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" multiple />
                    </label>
                    
                    <p className="text-xs text-white/40 mt-2">
                      {tracks.find(t => t.type === 'video')?.clips.length || 0} video clip(s)
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="text" className="mt-0 space-y-4">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Text</h3>
                
                <Button onClick={handleAddTextClip} disabled={!videoFile} className="w-full btn-gradient text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Text
                </Button>

                {editingText && (
                  <div className="space-y-3 p-4 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-white text-sm">Edit Text</Label>
                      <Button size="sm" variant="ghost" onClick={() => setEditingText(null)} className="h-6 w-6 p-0">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div>
                      <Label className="text-white/60 text-xs">Content</Label>
                      <Input
                        value={editingText.text}
                        onChange={(e) => handleUpdateTextClip({ text: e.target.value })}
                        className="bg-white/5 border-white/10 text-white mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-white/60 text-xs">Position</Label>
                      <Select
                        value={editingText.style.position}
                        onValueChange={(value) => handleUpdateTextClip({ style: { ...editingText.style, position: value } })}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Top</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="bottom">Bottom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-white/60 text-xs">Font Size: {editingText.style.fontSize}px</Label>
                      <Slider
                        value={[editingText.style.fontSize]}
                        onValueChange={(value) => handleUpdateTextClip({ style: { ...editingText.style, fontSize: value[0] } })}
                        min={20} max={120} step={4} className="mt-2"
                      />
                    </div>

                    <div>
                      <Label className="text-white/60 text-xs">Duration: {editingText.duration}s</Label>
                      <Slider
                        value={[editingText.duration]}
                        onValueChange={(value) => handleUpdateTextClip({ duration: value[0] })}
                        min={1} max={30} step={0.5} className="mt-2"
                      />
                    </div>

                    <div>
                      <Label className="text-white/60 text-xs">Text Color</Label>
                      <input
                        type="color"
                        value={editingText.style.color}
                        onChange={(e) => handleUpdateTextClip({ style: { ...editingText.style, color: e.target.value } })}
                        className="w-full h-10 rounded bg-white/5 border border-white/10 mt-1"
                      />
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="remove" className="mt-0 space-y-4">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Watermark Remover</h3>
                
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-start gap-3 mb-4">
                    <Wand2 className="w-5 h-5 text-[#FF6B35] mt-1" />
                    <div>
                      <h4 className="text-white font-medium text-sm mb-2">Remove Watermarks</h4>
                      <ol className="text-xs text-white/60 space-y-1">
                        <li>1. Pause at frame with watermark</li>
                        <li>2. Paint over watermark/unwanted object</li>
                        <li>3. Click "Remove" to process</li>
                      </ol>
                    </div>
                  </div>

                  <Button
                    onClick={() => setIsRemoving(!isRemoving)}
                    variant={isRemoving ? "default" : "outline"}
                    className={isRemoving ? "w-full btn-gradient text-white" : "w-full border-white/20 text-white"}
                  >
                    {isRemoving ? 'Painting Mode Active' : 'Start Painting'}
                  </Button>
                </div>

                {removeStrokes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">{removeStrokes.length} stroke(s)</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRemoveStrokes([])}
                        className="text-white/60 hover:text-white h-7"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                    <Button
                      onClick={async () => {
                        if (!videoFile || removeStrokes.length === 0) return;
                        setIsProcessing(true);
                        try {
                          const canvas = document.createElement('canvas');
                          const video = videoRef.current;
                          canvas.width = video.videoWidth;
                          canvas.height = video.videoHeight;
                          const ctx = canvas.getContext('2d');
                          ctx.drawImage(video, 0, 0);
                          
                          canvas.toBlob(async (blob) => {
                            const file = new File([blob], 'frame.png', { type: 'image/png' });
                            const uploadResult = await base44.integrations.Core.UploadFile({ file });
                            
                            const result = await base44.integrations.Core.GenerateImage({
                              prompt: 'Remove the painted areas (watermarks, logos, unwanted objects) from this image. Fill the removed areas naturally to match surrounding content. Keep everything else exactly the same.',
                              existing_image_urls: [uploadResult.file_url]
                            });
                            
                            const newImage = new Image();
                            newImage.src = result.url;
                            newImage.onload = () => {
                              alert('Watermark removed! The cleaned frame has been generated. You can download it from the export.');
                              setRemoveStrokes([]);
                              setIsRemoving(false);
                            };
                          });
                        } catch (err) {
                          alert('Error removing watermark: ' + err.message);
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      disabled={isProcessing}
                      className="w-full btn-gradient text-white"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Remove Watermark
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="transitions" className="mt-0">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Transitions</h3>
                
                {selectedClip && selectedClip.type === 'video' ? (
                  <div className="space-y-3">
                    <p className="text-sm text-white/60 mb-3">Apply transition to selected clip</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'fade', name: 'Fade', desc: 'Smooth fade' },
                        { id: 'dissolve', name: 'Dissolve', desc: 'Cross dissolve' },
                        { id: 'slide', name: 'Slide', desc: 'Slide in' },
                        { id: 'wipe', name: 'Wipe', desc: 'Wipe effect' },
                      ].map((trans) => (
                        <button
                          key={trans.id}
                          onClick={() => {
                            const track = tracks.find(t => t.clips.some(c => c.id === selectedClip.id));
                            if (track) {
                              const newTracks = tracks.map(t => {
                                if (t.id === track.id) {
                                  return {
                                    ...t,
                                    clips: t.clips.map(c => 
                                      c.id === selectedClip.id ? { ...c, transition: trans.id } : c
                                    )
                                  };
                                }
                                return t;
                              });
                              setTracks(newTracks);
                            }
                          }}
                          className={`p-4 rounded-lg transition-colors text-left ${
                            selectedClip.transition === trans.id 
                              ? 'bg-[#FF6B35]/20 border-2 border-[#FF6B35]' 
                              : 'bg-white/5 hover:bg-white/10 border-2 border-transparent'
                          }`}
                        >
                          <p className="text-sm text-white font-medium">{trans.name}</p>
                          <p className="text-xs text-white/50">{trans.desc}</p>
                        </button>
                      ))}
                    </div>
                    {selectedClip.transition && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const track = tracks.find(t => t.clips.some(c => c.id === selectedClip.id));
                          if (track) {
                            const newTracks = tracks.map(t => {
                              if (t.id === track.id) {
                                return {
                                  ...t,
                                  clips: t.clips.map(c => 
                                    c.id === selectedClip.id ? { ...c, transition: null } : c
                                  )
                                };
                              }
                              return t;
                            });
                            setTracks(newTracks);
                          }
                        }}
                        className="w-full border-white/20 text-white"
                      >
                        Remove Transition
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-white/50">Select a video clip to add transitions</p>
                )}
              </TabsContent>

              <TabsContent value="effects" className="mt-0">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Effects</h3>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { name: 'Blur', icon: Wand2 },
                    { name: 'B&W', icon: Image },
                    { name: 'Sepia', icon: Image },
                    { name: 'Vintage', icon: Sparkles },
                    { name: 'Glow', icon: Sparkles },
                    { name: 'Sharpen', icon: Wand2 },
                  ].map((effect) => (
                    <button
                      key={effect.name}
                      onClick={() => handleApplyEffect(effect.name)}
                      disabled={!videoFile}
                      className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-center disabled:opacity-30"
                    >
                      <effect.icon className="w-5 h-5 mx-auto mb-2 text-[#FF6B35]" />
                      <p className="text-xs text-white/80">{effect.name}</p>
                    </button>
                  ))}
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div>
                    <Label className="text-white/60 text-xs">Brightness: {videoEffects.brightness}%</Label>
                    <Slider value={[videoEffects.brightness]} onValueChange={(value) => setVideoEffects({ ...videoEffects, brightness: value[0] })} min={0} max={200} step={5} className="mt-2" />
                  </div>
                  <div>
                    <Label className="text-white/60 text-xs">Contrast: {videoEffects.contrast}%</Label>
                    <Slider value={[videoEffects.contrast]} onValueChange={(value) => setVideoEffects({ ...videoEffects, contrast: value[0] })} min={0} max={200} step={5} className="mt-2" />
                  </div>
                  <div>
                    <Label className="text-white/60 text-xs">Saturation: {videoEffects.saturation}%</Label>
                    <Slider value={[videoEffects.saturation]} onValueChange={(value) => setVideoEffects({ ...videoEffects, saturation: value[0] })} min={0} max={200} step={5} className="mt-2" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="speed" className="mt-0">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Speed & Audio</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-white/60 text-xs mb-3 block">Playback Speed</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4].map((speed) => (
                        <Button
                          key={speed}
                          variant={playbackSpeed === speed ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSpeedChange(speed)}
                          disabled={!videoFile}
                          className={playbackSpeed === speed ? "btn-gradient text-white" : "border-white/20 text-white/70"}
                        >
                          {speed}x
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <label className="block cursor-pointer mb-4">
                      <div className="border-2 border-dashed border-white/20 rounded-xl p-4 hover:border-white/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <Music className="w-5 h-5 text-[#FF6B35]" />
                          <div>
                            <p className="text-sm text-white">Add Music</p>
                            <p className="text-xs text-white/50">MP3, WAV</p>
                          </div>
                        </div>
                      </div>
                      <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
                    </label>

                    {tracks.find(t => t.type === 'audio')?.clips.length > 0 && (
                      <div>
                        <p className="text-xs text-white/40 mb-2">Audio Clips</p>
                        {tracks.find(t => t.type === 'audio').clips.map(clip => (
                          <div key={clip.id} className="flex items-center justify-between p-2 rounded bg-white/5 mb-2">
                            <span className="text-xs text-white truncate">{clip.name}</span>
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteClip('audio', clip.id)} className="h-6 w-6">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white/60">Master Volume</span>
                        <span className="text-xs text-white/40">{volume}%</span>
                      </div>
                      <Slider value={[volume]} onValueChange={handleVolumeChange} max={100} step={1} />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </motion.aside>

        <main className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center bg-[#0A0A0A] p-8 relative overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#FF6B35]/5 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#FFB800]/5 blur-[100px] pointer-events-none" />
            
            {videoFile ? (
              <div 
                className="relative max-w-4xl w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={() => {}}
              >
                <video
                  ref={videoRef}
                  src={videoFile.url}
                  className={`w-full h-full object-contain ${isRemoving ? 'cursor-crosshair' : ''}`}
                  style={{ filter: getVideoFilterStyle() }}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                />
                
                {activeTab === 'remove' && (
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 pointer-events-none"
                  />
                )}
                
                {tracks.find(t => t.type === 'text')?.clips.map(clip => {
                  if (currentTime >= clip.start && currentTime < clip.start + clip.duration) {
                    return (
                      <div
                        key={clip.id}
                        className={`absolute pointer-events-none px-4 py-2 ${getTextPosition(clip.style.position)}`}
                        style={{
                          fontSize: clip.style.fontSize,
                          color: clip.style.color,
                          fontWeight: clip.style.fontWeight,
                          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                        }}
                      >
                        {clip.text}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ) : (
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
                  <Video className="w-8 h-8 text-white/30" />
                </div>
                <p className="text-white/40">Upload a video to start editing</p>
              </div>
            )}
          </div>

          {videoFile && (
            <div className="border-t border-white/5 glass-card p-4">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-white/60 w-16">{formatTime(currentTime)}</span>
                  <Slider value={[currentTime]} onValueChange={handleSeek} max={duration || 100} step={0.1} className="flex-1" />
                  <span className="text-sm text-white/60 w-16">{formatTime(duration)}</span>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <Button variant="ghost" size="icon" onClick={handleSkipBack} className="text-white hover:bg-white/10">
                    <SkipBack className="w-5 h-5" />
                  </Button>
                  
                  <Button onClick={handlePlayPause} className="w-12 h-12 rounded-full btn-gradient">
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                  </Button>
                  
                  <Button variant="ghost" size="icon" onClick={handleSkipForward} className="text-white hover:bg-white/10">
                    <SkipForward className="w-5 h-5" />
                  </Button>

                  <div className="w-px h-6 bg-white/10 mx-2" />

                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                    <Volume2 className="w-5 h-5" />
                  </Button>
                  
                  <Slider value={[volume]} onValueChange={handleVolumeChange} max={100} step={1} className="w-24" />
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-white/5 glass-card p-4 h-64 overflow-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Timeline</h3>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} className="text-white hover:bg-white/10">
                <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs text-white/60 w-12 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(3, zoom + 0.25))} className="text-white hover:bg-white/10">
                <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div ref={timelineRef} className="space-y-2" style={{ minWidth: `${zoom * 100}%` }}>
              {tracks.map((track) => (
                <div key={track.id} className="flex items-center gap-2 group">
                  <div className="w-24 flex-shrink-0">
                    <p className="text-xs text-white/60">{track.name}</p>
                  </div>
                  
                  <div className="flex-1 h-12 bg-white/5 rounded-lg relative">
                    <div className="absolute inset-0 flex">
                      {[...Array(Math.ceil(duration || 10))].map((_, i) => (
                        <div key={i} className="flex-1 border-r border-white/5" />
                      ))}
                    </div>

                    {track.clips.map((clip) => (
                      <div
                        key={clip.id}
                        className={`absolute top-1 bottom-1 rounded px-2 flex items-center justify-between select-none ${
                          selectedClip?.id === clip.id ? 'ring-2 ring-[#FF6B35]' : ''
                        }`}
                        style={{
                          left: `${(clip.start / (duration || 100)) * 100}%`,
                          width: `${(clip.duration / (duration || 100)) * 100}%`,
                          background: track.type === 'video' 
                            ? 'linear-gradient(135deg, #FF6B35 0%, #F72C25 100%)'
                            : track.type === 'audio'
                            ? 'linear-gradient(135deg, #FFB800 0%, #FF6B35 100%)'
                            : 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                          cursor: 'move'
                        }}
                        onClick={() => setSelectedClip(clip)}
                        onMouseDown={(e) => handleClipMouseDown(e, clip)}
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
                          onMouseDown={(e) => handleClipMouseDown(e, clip, 'left')}
                        />
                        <span className="text-xs text-white truncate pointer-events-none">{clip.name || clip.text}</span>
                        <div className="flex items-center gap-1">
                          {track.type === 'text' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={(e) => { e.stopPropagation(); setEditingText(clip); setActiveTab('text'); }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); handleDeleteClip(track.id, clip.id); }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
                          onMouseDown={(e) => handleClipMouseDown(e, clip, 'right')}
                        />
                      </div>
                    ))}

                    {duration > 0 && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-[#FF6B35] pointer-events-none z-10"
                        style={{ left: `${(currentTime / duration) * 100}%` }}
                      >
                        <div className="w-3 h-3 bg-[#FF6B35] rounded-full -translate-x-1/2 -translate-y-1" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}