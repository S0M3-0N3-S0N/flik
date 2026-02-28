import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2, Upload, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function TextGeneratorPanel({ onTextImageGenerated, isProcessing }) {
  const [textContent, setTextContent] = useState("");
  const [stylePrompt, setStylePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [referenceImages, setReferenceImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;

    setIsUploading(true);
    try {
      const newImages = await Promise.all(
        files.map(async (file) => {
          const result = await base44.integrations.Core.UploadFile({ file });
          return { url: result.file_url, id: Date.now() + Math.random() };
        })
      );
      setReferenceImages(prev => [...prev, ...newImages]);
      toast.success(`${newImages.length} image(s) added as reference`);
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Failed to upload images");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (id) => {
    setReferenceImages(prev => prev.filter(img => img.id !== id));
  };

  const handleGenerateText = async () => {
    if (!textContent.trim()) {
      toast.error("Please enter text");
      return;
    }
    if (!stylePrompt.trim()) {
      toast.error("Please describe the style");
      return;
    }

    setIsGenerating(true);
    try {
      let prompt = `Create an image with stylized text that says "${textContent}". Style: ${stylePrompt}. Make the text visually striking, readable, and artistic. Transparent or white background preferred.`;
      
      if (referenceImages.length > 0) {
        prompt += ` Use the provided reference images to ensure the text style matches the visual aesthetic shown in those images.`;
      }

      const imageResult = await base44.integrations.Core.GenerateImage({
        prompt,
        existing_image_urls: referenceImages.length > 0 ? referenceImages.map(img => img.url) : undefined,
      });

      if (imageResult?.url) {
        onTextImageGenerated(imageResult.url);
        toast.success("Text generated successfully!");
        setTextContent("");
        setStylePrompt("");
      } else {
        toast.error("Failed to generate text");
      }
    } catch (error) {
      console.error("Error generating text:", error);
      toast.error("Error generating text. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="relative bg-[#141414]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-4 space-y-4">
        <div>
          <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">
            Text Content
          </label>
          <input
            type="text"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleGenerateText();
              }
            }}
            placeholder="Enter text to stylize..."
            className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-white/30 text-base focus:outline-none focus:border-[#FF6B35] transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">
            Style Description
          </label>
          <textarea
            value={stylePrompt}
            onChange={(e) => setStylePrompt(e.target.value)}
            placeholder="Describe the font style (e.g., 'glowing neon, cyberpunk', 'elegant gold with flowers', 'fiery red script')..."
            rows={4}
            className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-white/30 text-base focus:outline-none focus:border-[#FF6B35] transition-colors resize-none"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">
            Reference Images
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#FF6B35]/50 text-white text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? "Uploading..." : "Add Reference Images"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            <AnimatePresence>
              {referenceImages.map((img) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/10 group"
                >
                  <img src={img.url} alt="Reference" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemoveImage(img.id)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {referenceImages.length > 0 && (
            <p className="text-xs text-white/40 mt-2">
              {referenceImages.length} reference image{referenceImages.length !== 1 ? 's' : ''} added
            </p>
          )}
        </div>
      </div>

      <Button
        onClick={handleGenerateText}
        disabled={isGenerating || isProcessing || !textContent.trim() || !stylePrompt.trim()}
        className="btn-gradient w-full text-white rounded-lg h-10 shadow-lg shadow-[#FF6B35]/20 hover:shadow-[#FF6B35]/40 transition-all disabled:opacity-30"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Generating...
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4 mr-2" />
            Generate Text
          </>
        )}
      </Button>
    </motion.div>
  );
}