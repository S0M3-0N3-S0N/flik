import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

export default function BurstModeUI({ isBursting, burstCount, burstPhotos, onSelectPhoto, onCancel }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!isBursting && (!burstPhotos || burstPhotos.length === 0)) {
    return null;
  }

  // Show burst counter during capture
  if (isBursting) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50"
      >
        <div className="text-center">
          <div className="text-6xl font-bold text-white mb-4">{burstCount}</div>
          <div className="text-lg text-white/80">Capturing burst...</div>
        </div>
      </motion.div>
    );
  }

  // Show burst selection UI
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col"
      >
        {/* Main preview */}
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            key={selectedIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="aspect-square w-full max-w-md bg-black rounded-lg overflow-hidden"
          >
            <img
              src={burstPhotos[selectedIndex]}
              alt={`Burst ${selectedIndex + 1}`}
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>

        {/* Thumbnail strip */}
        <div className="bg-black/60 backdrop-blur-xl border-t border-white/10 p-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {burstPhotos.map((photo, idx) => (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedIndex(idx)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === selectedIndex
                    ? 'border-[#FF6B35] ring ring-[#FF6B35]'
                    : 'border-white/20'
                }`}
              >
                <img
                  src={photo}
                  alt={`Burst ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold">
                  {idx + 1}
                </div>
              </motion.button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => onSelectPhoto(burstPhotos[selectedIndex])}
              className="flex-1 flex items-center justify-center gap-2 bg-[#FF6B35] text-white rounded-lg py-3 font-semibold hover:bg-[#FF6B35]/90 transition-all"
            >
              <Check className="w-5 h-5" />
              Use This
            </button>
            <button
              onClick={onCancel}
              className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white rounded-lg py-3 font-semibold hover:bg-white/20 transition-all"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}