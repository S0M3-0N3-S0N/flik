import { motion } from 'framer-motion';

export default function ResolutionBadge({ capabilities, highRes, onToggle }) {
  const getResLabel = () => {
    if (!capabilities) return '720p';
    const height = capabilities.height?.max || 720;
    if (height >= 2160) return highRes ? '4K' : 'FHD';
    if (height >= 1080) return 'FHD';
    return '720p';
  };

  const getFpsLabel = () => capabilities?.frameRate?.max >= 60 ? '60fps' : '30fps';

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className="px-2.5 py-1 rounded-full text-xs font-semibold text-white/70 hover:text-white bg-black/30 border border-white/10 hover:border-white/20 transition-all"
    >
      {getResLabel()} • {getFpsLabel()}
    </motion.button>
  );
}