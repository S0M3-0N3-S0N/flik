import React from 'react';
import { motion, Reorder } from 'framer-motion';
import { Eye, EyeOff, Lock, Unlock, Volume2, VolumeX, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Track({ 
  track, 
  onUpdate, 
  onDelete, 
  onClipSelect, 
  selectedClipId,
  scale = 1 
}) {
  return (
    <div className="flex h-24 group border-b border-white/5 bg-[#0F0F0F]">
      {/* Track Header */}
      <div className="w-64 flex-shrink-0 bg-[#111] border-r border-white/5 p-3 flex flex-col justify-between z-10">
        <div className="flex items-center justify-between">
          <input
            value={track.name}
            onChange={(e) => onUpdate(track.id, { name: e.target.value })}
            className="bg-transparent text-sm font-medium text-white/90 focus:outline-none w-32"
          />
          <div className="flex items-center gap-1">
            <button 
              onClick={() => onUpdate(track.id, { visible: !track.visible })}
              className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              {track.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <button 
              onClick={() => onUpdate(track.id, { locked: !track.locked })}
              className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              {track.locked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {track.type === 'audio' || track.type === 'video' ? (
            <div className="flex items-center gap-2 w-full">
              <button 
                onClick={() => onUpdate(track.id, { muted: !track.muted })}
                className={cn("text-white/40 hover:text-white", track.muted && "text-red-400")}
              >
                {track.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500/80" 
                  style={{ width: `${track.volume || 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-xs text-white/30 uppercase tracking-wider">{track.type}</div>
          )}
        </div>
      </div>

      {/* Track Content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Grid Lines */}
        <div className="absolute inset-0 pointer-events-none opacity-10" 
          style={{ 
            backgroundImage: 'linear-gradient(90deg, #fff 1px, transparent 1px)', 
            backgroundSize: `${100 * scale}px 100%` 
          }} 
        />

        {track.clips.map((clip) => (
          <motion.div
            key={clip.id}
            layoutId={clip.id}
            className={cn(
              "absolute top-2 bottom-2 rounded-lg border overflow-hidden cursor-pointer group/clip transition-colors",
              selectedClipId === clip.id 
                ? "ring-2 ring-[#FF6B35] z-10" 
                : "hover:ring-1 hover:ring-white/30",
              track.type === 'video' && "bg-blue-900/30 border-blue-500/30",
              track.type === 'audio' && "bg-green-900/30 border-green-500/30",
              track.type === 'text' && "bg-purple-900/30 border-purple-500/30",
              track.type === 'image' && "bg-orange-900/30 border-orange-500/30",
            )}
            style={{
              left: `${clip.start * 10 * scale}px`,
              width: `${clip.duration * 10 * scale}px`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onClipSelect(clip);
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="absolute inset-0 flex items-center px-2">
              <span className="text-xs font-medium text-white/90 truncate drop-shadow-md">
                {clip.name}
              </span>
            </div>
            
            {/* Trim Handles */}
            {selectedClipId === clip.id && !track.locked && (
              <>
                <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/20 hover:bg-white/50" />
                <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/20 hover:bg-white/50" />
              </>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}