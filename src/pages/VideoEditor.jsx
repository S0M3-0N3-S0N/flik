import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, Play, Pause, SkipBack, SkipForward, Scissors, 
  Download, Volume2, ZoomIn, ZoomOut, Plus, Trash2,
  Image as ImageIcon, Music, Type, Sparkles, Wand2, Layers, Video, Edit2, X, Sliders, Zap, Settings
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- ENGINE CONSTANTS ---
const FPS = 30;
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

export default function VideoEditor() {
  // --- STATE ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [selectedClip, setSelectedClip] = useState(null);
  const [activeTab, setActiveTab] = useState("media");
  
  // Tracks: 0=Video/Image, 1=Text/Overlay, 2=Audio
  const [tracks, setTracks] = useState([
    { id: 'video', type: 'video', clips: [], name: 'Video Track' },
    { id: 'text', type: 'text', clips: [], name: 'Overlay Track' },
    { id: 'audio', type: 'audio', clips: [], name: 'Audio Track' },
  ]);

  // Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // --- REFS ---
  const canvasRef = useRef(null);
  const videoElementsRef = useRef({}); // Store hidden video elements
  const requestRef = useRef();
  const startTimeRef = useRef();
  const lastTimeRef = useRef(0);

  // --- HISTORY MANAGEMENT ---
  const addToHistory = useCallback((newTracks) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newTracks)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setTracks(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setTracks(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  // --- ENGINE: RENDER LOOP ---
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Render Video Track
    const videoTrack = tracks.find(t => t.type === 'video');
    const activeVideoClip = videoTrack?.clips.find(
      c => currentTime >= c.start && currentTime < c.start + c.duration
    );

    if (activeVideoClip) {
      if (activeVideoClip.mediaType === 'video') {
        const vid = videoElementsRef.current[activeVideoClip.id];
        if (vid && vid.readyState >= 2) {
          // Sync video time if drifting
          const clipTime = currentTime - activeVideoClip.start + activeVideoClip.offset;
          if (Math.abs(vid.currentTime - clipTime) > 0.3) {
            vid.currentTime = clipTime;
          }
          
          ctx.save();
          // Apply transforms/filters here
          if (activeVideoClip.filters) {
            ctx.filter = activeVideoClip.filters;
          }
          ctx.drawImage(vid, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          ctx.restore();
        }
      } else if (activeVideoClip.mediaType === 'image') {
        const img = videoElementsRef.current[activeVideoClip.id];
        if (img) {
          ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
      }
    }

    // 2. Render Text/Overlay Track
    const textTrack = tracks.find(t => t.type === 'text');
    const activeTextClips = textTrack?.clips.filter(
      c => currentTime >= c.start && currentTime < c.start + c.duration
    );

    activeTextClips?.forEach(clip => {
      ctx.save();
      ctx.font = `${clip.style.fontWeight} ${clip.style.fontSize}px Arial`;
      ctx.fillStyle = clip.style.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      
      let x = CANVAS_WIDTH / 2;
      let y = CANVAS_HEIGHT / 2;
      
      if (clip.style.position === 'top') y = 100;
      if (clip.style.position === 'bottom') y = CANVAS_HEIGHT - 100;
      
      ctx.fillText(clip.text, x, y);
      ctx.restore();
    });

  }, [currentTime, tracks]);

  // --- ENGINE: PLAYBACK LOOP ---
  const animate = useCallback((time) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      
      if (isPlaying) {
        setCurrentTime(prev => {
          const next = prev + deltaTime;
          if (next >= duration) {
            setIsPlaying(false);
            return 0; // Loop or stop
          }
          return next;
        });
      }
    }
    lastTimeRef.current = time;
    renderFrame();
    requestRef.current = requestAnimationFrame(animate);
  }, [isPlaying, duration, renderFrame]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  // --- HANDLERS ---
  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const id = Date.now().toString();

    if (type === 'video') {
      const vid = document.createElement('video');
      vid.src = url;
      vid.onloadedmetadata = () => {
        const newClip = {
          id,
          mediaType: 'video',
          type: 'video',
          url,
          name: file.name,
          start: duration, // Append to end
          duration: vid.duration,
          offset: 0, // Start from beginning of source
          filters: 'none'
        };
        
        // Store ref
        videoElementsRef.current[id] = vid;
        
        const newTracks = [...tracks];
        newTracks[0].clips.push(newClip);
        setTracks(newTracks);
        setDuration(prev => prev + vid.duration);
        addToHistory(newTracks);
      };
    } else if (type === 'image') {
       const img = new Image();
       img.src = url;
       img.onload = () => {
         const newClip = {
           id,
           mediaType: 'image',
           type: 'video', // Visual track
           url,
           name: file.name,
           start: duration,
           duration: 5, // Default 5s for images
           offset: 0
         };
         videoElementsRef.current[id] = img;
         const newTracks = [...tracks];
         newTracks[0].clips.push(newClip);
         setTracks(newTracks);
         setDuration(prev => prev + 5);
         addToHistory(newTracks);
       };
    }
  };

  const handleAddText = () => {
    const newClip = {
      id: Date.now().toString(),
      type: 'text',
      text: 'New Text',
      start: currentTime,
      duration: 3,
      style: {
        fontSize: 60,
        color: '#ffffff',
        fontWeight: 'bold',
        position: 'center'
      }
    };
    const newTracks = [...tracks];
    newTracks[1].clips.push(newClip);
    setTracks(newTracks);
    setSelectedClip(newClip);
    addToHistory(newTracks);
  };

  // --- AUDIO HANDLING ---
  // Sync audio elements with currentTime
  useEffect(() => {
    const audioTrack = tracks.find(t => t.type === 'audio');
    // For simplicity in this version, we're focusing on visual. 
    // Real implementation would manage AudioContext nodes here.
  }, [currentTime, tracks]);

  // --- PLAYBACK CONTROLS ---
  const togglePlay = () => {
    // Sync all videos before playing
    if (!isPlaying) {
       const videoTrack = tracks.find(t => t.type === 'video');
       videoTrack?.clips.forEach(clip => {
         if (clip.mediaType === 'video') {
           const vid = videoElementsRef.current[clip.id];
           if (vid) {
             vid.currentTime = Math.max(0, currentTime - clip.start + clip.offset);
             if (currentTime >= clip.start && currentTime < clip.start + clip.duration) {
               vid.play();
             }
           }
         }
       });
    } else {
      // Pause all
       Object.values(videoElementsRef.current).forEach(el => {
         if (el.tagName === 'VIDEO') el.pause();
       });
    }
    setIsPlaying(!isPlaying);
  };

  // --- CLIP MANIPULATION ---
  const updateClip = (id, updates) => {
    const newTracks = tracks.map(t => ({
      ...t,
      clips: t.clips.map(c => c.id === id ? { ...c, ...updates } : c)
    }));
    setTracks(newTracks);
    setSelectedClip(prev => prev?.id === id ? { ...prev, ...updates } : prev);
  };
  
  const deleteClip = (id) => {
    const newTracks = tracks.map(t => ({
      ...t,
      clips: t.clips.filter(c => c.id !== id)
    }));
    setTracks(newTracks);
    setSelectedClip(null);
    addToHistory(newTracks);
  };

  // --- EXPORT ---
  const handleExport = async () => {
     // Frame capture logic
     const canvas = canvasRef.current;
     if (!canvas) return;
     
     // Pause playback
     setIsPlaying(false);
     
     // Capture current frame
     renderFrame();
     
     canvas.toBlob(async (blob) => {
       const file = new File([blob], `frame_${Math.floor(currentTime)}.png`, { type: 'image/png' });
       try {
         const upload = await base44.integrations.Core.UploadFile({ file });
         await base44.entities.Creation.create({
           title: `Video Frame ${new Date().toLocaleTimeString()}`,
           type: 'image',
           url: upload.file_url,
           thumbnail_url: upload.file_url,
           metadata: { source: 'Video Editor' }
         });
         alert('Frame exported to Gallery!');
       } catch (e) {
         console.error(e);
         alert('Export failed');
       }
     });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] text-white font-sans">
      {/* HEADER */}
      <div className="h-16 border-b border-white/5 bg-[#141414]/50 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl btn-gradient flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Video className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">Pro Video Editor</span>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={undo} disabled={historyIndex <= 0} className="text-white/60 hover:text-white">
            <SkipBack className="w-4 h-4 mr-2" /> Undo
          </Button>
          <Button variant="ghost" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1} className="text-white/60 hover:text-white">
            <SkipForward className="w-4 h-4 mr-2" /> Redo
          </Button>
          <div className="h-6 w-px bg-white/10 mx-2" />
          <Button onClick={handleExport} className="btn-gradient text-white">
            <Download className="w-4 h-4 mr-2" /> Export Frame
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR TOOLS */}
        <div className="w-80 bg-[#141414] border-r border-white/5 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-4 p-2 bg-transparent border-b border-white/5">
              <TabsTrigger value="media" className="data-[state=active]:bg-white/10"><Layers className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="text" className="data-[state=active]:bg-white/10"><Type className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="effects" className="data-[state=active]:bg-white/10"><Sparkles className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="audio" className="data-[state=active]:bg-white/10"><Music className="w-4 h-4" /></TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto p-4">
              <TabsContent value="media" className="mt-0 space-y-4">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Media Library</h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="aspect-square rounded-xl bg-white/5 border border-white/10 hover:border-[#FF6B35] transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 group">
                    <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-[#FF6B35] transition-colors flex items-center justify-center">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-medium">Add Video</span>
                    <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileUpload(e, 'video')} />
                  </label>
                  <label className="aspect-square rounded-xl bg-white/5 border border-white/10 hover:border-[#FF6B35] transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 group">
                    <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-[#FF6B35] transition-colors flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-medium">Add Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'image')} />
                  </label>
                </div>
                
                {tracks[0].clips.length > 0 && (
                   <div className="space-y-2 mt-4">
                     <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Project Files</h3>
                     {tracks[0].clips.map(clip => (
                       <div key={clip.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5">
                         <div className="w-10 h-10 rounded bg-black/50 flex items-center justify-center overflow-hidden">
                           {clip.mediaType === 'video' ? <Video className="w-4 h-4 text-white/50" /> : <ImageIcon className="w-4 h-4 text-white/50" />}
                         </div>
                         <div className="flex-1 min-w-0">
                           <p className="text-sm font-medium truncate">{clip.name}</p>
                           <p className="text-xs text-white/40">{clip.duration.toFixed(1)}s</p>
                         </div>
                       </div>
                     ))}
                   </div>
                )}
              </TabsContent>

              <TabsContent value="text" className="mt-0 space-y-4">
                <Button onClick={handleAddText} className="w-full bg-white/10 hover:bg-white/20 text-white">
                  <Plus className="w-4 h-4 mr-2" /> Add Text Layer
                </Button>
                {selectedClip?.type === 'text' ? (
                  <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="space-y-2">
                       <Label>Content</Label>
                       <Input 
                         value={selectedClip.text} 
                         onChange={(e) => updateClip(selectedClip.id, { text: e.target.value })} 
                         className="bg-black/20 border-white/10"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label>Size</Label>
                       <Slider 
                         value={[selectedClip.style.fontSize]} 
                         onValueChange={(v) => updateClip(selectedClip.id, { style: { ...selectedClip.style, fontSize: v[0] }})}
                         min={12} max={200}
                       />
                    </div>
                    <div className="space-y-2">
                       <Label>Color</Label>
                       <div className="flex gap-2">
                         {['#FFFFFF', '#000000', '#FF6B35', '#FFB800', '#F72C25'].map(c => (
                           <button
                             key={c}
                             className={`w-6 h-6 rounded-full border border-white/20 ${selectedClip.style.color === c ? 'ring-2 ring-white' : ''}`}
                             style={{ backgroundColor: c }}
                             onClick={() => updateClip(selectedClip.id, { style: { ...selectedClip.style, color: c }})}
                           />
                         ))}
                       </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-white/40 text-center py-4">Select a text clip to edit</p>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* MAIN STAGE */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0A0A0A]">
          {/* PREVIEW AREA */}
          <div className="flex-1 flex items-center justify-center p-8 relative">
            <div className="relative shadow-2xl shadow-black/50 rounded-lg overflow-hidden border border-white/10 bg-black aspect-video max-h-full">
               <canvas 
                 ref={canvasRef} 
                 width={CANVAS_WIDTH} 
                 height={CANVAS_HEIGHT}
                 className="w-full h-full object-contain"
               />
               
               {/* Overlay Controls (simple resizing/moving placeholders could go here) */}
               {!isPlaying && selectedClip?.type === 'text' && (
                 <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                   <div className="border-2 border-[#FF6B35] p-4 rounded-lg bg-[#FF6B35]/10">
                     <p className="text-xs text-[#FF6B35] font-bold">TEXT LAYER SELECTED</p>
                   </div>
                 </div>
               )}
            </div>
          </div>

          {/* PLAYBACK CONTROLS */}
          <div className="h-16 border-t border-white/5 bg-[#141414] flex items-center justify-center gap-4 px-4">
             <span className="text-xs font-mono text-white/60">{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span>
             <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 rounded-full">
               <SkipBack className="w-5 h-5" onClick={() => setCurrentTime(0)} />
             </Button>
             <Button size="icon" className="w-12 h-12 rounded-full btn-gradient text-white shadow-lg shadow-orange-500/20" onClick={togglePlay}>
               {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
             </Button>
             <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 rounded-full">
               <SkipForward className="w-5 h-5" onClick={() => setCurrentTime(duration)} />
             </Button>
             <span className="text-xs font-mono text-white/60">{new Date(duration * 1000).toISOString().substr(14, 5)}</span>
          </div>

          {/* TIMELINE */}
          <div className="h-64 bg-[#0F0F0F] border-t border-white/5 flex flex-col">
            <div className="h-8 border-b border-white/5 flex items-center px-4 justify-between">
              <span className="text-xs font-medium text-white/40">TIMELINE</span>
              <div className="flex items-center gap-2">
                 <ZoomOut className="w-3 h-3 text-white/40" />
                 <Slider value={[zoom]} onValueChange={(v) => setZoom(v[0])} min={0.5} max={5} step={0.1} className="w-24" />
                 <ZoomIn className="w-3 h-3 text-white/40" />
              </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar relative">
              <div 
                className="h-full relative min-w-full"
                style={{ width: `${Math.max(100, duration * 20 * zoom)}%` }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percent = x / rect.width;
                  setCurrentTime(percent * (duration || 10)); // Default 10s if empty
                }}
              >
                {/* Time Ruler */}
                <div className="h-6 border-b border-white/5 flex pointer-events-none">
                  {Array.from({ length: Math.ceil(duration || 10) }).map((_, i) => (
                    <div key={i} className="flex-1 border-l border-white/5 text-[10px] text-white/20 pl-1">
                      {i}s
                    </div>
                  ))}
                </div>

                {/* Playhead */}
                <div 
                  className="absolute top-0 bottom-0 w-px bg-[#FF6B35] z-50 pointer-events-none"
                  style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
                >
                  <div className="w-3 h-3 -ml-1.5 bg-[#FF6B35] rounded-full mt-5" />
                </div>

                {/* Tracks */}
                <div className="p-4 space-y-2">
                  {tracks.map((track, trackIndex) => (
                    <div key={track.id} className="relative h-12 bg-white/5 rounded-lg border border-white/5 group">
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/20 uppercase tracking-widest pointer-events-none">
                        {track.name}
                      </div>
                      
                      {track.clips.map(clip => (
                        <div
                          key={clip.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedClip(clip); }}
                          className={`absolute top-1 bottom-1 rounded-md cursor-pointer border-2 transition-all flex items-center px-2 overflow-hidden ${
                            selectedClip?.id === clip.id ? 'border-[#FF6B35] bg-[#FF6B35]/20 z-10' : 'border-transparent bg-white/10 hover:bg-white/20'
                          }`}
                          style={{
                            left: `${(clip.start / (duration || 1)) * 100}%`,
                            width: `${(clip.duration / (duration || 1)) * 100}%`,
                          }}
                        >
                          <span className="text-xs font-medium truncate text-white/80">{clip.name || clip.text}</span>
                          
                          {selectedClip?.id === clip.id && (
                             <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                               <button onClick={(e) => { e.stopPropagation(); deleteClip(clip.id); }} className="p-1 hover:bg-red-500 rounded text-white/60 hover:text-white">
                                 <Trash2 className="w-3 h-3" />
                               </button>
                             </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}