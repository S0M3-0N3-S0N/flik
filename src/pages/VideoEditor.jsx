import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, Play, Pause, SkipBack, SkipForward, Scissors, 
  Download, Volume2, ZoomIn, ZoomOut, Plus, Trash2,
  Image, Music, Type, Sparkles, Wand2, Layers, Video, Edit2,
  Check, X, Sliders
} from "lucide-react";
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [editingText, setEditingText] = useState(null);
  const [videoEffects, setVideoEffects] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    sepia: 0,
  });
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [audioElements, setAudioElements] = useState([]);

  const videoRef = useRef(null);
  const timelineRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setVideoFile({ url, file, name: file.name });
    }
  };

  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('audio/')) {
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
          volume: 100,
        };
        
        const newTracks = [...tracks];
        const audioTrack = newTracks.find(t => t.type === 'audio');
        if (audioTrack) {
          audioTrack.clips.push(newClip);
          setTracks(newTracks);
        }
        
        setAudioElements(prev => [...prev, { id: newClip.id, element: audio }]);
      };
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
          trimStart: 0,
          trimEnd: video.duration,
        };
        
        const newTracks = [...tracks];
        newTracks[0].clips = [newClip];
        setTracks(newTracks);
      };
    }
  }, [videoFile]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        audioElements.forEach(({ element }) => element.pause());
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    audioElements.forEach(({ element }) => {
      element.playbackRate = speed;
    });
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      
      audioElements.forEach(({ id, element }) => {
        const clip = tracks.find(t => t.type === 'audio')?.clips.find(c => c.id === id);
        if (clip) {
          if (time >= clip.start && time < clip.start + clip.duration) {
            if (element.paused) {
              element.currentTime = time - clip.start;
              element.volume = clip.volume / 100;
              element.play().catch(e => console.log('Audio play failed:', e));
            }
          } else {
            if (!element.paused) {
              element.pause();
            }
          }
        }
      });
    }
  };

  const handleSeek = (value) => {
    const time = value[0];
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (value) => {
    const vol = value[0];
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol / 100;
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

  const handleAddTextClip = () => {
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
        backgroundColor: 'transparent',
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

    if (splitPoint <= 0 || splitPoint >= clip.duration) return;

    const clip1 = {
      ...clip,
      id: Date.now(),
      duration: splitPoint,
      trimEnd: clip.trimStart + splitPoint,
    };

    const clip2 = {
      ...clip,
      id: Date.now() + 1,
      start: clip.start + splitPoint,
      duration: clip.duration - splitPoint,
      trimStart: clip.trimStart + splitPoint,
    };

    const newTracks = tracks.map(t => {
      if (t.id === track.id) {
        return {
          ...t,
          clips: t.clips.flatMap(c => 
            c.id === clip.id ? [clip1, clip2] : [c]
          )
        };
      }
      return t;
    });

    setTracks(newTracks);
    setSelectedClip(null);
  };

  const handleClipDragStart = (e, clip) => {
    setIsDragging(true);
    setSelectedClip(clip);
    setDragStartX(e.clientX);
  };

  const handleClipDrag = (e) => {
    if (!isDragging || !selectedClip) return;

    const deltaX = e.clientX - dragStartX;
    const timelineWidth = timelineRef.current?.offsetWidth || 1000;
    const deltaTime = (deltaX / timelineWidth) * duration * zoom;

    const track = tracks.find(t => t.clips.some(c => c.id === selectedClip.id));
    if (!track) return;

    const newStart = Math.max(0, Math.min(duration - selectedClip.duration, selectedClip.start + deltaTime));

    const newTracks = tracks.map(t => {
      if (t.id === track.id) {
        return {
          ...t,
          clips: t.clips.map(c => 
            c.id === selectedClip.id ? { ...c, start: newStart } : c
          )
        };
      }
      return t;
    });

    setTracks(newTracks);
    setDragStartX(e.clientX);
  };

  const handleClipDragEnd = () => {
    setIsDragging(false);
  };

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
    
    video.currentTime = 0;
    video.onseeked = () => {
      const filters = [];
      if (videoEffects.brightness !== 100) filters.push(`brightness(${videoEffects.brightness}%)`);
      if (videoEffects.contrast !== 100) filters.push(`contrast(${videoEffects.contrast}%)`);
      if (videoEffects.saturation !== 100) filters.push(`saturate(${videoEffects.saturation}%)`);
      if (videoEffects.blur > 0) filters.push(`blur(${videoEffects.blur}px)`);
      if (videoEffects.sepia > 0) filters.push(`sepia(${videoEffects.sepia}%)`);
      
      ctx.filter = filters.join(' ');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'flik_video_frame.png';
        link.click();
        URL.revokeObjectURL(url);
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
      onMouseMove={handleClipDrag}
      onMouseUp={handleClipDragEnd}
    >
      {/* Top Toolbar */}
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
          {selectedClip && (
            <Button
              onClick={handleSplitClip}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Scissors className="w-4 h-4 mr-2" />
              Split Clip
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

      <div className="flex-1 flex">
        {/* Left Sidebar - Tools */}
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-80 border-r border-white/5 glass-card overflow-y-auto"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 bg-white/5 m-4">
              <TabsTrigger value="media">
                <Layers className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="text">
                <Type className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="effects">
                <Sparkles className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="speed">
                <Sliders className="w-4 h-4" />
              </TabsTrigger>
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
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {videoFile && (
                  <div className="mt-4 p-3 rounded-lg bg-white/5">
                    <p className="text-xs text-white/60 mb-2">Current Video</p>
                    <p className="text-sm text-white truncate">{videoFile.name}</p>
                    <p className="text-xs text-white/40 mt-1">{formatTime(duration)}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="text" className="mt-0 space-y-4">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Text</h3>
                
                <Button
                  onClick={handleAddTextClip}
                  disabled={!videoFile}
                  className="w-full btn-gradient text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Text
                </Button>

                {editingText && (
                  <div className="space-y-3 p-4 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-white text-sm">Edit Text</Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingText(null)}
                        className="h-6 w-6 p-0"
                      >
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
                        min={20}
                        max={120}
                        step={4}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label className="text-white/60 text-xs">Duration: {editingText.duration}s</Label>
                      <Slider
                        value={[editingText.duration]}
                        onValueChange={(value) => handleUpdateTextClip({ duration: value[0] })}
                        min={1}
                        max={30}
                        step={0.5}
                        className="mt-2"
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
                    <Slider
                      value={[videoEffects.brightness]}
                      onValueChange={(value) => setVideoEffects({ ...videoEffects, brightness: value[0] })}
                      min={0}
                      max={200}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-white/60 text-xs">Contrast: {videoEffects.contrast}%</Label>
                    <Slider
                      value={[videoEffects.contrast]}
                      onValueChange={(value) => setVideoEffects({ ...videoEffects, contrast: value[0] })}
                      min={0}
                      max={200}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-white/60 text-xs">Saturation: {videoEffects.saturation}%</Label>
                    <Slider
                      value={[videoEffects.saturation]}
                      onValueChange={(value) => setVideoEffects({ ...videoEffects, saturation: value[0] })}
                      min={0}
                      max={200}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="speed" className="mt-0">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Speed & Timing</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-white/60 text-xs mb-3 block">Playback Speed</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: '0.25x', value: 0.25 },
                        { label: '0.5x', value: 0.5 },
                        { label: '0.75x', value: 0.75 },
                        { label: '1x', value: 1 },
                        { label: '1.25x', value: 1.25 },
                        { label: '1.5x', value: 1.5 },
                        { label: '2x', value: 2 },
                        { label: '3x', value: 3 },
                        { label: '4x', value: 4 },
                      ].map((speed) => (
                        <Button
                          key={speed.value}
                          variant={playbackSpeed === speed.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSpeedChange(speed.value)}
                          disabled={!videoFile}
                          className={`${
                            playbackSpeed === speed.value 
                              ? "btn-gradient text-white" 
                              : "border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          {speed.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <Label className="text-white/60 text-xs mb-3 block">Audio Tracks</Label>
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
                      <input 
                        type="file" 
                        accept="audio/*" 
                        onChange={handleAudioUpload}
                        className="hidden" 
                      />
                    </label>

                    {tracks.find(t => t.type === 'audio')?.clips.length > 0 && (
                      <div>
                        <p className="text-xs text-white/40 mb-2">Audio Clips</p>
                        {tracks.find(t => t.type === 'audio').clips.map(clip => (
                          <div key={clip.id} className="flex items-center justify-between p-2 rounded bg-white/5 mb-2">
                            <span className="text-xs text-white truncate">{clip.name}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteClip('audio', clip.id)}
                              className="h-6 w-6"
                            >
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
                      <Slider
                        value={[volume]}
                        onValueChange={handleVolumeChange}
                        max={100}
                        step={1}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </motion.aside>

        {/* Main Area */}
        <main className="flex-1 flex flex-col">
          {/* Video Preview */}
          <div className="flex-1 flex items-center justify-center bg-[#0A0A0A] p-8 relative">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#FF6B35]/5 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#FFB800]/5 blur-[100px] pointer-events-none" />
            
            {videoFile ? (
              <div className="relative max-w-4xl w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
                <video
                  ref={videoRef}
                  src={videoFile.url}
                  className="w-full h-full object-contain"
                  style={{ filter: getVideoFilterStyle() }}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                />
                
                {/* Text overlays */}
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
                          backgroundColor: clip.style.backgroundColor,
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

          {/* Playback Controls */}
          {videoFile && (
            <div className="border-t border-white/5 glass-card p-4">
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Timeline Scrubber */}
                <div className="flex items-center gap-4">
                  <span className="text-sm text-white/60 w-16">{formatTime(currentTime)}</span>
                  <Slider
                    value={[currentTime]}
                    onValueChange={handleSeek}
                    max={duration || 100}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-sm text-white/60 w-16">{formatTime(duration)}</span>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSkipBack}
                    className="text-white hover:bg-white/10"
                  >
                    <SkipBack className="w-5 h-5" />
                  </Button>
                  
                  <Button
                    onClick={handlePlayPause}
                    className="w-12 h-12 rounded-full btn-gradient"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-1" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSkipForward}
                    className="text-white hover:bg-white/10"
                  >
                    <SkipForward className="w-5 h-5" />
                  </Button>

                  <div className="w-px h-6 bg-white/10 mx-2" />

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/10"
                  >
                    <Volume2 className="w-5 h-5" />
                  </Button>
                  
                  <Slider
                    value={[volume]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    className="w-24"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="border-t border-white/5 glass-card p-4 h-64 overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Timeline</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs text-white/60 w-12 text-center">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div ref={timelineRef} className="space-y-2">
              {tracks.map((track) => (
                <div key={track.id} className="flex items-center gap-2 group">
                  <div className="w-24 flex-shrink-0">
                    <p className="text-xs text-white/60">{track.name}</p>
                  </div>
                  
                  <div className="flex-1 h-12 bg-white/5 rounded-lg relative" style={{ width: `${zoom * 100}%` }}>
                    {/* Timeline ruler */}
                    <div className="absolute inset-0 flex">
                      {[...Array(Math.ceil(duration || 10))].map((_, i) => (
                        <div key={i} className="flex-1 border-r border-white/5" />
                      ))}
                    </div>

                    {/* Clips */}
                    {track.clips.map((clip) => (
                      <div
                        key={clip.id}
                        className={`absolute top-1 bottom-1 rounded px-2 flex items-center justify-between cursor-move ${
                          selectedClip?.id === clip.id ? 'ring-2 ring-[#FF6B35]' : ''
                        }`}
                        style={{
                          left: `${(clip.start / (duration || 100)) * 100}%`,
                          width: `${(clip.duration / (duration || 100)) * 100}%`,
                          background: track.type === 'video' 
                            ? 'linear-gradient(135deg, #FF6B35 0%, #F72C25 100%)'
                            : track.type === 'audio'
                            ? 'linear-gradient(135deg, #FFB800 0%, #FF6B35 100%)'
                            : 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)'
                        }}
                        onClick={() => setSelectedClip(clip)}
                        onMouseDown={(e) => handleClipDragStart(e, clip)}
                      >
                        <span className="text-xs text-white truncate">{clip.name || clip.text}</span>
                        <div className="flex items-center gap-1">
                          {track.type === 'text' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingText(clip);
                                setActiveTab('text');
                              }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClip(track.id, clip.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Playhead */}
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