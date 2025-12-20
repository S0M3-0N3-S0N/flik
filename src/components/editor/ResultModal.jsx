import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, RotateCcw, Check, ZoomIn, ZoomOut, Maximize2, SplitSquareHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ResultModal({ isOpen, onClose, originalImage, resultImage, onApply, onDownload }) {
  const [viewMode, setViewMode] = useState("split"); // "split", "result", "original"
  const [zoom, setZoom] = useState(1);
  
  if (!isOpen) return null;

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.25, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

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
          className="w-full h-full max-w-[95vw] max-h-[95vh] glass-card rounded-3xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-4">
              <h2 className="text-lg md:text-xl font-semibold text-white">Result</h2>
              
              {/* View Mode Tabs */}
              <Tabs value={viewMode} onValueChange={setViewMode}>
                <TabsList className="bg-white/5">
                  <TabsTrigger value="split" className="data-[state=active]:bg-[#FF6B35]">
                    <SplitSquareHorizontal className="w-4 h-4 mr-2" />
                    Split
                  </TabsTrigger>
                  <TabsTrigger value="result" className="data-[state=active]:bg-[#FF6B35]">
                    Enhanced
                  </TabsTrigger>
                  <TabsTrigger value="original" className="data-[state=active]:bg-[#FF6B35]">
                    Original
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="hidden md:flex items-center gap-1 mr-2 bg-white/5 rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="h-8 w-8 text-white hover:bg-white/10"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <button
                  onClick={handleResetZoom}
                  className="px-3 text-sm text-white/60 hover:text-white"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  className="h-8 w-8 text-white hover:bg-white/10"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
              
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
          
          {/* Image Comparison Area */}
          <div className="flex-1 overflow-auto bg-[#0A0A0A] p-4 md:p-8">
            <div className="w-full h-full flex items-center justify-center">
              {viewMode === "split" ? (
                <div className="grid md:grid-cols-2 gap-4 md:gap-8 w-full h-full">
                  {/* Original */}
                  <div className="space-y-3 flex flex-col min-h-0">
                    <div className="flex items-center justify-between flex-shrink-0">
                      <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white/60">
                        Original
                      </span>
                    </div>
                    <div className="flex-1 rounded-2xl overflow-hidden bg-white/5 flex items-center justify-center min-h-0">
                      <div className="relative w-full h-full overflow-auto flex items-center justify-center p-4">
                        <img
                          src={originalImage?.preview || originalImage?.url}
                          alt="Original"
                          style={{ transform: `scale(${zoom})` }}
                          className="max-w-none h-auto transition-transform duration-200 origin-center"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Result */}
                  <div className="space-y-3 flex flex-col min-h-0">
                    <div className="flex items-center justify-between flex-shrink-0">
                      <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FFB800] text-xs font-medium text-white">
                        Enhanced
                      </span>
                    </div>
                    <div className="flex-1 rounded-2xl overflow-hidden bg-white/5 flex items-center justify-center relative min-h-0">
                      <div className="relative w-full h-full overflow-auto flex items-center justify-center p-4">
                        <img
                          src={resultImage}
                          alt="Result"
                          style={{ transform: `scale(${zoom})` }}
                          className="max-w-none h-auto transition-transform duration-200 origin-center"
                        />
                      </div>
                      {/* Glow effect */}
                      <div className="absolute inset-0 pointer-events-none rounded-2xl"
                        style={{
                          boxShadow: "inset 0 0 80px rgba(255, 107, 53, 0.15)"
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col min-h-0">
                  <div className="mb-4 flex-shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      viewMode === "result" 
                        ? "bg-gradient-to-r from-[#FF6B35] to-[#FFB800] text-white"
                        : "bg-white/10 text-white/60"
                    }`}>
                      {viewMode === "result" ? "Enhanced" : "Original"}
                    </span>
                  </div>
                  <div className="flex-1 rounded-2xl overflow-hidden bg-white/5 flex items-center justify-center relative min-h-0">
                    <div className="relative w-full h-full overflow-auto flex items-center justify-center p-4">
                      <img
                        src={viewMode === "result" ? resultImage : (originalImage?.preview || originalImage?.url)}
                        alt={viewMode === "result" ? "Result" : "Original"}
                        style={{ transform: `scale(${zoom})` }}
                        className="max-w-none h-auto transition-transform duration-200 origin-center"
                      />
                    </div>
                    {viewMode === "result" && (
                      <div className="absolute inset-0 pointer-events-none rounded-2xl"
                        style={{
                          boxShadow: "inset 0 0 80px rgba(255, 107, 53, 0.15)"
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-between p-4 md:p-6 border-t border-white/10 bg-white/[0.02] flex-shrink-0">
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