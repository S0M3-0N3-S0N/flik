import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Trash2, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";

export default function LayerPanel({ layers, activeLayerId, onLayerSelect, onLayerToggle, onLayerDelete, onOpacityChange, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="fixed left-4 top-20 bottom-24 md:bottom-4 z-40 w-72 bg-gradient-to-br from-[#1a1a1a]/95 via-[#141414]/95 to-[#0f0f0f]/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-white font-semibold text-sm">Layers ({layers.length})</h3>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <AnimatePresence>
          {layers.map((layer, index) => (
            <motion.div
              key={layer.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                activeLayerId === layer.id
                  ? 'bg-[#FF6B35]/20 border-[#FF6B35]'
                  : 'bg-black/20 border-white/10 hover:border-white/20'
              }`}
              onClick={() => onLayerSelect(layer.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/40 border border-white/10 flex-shrink-0">
                  <img
                    src={layer.preview}
                    alt={layer.name}
                    className="w-full h-full object-cover"
                    style={{ opacity: layer.opacity }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{layer.name}</p>
                  <p className="text-white/40 text-xs">Layer {layers.length - index}</p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLayerToggle(layer.id);
                    }}
                    className="p-1.5 rounded hover:bg-white/10 transition-colors"
                  >
                    {layer.visible ? (
                      <Eye className="w-4 h-4 text-white/60" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-white/40" />
                    )}
                  </button>

                  {layers.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerDelete(layer.id);
                      }}
                      className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              </div>

              {activeLayerId === layer.id && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 text-xs">Opacity</span>
                    <Slider
                      value={[layer.opacity * 100]}
                      onValueChange={(value) => onOpacityChange(layer.id, value[0] / 100)}
                      min={0}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-white text-xs w-8 text-right">{Math.round(layer.opacity * 100)}%</span>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {layers.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-white/40 text-sm p-4">
          No layers yet. Add images to get started.
        </div>
      )}
    </motion.div>
  );
}