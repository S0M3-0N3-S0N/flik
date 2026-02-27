import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import PhotoStyles, { PHOTO_STYLES } from './PhotoStyles';
import NightModeControls from './NightModeControls';
import ResolutionBadge from './ResolutionBadge';

export default function QuickControlsSheet({
  isOpen,
  onClose,
  settings,
  onSettingChange,
  capabilities,
  highRes,
  onHighResToggle,
  selectedStyle,
  onStyleChange,
  nightMode,
  onNightModeChange,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-2xl border-t border-white/10 rounded-t-2xl z-40 max-h-[80vh] overflow-y-auto"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <ChevronDown className="w-5 h-5 text-white/30" />
            </div>

            <div className="px-4 pb-6 space-y-6">
              {/* Timer */}
              <div className="flex flex-col gap-2">
                <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">Timer</span>
                <div className="flex gap-2">
                  {[0, 3, 10].map(sec => (
                    <motion.button
                      key={sec}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onSettingChange('timer', sec)}
                      className={`
                        flex-1 py-2 text-sm font-medium rounded-lg transition-all
                        ${settings.timer === sec
                          ? 'bg-white/15 text-white border border-white/30'
                          : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/20'
                        }
                      `}
                    >
                      {sec === 0 ? 'Off' : `${sec}s`}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Grid */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">Grid</span>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSettingChange('showGrid', !settings.showGrid)}
                  className={`
                    w-12 h-7 rounded-full transition-all flex items-center
                    ${settings.showGrid ? 'bg-white/20 border border-white/30' : 'bg-white/5 border border-white/10'}
                  `}
                >
                  <motion.div
                    layout
                    className="w-5 h-5 rounded-full bg-white/80"
                    style={{ marginLeft: settings.showGrid ? 'auto' : '2px', marginRight: settings.showGrid ? '2px' : 'auto' }}
                  />
                </motion.button>
              </div>

              {/* Photographic Styles */}
              <PhotoStyles active={selectedStyle} onChange={onStyleChange} />

              {/* Night Mode */}
              <NightModeControls mode={nightMode} onChange={onNightModeChange} />

              {/* Resolution */}
              {capabilities && (
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">Resolution</span>
                  <ResolutionBadge
                    capabilities={capabilities}
                    highRes={highRes}
                    onToggle={onHighResToggle}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}