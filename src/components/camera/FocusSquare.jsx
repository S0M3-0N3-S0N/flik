import { motion, AnimatePresence } from 'framer-motion';

export default function FocusSquare({ position, locked }) {
  if (!position) return null;
  return (
    <AnimatePresence>
      <motion.div
        key={`${position.x}-${position.y}`}
        initial={{ opacity: 0, scale: 1.6 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="absolute pointer-events-none"
        style={{
          left: position.x - 36,
          top: position.y - 36,
          width: 72,
          height: 72,
        }}
      >
        {/* Corner brackets */}
        {[
          'top-0 left-0 border-t-2 border-l-2 rounded-tl',
          'top-0 right-0 border-t-2 border-r-2 rounded-tr',
          'bottom-0 left-0 border-b-2 border-l-2 rounded-bl',
          'bottom-0 right-0 border-b-2 border-r-2 rounded-br',
        ].map((cls, i) => (
          <div
            key={i}
            className={`absolute w-4 h-4 ${cls}`}
            style={{ borderColor: locked ? '#FFB800' : '#FF6B35' }}
          />
        ))}

        {locked && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold tracking-widest"
            style={{ color: '#FFB800' }}
          >
            AE/AF LOCK
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}