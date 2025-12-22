import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Download, Copy, Check, Wand2, Image as ImageIcon, Trash2, Loader2, Zap, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [aiModel, setAiModel] = useState("default");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [promptHistory, setPromptHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    
    setIsUploading(true);
    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      setUploadedImage({ url: uploadResult.file_url, file });
      setIsUploading(false);
    } catch (err) {
      setError("Failed to upload image");
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !uploadedImage) {
      setError("Please enter a prompt or upload an image");
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      let finalPrompt = prompt || "enhance this image, improve quality, professional result";
      
      if (aiModel === "gemini" && prompt) {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are an expert at creating detailed image generation prompts. Take this user request and expand it into a highly detailed, specific image generation prompt that will produce amazing results. Keep the core idea but add artistic details, lighting, composition, style elements, and technical quality specifications.

User request: "${prompt}"

Respond with ONLY the enhanced prompt, nothing else.`,
          response_json_schema: null
        });
        finalPrompt = result;
      }
      
      const stylePrompt = selectedStyle 
        ? stylePresets.find(s => s.id === selectedStyle)?.prompt 
        : "";
      
      const fullPrompt = `${finalPrompt}${stylePrompt ? `, ${stylePrompt}` : ''}, masterpiece, high quality, detailed`;
      
      const imageResult = await base44.integrations.Core.GenerateImage({
        prompt: fullPrompt,
        existing_image_urls: uploadedImage ? [uploadedImage.url] : undefined
      });
      
      const newImage = {
        id: Date.now(),
        url: imageResult.url,
        prompt: prompt,
        enhancedPrompt: aiModel === "gemini" ? finalPrompt : null,
        style: selectedStyle,
        model: aiModel,
        timestamp: new Date().toISOString()
      };
      
      try {
        await base44.entities.Creation.create({
          title: prompt.slice(0, 100) || 'AI Generated Image',
          type: 'image',
          url: imageResult.url,
          thumbnail_url: imageResult.url,
          prompt: prompt,
          metadata: { style: selectedStyle, model: aiModel, enhancedPrompt: finalPrompt }
        });
      } catch (saveErr) {
        console.error('Failed to save to gallery:', saveErr);
      }

      setGeneratedImages([newImage, ...generatedImages]);
      
      if (prompt.trim()) {
        setPromptHistory(prev => [prompt, ...prev.filter(p => p !== prompt)].slice(0, 10));
      }
      
      setPrompt("");
      setSelectedStyle(null);
      setUploadedImage(null);
    } catch (err) {
      console.error("Error generating image:", err);
      setError("Failed to generate image. " + (err.message || "Please try again."));
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
        <div className="absolute inset-0 pointer-events-none">
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
            className="relative max-w-3xl mx-auto"
          >
            <div className="relative bg-[#141414]/80 backdrop-blur-xl rounded-3xl border border-white/10 p-2 shadow-2xl transition-all duration-300 hover:border-white/20">
              {/* Input Area */}
              <div className="relative px-4 pt-4">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onFocus={() => setShowHistory(true)}
                  placeholder="Describe your vision..."
                  className="w-full min-h-[140px] bg-transparent text-white placeholder:text-white/30 text-xl resize-none focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      handleGenerate();
                    }
                  }}
                />
                
                {/* Uploaded Image Preview Badge */}
                {uploadedImage && (
                  <div className="absolute top-0 right-4 w-20 h-20 rounded-xl overflow-hidden border border-white/20 group hover:border-white/40 transition-colors bg-black/50">
                    <img src={uploadedImage.url} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setUploadedImage(null)} 
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                )}

                {/* History Dropdown */}
                {showHistory && promptHistory.length > 0 && (
                  <div className="absolute left-4 right-4 top-full z-20 bg-[#1F1F1F] border border-white/10 rounded-xl shadow-2xl mt-2 overflow-hidden max-h-48 overflow-y-auto">
                    {promptHistory.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setPrompt(p);
                          setShowHistory(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-white/80 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-between p-2 mt-2 bg-white/5 rounded-2xl">
                <div className="flex items-center gap-2 px-2">
                  <Select value={aiModel} onValueChange={setAiModel}>
                    <SelectTrigger className="h-9 w-auto bg-transparent border-white/10 hover:bg-white/5 text-white text-xs rounded-full gap-2 px-3 focus:ring-0">
                      <Zap className={`w-3.5 h-3.5 ${aiModel === 'gemini' ? 'text-[#FF6B35]' : 'text-white/50'}`} />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Standard Model</SelectItem>
                      <SelectItem value="gemini">Gemini Enhanced</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="w-px h-4 bg-white/10 mx-1" />

                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-9 px-3 rounded-full flex items-center gap-2 text-xs font-medium transition-colors ${
                      uploadedImage 
                        ? 'bg-[#FF6B35]/10 text-[#FF6B35]' 
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploadedImage ? 'Image Added' : 'Add Image'}
                  </button>
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="hidden" 
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={(!prompt.trim() && !uploadedImage) || isGenerating}
                  className="btn-gradient text-white rounded-xl px-6 h-10 shadow-lg shadow-[#FF6B35]/20 hover:shadow-[#FF6B35]/40 transition-all"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Style Presets */}
            <div className="mt-6 flex flex-col items-center">
              <p className="text-xs text-white/30 mb-3 uppercase tracking-wider font-medium">Style Presets</p>
              <div className="flex flex-wrap justify-center gap-2">
                {stylePresets.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(selectedStyle === style.id ? null : style.id)}
                    className={`
                      px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 border
                      ${selectedStyle === style.id 
                        ? "bg-white text-black border-white shadow-lg shadow-white/10 scale-105" 
                        : "bg-white/5 text-white/60 border-transparent hover:bg-white/10 hover:text-white hover:border-white/10"
                      }
                    `}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {error}
              </div>
            )}
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
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-[#1a1a1a] border border-white/10"
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
                      {image.model === "gemini" && (
                        <div className="mb-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-[#FF6B35]/20 text-[#FF6B35] border border-[#FF6B35]/30 flex items-center gap-1 w-fit">
                            <Zap className="w-3 h-3" />
                            Gemini Enhanced
                          </span>
                        </div>
                      )}
                      <p className="text-sm text-white/80 line-clamp-2 mb-2">
                        {image.prompt}
                      </p>
                      {image.enhancedPrompt && (
                        <p className="text-xs text-white/50 line-clamp-1 mb-3">
                          Enhanced: {image.enhancedPrompt}
                        </p>
                      )}
                      {image.style && (
                        <div className="mb-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/60">
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