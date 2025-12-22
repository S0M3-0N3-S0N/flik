import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export default function VideoPlayer({ 
  currentFrame, 
  isPlaying, 
  onPlayPause, 
  duration, 
  currentTime, 
  onSeek,
  volume,
  onVolumeChange 
}) {
  const videoRef = useRef(null);

  return (
    <div className="flex flex-col h-full bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10">
      <div className="relative flex-1 flex items-center justify-center overflow-hidden group">
        {currentFrame ? (
          <img 
            src={currentFrame} 
            alt="Preview" 
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-white/30 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-white/30 border-b-[10px] border-b-transparent ml-1" />
            </div>
            <p className="font-medium">No media selected</p>
          </div>
        )}
        
        {/* Hover Controls Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
          <div className="flex items-center gap-4">
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={onPlayPause}
              className="w-12 h-12 rounded-full bg-white text-black hover:bg-white/90 hover:text-black hover:scale-105 transition-all"
            >
              {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current ml-1" />}
            </Button>
            
            <div className="flex-1">
              <Slider 
                value={[currentTime]} 
                max={duration || 100} 
                onValueChange={onSeek}
                className="cursor-pointer"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-white/80" />
              <div className="w-24">
                <Slider 
                  value={[volume]} 
                  max={100} 
                  onValueChange={onVolumeChange} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Timecode Display */}
      <div className="h-12 bg-[#111] flex items-center justify-between px-6 border-t border-white/5 font-mono text-sm text-white/60">
        <div>
          <span className="text-white">{new Date(currentTime * 1000).toISOString().substr(11, 8)}</span>
          <span className="mx-2 opacity-30">/</span>
          <span>{new Date(duration * 1000).toISOString().substr(11, 8)}</span>
        </div>
        <div>
          1080p • 30fps
        </div>
      </div>
    </div>
  );
}