import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Download, RefreshCw, Copy, Check, Wand2, Image as ImageIcon, AlertCircle, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";

const stylePresets = [
  { id: "photo", label: "Photorealistic", prompt: "ultra realistic photograph, 8k, highly detailed, professional photography" },
  { id: "cinematic", label: "Cinematic", prompt: "cinematic shot, movie still, dramatic lighting, film grain" },
  { id: "anime", label: "Anime", prompt: "anime style, studio ghibli inspired, vibrant colors, detailed" },
  { id: "oil", label: "Oil Painting", prompt: "oil painting, classic art style, visible brush strokes, artistic" },
  { id: "3d", label: "3D Render", prompt: "3d render, octane render, volumetric lighting, high quality" },
  { id: "watercolor", label: "Watercolor", prompt: "watercolor painting, soft edges, artistic, flowing colors" },
  { id: "pixel", label: "Pixel Art", prompt: "pixel art, 16-bit style, retro game aesthetic" },
  { id: "minimalist", label: "Minimalist", prompt: "minimalist design, clean lines, simple, modern" },
];

export default function Generate() {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt to generate an image");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const stylePrompt = selectedStyle 
        ? stylePresets.find(s => s.id === selectedStyle)?.prompt 
        : "";
      
      const fullPrompt = `${prompt}${stylePrompt ? `, ${stylePrompt}` : ''}, masterpiece, high quality, detailed`;
      
      const result = await base44.integrations.Core.GenerateImage({
        prompt: fullPrompt
      });
      
      const newImage = {
        id: Date.now(),
        url: result.url,
        prompt: prompt,
        style: selectedStyle,
        timestamp: new Date().toISOString()
      };
      
      setGeneratedImages([newImage, ...generatedImages]);
      setPrompt("");
      setSelectedStyle(null);
    } catch (err) {
      console.error("Error generating image:", err);
      setError("Failed to generate image. Please try again or modify your prompt.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (imageUrl, imagePrompt) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `flik_${imagePrompt.slice(0, 30).replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      window.open(imageUrl, '_blank');
    }
  };

  const handleCopyPrompt = (imagePrompt, id) => {
    navigator.clipboard.writeText(imagePrompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteImage = (id) => {
    setGeneratedImages(generatedImages.filter(img => img.id !== id));
  };

  return (
    <div className="min-h-screen">
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-b from-[#FF6B35]/20 to-transparent blur-[100px]" />
        </div>
        
        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
          >
            <Sparkles className="w-4 h-4 text-[#FF6B35]" />
            <span className="text-sm text-white/70">Powered by AI</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold mb-6"
          >
            <span className="text-white">Create with </span>
            <span className="gradient-text">Imagination</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-white/50 mb-12 max-w-2xl mx-auto"
          >
            Describe your vision and watch AI bring it to life in seconds
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="gradient-border p-6 max-w-3xl mx-auto"
          >
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A majestic lion on a cliff at sunset, golden hour lighting..."
              className="min-h-[120px] bg-[#141414] border border-white/10 text-white placeholder:text-white/40 text-lg resize-none focus-visible:ring-2 focus-visible:ring-[#FF6B35] focus-visible:ring-offset-0"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleGenerate();
                }
              }}
            />
            
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-white/40 mb-3 text-left">Style Presets (Optional)</p>
              <div className="flex flex-wrap gap-2">
                {stylePresets.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(selectedStyle === style.id ? null : style.id)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                      ${selectedStyle === style.id 
                        ? "bg-gradient-to-r from-[#FF6B35] to-[#FFB800] text-white" 
                        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                      }
                    `}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>
            
            {error && (
              <Alert className="mt-4 bg-red-500/10 border-red-500/20 text-red-400">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="mt-6 flex justify-between items-center">
              <div className="text-xs text-white/40">
                Tip: Press {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter
              </div>
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="btn-gradient border-0 text-white px-8 py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Generate Image
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
      
      <section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          {generatedImages.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-8 flex items-center justify-between"
            >
              <h2 className="text-xl font-semibold text-white">
                Your Creations ({generatedImages.length})
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGeneratedImages([])}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </motion.div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {generatedImages.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative aspect-square rounded-2xl overflow-hidden gradient-border"
                >
                  <img
                    src={image.url}
                    alt={image.prompt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="absolute top-4 right-4">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteImage(image.id)}
                        className="bg-black/50 hover:bg-black/70 text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-sm text-white/80 line-clamp-2 mb-4">
                        {image.prompt}
                      </p>
                      {image.style && (
                        <div className="mb-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-[#FF6B35]/20 text-[#FF6B35] border border-[#FF6B35]/30">
                            {stylePresets.find(s => s.id === image.style)?.label}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleDownload(image.url, image.prompt)}
                          className="flex-1 bg-white/10 hover:bg-white/20 text-white border-0"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyPrompt(image.prompt, image.id)}
                          className="text-white hover:bg-white/10"
                        >
                          {copiedId === image.id ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {generatedImages.length === 0 && !isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
                <ImageIcon className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-white/40 text-lg mb-2">Your generated images will appear here</p>
              <p className="text-white/30 text-sm">Enter a prompt above to create your first AI image</p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}