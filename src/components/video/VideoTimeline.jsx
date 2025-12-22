import React from "react";
import { Edit2, Trash2, ZoomIn, ZoomOut, Scissors, Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export default function VideoTimeline({ 
  tracks, 
  currentTime, 
  duration, 
  zoom, 
  setZoom,
  selectedClip,
  setSelectedClip,
  onClipMouseDown,
  onEditClip,
  onDeleteClip,
  onSplitClip,
  onUndo,
  undoHistory,
  timelineRef
}) {
  const rulerTicks = Math.ceil(duration || 60);

  return (
    <div className="h-72 bg-[#121212] border-t border-white/10 flex flex-col shrink-0">
      {/* Timeline Toolbar */}
      <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-[#141414]">
          <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onUndo} 
                disabled={!undoHistory.length}
                className="text-white/60 hover:text-white hover:bg-white/10 h-8"
              >
                  <Undo2 className="w-4 h-4 mr-2" /> Undo
              </Button>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onSplitClip} 
                disabled={!selectedClip || selectedClip.type !== 'video'}
                className="text-white/60 hover:text-white hover:bg-white/10 h-8"
              >
                  <Scissors className="w-4 h-4 mr-2" /> Split
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => selectedClip && onDeleteClip(null, selectedClip.id)} // Pass null trackId if we just use selectedClip logic or we need trackId
                disabled={!selectedClip}
                className="text-white/60 hover:text-red-400 hover:bg-red-500/10 h-8"
              >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
          </div>
          
          <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} className="text-white/60 hover:text-white h-8 w-8">
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Slider 
                value={[zoom]} 
                onValueChange={(v) => setZoom(v[0])} 
                min={0.5} 
                max={3} 
                step={0.1} 
                className="w-24"
              />
              <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(3, zoom + 0.25))} className="text-white/60 hover:text-white h-8 w-8">
                <ZoomIn className="w-4 h-4" />
              </Button>
          </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar">
          <div ref={timelineRef} className="relative h-full min-w-full" style={{ width: `${Math.max(100, (duration || 60) * 10 * zoom)}%` }}>
             
             {/* Ruler */}
             <div className="h-6 border-b border-white/5 flex items-end select-none bg-[#141414] sticky top-0 z-20">
                 {[...Array(rulerTicks + 1)].map((_, i) => (
                    <div key={i} className="absolute bottom-0 border-l border-white/20 h-2 flex flex-col items-center justify-end" style={{ left: `${(i / (duration || 60)) * 100}%` }}>
                        <span className="text-[10px] text-white/30 -mb-4 font-mono">{i}s</span>
                    </div>
                 ))}
             </div>

             {/* Playhead Cursor */}
             <div 
                className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center"
                style={{ left: `${(currentTime / (duration || 60)) * 100}%` }}
             >
                 <div className="w-3 h-3 bg-[#FF6B35] rotate-45 -mt-1.5 shadow-md shadow-black/50" />
                 <div className="w-px bg-[#FF6B35] h-full shadow-[0_0_10px_rgba(255,107,53,0.5)]" />
             </div>

             {/* Tracks */}
             <div className="p-4 space-y-4">
                 {tracks.map((track) => (
                    <div key={track.id} className="relative h-16 group/track">
                        {/* Track Background */}
                        <div className="absolute inset-0 bg-white/5 rounded-lg border border-white/5 group-hover/track:border-white/10 transition-colors" />
                        
                        {/* Track Label Icon (Sticky Left - this is tricky in absolute scrolling div, usually needs separate sidebar for track headers) */}
                        {/* For simplicity in this layout, we'll put icon inside but ideally tracks have headers on left */}
                        
                        {/* Clips */}
                        {track.clips.map((clip) => (
                             <div
                                key={clip.id}
                                className={`absolute top-1 bottom-1 rounded-md px-3 flex items-center justify-between select-none overflow-hidden transition-all shadow-lg ${
                                  selectedClip?.id === clip.id 
                                    ? 'ring-2 ring-white z-10' 
                                    : 'hover:brightness-110 z-0'
                                }`}
                                style={{
                                  left: `${(clip.start / (duration || 60)) * 100}%`,
                                  width: `${(clip.duration / (duration || 60)) * 100}%`,
                                  backgroundColor: track.type === 'video' ? '#2A2A2A' : track.type === 'audio' ? '#1E293B' : '#3F2E18',
                                  borderLeft: `4px solid ${track.type === 'video' ? '#3B82F6' : track.type === 'audio' ? '#10B981' : '#F59E0B'}`,
                                  cursor: 'move'
                                }}
                                onMouseDown={(e) => onClipMouseDown(e, clip)}
                                onClick={(e) => { e.stopPropagation(); setSelectedClip(clip); }}
                             >
                                {/* Left Resize Handle */}
                                <div className="absolute left-0 top-0 bottom-0 w-3 cursor-w-resize hover:bg-white/20 z-10" onMouseDown={(e) => onClipMouseDown(e, clip, 'left')} />
                                
                                <span className="text-xs text-white/90 font-medium truncate z-0">{clip.name || clip.text}</span>
                                
                                {/* Right Resize Handle */}
                                <div className="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize hover:bg-white/20 z-10" onMouseDown={(e) => onClipMouseDown(e, clip, 'right')} />
                             </div>
                        ))}
                    </div>
                 ))}
             </div>
          </div>
      </div>
    </div>
  );
}