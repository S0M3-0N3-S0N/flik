import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Download, RefreshCw, Copy, Check, Wand2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";

const stylePresets = [
  { id: "photo", label: "Photorealistic", prompt: "ultra realistic photograph, 8k, detailed" },
  { id: "cinematic", label: "Cinematic", prompt: "cinematic shot, movie still, dramatic lighting" },
  { id: "anime", label: "Anime", prompt: "anime style, studio ghibli, vibrant colors" },
  { id: "oil", label: "Oil Painting", prompt: "oil painting, classic art style, brush strokes" },
  { id: "3d", label: "3D Render", prompt: "3d render, octane render, volumetric lighting" },
  { id: "watercolor", label: "Watercolor", prompt: "watercolor painting, soft edges, artistic" },
  { id: "pixel", label: "Pixel Art", prompt: "pixel art, 16-bit, retro game style" },
  { id: "minimalist", label: "Minimalist", prompt: "minimalist design, clean lines, simple" },
];

export default function Generate() {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    
    try {
      const stylePrompt = selectedStyle 
        ? stylePresets.find(s => s.id === selectedStyle)?.prompt 
        : "";
      
      const fullPrompt = `${prompt}. ${stylePrompt}. High quality, masterpiece, best quality`;
      
      const result = await base44.integrations.Core.GenerateImage({
        prompt: fullPrompt
      });
      
      setGeneratedImages([
        { id: Date.now(), url: result.url, prompt: prompt },
        ...generatedImages
      ]);
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (imageUrl) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = "flik_generated.png";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyPrompt = (imagePrompt, id) => {
    navigator.clipboard.writeText(imagePrompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-6 overflow-hidden">
        {/* Background effects */}
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
            Describe your vision and watch AI bring it to life. Generate stunning images in any style.
          </motion.p>
          
          {/* Prompt Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="gradient-border p-6 max-w-3xl mx-auto"
          >
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to create... (e.g., 'A majestic lion standing on a cliff at sunset, golden hour lighting')"
              className="min-h-[120px] bg-transparent border-0 text-white placeholder:text-white/30 text-lg resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            
            {/* Style Presets */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-white/40 mb-3 text-left">Style Presets</p>
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
            
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="btn-gradient border-0 text-white px-8 py-6 text-lg disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Generated Images Grid */}
      <section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          {generatedImages.length > 0 && (
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-semibold text-white mb-8"
            >
              Your Creations
            </motion.h2>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {generatedImages.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative aspect-square rounded-2xl overflow-hidden gradient-border"
                >
                  <img
                    src={image.url}
                    alt={image.prompt}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-sm text-white/80 line-clamp-2 mb-4">
                        {image.prompt}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleDownload(image.url)}
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
          
          {generatedImages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
                <ImageIcon className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-white/40">Your generated images will appear here</p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}