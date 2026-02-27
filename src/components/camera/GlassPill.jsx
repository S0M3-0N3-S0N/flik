import { motion } from 'framer-motion';

export default function GlassPill({ children, className = '', onClick }) {
  return (
    <motion.div
      whileTap={onClick ? { scale: 0.95 } : {}}
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-full
        bg-black/40 backdrop-blur-xl
        border border-white/10 hover:border-white/20
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:bg-black/50' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}