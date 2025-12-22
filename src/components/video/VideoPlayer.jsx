import React from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, ZoomIn, ZoomOut, Scissors, Undo2, Redo2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export default function VideoPlayer({ 
  videoRef, 
  canvasRef, 
  videoFile, 
  isPlaying, 
  onPlayPause, 
  currentTime, 
  duration, 
  onSeek, 
  onSkipBack, 
  onSkipForward, 
  volume, 
  onVolumeChange,
  isRemoving,
  videoFilterStyle,
  tracks,
  handleCanvasMouseDown,
  handleCanvasMouseMove,
  handleMouseUp,
  onExport
}) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTextPosition = (position) => {
    switch(position) {
      case 'top': return 'top-16 left-1/2 -translate-x-1/2';
      case 'center': return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case 'bottom': return 'bottom-16 left-1/2 -translate-x-1/2';
      default: return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0A0A0A] relative">
      {/* Player Area */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden relative group">
          {videoFile ? (
             <div className="relative w-full h-full max-h-[calc(100vh-400px)] aspect-video flex items-center justify-center">
                 <div className="relative w-full h-full bg-black rounded-lg overflow-hidden shadow-2xl border border-white/5">
                    <video
                      ref={videoRef}
                      src={videoFile.url}
                      className={`w-full h-full object-contain ${isRemoving ? 'cursor-crosshair' : ''}`}
                      style={{ filter: videoFilterStyle }}
                      onClick={onPlayPause}
                    />
                    
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 pointer-events-none w-full h-full"
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleMouseUp}
                    />
                    
                    {tracks.find(t => t.type === 'text')?.clips.map(clip => {
                      if (currentTime >= clip.start && currentTime < clip.start + clip.duration) {
                        return (
                          <div
                            key={clip.id}
                            className={`absolute pointer-events-none px-4 py-2 ${getTextPosition(clip.style.position)}`}
                            style={{
                              fontSize: clip.style.fontSize,
                              color: clip.style.color,
                              fontWeight: clip.style.fontWeight,
                              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                              fontFamily: 'sans-serif'
                            }}
                          >
                            {clip.text}
                          </div>
                        );
                      }
                      return null;
                    })}
                 </div>
             </div>
          ) : (
             <div className="text-center space-y-4">
                 <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto shadow-inner">
                     <Play className="w-10 h-10 text-white/20" />
                 </div>
                 <p className="text-white/40 text-sm">Import media to start editing</p>
             </div>
          )}
      </div>

      {/* Controls Bar */}
      <div className="h-16 border-t border-white/10 bg-[#141414] flex items-center justify-between px-6 shrink-0">
         <div className="flex items-center gap-2 text-xs font-medium tabular-nums text-white/60">
             <span className="text-white">{formatTime(currentTime)}</span>
             <span className="text-white/20">/</span>
             <span>{formatTime(duration)}</span>
         </div>

         <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" onClick={onSkipBack} className="text-white/70 hover:text-white hover:bg-white/10">
                 <SkipBack className="w-5 h-5" />
             </Button>
             <button 
                onClick={onPlayPause}
                className="w-10 h-10 rounded-full bg-white text-black hover:scale-105 transition-all flex items-center justify-center shadow-lg shadow-white/10"
             >
                 {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-1 fill-current" />}
             </button>
             <Button variant="ghost" size="icon" onClick={onSkipForward} className="text-white/70 hover:text-white hover:bg-white/10">
                 <SkipForward className="w-5 h-5" />
             </Button>
         </div>

         <div className="flex items-center gap-4 w-[200px] justify-end">
             <div className="flex items-center gap-2 group">
                 <Volume2 className="w-4 h-4 text-white/40 group-hover:text-white/80 transition-colors" />
                 <Slider 
                    value={[volume]} 
                    onValueChange={onVolumeChange} 
                    max={100} 
                    className="w-20"
                 />
             </div>
             <Button variant="ghost" size="icon" className="text-white/40 hover:text-white hover:bg-white/10">
                 <Maximize2 className="w-4 h-4" />
             </Button>
         </div>
      </div>
    </div>
  );
}