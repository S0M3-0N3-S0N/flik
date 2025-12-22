import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scissors, Copy, Trash2, Undo2, Redo2, 
  Download, Settings, Layers, Wand2, 
  ChevronDown, Image as ImageIcon, Music, Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Timeline from '@/components/video/Timeline';
import VideoPlayer from '@/components/video/VideoPlayer';
import { base44 } from '@/api/base44Client';

export default function VideoEditor() {
  const [tracks, setTracks] = useState([
    { 
      id: 'v1', 
      type: 'video', 
      name: 'Main Video', 
      visible: true, 
      locked: false, 
      volume: 100, 
      muted: false,
      clips: [] 
    },
    { 
      id: 'a1', 
      type: 'audio', 
      name: 'Music', 
      visible: true, 
      locked: false, 
      volume: 80, 
      muted: false,
      clips: [] 
    },
    { 
      id: 't1', 
      type: 'text', 
      name: 'Overlay', 
      visible: true, 
      locked: false, 
      clips: [] 
    }
  ]);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [activePanel, setActivePanel] = useState('assets'); // assets, effects, transitions
  
  // Simulated playback loop
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 0.1);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleTrackUpdate = (trackId, updates) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, ...updates } : t));
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Simulate upload and creating a clip
    const url = URL.createObjectURL(file);
    const newClip = {
      id: Date.now().toString(),
      name: file.name,
      url,
      start: currentTime,
      duration: 5, // Default 5s
      type
    };

    setTracks(prev => {
      const targetTrack = prev.find(t => t.type === type) || prev[0];
      return prev.map(t => t.id === targetTrack.id ? {
        ...t,
        clips: [...t.clips, newClip]
      } : t);
    });
  };

  const handleClipSelect = (clip) => {
    setSelectedClipId(clip.id);
    setCurrentTime(clip.start); // Jump to clip start
  };

  const handleDeleteSelected = () => {
    if (!selectedClipId) return;
    setTracks(prev => prev.map(t => ({
      ...t,
      clips: t.clips.filter(c => c.id !== selectedClipId)
    })));
    setSelectedClipId(null);
  };

  return (
    <div className="h-screen flex flex-col bg-[#050505] text-white overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#0A0A0A]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#FFB800] flex items-center justify-center">
              <Scissors size={16} className="text-white" />
            </div>
            <span className="font-bold tracking-tight">Studio Pro</span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white">
              <Undo2 size={16} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white">
              <Redo2 size={16} />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">Autosaved</span>
          <Button className="h-8 bg-white text-black hover:bg-white/90 font-medium px-4 rounded-full">
            <Download size={14} className="mr-2" /> Export
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-16 border-r border-white/5 bg-[#0A0A0A] flex flex-col items-center py-4 gap-4">
          {[
            { id: 'assets', icon: Layers, label: 'Assets' },
            { id: 'text', icon: Type, label: 'Text' },
            { id: 'effects', icon: Wand2, label: 'Effects' },
            { id: 'settings', icon: Settings, label: 'Settings' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              className={`p-3 rounded-xl transition-all ${
                activePanel === item.id 
                  ? 'bg-white/10 text-[#FF6B35]' 
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={20} />
            </button>
          ))}
        </div>

        {/* Assets Panel */}
        <div className="w-72 border-r border-white/5 bg-[#0F0F0F] flex flex-col">
          <div className="p-4 border-b border-white/5">
            <h2 className="font-semibold mb-1">Project Assets</h2>
            <p className="text-xs text-white/40">Drag to timeline</p>
          </div>
          
          <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto flex-1">
            <label className="aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-[#FF6B35]/50 hover:bg-white/5 cursor-pointer flex flex-col items-center justify-center gap-2 transition-all group">
              <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-[#FF6B35]/20 flex items-center justify-center transition-colors">
                <ImageIcon size={20} className="text-white/40 group-hover:text-[#FF6B35]" />
              </div>
              <span className="text-xs text-white/40 group-hover:text-white">Add Media</span>
              <input type="file" className="hidden" accept="image/*,video/*" onChange={(e) => handleFileUpload(e, 'video')} />
            </label>

            {/* Simulated Assets */}
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-square rounded-xl bg-white/5 border border-white/5 relative group cursor-grab active:cursor-grabbing hover:ring-1 hover:ring-white/20">
                <div className="absolute inset-0 flex items-center justify-center text-white/20">
                  <ImageIcon size={24} />
                </div>
                <div className="absolute bottom-2 left-2 text-[10px] bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm">
                  Asset {i}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 bg-[#050505] p-6 flex flex-col justify-center items-center relative">
          <div className="w-full max-w-4xl aspect-video relative z-10">
            <VideoPlayer 
              isPlaying={isPlaying}
              onPlayPause={() => setIsPlaying(!isPlaying)}
              duration={100}
              currentTime={currentTime}
              onSeek={(val) => setCurrentTime(val[0])}
              volume={100}
            />
          </div>
        </div>

        {/* Properties Panel (Right) */}
        <div className="w-80 border-l border-white/5 bg-[#0F0F0F] flex flex-col">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-semibold">Properties</h2>
            {selectedClipId && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                onClick={handleDeleteSelected}
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>
          
          {selectedClipId ? (
            <div className="p-4 space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Transform</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 p-2 rounded-lg">
                    <span className="text-xs text-white/40 block mb-1">Scale</span>
                    <input type="number" defaultValue="100" className="bg-transparent w-full text-sm font-mono focus:outline-none" />
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg">
                    <span className="text-xs text-white/40 block mb-1">Rotation</span>
                    <input type="number" defaultValue="0" className="bg-transparent w-full text-sm font-mono focus:outline-none" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Opacity</label>
                <input type="range" className="w-full accent-[#FF6B35]" />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white/30 p-8 text-center">
              <Settings size={32} className="mb-4 opacity-50" />
              <p className="text-sm">Select a clip to edit properties</p>
            </div>
          )}
        </div>
      </div>

      {/* Timeline (Bottom) */}
      <div className="h-80 flex-shrink-0">
        <Timeline 
          tracks={tracks}
          currentTime={currentTime}
          duration={100}
          onTimeUpdate={setCurrentTime}
          onTrackUpdate={handleTrackUpdate}
          onClipSelect={handleClipSelect}
          selectedClipId={selectedClipId}
          zoom={zoom}
          onZoomChange={setZoom}
        />
      </div>
    </div>
  );
}