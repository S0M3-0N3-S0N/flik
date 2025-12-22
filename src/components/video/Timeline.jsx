import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Track from './Track';

export default function Timeline({ 
  tracks, 
  currentTime, 
  duration, 
  onTimeUpdate, 
  onTrackUpdate,
  onClipSelect,
  selectedClipId,
  zoom,
  onZoomChange
}) {
  const timelineRef = useRef(null);
  const [isDraggingHeader, setIsDraggingHeader] = useState(false);

  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 256; // Minus sidebar width
    const newTime = Math.max(0, (x / (10 * zoom)));
    onTimeUpdate(newTime);
  };

  const handleMouseMove = (e) => {
    if (isDraggingHeader && timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - 256;
      const newTime = Math.max(0, (x / (10 * zoom)));
      onTimeUpdate(newTime);
    }
  };

  useEffect(() => {
    if (isDraggingHeader) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', () => setIsDraggingHeader(false));
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', () => setIsDraggingHeader(false));
      };
    }
  }, [isDraggingHeader]);

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] border-t border-white/10">
      {/* Timeline Controls */}
      <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-[#111]">
        <div className="flex items-center gap-2 text-sm text-white/60">
          <span>{new Date(currentTime * 1000).toISOString().substr(11, 8)}</span>
          <span className="opacity-30">|</span>
          <span>{tracks.reduce((acc, t) => acc + t.clips.length, 0)} clips</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => onZoomChange(Math.max(0.5, zoom - 0.2))}>
            <ZoomOut size={16} />
          </Button>
          <span className="text-xs text-white/40 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={() => onZoomChange(Math.min(5, zoom + 0.2))}>
            <ZoomIn size={16} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative" ref={timelineRef}>
        {/* Time Header */}
        <div 
          className="h-8 sticky top-0 z-20 flex bg-[#0A0A0A] border-b border-white/10 cursor-pointer"
          onMouseDown={() => setIsDraggingHeader(true)}
          onClick={handleTimelineClick}
        >
          <div className="w-64 flex-shrink-0 bg-[#0F0F0F] border-r border-white/5 sticky left-0 z-30" />
          <div className="flex-1 relative">
            {/* Time Markers */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{ 
                backgroundImage: 'linear-gradient(90deg, #333 1px, transparent 1px)', 
                backgroundSize: `${100 * zoom}px 100%` 
              }} 
            >
              {Array.from({ length: Math.ceil((duration + 100) / 10) }).map((_, i) => (
                <div 
                  key={i} 
                  className="absolute top-1 text-[10px] text-white/30 font-mono"
                  style={{ left: `${i * 100 * zoom + 4}px` }}
                >
                  {new Date(i * 10 * 1000).toISOString().substr(14, 5)}
                </div>
              ))}
            </div>

            {/* Playhead */}
            <div 
              className="absolute top-0 bottom-0 w-px bg-[#FF6B35] z-40 pointer-events-none"
              style={{ 
                left: `${currentTime * 10 * zoom}px`,
                height: '1000px' // Hack to extend playhead
              }}
            >
              <div className="absolute -top-1 -translate-x-1/2 w-3 h-3 bg-[#FF6B35] transform rotate-45 rounded-[1px] shadow-lg shadow-orange-500/20" />
            </div>
          </div>
        </div>

        {/* Tracks Area */}
        <div className="relative min-w-full">
          {tracks.map((track) => (
            <Track
              key={track.id}
              track={track}
              onUpdate={onTrackUpdate}
              onClipSelect={onClipSelect}
              selectedClipId={selectedClipId}
              scale={zoom}
            />
          ))}
          
          {/* Add Track Button */}
          <div className="h-12 flex items-center px-4 border-t border-white/5 bg-[#0F0F0F]/50">
            <Button variant="ghost" size="sm" className="text-white/40 hover:text-white">
              <Plus size={14} className="mr-2" /> Add Track
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}