import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Edit2, Trash2 } from 'lucide-react';

export default function Timeline({ 
  tracks, 
  duration, 
  currentTime, 
  zoom, 
  setZoom, 
  selectedClip, 
  onSelectClip, 
  onUpdateClip,
  onDeleteClip,
  onSeek 
}) {
  const timelineRef = useRef(null);

  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    onSeek(Math.max(0, Math.min(newTime, duration)));
  };

  return (
    <div className="border-t border-white/5 glass-card p-4 h-64 flex flex-col">
      {/* Timeline Controls */}
      <div className="mb-4 flex items-center justify-between flex-shrink-0">
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

      {/* Tracks Container */}
      <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
        <div 
          ref={timelineRef}
          className="relative min-w-full h-full pb-8" 
          style={{ width: `${zoom * 100}%` }}
          onClick={handleTimelineClick}
        >
          {/* Time Ruler */}
          <div className="absolute top-0 left-0 right-0 h-6 border-b border-white/10 flex text-[10px] text-white/30 select-none pointer-events-none">
             {[...Array(20)].map((_, i) => (
               <div key={i} className="flex-1 border-l border-white/5 pl-1">
                 {Math.round((duration / 20) * i)}s
               </div>
             ))}
          </div>

          <div className="mt-8 space-y-3">
            {tracks.map((track) => (
              <div key={track.id} className="relative h-14 bg-white/5 rounded-lg border border-white/5">
                {/* Track Label */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/20 bg-black/40 px-1 rounded">
                    {track.name}
                  </span>
                </div>

                {/* Clips */}
                {track.clips.map((clip) => (
                  <div
                    key={clip.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectClip(clip);
                    }}
                    className={`absolute top-1 bottom-1 rounded-md border flex items-center justify-center overflow-hidden cursor-pointer transition-all ${
                      selectedClip?.id === clip.id 
                        ? 'border-white/80 ring-2 ring-[#FF6B35]/50 z-20 shadow-lg' 
                        : 'border-white/10 hover:border-white/40 z-10'
                    }`}
                    style={{
                      left: `${(clip.start / (duration || 1)) * 100}%`,
                      width: `${(clip.duration / (duration || 1)) * 100}%`,
                      backgroundColor: track.type === 'video' ? '#FF6B35' : 
                                     track.type === 'audio' ? '#3B82F6' : '#10B981',
                      background: track.type === 'video' 
                        ? 'linear-gradient(180deg, rgba(255,107,53,0.8) 0%, rgba(255,107,53,0.6) 100%)'
                        : undefined
                    }}
                  >
                    <span className="text-xs font-medium text-white shadow-sm truncate px-2">
                      {clip.name || clip.text}
                    </span>
                    
                    {/* Clip Actions (Only visible on hover/select) */}
                    {selectedClip?.id === clip.id && (
                       <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteClip(track.id, clip.id); }}
                            className="p-1 hover:bg-black/20 rounded text-white/80 hover:text-white"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                       </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Playhead */}
          <div 
            className="absolute top-6 bottom-0 w-px bg-white z-50 pointer-events-none"
            style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
          >
            <div className="w-3 h-3 -ml-1.5 bg-[#FF6B35] rotate-45 transform shadow-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}