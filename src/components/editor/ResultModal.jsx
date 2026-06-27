import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ArrowRight, RotateCcw, Check, Columns, ScanEye, RefreshCw, Loader2, BookImage, ChevronLeft, ChevronRight } from "lucide-react";
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
  isRegenerating,
  metadata = {}
}) {
  const [mode, setMode] = useState("compare");
  const [sliderPos, setSliderPos] = useState(50);
  const [userFeedback, setUserFeedback] = useState(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const compareRef = useRef(null);
  const draggingRef = useRef(false);

  const updateSliderFromClientX = useCallback((clientX) => {
    const el = compareRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = true;
    setIsDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    updateSliderFromClientX(e.clientX);
  }, [updateSliderFromClientX]);

  const handlePointerMove = useCallback((e) => {
    if (!draggingRef.current) return;
    updateSliderFromClientX(e.clientX);
  }, [updateSliderFromClientX]);

  const handlePointerUp = useCallback((e) => {
    draggingRef.current = false;
    setIsDragging(false);
    e.currentTarget?.releasePointerCapture?.(e.pointerId);
  }, []);

  // Keyboard support: arrow keys move slider by 2%
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderPos(prev => Math.max(0, prev - 2));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderPos(prev => Math.min(100, prev + 2));
    }
  }, []);

  // Reset error state when result image changes
  React.useEffect(() => {
    setImageLoadError(false);
  }, [resultImage]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveToGallery = async () => {
    if (!resultImage) return;
    setIsSaving(true);
    try {
      await base44.entities.Creation.create({
        type: 'image',
        url: resultImage,
        thumbnail_url: resultImage,
        title: `Edited ${new Date().toLocaleDateString()}`,
      });
      toast.success('Saved to gallery!');
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Failed to save to gallery');
    } finally {
      setIsSaving(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      document.body.setAttribute('data-modal-open', 'true');
    } else {
      document.body.removeAttribute('data-modal-open');
    }
    return () => document.body.removeAttribute('data-modal-open');
  }, [isOpen]);

  if (!isOpen) return null;

  const originalSrc = originalImage?.preview || originalImage?.url || originalImage;
  
  const transformStyle = transform ? {
    transform: `rotate(${transform.rotate}deg) scaleX(${transform.flipH ? -1 : 1}) scaleY(${transform.flipV ? -1 : 1})`
  } : {};

  const handleApplyWithFeedback = () => {
    onApply(metadata);
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
        className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-7xl h-[100dvh] sm:h-[90vh] glass-card sm:rounded-3xl overflow-hidden flex flex-col"
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
                ref={compareRef}
                className="relative w-full h-full max-w-5xl mx-auto flex items-center justify-center select-none touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {/* Result Image (Background) - No transform as it is baked */}
                {imageLoadError ? (
                  <div className="w-full h-full flex items-center justify-center bg-black/50 text-white">
                    Failed to load result image
                  </div>
                ) : (
                  <img
                    src={resultImage}
                    alt="Enhanced"
                    className="w-full h-full object-contain pointer-events-none"
                    onError={() => setImageLoadError(true)}
                  />
                )}

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
                  <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-xs font-semibold text-white/90 border border-white/10 pointer-events-none">
                    Original
                  </div>
                </div>

                {/* Slider Divider Line with glow */}
                <div 
                  className="absolute top-0 bottom-0 w-[2px] bg-white pointer-events-none"
                  style={{ 
                    left: `${sliderPos}%`,
                    transform: 'translateX(-50%)',
                    boxShadow: '0 0 12px rgba(255,255,255,0.5), 0 0 4px rgba(255,107,53,0.4)',
                    willChange: 'left'
                  }}
                />

                {/* Draggable Handle */}
                <div
                  className={`absolute top-1/2 z-10 flex items-center justify-center transition-transform duration-150 ${
                    isDragging ? 'scale-110' : 'hover:scale-105'
                  }`}
                  style={{ 
                    left: `${sliderPos}%`,
                    transform: `translate(-50%, -50%)`,
                    willChange: 'left, transform'
                  }}
                >
                  <div className={`w-11 h-11 rounded-full bg-white shadow-2xl flex items-center justify-center border-2 ${
                    isDragging ? 'border-[#FF6B35] shadow-[#FF6B35]/30' : 'border-white/20'
                  }`}>
                    <ChevronLeft className="w-4 h-4 text-[#FF6B35] -mr-1" />
                    <ChevronRight className="w-4 h-4 text-[#FF6B35] -ml-1" />
                  </div>
                </div>

                 {/* Label for Enhanced */}
                 <div className="absolute top-4 right-4 px-3 py-1.5 bg-[#FF6B35]/80 backdrop-blur-md rounded-full text-xs font-semibold text-white border border-white/10 pointer-events-none">
                    Enhanced
                 </div>

                 {/* Hint text when not dragging */}
                 <AnimatePresence>
                   {!isDragging && (
                     <motion.div
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       exit={{ opacity: 0 }}
                       className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full text-[11px] text-white/60 border border-white/10 pointer-events-none whitespace-nowrap"
                     >
                       Drag to compare
                     </motion.div>
                   )}
                 </AnimatePresence>
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
                    {imageLoadError ? (
                      <div className="w-full h-full flex items-center justify-center bg-black/50 text-white">
                        Failed to load result
                      </div>
                    ) : (
                      <img
                        src={resultImage}
                        alt="Result"
                        className="w-full h-full object-contain"
                        onError={() => setImageLoadError(true)}
                      />
                    )}
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
                onClick={handleSaveToGallery}
                disabled={isSaving}
                className="w-full sm:w-auto bg-white/10 border-white/40 text-white hover:bg-white/20 hover:border-white/60 hover:text-white transition-all shadow-sm disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookImage className="w-4 h-4 mr-2" />}
                {isSaving ? 'Saving...' : 'Save to Gallery'}
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