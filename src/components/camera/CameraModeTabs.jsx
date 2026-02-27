import React from 'react';
import { motion } from 'framer-motion';

const MODES = [
  { id: 'photo', label: 'Photo', icon: '📷' },
  { id: 'portrait', label: 'Portrait', icon: '👤' },
  { id: 'night', label: 'Night', icon: '🌙' },
  { id: 'effects', label: 'Effects', icon: '✨' },
];

export default function CameraModeTabs({ activeMode, onModeChange }) {
  return (
    <div className="absolute top-20 left-0 right-0 z-30 flex justify-center px-4">
      <div className="flex gap-2 bg-black/40 backdrop-blur-xl rounded-full p-1 border border-white/10">
        {MODES.map((mode) => (
          <motion.button
            key={mode.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onModeChange(mode.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeMode === mode.id
                ? 'bg-[#FF6B35] text-white shadow-lg shadow-[#FF6B35]/50'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <span className="text-lg">{mode.icon}</span>
            <span>{mode.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}