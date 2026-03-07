import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Wand2, Paintbrush, Eraser, MessageSquare, ImagePlus, X, Loader2, Sparkles, Lightbulb, Grid3x3 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [galleryCreations, setGalleryCreations] = useState([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [selectedGalleryImages, setSelectedGalleryImages] = useState([]);

  // Debounce prompt changes to get AI suggestions
  useEffect(() => {
    if (!prompt || prompt.length < 10) {
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      getAISuggestions(prompt);
    }, 1500); // Wait 1.5s after user stops typing

    return () => clearTimeout(timer);
  }, [prompt]);

  const getAISuggestions = async (userPrompt) => {
    if (!userPrompt || userPrompt.length < 10) return;

    setIsLoadingSuggestions(true);
    try {
      // Fetch successful prompts from the learning database
      const learnedPrompts = await base44.entities.PromptLearning.filter(
        { tool_type: 'magic_brush', was_successful: true },
        '-created_date',
        10
      );

      // Use AI to enhance the prompt
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert image editing AI assistant. A user is using the Magic Brush tool and has written this prompt:

  "${userPrompt}"

  ${learnedPrompts.length > 0 ? `Based on successful prompts from other users:\n${learnedPrompts.map((p, i) => `${i + 1}. "${p.prompt}"`).join('\n')}` : ''}

  Provide 3 enhanced versions of their prompt that will give better results. Make them:
  - More specific and descriptive
  - Include better visual details
  - Maintain the user's original intent

  Return ONLY the 3 suggestions, nothing else.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      if (response?.suggestions && response.suggestions.length > 0) {
        setAiSuggestions(response.suggestions);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error("Failed to get AI suggestions:", error);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target?.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const newImages = await Promise.all(files.map(async (file) => {
        if (!file.type.startsWith('image/')) throw new Error(`Invalid file type: ${file.type}`);
        const result = await base44.integrations.Core.UploadFile({ file });
        if (!result?.file_url) throw new Error('No file URL returned');
        return { url: result.file_url, title: file.name };
      }));

      const updatedImages = [...(Array.isArray(referenceImages) ? referenceImages : []), ...newImages];
      onReferenceImagesChange(updatedImages);
      toast.success(`${files.length} image${files.length > 1 ? 's' : ''} uploaded successfully!`);
      if (e.target) e.target.value = '';
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(`Failed to upload: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGalleryPick = async () => {
    setShowGalleryPicker(true);
    setIsLoadingGallery(true);
    try {
      const user = await base44.auth.me();
      if (!user?.email) {
        throw new Error("User not authenticated");
      }
      const creations = await base44.entities.Creation.filter(
          { created_by: user.email },
          '-created_date',
          200
        );
      setGalleryCreations(creations);
    } catch (error) {
      console.error("Failed to load gallery:", error);
      toast.error("Failed to load gallery");
      setShowGalleryPicker(false);
    } finally {
      setIsLoadingGallery(false);
    }
  };

  const handleGalleryToggle = (creation) => {
    const imageUrl = creation?.thumbnail_url || creation?.url;
    if (!imageUrl) return;
    setSelectedGalleryImages(prev => 
      prev.includes(imageUrl) 
        ? prev.filter(url => url !== imageUrl)
        : [...prev, imageUrl]
    );
  };

  const handleAddSelectedImages = () => {
    if (selectedGalleryImages.length > 0) {
      const currentRefs = Array.isArray(referenceImages) ? referenceImages : [];
      const newRefs = selectedGalleryImages.map(url => ({ url, title: 'Gallery Image' }));
      onReferenceImagesChange([...currentRefs, ...newRefs]);
      toast.success(`${selectedGalleryImages.length} image${selectedGalleryImages.length > 1 ? 's' : ''} added from gallery`);
      setSelectedGalleryImages([]);
      setShowGalleryPicker(false);
    }
  };

  const handleGenerateWithLearning = () => {
    // Proceed with the actual generation (learning is logged in useMagicBrush)
    onRemoveSpot();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-6 px-4 space-y-6"
    >
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FF6B35]/10 to-[#FFB800]/10 border border-[#FF6B35]/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/20 flex items-center justify-center flex-shrink-0 text-[#FF6B35]">
            <Wand2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-medium text-sm mb-1">Magic Brush</h4>
            <p className="text-xs text-white/60 leading-relaxed">
              Paint over areas to transform them. Describe what you want to add, change, or remove.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-white/80 text-xs font-medium uppercase tracking-wider mb-3 block">Brush Mode</Label>
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => onBrushModeChange('draw')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                brushMode === 'draw' 
                  ? 'bg-[#FF6B35] text-white shadow-lg' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Paintbrush className="w-4 h-4" />
              Draw
            </button>
            <button
              onClick={() => onBrushModeChange('erase')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                brushMode === 'erase' 
                  ? 'bg-white/20 text-white shadow-lg' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Eraser className="w-4 h-4" />
              Eraser
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-white/80 text-xs font-medium uppercase tracking-wider">Brush Size</Label>
            <span className="text-xs font-mono text-white/50 bg-white/5 px-2 py-1 rounded">{brushSize}px</span>
          </div>
          <Slider
            value={[brushSize]}
            onValueChange={(value) => onBrushSizeChange(value[0])}
            min={10}
            max={100}
            step={5}
            className="[&_.relative]:bg-white/10 [&_.absolute]:bg-[#FF6B35] [&_span]:border-none [&_span]:shadow-lg"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <Label className="text-white/80 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
              Instructions
              {isLoadingSuggestions && <Loader2 className="w-3 h-3 animate-spin text-[#FF6B35]" />}
            </Label>
            {prompt.length > 10 && (
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="text-xs text-[#FF6B35] hover:text-[#FFB800] transition-colors flex items-center gap-1"
              >
                <Lightbulb className="w-3 h-3" />
                {showSuggestions ? 'Hide' : 'Suggestions'}
              </button>
            )}
          </div>
          
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder="Describe your magic edit... (e.g., 'put a vintage lamp here', 'make the sky purple', 'remove this person')"
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF6B35]/50 focus:bg-white/5 min-h-[100px] resize-none transition-all [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            />
          </div>

          <AnimatePresence>
            {showSuggestions && aiSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-3 space-y-2"
              >
                <div className="text-xs text-white/40 flex items-center gap-2 mb-2">
                  <Sparkles className="w-3 h-3 text-[#FF6B35]" />
                  AI-Enhanced Suggestions
                </div>
                {aiSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onPromptChange(suggestion);
                      setShowSuggestions(false);
                      toast.success("Prompt enhanced!");
                    }}
                    className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-[#FF6B35]/20 border border-white/10 hover:border-[#FF6B35]/50 text-xs text-white/80 hover:text-white transition-all group"
                  >
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-3 h-3 text-[#FF6B35] mt-0.5 flex-shrink-0" />
                      <span className="leading-relaxed">{suggestion}</span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3 mt-3">
            <Label className="text-white/60 text-xs">Reference Images (Optional)</Label>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGalleryPick}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 transition-colors h-[36px] whitespace-nowrap"
              >
                <Grid3x3 className="w-4 h-4" />
                <span className="hidden sm:inline">Gallery</span>
                <span className="sm:hidden">Gal</span>
              </button>

              <label className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-xs text-white/80 transition-colors h-[36px] whitespace-nowrap ${
                isUploading 
                  ? 'bg-white/5 cursor-not-allowed opacity-50' 
                  : 'bg-white/5 hover:bg-white/10 cursor-pointer'
              }`}>
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Uploading...</span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Upload</span>
                    <span className="sm:hidden">Up</span>
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

              {referenceImages?.length > 0 && (
                <div className="flex items-center justify-center min-w-[36px] h-[36px] rounded-lg bg-[#FF6B35]/20 border border-[#FF6B35]/40 px-2" title={`${referenceImages.length} images added`}>
                  <span className="text-xs text-[#FF6B35] font-semibold">{referenceImages.length}</span>
                </div>
              )}
            </div>
            
            {referenceImages.length > 0 && (
              <div className="space-y-2">
                <Label className="text-white/60 text-xs">Reference Images</Label>
                <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {referenceImages.map((ref, idx) => {
                    const url = typeof ref === 'string' ? ref : ref?.url;
                    return (
                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 group border border-white/10 bg-white/5">
                      <img src={url} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover" onError={(e) => {
                        console.error(`Failed to load image ${idx}:`, url);
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23333"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23666" font-size="10"%3EError%3C/text%3E%3C/svg%3E';
                      }} />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReferenceImagesChange(referenceImages.filter((_, i) => i !== idx));
                          toast.success("Image removed");
                        }}
                        className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        title="Remove image"
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={handleGenerateWithLearning}
          disabled={isProcessing}
          className="w-full btn-gradient text-white h-12 text-sm font-medium rounded-xl mt-2 shadow-lg shadow-[#FF6B35]/20 hover:shadow-[#FF6B35]/30 hover:translate-y-[-1px] transition-all"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              Generate Changes
            </>
          )}
        </Button>
      </div>

      {/* Gallery Picker Dialog */}
      <Dialog open={showGalleryPicker} onOpenChange={(open) => {
        setShowGalleryPicker(open);
        if (!open) setSelectedGalleryImages([]);
      }}>
        <DialogContent className="max-w-5xl h-[90vh] sm:h-[85vh] bg-[#0a0a0a] border border-white/10 text-white p-0 gap-0 overflow-hidden flex flex-col">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 bg-gradient-to-r from-[#FF6B35]/5 to-[#FFB800]/5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#FFB800] flex items-center justify-center flex-shrink-0">
                  <Grid3x3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-white truncate">Your Gallery</h3>
                  <p className="text-xs text-white/50 hidden sm:block">Select images to add as references</p>
                </div>
              </div>
              {selectedGalleryImages.length > 0 && (
                <Button
                  onClick={handleAddSelectedImages}
                  className="btn-gradient h-9 px-3 sm:px-4 text-xs sm:text-sm flex-shrink-0"
                >
                  <span className="hidden sm:inline">Add</span> ({selectedGalleryImages.length})
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {isLoadingGallery ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="aspect-square rounded-lg bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : galleryCreations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 sm:py-20 px-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-3 sm:mb-4">
                  <Grid3x3 className="w-6 h-6 sm:w-8 sm:h-8 text-white/30" />
                </div>
                <p className="text-white/60 text-sm">No creations yet</p>
                <p className="text-white/40 text-xs mt-1">Create your first image to see it here</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {galleryCreations.map((creation) => {
                  const imageUrl = creation.thumbnail_url || creation.url;
                  const isSelected = selectedGalleryImages.includes(imageUrl);
                  return (
                    <button
                      key={creation.id}
                      onClick={() => handleGalleryToggle(creation)}
                      className={`relative aspect-square rounded-lg overflow-hidden transition-all active:scale-95 ${
                        isSelected 
                          ? 'ring-2 ring-[#FF6B35]' 
                          : ''
                      }`}
                    >
                      <img
                        src={imageUrl}
                        alt={creation.title || 'Creation'}
                        className="w-full h-full object-cover"
                      />
                      <div className={`absolute inset-0 transition-all ${
                        isSelected 
                          ? 'bg-[#FF6B35]/20' 
                          : 'bg-black/0'
                      }`} />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#FF6B35] flex items-center justify-center shadow-lg">
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}