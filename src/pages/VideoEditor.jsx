import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, Play, Pause, SkipBack, SkipForward, Scissors, 
  Download, Volume2, ZoomIn, ZoomOut, Plus, Trash2,
  Image, Music, Type, Sparkles, Wand2, Layers, Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const videoRef = useRef(null);
  const timelineRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setVideoFile({ url, file, name: file.name });
      
      // Add clip to video track
      const newClip = {
        id: Date.now(),
        type: 'video',
        url: url,
        name: file.name,
        start: 0,
        duration: 10, // Will be updated when video loads
        trimStart: 0,
        trimEnd: 10,
      };
      
      const newTracks = [...tracks];
      newTracks[0].clips.push(newClip);
      setTracks(newTracks);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
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

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
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

  const handleZoomChange = (value) => {
    setZoom(value[0]);
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
      }
    };
    
    const newTracks = [...tracks];
    const textTrack = newTracks.find(t => t.type === 'text');
    if (textTrack) {
      textTrack.clips.push(newClip);
      setTracks(newTracks);
    }
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExport = () => {
    alert('Export functionality would render the timeline and download the video. This requires additional video processing libraries.');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A]">
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
          <Button
            onClick={handleExport}
            disabled={!videoFile}
            className="btn-gradient border-0 text-white disabled:opacity-30"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Video
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
              <TabsTrigger value="audio">
                <Music className="w-4 h-4" />
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
                  </div>
                )}
              </TabsContent>

              <TabsContent value="text" className="mt-0">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Text</h3>
                
                <Button
                  onClick={handleAddTextClip}
                  className="w-full btn-gradient text-white mb-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Text
                </Button>

                <div className="space-y-2">
                  <p className="text-xs text-white/40">Text Presets</p>
                  {['Title', 'Subtitle', 'Lower Third', 'End Credits'].map((preset) => (
                    <Button
                      key={preset}
                      variant="outline"
                      className="w-full justify-start text-white/70 hover:text-white border-white/10"
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="effects" className="mt-0">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Effects</h3>
                
                <div className="grid grid-cols-2 gap-3">
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
                      className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-center"
                    >
                      <effect.icon className="w-5 h-5 mx-auto mb-2 text-[#FF6B35]" />
                      <p className="text-xs text-white/80">{effect.name}</p>
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="audio" className="mt-0">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Audio</h3>
                
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
                  <input type="file" accept="audio/*" className="hidden" />
                </label>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/60">Volume</span>
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
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                />
                
                {/* Text overlays would render here */}
                {tracks.find(t => t.type === 'text')?.clips.map(clip => {
                  if (currentTime >= clip.start && currentTime < clip.start + clip.duration) {
                    return (
                      <div
                        key={clip.id}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                        style={{
                          fontSize: clip.style.fontSize,
                          color: clip.style.color,
                          fontWeight: clip.style.fontWeight,
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
                  onClick={() => handleZoomChange([Math.max(0.5, zoom - 0.25)])}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs text-white/60 w-12 text-center">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleZoomChange([Math.min(3, zoom + 0.25)])}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div ref={timelineRef} className="space-y-2" style={{ transform: `scaleX(${zoom})`, transformOrigin: 'left' }}>
              {tracks.map((track) => (
                <div key={track.id} className="flex items-center gap-2 group">
                  <div className="w-24 flex-shrink-0">
                    <p className="text-xs text-white/60">{track.name}</p>
                  </div>
                  
                  <div className="flex-1 h-12 bg-white/5 rounded-lg relative">
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
                      >
                        <span className="text-xs text-white truncate">{clip.name || clip.text}</span>
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
                    ))}

                    {/* Playhead */}
                    {duration > 0 && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-[#FF6B35] pointer-events-none"
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