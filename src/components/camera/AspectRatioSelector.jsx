import React from 'react';
import { motion } from 'framer-motion';

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1', value: 1 },
  { id: '4:3', label: '4:3', value: 4 / 3 },
  { id: '16:9', label: '16:9', value: 16 / 9 },
  { id: 'full', label: 'Full', value: 'full' },
];

export default function AspectRatioSelector({ activeRatio, onRatioChange }) {
  return (
    <div className="absolute bottom-28 right-4 z-30 flex flex-col gap-2 bg-black/40 backdrop-blur-xl rounded-2xl p-3 border border-white/10">
      {ASPECT_RATIOS.map((ratio) => (
        <motion.button
          key={ratio.id}
          whileTap={{ scale: 0.95 }}
          onClick={() => onRatioChange(ratio.id, ratio.value)}
          className={`w-12 h-12 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
            activeRatio === ratio.id
              ? 'bg-[#FF6B35] text-white ring ring-white/30'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {ratio.label}
        </motion.button>
      ))}
    </div>
  );
}