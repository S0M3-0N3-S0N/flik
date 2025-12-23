import React, { useRef, useEffect } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { GripVertical } from "lucide-react";

export default function Timeline({ tracks, zoomLevel, currentTime, onTimeUpdate, onSelectClip }) {
  const containerRef = useRef(null);
  const pxPerSec = 50 * zoomLevel;

  // Mock duration for timeline background
  const timelineDuration = 600; // 10 minutes

  const handleTimelineClick = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + containerRef.current.scrollLeft;
    const time = Math.max(0, x / pxPerSec);
    onTimeUpdate(time);
  };

  return (
    <div className="h-full flex flex-col bg-[#141414] select-none text-xs">
      {/* Time Header */}
      <div 
        className="h-8 border-b border-white/5 bg-[#1a1a1a] flex items-end sticky top-0 z-10 overflow-hidden"
        ref={containerRef}
        onClick={handleTimelineClick}
      >
        <div 
          className="relative h-full" 
          style={{ width: `${timelineDuration * pxPerSec}px` }}
        >
           {Array.from({ length: Math.ceil(timelineDuration / 5) }).map((_, i) => (
             <div 
               key={i} 
               className="absolute bottom-0 h-2 border-l border-white/20 pl-1 text-[10px] text-white/30"
               style={{ left: `${i * 5 * pxPerSec}px` }}
             >
               {i * 5}s
             </div>
           ))}
           {/* Playhead Indicator */}
           <div 
             className="absolute top-0 bottom-0 w-px bg-[#FF6B35] z-20 pointer-events-none"
             style={{ left: `${currentTime * pxPerSec}px` }}
           >
             <div className="absolute -top-1 -translate-x-1/2 text-[#FF6B35]">▼</div>
           </div>
        </div>
      </div>

      {/* Tracks Area */}
      <ScrollArea className="flex-1">
        <div 
          className="relative min-h-full" 
          style={{ width: `${timelineDuration * pxPerSec}px` }}
        >
           {/* Playhead Line extending down */}
           <div 
             className="absolute top-0 bottom-0 w-px bg-[#FF6B35]/50 z-20 pointer-events-none"
             style={{ left: `${currentTime * pxPerSec}px` }}
           />

           <div className="flex flex-col gap-1 p-2">
             {tracks.map((track) => (
               <div key={track.id} className="h-20 bg-black/20 rounded-lg relative border border-white/5 flex items-center">
                 {/* Track Label */}
                 <div className="absolute left-2 top-2 text-[10px] text-white/30 uppercase tracking-wider pointer-events-none z-10">
                   {track.type}
                 </div>
                 
                 {/* Clips */}
                 {track.clips.map((clip, idx) => (
                   <div
                     key={clip.id}
                     className="absolute h-16 rounded-md bg-[#FF6B35]/20 border border-[#FF6B35]/50 overflow-hidden cursor-pointer hover:bg-[#FF6B35]/30 group"
                     style={{ 
                       left: `${(clip.startTime || idx * 5) * pxPerSec}px`, // Mock positioning logic
                       width: `${(clip.duration || 5) * pxPerSec}px`
                     }}
                     onClick={(e) => { e.stopPropagation(); onSelectClip(clip); }}
                   >
                     {clip.type === 'image' && (
                       <img src={clip.thumbnail_url || clip.url} className="h-full w-full object-cover opacity-50" />
                     )}
                     <div className="absolute inset-0 flex items-center justify-center text-xs text-white/80 font-medium truncate px-2">
                       {clip.title}
                     </div>
                     
                     {/* Resize Handles */}
                     <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-[#FF6B35] opacity-0 group-hover:opacity-100 transition-opacity" />
                     <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-[#FF6B35] opacity-0 group-hover:opacity-100 transition-opacity" />
                   </div>
                 ))}
               </div>
             ))}
           </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}