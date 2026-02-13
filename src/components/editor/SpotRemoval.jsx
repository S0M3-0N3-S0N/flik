import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wand2, Paintbrush, Eraser, ImagePlus, X, Loader2, Sparkles, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SpotRemoval({ 
  onRemoveSpot, 
  isProcessing, 
  brushSize, 
  onBrushSizeChange,
  brushMode,
  onBrushModeChange,
  prompt,
  onPromptChange,
  referenceImages = [],
  onReferenceImagesChange
}) {
  const [isUploading, setIsUploading] = useState(false);



  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const newUrls = [];
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        newUrls.push(result.file_url);
      }
      onReferenceImagesChange([...referenceImages, ...newUrls]);
      toast.success(`${files.length} reference image${files.length > 1 ? 's' : ''} added`);
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (index) => {
    const newImages = referenceImages.filter((_, i) => i !== index);
    onReferenceImagesChange(newImages);
    toast.success("Reference removed");
  };

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-xl bg-gradient-to-br from-[#FF6B35]/10 to-[#FFB800]/10 border border-[#FF6B35]/20">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FF6B35]/20 flex items-center justify-center flex-shrink-0">
            <Wand2 className="w-4 h-4 text-[#FF6B35]" />
          </div>
          <div>
            <h4 className="text-white font-medium text-sm mb-1">Magic Brush</h4>
            <p className="text-xs text-white/60 leading-relaxed">
              Paint the area, then describe what you want
            </p>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-white/70 text-xs mb-2 block">Brush Mode</Label>
        <div className="flex gap-2 bg-white/5 p-1 rounded-lg">
          <button
            onClick={() => onBrushModeChange('draw')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all ${
              brushMode === 'draw' 
                ? 'bg-[#FF6B35] text-white' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Paintbrush className="w-3 h-3" />
            Paint
          </button>
          <button
            onClick={() => onBrushModeChange('erase')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all ${
              brushMode === 'erase' 
                ? 'bg-white/20 text-white' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Eraser className="w-3 h-3" />
            Erase
          </button>
        </div>
      </div>

      <div>
        <div className="flex justify-between mb-2">
          <Label className="text-white/70 text-xs">Brush Size</Label>
          <span className="text-xs text-white/50">{brushSize}px</span>
        </div>
        <Slider
          value={[brushSize]}
          onValueChange={(value) => onBrushSizeChange(value[0])}
          min={10}
          max={100}
          step={5}
          className="[&_.relative]:bg-white/10 [&_.absolute]:bg-[#FF6B35]"
        />
      </div>

      <div>
        <Label className="text-white/70 text-xs mb-2 block">What do you want?</Label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="e.g., 'remove this object', 'add a blue car here', 'change sky to sunset'"
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#FF6B35]/50 min-h-[80px] resize-none"
        />
      </div>

      <div>
        <Label className="text-white/70 text-xs mb-2 block">Reference Images (Optional)</Label>
        <label className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 border-dashed text-xs text-white/70 cursor-pointer transition-colors">
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <ImagePlus className="w-4 h-4" />
              Add Reference Images
            </>
          )}
          <input 
            type="file" 
            accept="image/*" 
            multiple 
            onChange={handleImageUpload} 
            className="hidden" 
            disabled={isUploading}
          />
        </label>
        
        {referenceImages.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {referenceImages.map((url, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10 group">
                <img src={url} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button
        onClick={onRemoveSpot}
        disabled={isProcessing}
        className="w-full btn-gradient h-11 text-sm font-medium rounded-lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Apply Magic
          </>
        )}
      </Button>
    </div>
  );
}