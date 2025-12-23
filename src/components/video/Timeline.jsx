import React, { useRef } from 'react';
import { ZoomIn, ZoomOut, Trash2, Edit2 } from 'lucide-react';
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
  setActiveTab
}) {
  const timelineRef = useRef(null);

  // Time markers
  const renderTimeMarkers = () => {
    const markers = [];
    const step = 5; // seconds
    const totalDuration = Math.max(duration, 60); // min 60s
    
    for (let i = 0; i <= totalDuration; i += step) {
      markers.push(
        <div key={i} className="absolute top-0 text-[10px] text-white/30 border-l border-white/10 pl-1 h-full select-none pointer-events-none" style={{ left: `${(i / totalDuration) * 100}%` }}>
          {i}s
        </div>
      );
    }
    return markers;
  };

  return (
    <div className="border-t border-white/5 glass-card p-4 h-72 flex flex-col">
      <div className="mb-4 flex items-center justify-between shrink-0">
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

      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar">
        <div 
           ref={timelineRef} 
           className="relative h-full min-w-full" 
           style={{ width: `${Math.max(100, (duration / 20) * 100 * zoom)}%` }}
        >
          {/* Header/Ruler */}
          <div className="h-6 border-b border-white/10 relative mb-2">
             {renderTimeMarkers()}
          </div>

          <div className="space-y-3 pb-4">
            {tracks.map((track) => (
              <div key={track.id} className="flex gap-2 group relative">
                <div className="w-24 flex-shrink-0 sticky left-0 z-20 bg-[#0A0A0A] border-r border-white/10 flex items-center px-2 h-16">
                  <p className="text-xs text-white/60 font-medium">{track.name}</p>
                </div>
                
                <div className="flex-1 h-16 bg-white/5 rounded-lg relative overflow-hidden ring-1 ring-white/5">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex pointer-events-none opacity-10">
                    {[...Array(Math.ceil(duration / 5))].map((_, i) => (
                      <div key={i} className="flex-1 border-r border-white" />
                    ))}
                  </div>

                  {track.clips.map((clip) => (
                    <div
                      key={clip.id}
                      className={`absolute top-1 bottom-1 rounded-md px-2 flex items-center overflow-hidden transition-all shadow-lg ${
                        selectedClip?.id === clip.id ? 'ring-2 ring-white z-10' : 'hover:ring-1 hover:ring-white/50'
                      }`}
                      style={{
                        left: `${(clip.start / Math.max(duration, 1)) * 100}%`,
                        width: `${Math.max(0.5, (clip.duration / Math.max(duration, 1)) * 100)}%`,
                        background: track.type === 'video' 
                          ? 'linear-gradient(to bottom, #FF6B35 0%, #E65A2C 100%)'
                          : track.type === 'audio'
                          ? 'linear-gradient(to bottom, #FFB800 0%, #E5A600 100%)'
                          : 'linear-gradient(to bottom, #8B5CF6 0%, #7C3AED 100%)',
                      }}
                      onMouseDown={(e) => handleClipMouseDown(e, clip)}
                      onClick={(e) => { e.stopPropagation(); setSelectedClip(clip); }}
                    >
                      {/* Drag Handles */}
                      <div className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/20 z-10" onMouseDown={(e) => handleClipMouseDown(e, clip, 'left')} />
                      
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-white/90 truncate drop-shadow-md select-none">
                              {clip.name || clip.text}
                          </span>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover/clip:opacity-100 transition-opacity">
                         {track.type === 'text' && (
                             <Button size="icon" variant="ghost" className="h-5 w-5 text-white/80 hover:bg-black/20" onClick={(e) => { e.stopPropagation(); setEditingText(clip); setActiveTab('text'); }}>
                                 <Edit2 className="w-3 h-3" />
                             </Button>
                         )}
                         <Button size="icon" variant="ghost" className="h-5 w-5 text-white/80 hover:bg-black/20" onClick={(e) => { e.stopPropagation(); handleDeleteClip(track.id, clip.id); }}>
                             <Trash2 className="w-3 h-3" />
                         </Button>
                      </div>

                      <div className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/20 z-10" onMouseDown={(e) => handleClipMouseDown(e, clip, 'right')} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Playhead */}
          <div
            className="absolute top-6 bottom-0 w-0.5 bg-white z-30 pointer-events-none"
            style={{ left: `${(currentTime / Math.max(duration, 1)) * 100}%` }}
          >
            <div className="w-3 h-3 bg-white rotate-45 -translate-x-1.5 -translate-y-1.5 shadow-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}