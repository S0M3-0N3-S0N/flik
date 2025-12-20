import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ArrowRight, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ResultModal({ isOpen, onClose, originalImage, resultImage, onApply, onDownload }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-6xl glass-card rounded-3xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">AI Enhancement Result</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          {/* Comparison */}
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Original */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white/60">
                    Original
                  </span>
                </div>
                <div className="aspect-video rounded-2xl overflow-hidden bg-white/5 flex items-center justify-center">
                  <img
                    src={originalImage?.preview || originalImage?.url}
                    alt="Original"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>
              
              {/* Result */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FFB800] text-xs font-medium text-white">
                    Enhanced
                  </span>
                </div>
                <div className="aspect-video rounded-2xl overflow-hidden bg-white/5 flex items-center justify-center relative">
                  <img
                    src={resultImage}
                    alt="Result"
                    className="max-w-full max-h-full object-contain"
                  />
                  {/* Glow effect */}
                  <div className="absolute inset-0 pointer-events-none rounded-2xl"
                    style={{
                      boxShadow: "inset 0 0 60px rgba(255, 107, 53, 0.1)"
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-between p-6 border-t border-white/10 bg-white/[0.02]">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Another
            </Button>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={onDownload}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={onApply}
                className="btn-gradient border-0 text-white"
              >
                <Check className="w-4 h-4 mr-2" />
                Apply & Continue
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}