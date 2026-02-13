import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wand2, Paintbrush, Eraser, X, Loader2, Sparkles, ImagePlus, Grid3x3, Trash2, RotateCcw, Zap, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BRUSH_PRESETS = [
  { size: 20, label: "S" },
  { size: 40, label: "M" },
  { size: 60, label: "L" },
  { size: 80, label: "XL" }
];

const QUICK_PROMPTS = [
  { icon: "✨", text: "Remove this", action: "remove this object" },
  { icon: "🎨", text: "Change color", action: "change the color to" },
  { icon: "🌟", text: "Add glow", action: "add a glowing effect" },
  { icon: "🔄", text: "Replace", action: "replace this with" },
  { icon: "🖼️", text: "Background", action: "change background to" },
  { icon: "💡", text: "Enhance", action: "enhance and improve this area" }
];

export default function MagicBrush({ 
  onGenerate, 
  isProcessing, 
  brushSize, 
  onBrushSizeChange,
  brushMode,
  onBrushModeChange,
  prompt,
  onPromptChange,
  referenceImages = [],
  onReferenceImagesChange,
  brushStrokes = []
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryCreations, setGalleryCreations] = useState([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [activeMode, setActiveMode] = useState("paint");
  const [showTips, setShowTips] = useState(false);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const newImages = await Promise.all(files.map(async (file) => {
        const result = await base44.integrations.Core.UploadFile({ file });
        return result.file_url;
      }));
      onReferenceImagesChange([...referenceImages, ...newImages]);
      toast.success(`${files.length} reference${files.length > 1 ? 's' : ''} added`);
      e.target.value = '';
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload images");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGalleryPick = async () => {
    setShowGallery(true);
    setIsLoadingGallery(true);
    try {
      const user = await base44.auth.me();
      const creations = await base44.entities.Creation.filter(
        { created_by: user.email },
        '-created_date',
        50
      );
      setGalleryCreations(creations);
    } catch (error) {
      console.error("Failed to load gallery:", error);
      toast.error("Failed to load gallery");
    } finally {
      setIsLoadingGallery(false);
    }
  };

  const handleGallerySelect = (creation) => {
    const imageUrl = creation.thumbnail_url || creation.url;
    onReferenceImagesChange([...referenceImages, imageUrl]);
    setShowGallery(false);
    toast.success("Reference added");
  };

  const handleQuickPrompt = (action) => {
    onPromptChange(action);
    toast.success("Quick prompt applied");
  };

  const hasContent = brushStrokes.length > 0 || prompt.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative rounded-2xl bg-gradient-to-br from-[#FF6B35]/5 via-transparent to-[#FFB800]/5 border border-[#FF6B35]/20 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwxMDcsNTMsMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
        <div className="relative p-4 flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#FFB800] flex items-center justify-center shadow-lg">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-semibold text-base">Magic Brush</h3>
              <button
                onClick={() => setShowTips(!showTips)}
                className="text-white/40 hover:text-white/80 transition-colors"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              Paint areas, describe changes, and watch AI transform your image
            </p>
          </div>
        </div>
        
        <AnimatePresence>
          {showTips && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/10 px-4 py-3 space-y-2 overflow-hidden"
            >
              <div className="flex items-start gap-2 text-xs text-white/60">
                <Sparkles className="w-3 h-3 text-[#FF6B35] mt-0.5 flex-shrink-0" />
                <span>Paint over the area you want to modify</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-white/60">
                <Sparkles className="w-3 h-3 text-[#FF6B35] mt-0.5 flex-shrink-0" />
                <span>Be specific: "add a red sports car" works better than "add car"</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-white/60">
                <Sparkles className="w-3 h-3 text-[#FF6B35] mt-0.5 flex-shrink-0" />
                <span>Add reference images for style and details</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mode Selector */}
      <div>
        <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Brush Mode</label>
        <Tabs value={brushMode} onValueChange={onBrushModeChange} className="w-full">
          <TabsList className="grid grid-cols-2 bg-white/5 p-1">
            <TabsTrigger value="draw" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B35] data-[state=active]:to-[#FFB800]">
              <Paintbrush className="w-4 h-4 mr-2" />
              Paint
            </TabsTrigger>
            <TabsTrigger value="erase" className="data-[state=active]:bg-white/20">
              <Eraser className="w-4 h-4 mr-2" />
              Erase
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Brush Size */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Brush Size</label>
          <span className="text-xs font-mono text-[#FF6B35] bg-[#FF6B35]/10 px-2 py-1 rounded">{brushSize}px</span>
        </div>
        <div className="flex gap-2 mb-3">
          {BRUSH_PRESETS.map(preset => (
            <button
              key={preset.size}
              onClick={() => onBrushSizeChange(preset.size)}
              className={`flex-1 h-9 rounded-lg text-xs font-medium transition-all ${
                brushSize === preset.size
                  ? 'bg-[#FF6B35] text-white shadow-lg'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <Slider
          value={[brushSize]}
          onValueChange={(value) => onBrushSizeChange(value[0])}
          min={10}
          max={100}
          step={5}
          className="[&_.relative]:bg-white/10 [&_.absolute]:bg-gradient-to-r [&_.absolute]:from-[#FF6B35] [&_.absolute]:to-[#FFB800] [&_span]:border-2 [&_span]:border-white/20 [&_span]:shadow-lg"
        />
      </div>

      {/* Quick Prompts */}
      <div>
        <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Quick Actions</label>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickPrompt(item.action)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FF6B35]/50 transition-all group"
            >
              <span className="text-lg group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="text-[10px] text-white/60 group-hover:text-white/90 transition-colors leading-tight text-center">{item.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Input */}
      <div>
        <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Instructions</label>
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Describe what you want... (e.g., 'replace with a sunset sky', 'remove the person', 'add a cat sitting here')"
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#FF6B35]/50 focus:bg-white/10 min-h-[90px] resize-none transition-all"
            rows={3}
          />
          {prompt.length > 0 && (
            <button
              onClick={() => onPromptChange('')}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-3 h-3 text-white/60" />
            </button>
          )}
        </div>
      </div>

      {/* Reference Images */}
      <div>
        <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Reference Images (Optional)</label>
        <div className="flex gap-2">
          <label className="flex-1 cursor-pointer">
            <div className="flex items-center justify-center gap-2 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FF6B35]/50 text-xs text-white/70 hover:text-white transition-all">
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              <span>Upload</span>
            </div>
            <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
          </label>
          
          <button
            onClick={handleGalleryPick}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FF6B35]/50 text-xs text-white/70 hover:text-white transition-all"
          >
            <Grid3x3 className="w-4 h-4" />
            Gallery
          </button>
          
          {referenceImages.length > 0 && (
            <button
              onClick={() => onReferenceImagesChange([])}
              className="px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs text-red-400 transition-all"
              title="Clear all references"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {referenceImages.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {referenceImages.map((url, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 group border-2 border-white/10">
                <img src={url} alt="Reference" className="w-full h-full object-cover" />
                <button
                  onClick={() => onReferenceImagesChange(referenceImages.filter((_, i) => i !== idx))}
                  className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Info */}
      {hasContent && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-[#FF6B35]/10 border border-[#FF6B35]/20"
        >
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-white/70">
              <Zap className="w-3 h-3 text-[#FF6B35]" />
              <span>{brushStrokes.length} stroke{brushStrokes.length !== 1 ? 's' : ''} drawn</span>
            </div>
            {prompt.length > 0 && (
              <div className="text-white/50">
                {prompt.length} characters
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Generate Button */}
      <Button
        onClick={onGenerate}
        disabled={isProcessing || brushStrokes.length === 0}
        className="w-full btn-gradient text-white h-12 text-sm font-semibold rounded-xl shadow-lg shadow-[#FF6B35]/20 hover:shadow-[#FF6B35]/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating Magic...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Apply Magic Brush
          </>
        )}
      </Button>

      {brushStrokes.length === 0 && (
        <p className="text-center text-xs text-white/40 -mt-2">
          Paint on the image to get started
        </p>
      )}

      {/* Gallery Dialog */}
      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="max-w-4xl max-h-[85vh] bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#0a0a0a] border-2 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold gradient-text flex items-center gap-2">
              <Grid3x3 className="w-5 h-5" />
              Select Reference Image
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(85vh-120px)]">
            {isLoadingGallery ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="aspect-square rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : galleryCreations.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-white/50 text-sm">No creations yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
                {galleryCreations.map((creation) => (
                  <button
                    key={creation.id}
                    onClick={() => handleGallerySelect(creation)}
                    className="relative aspect-square rounded-xl overflow-hidden border-2 border-white/10 hover:border-[#FF6B35]/60 transition-all group"
                  >
                    <img
                      src={creation.thumbnail_url || creation.url}
                      alt={creation.title || 'Creation'}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <p className="text-white text-xs font-medium line-clamp-2">{creation.title || 'Untitled'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}