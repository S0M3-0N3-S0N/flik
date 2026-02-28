import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ArrowRight, RotateCcw, Check, Columns, ScanEye, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ResultModal({ 
  isOpen, 
  onClose, 
  originalImage, 
  resultImage, 
  onApply, 
  onDownload, 
  transform, 
  onRegenerate, 
  isRegenerating 
}) {
  const [mode, setMode] = useState("compare");
  const [sliderPos, setSliderPos] = useState(50);
  const [userFeedback, setUserFeedback] = useState(null);

  const handleDownloadResult = async () => {
    if (!resultImage) return;
    try {
      const response = await fetch(resultImage);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `flik_result_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // fallback to original handler
      onDownload();
    }
  };

  if (!isOpen) return null;

  const originalSrc = originalImage?.preview || originalImage?.url || originalImage;
  
  const transformStyle = transform ? {
    transform: `rotate(${transform.rotate}deg) scaleX(${transform.flipH ? -1 : 1}) scaleY(${transform.flipV ? -1 : 1})`
  } : {};

  const handleApplyWithFeedback = () => {
    onApply();
  };

  const handleDiscardWithFeedback = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-7xl h-[90vh] glass-card rounded-3xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2 sm:gap-4">
              <h2 className="text-lg sm:text-xl font-semibold text-white">Result</h2>
              <div className="flex bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setMode("compare")}
                  className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                    mode === "compare" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
                  }`}
                  title="Slider Comparison"
                >
                  <ScanEye className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Slider</span>
                </button>
                <button
                  onClick={() => setMode("side")}
                  className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                    mode === "side" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
                  }`}
                  title="Side-by-Side Comparison"
                >
                  <Columns className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Side-by-Side</span>
                </button>
              </div>
            </div>
            <button
              onClick={handleDiscardWithFeedback}
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
                {/* Result Image (Background) - No transform as it is baked */}
                <img
                  src={resultImage}
                  alt="Enhanced"
                  className="w-full h-full object-contain pointer-events-none"
                />

                {/* Original Image (Foreground - Clipped) - Transform needed to match visual */}
                <div 
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{ 
                    clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
                    WebkitClipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`
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
              <div className="grid grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1 gap-4 w-full h-full max-w-7xl mx-auto overflow-hidden p-1">
                <div className="relative flex flex-col h-full min-h-0 bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                  <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs font-medium text-white/80 border border-white/10">
                    Original
                  </div>
                  <div className="flex-1 p-4 flex items-center justify-center overflow-hidden">
                    <img
                      src={originalSrc}
                      alt="Original"
                      className="w-full h-full object-contain"
                      style={transformStyle}
                    />
                  </div>
                </div>
                <div className="relative flex flex-col h-full min-h-0 bg-white/5 rounded-2xl border border-[#FF6B35]/30 overflow-hidden">
                  <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-[#FF6B35]/80 backdrop-blur-md rounded-full text-xs font-medium text-white border border-white/10">
                    Enhanced
                  </div>
                  <div className="flex-1 p-4 flex items-center justify-center overflow-hidden">
                    <img
                      src={resultImage}
                      alt="Result"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between p-4 sm:p-6 gap-4 border-t border-white/10 bg-[#141414] shrink-0">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                onClick={handleDiscardWithFeedback}
                className="flex-1 sm:flex-none text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4 mr-2" />
                Discard
              </Button>
              {onRegenerate && (
              <Button
                variant="ghost"
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="flex-1 sm:flex-none text-[#FF6B35] hover:text-[#F72C25] hover:bg-[#FF6B35]/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                  </>
                )}
              </Button>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={handleDownloadResult}
                className="w-full sm:w-auto bg-white/10 border-white/40 text-white hover:bg-white/20 hover:border-white/60 hover:text-white transition-all shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={handleApplyWithFeedback}
                className="w-full sm:w-auto bg-[#FF6B35] hover:bg-[#F72C25] text-white border-0 sm:min-w-[160px] font-bold shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 transition-all z-10"
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