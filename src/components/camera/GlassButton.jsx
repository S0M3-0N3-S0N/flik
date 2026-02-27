import { motion } from 'framer-motion';

export default function GlassButton({ icon: Icon, onClick, label, active, disabled, size = 'md', className = '', children }) {
  const sizeMap = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14', xl: 'w-20 h-20' };
  
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizeMap[size]} rounded-full
        bg-black/40 backdrop-blur-xl
        border border-white/10 hover:border-white/20
        flex items-center justify-center
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${active ? 'bg-white/15 border-white/30' : 'hover:bg-white/10'}
        ${className}
      `}
    >
      {children}
      {!children && Icon && typeof Icon === 'function' && <Icon className="w-5 h-5 text-white" />}
      {label && <span className="text-xs text-white font-medium">{label}</span>}
    </motion.button>
  );
}