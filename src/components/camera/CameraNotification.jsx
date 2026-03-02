import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function CameraNotification({ message, onDismiss }) {
  React.useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-5 py-3 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl"
        >
          <p className="text-white text-sm font-medium">{message}</p>
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-white/60 hover:text-white" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}