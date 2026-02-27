import React, { useState } from 'react';
import { motion } from 'framer-motion';

const FILTERS = [
  { id: 'none', label: 'None', icon: '⭕' },
  { id: 'vivid', label: 'Vivid', icon: '✨' },
  { id: 'warm', label: 'Warm', icon: '🔥' },
  { id: 'cool', label: 'Cool', icon: '❄️' },
  { id: 'bw', label: 'B&W', icon: '⚫' },
  { id: 'filmGrain', label: 'Film', icon: '🎬' },
  { id: 'vintage', label: 'Vintage', icon: '📼' },
  { id: 'neon', label: 'Neon', icon: '🌠' },
  { id: 'softGlow', label: 'Glow', icon: '💫' },
  { id: 'sharpen', label: 'Sharp', icon: '⚔️' },
  { id: 'matte', label: 'Matte', icon: '🖼️' },
];

export default function CameraFilterCarousel({ activeFilter, onFilterChange, intensity, onIntensityChange }) {
  const [showIntensitySlider, setShowIntensitySlider] = useState(false);

  return (
    <div className="absolute bottom-32 left-0 right-0 z-30">
      {/* Intensity Slider */}
      {showIntensitySlider && activeFilter !== 'none' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="px-4 mb-3"
        >
          <input
            type="range"
            min="0"
            max="100"
            value={intensity * 100}
            onChange={(e) => onIntensityChange(e.target.value / 100)}
            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.2) ${intensity * 100}%, rgba(255,255,255,0.1) ${intensity * 100}%, rgba(255,255,255,0.1) 100%)`
            }}
          />
          <div className="text-white text-xs text-center mt-1">
            {Math.round(intensity * 100)}%
          </div>
        </motion.div>
      )}

      {/* Filter Carousel */}
      <div className="flex overflow-x-auto px-2 gap-2 pb-2 scrollbar-hide">
        {FILTERS.map((filter) => (
          <motion.button
            key={filter.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              onFilterChange(filter.id);
              setShowIntensitySlider(filter.id !== 'none');
            }}
            className={`flex-shrink-0 w-16 h-20 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              activeFilter === filter.id
                ? 'bg-white/30 border border-white/50 ring ring-[#FF6B35]'
                : 'bg-black/40 border border-white/10 hover:bg-black/60'
            }`}
          >
            <span className="text-2xl">{filter.icon}</span>
            <span className="text-white text-xs font-medium text-center">{filter.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}