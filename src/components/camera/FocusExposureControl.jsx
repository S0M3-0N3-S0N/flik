import { useRef, useState, useEffect } from 'react';
import { Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FocusExposureControl({ position, locked, value, min = -2, max = 2, onChange }) {
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
  const color = locked ? '#FFB800' : '#FF6B35';

  // Position the whole control centered on the tap point
  const boxSize = 72;
  const left = Math.max(0, Math.min(position.x - boxSize / 2, window.innerWidth - boxSize - 60));
  const top = Math.max(40, Math.min(position.y - boxSize / 2, window.innerHeight - 260));

  return (
    <AnimatePresence>
      <motion.div
        key={`${position.x}-${position.y}`}
        initial={{ opacity: 0, scale: 1.4 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="absolute pointer-events-none z-20"
        style={{ left, top }}
      >
        {/* Focus square */}
        <div className="relative" style={{ width: boxSize, height: boxSize }}>
          {[
            'top-0 left-0 border-t-2 border-l-2 rounded-tl',
            'top-0 right-0 border-t-2 border-r-2 rounded-tr',
            'bottom-0 left-0 border-b-2 border-l-2 rounded-bl',
            'bottom-0 right-0 border-b-2 border-r-2 rounded-br',
          ].map((cls, i) => (
            <div key={i} className={`absolute w-4 h-4 ${cls}`} style={{ borderColor: color }} />
          ))}

          {locked && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold tracking-widest"
              style={{ color: '#FFB800' }}
            >
              AE/AF LOCK
            </motion.div>
          )}
        </div>

        {/* Exposure slider — anchored to right of focus box */}
        <div
          className="absolute flex flex-col items-center gap-1.5 pointer-events-auto"
          style={{ left: boxSize + 12, top: -20 }}
        >
          <Sun className="w-4 h-4" style={{ color }} />

          <div
            ref={trackRef}
            className="relative w-1.5 h-36 bg-white/20 rounded-full cursor-pointer touch-none select-none"
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
          >
            <div
              className="absolute bottom-0 w-full rounded-full"
              style={{ height: `${fillPercent}%`, background: color }}
            />
            <div
              className="absolute left-1/2 w-4 h-4 rounded-full bg-white shadow-lg border-2 transition-transform"
              style={{
                borderColor: color,
                bottom: `calc(${fillPercent}% - 8px)`,
                transform: `translateX(-50%) scale(${isDragging ? 1.3 : 1})`,
              }}
            />
          </div>

          <span className="text-[10px] font-bold tabular-nums" style={{ color }}>
            {value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}