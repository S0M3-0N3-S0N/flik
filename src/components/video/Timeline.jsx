import React, { useRef } from 'react';
import { ZoomIn, ZoomOut, Trash2, Edit2, Volume2, VolumeX, Lock, Unlock, Split, Undo, Redo, Scissors } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function Timeline({
  tracks,
  duration,
  currentTime,
  zoom,
  setZoom,
  selectedClip,
  setSelectedClip,
  handleClipMouseDown,
  handleDeleteClip,
  setEditingText,
  setActiveTab,
  onSplitClip,
  onUndo,
  onRedo,
  snappingLine,
  onSeek,
  onToggleTrackMute,
  onToggleTrackLock,
  onRippleDelete
}) {
  const timelineRef = useRef(null);

  const handleTimelineClick = (e) => {
      // Seek logic
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const time = percentage * Math.max(duration, 1);
      if (onSeek) onSeek(Math.max(0, Math.min(time, duration)));
  };

  // Time markers
  const renderTimeMarkers = () => {
    const markers = [];
    const step = 5; // seconds
    const totalDuration = Math.max(duration, 60); // min 60s
    
    for (let i = 0; i <= totalDuration; i += step) {
      markers.push(
        <div key={i} className="absolute top-0 flex flex-col items-center h-full select-none pointer-events-none" style={{ left: `${(i / totalDuration) * 100}%`, transform: 'translateX(-50%)' }}>
          <div className="h-1.5 w-px bg-white/40 mb-1" />
          <span className="text-[10px] text-white/40 font-mono">
            {Math.floor(i / 60)}:{(i % 60).toString().padStart(2, '0')}
          </span>
        </div>
      );
    }
    return markers;
  };

  return (
    <div className="flex flex-col h-80 bg-[#121212] border-t border-white/10 select-none">
      {/* Top Toolbar */}
      <div className="h-10 border-b border-white/10 flex items-center justify-between px-4 bg-[#181818]">
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-white/5 rounded-md p-0.5 mr-3">
             <Button variant="ghost" size="icon" onClick={onUndo} className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10" title="Undo (Ctrl+Z)">
                 <Undo className="w-3.5 h-3.5" />
             </Button>
             <Button variant="ghost" size="icon" onClick={onRedo} className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10" title="Redo (Ctrl+Shift+Z)">
                 <Redo className="w-3.5 h-3.5" />
             </Button>
          </div>
          
          <Button 
             variant="ghost" 
             size="sm" 
             onClick={onSplitClip} 
             disabled={!selectedClip}
             className="h-7 px-3 text-xs text-white/80 hover:text-white hover:bg-white/10 gap-2"
          >
             <Scissors className="w-3.5 h-3.5" />
             Split
          </Button>
          <Button 
             variant="ghost" 
             size="sm" 
             onClick={() => { if(onRippleDelete && selectedClip) onRippleDelete(); }} 
             disabled={!selectedClip}
             className="h-7 px-3 text-xs text-white/80 hover:text-white hover:bg-white/10 gap-2"
          >
             <Trash2 className="w-3.5 h-3.5" />
             Ripple Del
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10">
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <div className="w-20 px-2 h-1 bg-white/10 rounded-full overflow-hidden">
             <div className="h-full bg-white/40" style={{ width: `${(zoom / 3) * 100}%` }} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(3, zoom + 0.25))} className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10">
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
         {/* Track Headers Column */}
         <div className="w-48 flex-shrink-0 bg-[#151515] border-r border-white/10 z-20 flex flex-col pt-8">
            {tracks.map((track) => (
                <div key={track.id} className="h-20 border-b border-white/5 px-3 flex flex-col justify-center gap-2 group hover:bg-white/5 transition-colors">
                   <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white/80 truncate">{track.name}</span>
                      <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                          <button 
                             onClick={() => onToggleTrackMute && onToggleTrackMute(track.id)}
                             className={`p-1.5 rounded-md transition-colors ${track.muted ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/10 text-white'}`}
                          >
                              {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                          </button>
                          <button 
                             onClick={() => onToggleTrackLock && onToggleTrackLock(track.id)}
                             className={`p-1.5 rounded-md transition-colors ${track.locked ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-white/10 text-white'}`}
                          >
                              {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          </button>
                      </div>
                   </div>
                   <div className="flex items-center gap-2 text-[10px] text-white/30">
                       <span className="uppercase tracking-wider">{track.type}</span>
                       <span className="w-1 h-1 rounded-full bg-white/20" />
                       <span>{track.clips.length} clips</span>
                   </div>
                </div>
            ))}
         </div>

         {/* Scrollable Timeline Area */}
         <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar bg-[#0A0A0A] relative">
            <div 
               ref={timelineRef} 
               className="relative h-full min-w-full" 
               style={{ width: `${Math.max(100, (duration / 20) * 100 * zoom)}%` }}
               onClick={() => setSelectedClip(null)}
            >
               {/* Time Ruler */}
               <div 
                  className="h-8 border-b border-white/10 bg-[#151515]/90 backdrop-blur sticky top-0 z-30 flex items-end pb-1 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={handleTimelineClick}
               >
                  {renderTimeMarkers()}
               </div>

               {/* Snapping Line */}
               {snappingLine !== null && (
                   <div 
                       className="absolute top-8 bottom-0 w-px bg-[#FF6B35] z-50 pointer-events-none shadow-[0_0_10px_rgba(255,107,53,0.5)]"
                       style={{ left: `${(snappingLine / Math.max(duration, 1)) * 100}%` }}
                   >
                       <div className="absolute top-0 -translate-x-1/2 -translate-y-1 bg-[#FF6B35] text-[9px] text-black px-1 rounded font-bold">
                           {snappingLine.toFixed(1)}s
                       </div>
                   </div>
               )}

               {/* Tracks Container */}
               <div className="relative" onClick={(e) => { if(e.target === e.currentTarget && onSeek) handleTimelineClick(e); }}>
                  {/* Background Grid */}
                  <div className="absolute inset-0 pointer-events-none z-0 flex">
                      {[...Array(Math.ceil(duration / 5))].map((_, i) => (
                        <div key={i} className="flex-1 border-r border-white/5" />
                      ))}
                  </div>

                  {tracks.map((track) => (
                      <div key={track.id} className="h-20 border-b border-white/5 relative w-full z-10">
                          {track.clips.map((clip) => (
                             <div
                               key={clip.id}
                               className={`absolute top-2 bottom-2 rounded-md overflow-hidden transition-all group/clip cursor-pointer select-none
                                  ${selectedClip?.id === clip.id 
                                     ? 'ring-2 ring-white shadow-lg z-20' 
                                     : 'ring-1 ring-white/10 hover:ring-white/30 z-10'
                                  }
                               `}
                               style={{
                                 left: `${(clip.start / Math.max(duration, 1)) * 100}%`,
                                 width: `${Math.max(0.5, (clip.duration / Math.max(duration, 1)) * 100)}%`,
                                 background: track.type === 'video' 
                                   ? 'linear-gradient(180deg, #2A2A2A 0%, #1A1A1A 100%)'
                                   : track.type === 'audio'
                                   ? 'linear-gradient(180deg, #1A2A3A 0%, #0F1A25 100%)'
                                   : 'linear-gradient(180deg, #2A1A3A 0%, #1A0F25 100%)',
                               }}
                               onMouseDown={(e) => handleClipMouseDown(e, clip)}
                               onClick={(e) => { e.stopPropagation(); setSelectedClip(clip); }}
                             >
                               {/* Clip Content */}
                               <div className="absolute inset-0 flex items-center p-2 gap-2">
                                  {/* Progress Bar/Fill */}
                                  <div className={`absolute bottom-0 left-0 h-1 right-0 opacity-50
                                      ${track.type === 'video' ? 'bg-[#FF6B35]' : track.type === 'audio' ? 'bg-[#3B82F6]' : 'bg-[#A855F7]'}
                                  `} />
                                  
                                  {track.type === 'video' && (
                                      <div className="h-full aspect-video bg-black/50 rounded-sm overflow-hidden flex-shrink-0 border border-white/10">
                                           {/* We could show a thumbnail here if we generated one, for now video element */}
                                           <video src={clip.url} className="w-full h-full object-cover opacity-50" />
                                      </div>
                                  )}
                                  
                                  {track.type === 'audio' && (
                                      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none px-2">
                                          <div className="w-full h-1/2 flex items-end gap-[1px]">
                                              {[...Array(30)].map((_, i) => (
                                                  <div key={i} className="flex-1 bg-white rounded-t-sm" style={{ height: `${20 + Math.random() * 80}%` }} />
                                              ))}
                                          </div>
                                      </div>
                                  )}

                                  <span className="text-[10px] font-medium text-white/90 truncate relative z-10 drop-shadow-md">
                                      {clip.name || clip.text || 'Untitled Clip'}
                                  </span>
                               </div>

                               {/* Drag Handles */}
                               <div className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize hover:bg-white/20 z-30 transition-colors" onMouseDown={(e) => handleClipMouseDown(e, clip, 'left')} />
                               <div className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-white/20 z-30 transition-colors" onMouseDown={(e) => handleClipMouseDown(e, clip, 'right')} />

                               {/* Hover Actions */}
                               <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover/clip:opacity-100 transition-opacity z-20">
                                   {track.type === 'text' && (
                                       <button 
                                          className="p-1 rounded bg-black/50 text-white/80 hover:text-white hover:bg-black/80" 
                                          onClick={(e) => { e.stopPropagation(); setEditingText(clip); setActiveTab('text'); }}
                                          title="Edit Text"
                                       >
                                           <Edit2 className="w-3 h-3" />
                                       </button>
                                   )}
                                   <button 
                                      className="p-1 rounded bg-black/50 text-white/80 hover:text-white hover:bg-black/80 hover:text-red-400" 
                                      onClick={(e) => { e.stopPropagation(); handleDeleteClip(track.id, clip.id); }}
                                      title="Delete Clip"
                                   >
                                       <Trash2 className="w-3 h-3" />
                                   </button>
                               </div>
                             </div>
                          ))}
                      </div>
                  ))}
               </div>

               {/* Playhead */}
               <div
                  className="absolute top-0 bottom-0 w-px bg-white z-40 pointer-events-none group"
                  style={{ left: `${(currentTime / Math.max(duration, 1)) * 100}%` }}
               >
                  <div className="absolute top-0 -translate-x-1/2 w-3 h-3 bg-white rotate-45 shadow-sm transform origin-center" />
                  <div className="absolute top-[-20px] left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {currentTime.toFixed(2)}s
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}