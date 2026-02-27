import { motion } from 'framer-motion';
import { Moon } from 'lucide-react';

export default function NightModeControls({ mode, onChange }) {
  const modes = ['Off', 'Auto', 'On'];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Moon className="w-4 h-4 text-white/60" />
        <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">Night Mode</span>
      </div>
      <div className="flex gap-2 flex-1">
        {modes.map(m => (
          <motion.button
            key={m}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(m.toLowerCase())}
            className={`
              flex-1 py-2 text-xs font-medium rounded-lg transition-all
              ${mode === m.toLowerCase()
                ? 'bg-white/15 text-white border border-white/30'
                : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/20'
              }
            `}
          >
            {m}
          </motion.button>
        ))}
      </div>
      <p className="text-xs text-white/40">Web: Simulated brightening. Native: Full Night Mode.</p>
    </div>
  );
}