import { motion } from 'framer-motion';

const PHOTO_STYLES = [
  { name: 'Standard', filter: '', intensity: 1 },
  { name: 'Warm', filter: 'sepia(0.15) saturate(1.1)', intensity: 0.7 },
  { name: 'Cool', filter: 'hue-rotate(-10deg) saturate(0.9)', intensity: 0.6 },
  { name: 'Vivid', filter: 'saturate(1.4) contrast(1.1)', intensity: 0.8 },
  { name: 'Rich', filter: 'saturate(1.2) brightness(0.95)', intensity: 0.75 },
];

export default function PhotoStyles({ active, onChange }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">Photographic Styles</span>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {PHOTO_STYLES.map(style => (
          <motion.button
            key={style.name}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(style)}
            className={`
              flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all
              ${active?.name === style.name
                ? 'bg-white/20 text-white border border-white/40'
                : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/20'
              }
            `}
          >
            {style.name}
          </motion.button>
        ))}
      </div>
      {active && active.intensity < 1 && (
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          defaultValue={active.intensity}
          onChange={(e) => onChange({ ...active, intensity: parseFloat(e.target.value) })}
          className="w-full h-1 bg-white/10 rounded-full accent-white/30 cursor-pointer"
        />
      )}
    </div>
  );
}

export { PHOTO_STYLES };