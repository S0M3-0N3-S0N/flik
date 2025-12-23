import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  Play, Pause, SkipBack, SkipForward, Plus, Layers, 
  Scissors, Type, Music, Settings, Download, Save, 
  ChevronLeft, ChevronRight, Upload, Image as ImageIcon, Video 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Timeline from "@/components/video/Timeline";
import MediaLibrary from "@/components/video/MediaLibrary";
import VideoPreview from "@/components/video/VideoPreview";
import PropertiesPanel from "@/components/video/PropertiesPanel";

export default function VideoEditor() {
  const [activeTab, setActiveTab] = useState("media");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [tracks, setTracks] = useState([
    { id: "main", type: "video", clips: [] },
    { id: "overlay", type: "overlay", clips: [] },
    { id: "audio", type: "audio", clips: [] },
    { id: "text", type: "text", clips: [] }
  ]);
  const [selectedClip, setSelectedClip] = useState(null);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleAddClip = (trackId, clip) => {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId) {
        return { ...track, clips: [...track.clips, { ...clip, id: Date.now() }] };
      }
      return track;
    }));
  };

  return (
    <div className="h-screen pt-16 flex flex-col bg-[#0A0A0A] overflow-hidden">
      {/* Header / Toolbar */}
      <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#141414]">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
              <Scissors className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
              <Layers className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="border-white/20 text-white bg-transparent hover:bg-white/10">
            <Save className="w-4 h-4 mr-2" />
            Save Template
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-[#FF6B35] to-[#FFB800] text-white border-0">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Resources */}
        <div className="w-80 border-r border-white/5 bg-[#141414] flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-4 bg-transparent border-b border-white/5 rounded-none h-12 p-0">
              <TabsTrigger value="media" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6B35] data-[state=active]:bg-white/5 text-white/60 data-[state=active]:text-white h-full">
                <ImageIcon className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="audio" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6B35] data-[state=active]:bg-white/5 text-white/60 data-[state=active]:text-white h-full">
                <Music className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="text" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6B35] data-[state=active]:bg-white/5 text-white/60 data-[state=active]:text-white h-full">
                <Type className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="effects" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6B35] data-[state=active]:bg-white/5 text-white/60 data-[state=active]:text-white h-full">
                <Settings className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-hidden relative">
              <TabsContent value="media" className="h-full m-0 p-0 absolute inset-0">
                <MediaLibrary onAddClip={(clip) => handleAddClip('main', clip)} />
              </TabsContent>
              <TabsContent value="audio" className="h-full m-0 p-4 absolute inset-0">
                <div className="text-white/40 text-center mt-10">Audio Library Coming Soon</div>
              </TabsContent>
              <TabsContent value="text" className="h-full m-0 p-4 absolute inset-0">
                 <div className="text-white/40 text-center mt-10">Text Tools Coming Soon</div>
              </TabsContent>
              <TabsContent value="effects" className="h-full m-0 p-4 absolute inset-0">
                 <div className="text-white/40 text-center mt-10">Effects Library Coming Soon</div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Center - Preview */}
        <div className="flex-1 bg-[#0A0A0A] flex flex-col relative">
          <div className="flex-1 flex items-center justify-center p-8">
            <VideoPreview 
              isPlaying={isPlaying} 
              currentTime={currentTime}
              tracks={tracks}
            />
          </div>
          
          {/* Player Controls */}
          <div className="h-12 border-t border-white/5 flex items-center justify-center gap-4 bg-[#141414]">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-8 w-8">
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button 
              onClick={handlePlayPause}
              variant="default" 
              size="icon" 
              className="bg-white text-black hover:bg-white/90 rounded-full h-10 w-10"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-8 w-8">
              <SkipForward className="w-4 h-4" />
            </Button>
            <div className="absolute right-4 text-xs text-white/50 font-mono">
              00:00:00 / 00:00:30
            </div>
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-72 border-l border-white/5 bg-[#141414]">
          <PropertiesPanel selectedClip={selectedClip} />
        </div>
      </div>

      {/* Bottom - Timeline */}
      <div className="h-72 border-t border-white/5 bg-[#141414] flex flex-col">
        <div className="h-10 border-b border-white/5 flex items-center justify-between px-4">
          <div className="text-xs text-white/40">Timeline</div>
          <div className="flex items-center gap-2 w-32">
             <span className="text-xs text-white/40">-</span>
             <Slider 
               value={[zoomLevel]} 
               min={0.5} 
               max={5} 
               step={0.1} 
               onValueChange={([v]) => setZoomLevel(v)}
               className="flex-1"
             />
             <span className="text-xs text-white/40">+</span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <Timeline 
            tracks={tracks} 
            zoomLevel={zoomLevel} 
            currentTime={currentTime}
            onTimeUpdate={setCurrentTime}
            onSelectClip={setSelectedClip}
          />
        </div>
      </div>
    </div>
  );
}