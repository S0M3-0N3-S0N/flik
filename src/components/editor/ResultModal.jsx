import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ArrowRight, RotateCcw, Check, Columns, ScanEye } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ResultModal({ isOpen, onClose, originalImage, resultImage, onApply, onDownload, transform }) {
  const [mode, setMode] = useState("compare"); // 'compare' (slider) or 'side' (side-by-side)
  const [sliderPos, setSliderPos] = useState(50);

  if (!isOpen) return null;

  const originalSrc = originalImage?.preview || originalImage?.url || originalImage;
  
  const transformStyle = transform ? {
    transform: `rotate(${transform.rotate}deg) scaleX(${transform.flipH ? -1 : 1}) scaleY(${transform.flipV ? -1 : 1})`
  } : {};

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-7xl h-[90vh] glass-card rounded-3xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-white">Result</h2>
              <div className="flex bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setMode("compare")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                    mode === "compare" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
                  }`}
                >
                  <ScanEye className="w-3.5 h-3.5" />
                  Slider
                </button>
                <button
                  onClick={() => setMode("side")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                    mode === "side" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  Side-by-Side
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-hidden relative bg-black/50 flex items-center justify-center p-4">
            {mode === "compare" ? (
              <div 
                className="relative w-full h-full max-w-5xl mx-auto flex items-center justify-center select-none cursor-col-resize group"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                  setSliderPos((x / rect.width) * 100);
                }}
                onTouchMove={(e) => {
                   const rect = e.currentTarget.getBoundingClientRect();
                   const touch = e.touches[0];
                   const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
                   setSliderPos((x / rect.width) * 100);
                }}
              >
                {/* Result Image (Background) */}
                <img
                  src={resultImage}
                  alt="Enhanced"
                  className="w-full h-full object-contain pointer-events-none"
                  style={transformStyle}
                />

                {/* Original Image (Foreground - Clipped) */}
                <div 
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{ 
                    clipPath: `inset(0 ${100 - sliderPos}% 0 0)` 
                  }}
                >
                  <img
                    src={originalSrc}
                    alt="Original"
                    className="w-full h-full object-contain"
                    style={transformStyle}
                  />
                  {/* Labels inside image */}
                  <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs font-medium text-white/80 border border-white/10">
                    Original
                  </div>
                </div>

                {/* Slider Handle */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-white cursor-col-resize shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-black/80">
                    <ScanEye className="w-4 h-4" />
                  </div>
                </div>

                 {/* Label for Enhanced */}
                 <div className="absolute top-4 right-4 px-3 py-1 bg-[#FF6B35]/80 backdrop-blur-md rounded-full text-xs font-medium text-white border border-white/10 pointer-events-none">
                    Enhanced
                 </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 w-full h-full max-w-7xl mx-auto">
                <div className="relative flex flex-col h-full bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                  <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs font-medium text-white/80 border border-white/10">
                    Original
                  </div>
                  <div className="flex-1 p-4 flex items-center justify-center">
                    <img
                      src={originalSrc}
                      alt="Original"
                      className="w-full h-full object-contain"
                      style={transformStyle}
                    />
                    </div>
                    </div>
                    <div className="relative flex flex-col h-full bg-white/5 rounded-2xl border border-[#FF6B35]/30 overflow-hidden">
                    <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-[#FF6B35]/80 backdrop-blur-md rounded-full text-xs font-medium text-white border border-white/10">
                    Enhanced
                    </div>
                    <div className="flex-1 p-4 flex items-center justify-center">
                    <img
                      src={resultImage}
                      alt="Result"
                      className="w-full h-full object-contain"
                      style={transformStyle}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-between p-6 border-t border-white/10 bg-[#141414] shrink-0">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Discard
            </Button>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={onDownload}
                className="bg-white/10 border-white/40 text-white hover:bg-white/20 hover:border-white/60 hover:text-white transition-all shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={onApply}
                className="bg-[#FF6B35] hover:bg-[#F72C25] text-white border-0 min-w-[160px] font-bold shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 transition-all z-10"
              >
                <Check className="w-5 h-5 mr-2" />
                Apply & Close
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}