import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings2, Filter, RotateCw, Crop as CropIcon, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOOLS = [
  { id: 'adjust', label: 'Adjustments', icon: Settings2, color: 'from-blue-500 to-blue-600' },
  { id: 'filters', label: 'Filters', icon: Filter, color: 'from-purple-500 to-purple-600' },
  { id: 'transform', label: 'Transform', icon: RotateCw, color: 'from-pink-500 to-pink-600' },
  { id: 'crop', label: 'Crop', icon: CropIcon, color: 'from-green-500 to-green-600' },
  { id: 'remove', label: 'Magic Brush', icon: Wand2, color: 'from-orange-500 to-orange-600' },
];

export default function ToolsModal({ isOpen, onClose, onSelectTool, hasImage }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-gradient-to-br from-[#1a1a1a] via-[#141414] to-[#0f0f0f] rounded-t-3xl border-t border-white/10 max-h-[80vh] overflow-y-auto"
          >
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-gradient-to-br from-[#1a1a1a] via-[#141414] to-[#0f0f0f] border-b border-white/10 z-10">
              <h2 className="text-lg font-semibold text-white">Tools</h2>
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-6">
              {TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <motion.button
                    key={tool.id}
                    onClick={() => {
                      if (hasImage) {
                        onSelectTool(tool.id);
                        onClose();
                      }
                    }}
                    disabled={!hasImage}
                    whileHover={hasImage ? { scale: 1.05 } : {}}
                    whileTap={hasImage ? { scale: 0.95 } : {}}
                    className={`relative p-4 rounded-2xl border border-white/10 transition-all group ${
                      hasImage
                        ? `bg-gradient-to-br ${tool.color} hover:shadow-lg hover:shadow-current/50`
                        : 'bg-white/5 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Icon className="w-6 h-6 text-white" />
                      <span className="text-sm font-medium text-white text-center">{tool.label}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}