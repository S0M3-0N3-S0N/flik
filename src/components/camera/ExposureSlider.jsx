import { useRef } from 'react';
import { Sun } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ExposureSlider({ position, value, onChange }) {
  if (!position) return null;
  const trackRef = useRef(null);

  const handlePointerMove = (e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const ratio = 1 - Math.max(0, Math.min(1, (y - rect.top) / rect.height));
    onChange((ratio * 4) - 2); // -2 to +2 range
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className="absolute flex flex-col items-center gap-1 pointer-events-auto"
      style={{ left: position.x + 44, top: position.y - 80 }}
    >
      <Sun className="w-4 h-4 text-[#FFB800]" />
      <div
        ref={trackRef}
        className="relative w-1 h-32 bg-white/20 rounded-full cursor-pointer touch-none"
        onMouseMove={(e) => e.buttons === 1 && handlePointerMove(e)}
        onTouchMove={handlePointerMove}
      >
        <div
          className="absolute w-full rounded-full bg-[#FFB800]"
          style={{
            bottom: 0,
            height: `${((value + 2) / 4) * 100}%`,
          }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-lg border border-[#FFB800]"
          style={{ bottom: `calc(${((value + 2) / 4) * 100}% - 6px)` }}
        />
      </div>
      <span className="text-[#FFB800] text-[10px] font-bold">
        {value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)}
      </span>
    </motion.div>
  );
}