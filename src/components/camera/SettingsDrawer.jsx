import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function SettingsDrawer({ open, onClose, settings, onChange }) {
  const timerOptions = [{ label: 'Off', value: 0 }, { label: '3s', value: 3 }, { label: '10s', value: 10 }];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-[#1a1a1a]/95 backdrop-blur-xl border-t border-white/10 px-6 pt-5 pb-10"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 40px)' }}
          >
            <div className="w-10 h-1 rounded-full bg-white/30 mx-auto mb-5" />
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-lg">Camera Settings</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Grid */}
            <SettingRow label="Grid Lines">
              <Toggle value={settings.showGrid} onChange={v => onChange('showGrid', v)} />
            </SettingRow>

            {/* Timer */}
            <SettingRow label="Timer">
              <SegmentControl
                options={timerOptions}
                value={settings.timer}
                onChange={v => onChange('timer', v)}
              />
            </SettingRow>

            {/* Camera Guidance */}
            <SettingRow label="Camera Guidance">
              <Toggle value={settings.cameraGuidance ?? true} onChange={v => onChange('cameraGuidance', v)} />
            </SettingRow>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SettingRow({ label, children }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5">
      <span className="text-white/70 text-sm">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-12 h-7 rounded-full transition-colors relative ${value ? 'bg-[#FF6B35]' : 'bg-white/20'}`}
    >
      <div
        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${value ? 'left-6' : 'left-1'}`}
      />
    </button>
  );
}

function SegmentControl({ options, value, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            value === opt.value ? 'bg-[#FF6B35] text-white' : 'text-white/50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}