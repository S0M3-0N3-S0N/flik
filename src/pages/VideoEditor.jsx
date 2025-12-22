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
import VideoPlayer from "@/components/video/VideoPlayer";
import Timeline from "@/components/video/Timeline";

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
  const [removeStrokes, setRemoveStrokes] = useState([]);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [undoHistory, setUndoHistory] = useState([]);

  const audioRefs = useRef({});

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const loadUrl = urlParams.get('load');
    if (loadUrl) {
      setVideoFile({ url: loadUrl, name: 'loaded_video.mp4' });
    }
  }, []);

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
          setDuration(Math.max(duration, newClip.start + newClip.duration));
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
          audio.volume = (clip.volume / 100) * (volume / 100);
          audio.playbackRate = playbackSpeed;
          audio.play().catch(() => {});
        } else if (!audio.paused && !isPlaying) {
            audio.pause();
        }
      } else {
        if (!audio.paused) {
          audio.pause();
        }
      }
    });
  }, [currentTime, isPlaying, tracks, volume, playbackSpeed]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time) => {
    setCurrentTime(time);
    // Sync audio on seek
    Object.values(audioRefs.current).forEach(audio => {
        // We pause audio while seeking to avoid glitching, the effect above will resume if playing
        audio.pause(); 
    });
  };

  const handleVolumeChange = (value) => {
    setVolume(value[0]);
  };

  const handleSkipBack = () => {
    handleSeek(Math.max(0, currentTime - 5));
  };

  const handleSkipForward = () => {
    handleSeek(Math.min(duration, currentTime + 5));
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
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
      setActiveTab('text');
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
    setUndoHistory([...undoHistory, { action: 'delete', tracks: JSON.parse(JSON.stringify(tracks)) }]);
    
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

  const handleUndo = () => {
    if (undoHistory.length > 0) {
      const previous = undoHistory[undoHistory.length - 1];
      setTracks(JSON.parse(JSON.stringify(previous.tracks)));
      setUndoHistory(undoHistory.slice(0, -1));
    }
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

  const handleApplyEffect = (effectName) => {
    let newEffects = { ...videoEffects };
    
    switch(effectName) {
      case 'Blur': newEffects.blur = newEffects.blur === 0 ? 5 : 0; break;
      case 'B&W': newEffects.saturation = newEffects.saturation === 100 ? 0 : 100; break;
      case 'Sepia': newEffects.sepia = newEffects.sepia === 0 ? 100 : 0; break;
      case 'Vintage': newEffects = { brightness: 90, contrast: 110, saturation: 80, sepia: 30, blur: 0 }; break;
      case 'Glow': newEffects = { brightness: 110, contrast: 105, saturation: 110, sepia: 0, blur: 0 }; break;
      case 'Sharpen': newEffects = { brightness: 105, contrast: 120, saturation: 105, sepia: 0, blur: 0 }; break;
    }
    
    setVideoEffects(newEffects);
  };

  const handleExport = async () => {
    if (!videoFile) return;
    
    const confirmExport = window.confirm("Start rendering? The video will play from start to finish to capture the output.");
    if (!confirmExport) return;

    setIsExporting(true);
    setIsPlaying(false);
    
    // 1. Reset to start
    handleSeek(0);
    
    // 2. Wait for seek
    await new Promise(r => setTimeout(r, 500));

    // 3. Get Canvas Stream
    const canvas = document.querySelector('canvas');
    if (!canvas) {
        alert("Canvas not found");
        setIsExporting(false);
        return;
    }

    const stream = canvas.captureStream(30); // 30 FPS
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks = [];

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flik_export_${Date.now()}.webm`;
        a.click();
        setIsExporting(false);
        setIsPlaying(false);
        alert("Export complete!");
    };

    // 4. Start Recording and Playing
    mediaRecorder.start();
    setIsPlaying(true);
    
    // 5. Stop when finished
    const checkEnded = setInterval(() => {
        const video = document.querySelector('video');
        if (video && video.ended) {
            mediaRecorder.stop();
            clearInterval(checkEnded);
        }
    }, 100);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A]">
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
          {undoHistory.length > 0 && (
            <Button
              onClick={handleUndo}
              variant="ghost"
              className="text-white hover:bg-white/10"
              title="Undo"
            >
               <span className="mr-2">↩</span> Undo
            </Button>
          )}
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
            className="btn-gradient text-white disabled:opacity-30"
            disabled={!videoFile || isExporting}
            onClick={handleExport}
          >
            {isExporting ? (
                 <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Rendering...
                 </>
            ) : (
                <>
                    <Download className="w-4 h-4 mr-2" />
                    Export Video
                </>
            )}
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
              {/* Media Tab */}
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
                        <p className="text-xs text-white/50 mt-1">MP4, MOV</p>
                      </div>
                    </div>
                  </div>
                  <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
                </label>
                {videoFile && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-white/40">
                      {tracks.find(t => t.type === 'video')?.clips.length || 0} clips loaded
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Text Tab */}
              <TabsContent value="text" className="mt-0 space-y-4">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Text Overlays</h3>
                <Button onClick={handleAddTextClip} disabled={!videoFile} className="w-full btn-gradient text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Text Layer
                </Button>
                
                {editingText ? (
                  <div className="space-y-3 p-4 rounded-lg bg-white/5">
                    <div className="flex justify-between items-center">
                      <Label className="text-white">Edit Text</Label>
                      <Button variant="ghost" size="sm" onClick={() => setEditingText(null)}><X className="w-4 h-4"/></Button>
                    </div>
                    <Input 
                        value={editingText.text} 
                        onChange={(e) => handleUpdateTextClip({ text: e.target.value })}
                        className="bg-white/5 border-white/10 text-white"
                    />
                    <div>
                        <Label className="text-white/60 text-xs">Size: {editingText.style.fontSize}px</Label>
                        <Slider 
                            value={[editingText.style.fontSize]} 
                            min={20} max={200} step={5}
                            onValueChange={(v) => handleUpdateTextClip({ style: { ...editingText.style, fontSize: v[0] } })}
                            className="mt-2"
                        />
                    </div>
                    <div>
                        <Label className="text-white/60 text-xs">Position</Label>
                        <Select 
                            value={editingText.style.position}
                            onValueChange={(v) => handleUpdateTextClip({ style: { ...editingText.style, position: v } })}
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
                        <Label className="text-white/60 text-xs">Color</Label>
                        <input 
                            type="color" 
                            value={editingText.style.color}
                            onChange={(e) => handleUpdateTextClip({ style: { ...editingText.style, color: e.target.value } })}
                            className="w-full h-8 mt-1 rounded cursor-pointer"
                        />
                    </div>
                  </div>
                ) : (
                    <p className="text-xs text-white/40 italic">Select a text clip in the timeline to edit.</p>
                )}
              </TabsContent>

              {/* Effects Tab */}
              <TabsContent value="effects" className="mt-0">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Video Effects</h3>
                <div className="space-y-4">
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
                   <div className="grid grid-cols-3 gap-2">
                      {[0.5, 1, 1.5, 2].map((speed) => (
                        <Button
                          key={speed}
                          variant={playbackSpeed === speed ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSpeedChange(speed)}
                          disabled={!videoFile}
                          className={playbackSpeed === speed ? "btn-gradient text-white" : "bg-white/10 border-white/20 text-white hover:bg-white/20"}
                        >
                          {speed}x
                        </Button>
                      ))}
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <Label className="text-white/60 text-xs mb-2 block">Background Audio</Label>
                         <label className="block cursor-pointer">
                            <div className="border border-white/10 bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors flex items-center gap-3">
                                <Music className="w-4 h-4 text-[#FF6B35]" />
                                <span className="text-sm text-white">Upload Audio Track</span>
                            </div>
                            <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
                        </label>
                    </div>
              </TabsContent>
            </div>
          </Tabs>
        </motion.aside>

        <main className="flex-1 flex flex-col">
          {/* Main Stage */}
          <div className="flex-1 flex items-center justify-center bg-[#0A0A0A] p-8 relative overflow-hidden">
            {videoFile ? (
              <VideoPlayer
                videoFile={videoFile}
                isPlaying={isPlaying}
                currentTime={currentTime}
                onTimeUpdate={setCurrentTime}
                onEnded={() => setIsPlaying(false)}
                effects={videoEffects}
                tracks={tracks}
                removeStrokes={removeStrokes}
              />
            ) : (
              <div className="text-center">
                 <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
                  <Video className="w-8 h-8 text-white/30" />
                </div>
                <p className="text-white/40">Upload a video to start editing</p>
              </div>
            )}
          </div>

          {/* Transport Controls */}
          {videoFile && (
            <div className="border-t border-white/5 glass-card p-4">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-white/60 w-16">{formatTime(currentTime)}</span>
                  <Slider value={[currentTime]} onValueChange={(v) => handleSeek(v[0])} max={duration || 100} step={0.1} className="flex-1" />
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

          <Timeline 
            tracks={tracks}
            duration={duration}
            currentTime={currentTime}
            zoom={zoom}
            setZoom={setZoom}
            selectedClip={selectedClip}
            onSelectClip={(clip) => {
                setSelectedClip(clip);
                if (clip.type === 'text') {
                    setEditingText(clip);
                    setActiveTab('text');
                }
            }}
            onDeleteClip={handleDeleteClip}
            onSeek={handleSeek}
            onUpdateClip={() => {}} 
          />
        </main>
      </div>
    </div>
  );
}