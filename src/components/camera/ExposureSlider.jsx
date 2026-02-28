import { useRef, useState, useEffect } from 'react';
import { Sun } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ExposureSlider({ position, value, min = -2, max = 2, onChange }) {
  if (!position) return null;
  const trackRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const getValueFromEvent = (e) => {
    if (!e || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clientY = e.touches?.length > 0 ? e.touches[0].clientY : e.clientY;
    const ratio = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    onChange(min + ratio * (max - min));
  };

  const handlePointerDown = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    getValueFromEvent(e);
  };

  const handlePointerUp = () => setIsDragging(false);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e) => { if (e) { e.stopPropagation(); getValueFromEvent(e); } };
    const onUp = () => setIsDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [isDragging, min, max]);

  const fillPercent = ((value - min) / (max - min)) * 100;

  // Keep slider inside viewfinder bounds
  const sliderLeft = Math.min(position.x + 52, window.innerWidth - 40);
  const sliderTop = Math.max(40, Math.min(position.y - 90, window.innerHeight - 220));

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="absolute flex flex-col items-center gap-1.5 pointer-events-auto z-20"
      style={{ left: sliderLeft, top: sliderTop }}
    >
      <Sun className="w-4 h-4 text-[#FFB800]" />

      <div
        ref={trackRef}
        className="relative w-1.5 h-36 bg-white/20 rounded-full cursor-pointer touch-none select-none"
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
      >
        {/* Fill */}
        <div
          className="absolute bottom-0 w-full rounded-full bg-[#FFB800]"
          style={{ height: `${fillPercent}%` }}
        />
        {/* Thumb */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-lg border-2 border-[#FFB800] transition-transform"
          style={{
            bottom: `calc(${fillPercent}% - 8px)`,
            transform: `translateX(-50%) scale(${isDragging ? 1.3 : 1})`,
          }}
        />
      </div>

      <span className="text-[#FFB800] text-[10px] font-bold tabular-nums">
        {value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)}
      </span>
    </motion.div>
  );
}