import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Play, Pause, SkipBack, SkipForward, Download, Video as VideoIcon, 
  ArrowLeft, X, Undo, Redo, LayoutTemplate
} from "lucide-react";
// import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

import VideoPlayer from "@/components/video/VideoPlayer";
import Timeline from "@/components/video/Timeline";
import LibraryPanel from "@/components/video/LibraryPanel";
import InspectorPanel from "@/components/video/InspectorPanel";

export default function VideoEditor() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60); 
  const [volume, setVolume] = useState(100);
  const [zoom, setZoom] = useState(1);
  const [aspectRatio, setAspectRatio] = useState("16:9"); 
  const [clipboard, setClipboard] = useState(null);
  const [snappingLine, setSnappingLine] = useState(null); 

  // History for Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [tracks, setTracksInternal] = useState([
    { id: 'video', type: 'video', clips: [], name: 'Video Track', muted: false, locked: false },
    { id: 'audio', type: 'audio', clips: [], name: 'Audio Track', muted: false, locked: false },
    { id: 'text', type: 'text', clips: [], name: 'Text Track', muted: false, locked: false },
  ]);

  // Memory Cleanup
  useEffect(() => {
    return () => {
      tracks.forEach(t => t.clips.forEach(c => {
        if (c.url && c.url.startsWith('blob:')) URL.revokeObjectURL(c.url);
      }));
    };
  }, []);

  // Wrapper to save history
  const setTracks = (newTracksOrFn) => {
      setTracksInternal(prev => {
          const newTracks = typeof newTracksOrFn === 'function' ? newTracksOrFn(prev) : newTracksOrFn;
          
          // Add to history
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(newTracks);
          if (newHistory.length > 20) newHistory.shift();
          
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
          
          return newTracks;
      });
  };

  const handleUndo = () => {
      if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setTracksInternal(history[newIndex]);
      }
  };

  const handleRedo = () => {
      if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setTracksInternal(history[newIndex]);
      }
  };

  // Initialize history
  useEffect(() => {
      if (history.length === 0) {
          setHistory([tracks]);
          setHistoryIndex(0);
      }
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch(e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          setIsPlaying(p => !p);
          break;
        case 's':
          handleSplitClip();
          break;
        case 'delete':
        case 'backspace':
          if (selectedClip) handleDeleteClip(tracks.find(t => t.clips.find(c => c.id === selectedClip.id))?.id, selectedClip.id);
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
             e.preventDefault();
             e.shiftKey ? handleRedo() : handleUndo();
          }
          break;
        case 'c':
          if ((e.ctrlKey || e.metaKey) && selectedClip) {
             setClipboard(selectedClip);
          }
          break;
        case 'v':
          if ((e.ctrlKey || e.metaKey) && clipboard) {
             handlePaste();
          }
          break;
        case 'arrowleft':
          setCurrentTime(t => Math.max(0, t - 1/30)); // 1 frame
          break;
        case 'arrowright':
          setCurrentTime(t => Math.min(duration, t + 1/30));
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClip, clipboard, tracks, historyIndex]);

  const handlePaste = () => {
      if (!clipboard) return;
      const targetTrack = tracks.find(t => t.type === clipboard.type) || tracks[0];
      const newClip = {
          ...clipboard,
          id: Date.now(),
          start: currentTime,
          name: `${clipboard.name} (Copy)`
      };
      addClipToTrack(targetTrack.id, newClip);
  };

  const handleRippleDelete = () => {
      if (!selectedClip) return;
      const trackId = tracks.find(t => t.clips.find(c => c.id === selectedClip.id))?.id;
      const deletedDuration = selectedClip.duration;
      const deletedStart = selectedClip.start;
      
      setTracks(prev => prev.map(t => {
          if (t.id === trackId) {
              return {
                  ...t,
                  clips: t.clips
                      .filter(c => c.id !== selectedClip.id)
                      .map(c => ({
                          ...c,
                          start: c.start > deletedStart ? c.start - deletedDuration : c.start
                      }))
              };
          }
          return t;
      }));
      setSelectedClip(null);
  };

  const [selectedClip, setSelectedClip] = useState(null);
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
       const newClip = {
          id: Date.now(),
          type: 'video',
          url: loadUrl,
          name: 'Imported Video',
          start: 0,
          duration: 10,
          transition: null
       };
       const newTracks = [...tracks];
       newTracks[0].clips.push(newClip);
       setTracks(newTracks);
       
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
    
    files.forEach((file, index) => {
      if (file.type.startsWith('video/') || file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        const isVideo = file.type.startsWith('video/');
        
        const newClip = {
          id: Date.now() + index,
          type: 'video',
          url: url,
          name: file.name,
          start: 0, 
          duration: 5, 
          offset: 0,
          volume: 100,
          transition: 'fade',
          };

        if (isVideo) {
            const video = document.createElement('video');
            video.src = url;
            video.onloadedmetadata = () => {
                newClip.duration = video.duration;
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
        
        if (clip.start === undefined || clip.start === null) {
            let startTime = 0;
            if (track.clips.length > 0) {
                const lastClip = track.clips[track.clips.length - 1];
                startTime = lastClip.start + lastClip.duration;
            }
            clip.start = startTime;
        }
        
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
      setSelectedClip(newClip);
  };

  const handleUpdateTextClip = (updates) => {
      if (!editingText) return;
      const updatedClip = { ...editingText, ...updates };
      setEditingText(updatedClip);
      setSelectedClip(updatedClip); // Update selected clip as well
      
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

  const handleClipMouseDown = (e, clip, edge = null) => {
      e.stopPropagation();
      if (edge) {
          setClipResizing({ clip, edge, startX: e.clientX, startDuration: clip.duration, startStart: clip.start });
      } else {
          setClipDragging({ clip, startX: e.clientX, startStart: clip.start });
      }
      setSelectedClip(clip);
      if (clip.type === 'text') setEditingText(clip);
      else setEditingText(null);
  };

  const handleMouseMove = (e) => {
      if (!clipDragging && !clipResizing) return;
      
      const sensitivity = 0.1 / zoom; 
      const deltaX = (e.clientX - (clipDragging?.startX || clipResizing?.startX));
      const deltaTime = deltaX * sensitivity;

      if (clipDragging) {
          let newStart = Math.max(0, clipDragging.startStart + deltaTime);
          
          const snapThreshold = 0.5;
          let snapped = false;
          
          tracks.forEach(track => {
             track.clips.forEach(clip => {
                if (clip.id === clipDragging.clip.id) return;
                
                const end = clip.start + clip.duration;
                if (Math.abs(newStart - end) < snapThreshold) {
                    newStart = end;
                    snapped = true;
                }
                
                if (Math.abs(newStart - clip.start) < snapThreshold) {
                  newStart = clip.start;
                  snapped = true;
                }
                });
                });

                if (Math.abs(newStart) < snapThreshold) {
                newStart = 0;
                snapped = true;
                }

                if (snapped) setSnappingLine(newStart);
                else setSnappingLine(null);

                updateClipInTracks(clipDragging.clip.id, { start: newStart });
                } else if (clipResizing) {
          if (clipResizing.edge === 'right') {
              const newDuration = Math.max(0.5, clipResizing.startDuration + deltaTime);
              updateClipInTracks(clipResizing.clip.id, { duration: newDuration });
          } else {
             const newStart = Math.max(0, Math.min(clipResizing.startStart + clipResizing.startDuration - 0.5, clipResizing.startStart + deltaTime));
             const newDuration = clipResizing.startDuration - (newStart - clipResizing.startStart);
             updateClipInTracks(clipResizing.clip.id, { start: newStart, duration: newDuration });
          }
      }
  };

  const handleMouseUp = () => {
      setClipDragging(null);
      setClipResizing(null);
      setSnappingLine(null);
  };

  const updateClipInTracks = (clipId, updates) => {
      setTracks(prev => prev.map(t => ({
          ...t,
          clips: t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c)
      })));
      if (selectedClip?.id === clipId) setSelectedClip(prev => ({...prev, ...updates}));
  };

  const handleSplitClip = () => {
      if (!selectedClip) return;
      if (currentTime <= selectedClip.start || currentTime >= selectedClip.start + selectedClip.duration) {
          alert("Move playhead inside the selected clip to split.");
          return;
      }

      const splitPoint = currentTime;
      const firstPartDuration = splitPoint - selectedClip.start;
      const remainingDuration = selectedClip.duration - firstPartDuration;

      setTracks(prev => {
          return prev.map(track => {
              if (!track.clips.find(c => c.id === selectedClip.id)) return track;

              const newClips = [];
              track.clips.forEach(clip => {
                  if (clip.id === selectedClip.id) {
                      newClips.push({
                          ...clip,
                          duration: firstPartDuration
                      });
                      newClips.push({
                          ...clip,
                          id: Date.now(),
                          start: splitPoint,
                          duration: remainingDuration,
                          offset: (clip.offset || 0) + firstPartDuration,
                          name: `${clip.name} (Part 2)`
                      });
                  } else {
                      newClips.push(clip);
                  }
              });

              return { ...track, clips: newClips };
          });
      });
      setSelectedClip(null);
  };

  const handleSmartExport = async () => {
    if (!playerRef.current) return;
    setCurrentTime(0);
    await new Promise(r => setTimeout(r, 200));
    setIsPlaying(true);
    setIsExporting(true);
    abortExport.current = false;
    playerRef.current.startRecording();
    const endTime = Math.max(...tracks.map(t => t.clips.reduce((max, c) => Math.max(max, c.start + c.duration), 0)));
    const checkEnd = setInterval(async () => {
        if (abortExport.current) {
             clearInterval(checkEnd);
             return;
        }
        setCurrentTime(curr => {
            if (curr >= endTime) {
                clearInterval(checkEnd);
                finishExport();
                return curr;
            }
            return curr;
        });
    }, 1000); 
    
    const abortExport = { current: false };

    const cancelExport = () => {
        abortExport.current = true;
        setIsExporting(false);
        setIsPlaying(false);
        if (playerRef.current) playerRef.current.stopRecording();
    };

    const finishExport = async () => {
        setIsPlaying(false);
        if (abortExport.current) return;
        const blob = await playerRef.current.stopRecording();
        if (!blob) return;
        const file = new File([blob], 'my_movie.webm', { type: 'video/webm' });
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            await base44.entities.Creation.create({
                title: 'My Video Project',
                type: 'video',
                url: file_url,
                thumbnail_url: file_url 
            });
            const a = document.createElement('a');
            a.href = file_url;
            a.download = 'movie.webm';
            a.click();
            alert("Export Complete! Video saved to gallery.");
        } catch (e) {
            console.error(e);
            alert("Export complete (Local save only - Upload failed)");
            const u = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = u;
            a.download = 'movie.webm';
            a.click();
        }
        setIsExporting(false);
    };
  };

  const abortExport = useRef(false);
  const cancelExport = () => {
        abortExport.current = true;
        setIsExporting(false);
        setIsPlaying(false);
        if (playerRef.current) playerRef.current.stopRecording();
  };


  return (
    <div 
      className="h-screen flex flex-col bg-[#0A0A0A] overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#0A0A0A] shrink-0 z-50"
      >
        <div className="flex items-center gap-4">
          <a href={createPageUrl("Dashboard")} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div className="flex items-center gap-2">
              <span className="font-bold text-white">Video Studio</span>
              <span className="text-xs text-white/40 px-2 py-0.5 rounded bg-white/5 border border-white/5">PRO</span>
          </div>
          {isExporting && <span className="text-xs text-[#FF6B35] animate-pulse">● Recording...</span>}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 mr-4">
               <Button variant="ghost" size="icon" onClick={handleUndo} className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10">
                   <Undo className="w-4 h-4" />
               </Button>
               <Button variant="ghost" size="icon" onClick={handleRedo} className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10">
                   <Redo className="w-4 h-4" />
               </Button>
          </div>

          <Button
            onClick={isExporting ? cancelExport : handleSmartExport}
            className={isExporting ? "bg-red-500 hover:bg-red-600 text-white h-8 text-xs" : "bg-[#FF6B35] hover:bg-[#E65A2C] text-white h-8 text-xs"}
          >
            {isExporting ? <><X className="w-3 h-3 mr-2" /> Cancel</> : <><Download className="w-3 h-3 mr-2" /> Export</>}
          </Button>
        </div>
      </motion.div>

      <div className="flex-1 overflow-hidden relative">
          <ResizablePanelGroup direction="horizontal">
              {/* Left Panel: Library */}
              <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="z-10">
                  <LibraryPanel 
                    tracks={tracks}
                    handleFileUpload={handleFileUpload}
                    handleAudioUpload={handleAudioUpload}
                    handleAddTextClip={handleAddTextClip}
                    handleDeleteClip={handleDeleteClip}
                  />
              </ResizablePanel>
              
              <ResizableHandle className="bg-white/5 hover:bg-[#FF6B35] transition-colors w-1" />
              
              {/* Center Panel: Preview & Timeline */}
              <ResizablePanel defaultSize={60} minSize={40}>
                  <ResizablePanelGroup direction="vertical">
                      {/* Top: Video Player */}
                      <ResizablePanel defaultSize={60} minSize={30} className="bg-[#141414] relative flex flex-col">
                            <div className="flex-1 relative flex items-center justify-center p-4 bg-dots-pattern">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,107,53,0.05),transparent_70%)]" />
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <VideoPlayer
                                        ref={playerRef}
                                        tracks={tracks}
                                        currentTime={currentTime}
                                        isPlaying={isPlaying}
                                        onTimeUpdate={setCurrentTime}
                                        videoEffects={videoEffects}
                                        zoom={zoom}
                                        volume={volume}
                                        aspectRatio={aspectRatio}
                                    />
                                </div>
                            </div>
                            
                            {/* Player Controls Bar */}
                            <div className="h-12 border-t border-white/5 bg-[#0A0A0A] flex items-center justify-between px-4 shrink-0">
                                <div className="flex items-center gap-2 text-xs text-white/40 font-mono">
                                    <span>{currentTime.toFixed(2)}s</span>
                                    <span>/</span>
                                    <span>{duration.toFixed(2)}s</span>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => setCurrentTime(t => Math.max(0, t - 1))} className="text-white hover:bg-white/10 w-8 h-8 rounded-full">
                                        <SkipBack className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setIsPlaying(!isPlaying)} className="text-white bg-white/10 hover:bg-white/20 w-8 h-8 rounded-full">
                                        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current pl-0.5" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setCurrentTime(t => Math.min(duration, t + 1))} className="text-white hover:bg-white/10 w-8 h-8 rounded-full">
                                        <SkipForward className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div className="w-24">
                                     {/* Volume or Empty Space */}
                                </div>
                            </div>
                      </ResizablePanel>
                      
                      <ResizableHandle className="bg-white/5 hover:bg-[#FF6B35] transition-colors h-1" />
                      
                      {/* Bottom: Timeline */}
                      <ResizablePanel defaultSize={40} minSize={20} className="bg-[#0A0A0A]">
                          <Timeline 
                             tracks={tracks}
                             duration={duration}
                             currentTime={currentTime}
                             zoom={zoom}
                             setZoom={setZoom}
                             selectedClip={selectedClip}
                             setSelectedClip={(clip) => {
                                 setSelectedClip(clip);
                                 if (clip?.type === 'text') setEditingText(clip);
                                 else setEditingText(null);
                             }}
                             handleClipMouseDown={handleClipMouseDown}
                             handleDeleteClip={handleDeleteClip}
                             setEditingText={setEditingText}
                             setActiveTab={() => {}} // Legacy
                             onSplitClip={handleSplitClip}
                             onUndo={handleUndo}
                             onRedo={handleRedo}
                             snappingLine={snappingLine}
                             onSeek={setCurrentTime}
                             onToggleTrackMute={(id) => setTracks(prev => prev.map(t => t.id === id ? { ...t, muted: !t.muted } : t))}
                             onToggleTrackLock={(id) => setTracks(prev => prev.map(t => t.id === id ? { ...t, locked: !t.locked } : t))}
                             onRippleDelete={handleRippleDelete}
                          />
                      </ResizablePanel>
                  </ResizablePanelGroup>
              </ResizablePanel>

              <ResizableHandle className="bg-white/5 hover:bg-[#FF6B35] transition-colors w-1" />

              {/* Right Panel: Inspector */}
              <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                  <InspectorPanel 
                    selectedClip={selectedClip}
                    handleUpdateClip={updateClipInTracks}
                    editingText={editingText}
                    setEditingText={setEditingText}
                    handleUpdateTextClip={handleUpdateTextClip}
                    videoEffects={videoEffects}
                    setVideoEffects={setVideoEffects}
                    handleApplyEffect={(name) => {
                        if (name === 'B&W') setVideoEffects({ ...videoEffects, saturation: 0 });
                        if (name === 'Sepia') setVideoEffects({ ...videoEffects, sepia: 100 });
                        if (name === 'Glow') setVideoEffects({ ...videoEffects, brightness: 120, blur: 1 });
                    }}
                    playbackSpeed={playbackSpeed}
                    handleSpeedChange={setPlaybackSpeed}
                    aspectRatio={aspectRatio}
                    onAspectRatioChange={setAspectRatio}
                  />
              </ResizablePanel>
          </ResizablePanelGroup>
      </div>
    </div>
  );
}