import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, Loader2, Zap, Upload, X, MessageSquare, Settings2, RectangleHorizontal, RectangleVertical, Square, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import ChatPanel from "@/components/generate/ChatPanel";
import StyleSelector, { stylePresets } from "@/components/generate/StyleSelector";
import ImageGrid from "@/components/generate/ImageGrid";

export default function Generate() {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState(null);
  const [aiModel, setAiModel] = useState("default");
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [promptHistory, setPromptHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [imageStrength, setImageStrength] = useState(0.5);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loadUrl = params.get('load');
    if (loadUrl) {
      setUploadedImages([{ url: loadUrl, id: Date.now() }]);
    }
  }, []);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;
    
    setIsUploading(true);
    try {
      const newUploads = await Promise.all(validFiles.map(async (file) => {
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        return { url: uploadResult.file_url, file, id: Date.now() + Math.random() };
      }));
      setUploadedImages(prev => [...prev, ...newUploads]);
      setIsUploading(false);
    } catch (err) {
      setError("Failed to upload images");
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && uploadedImages.length === 0) {
      setError("Please enter a prompt or upload an image");
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Step 1: Analyze prompt for multiplicity and enhancement
      let promptsToGenerate = [];
      const selectedStyleObj = selectedStyle ? stylePresets.find(s => s.id === selectedStyle) : null;
      const styleInstruction = selectedStyleObj ? selectedStyleObj.prompt : "";
      
      const llmAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this image generation request: "${prompt}".
        
        Tasks:
        1. Determine if the user is asking for multiple variations (e.g., "5 different angles", "3 variations", "a storyboard").
        2. If multiple, create a specific prompt for each variation.
        3. If single, create one optimized prompt.
        4. Enhance the prompts with artistic details${selectedStyleObj ? ` matching style: ${selectedStyleObj.label} (${selectedStyleObj.prompt})` : ''}.
        
        Return JSON format: { "prompts": ["prompt 1", "prompt 2", ...] }`,
        response_json_schema: {
          type: "object",
          properties: {
            prompts: { type: "array", items: { type: "string" } }
          },
          required: ["prompts"]
        }
      });
      
      promptsToGenerate = llmAnalysis.prompts || [prompt];
      
      // Limit to 5 max to prevent abuse/timeout
      if (promptsToGenerate.length > 5) promptsToGenerate = promptsToGenerate.slice(0, 5);

      // Step 2: Generate all images
      const promises = promptsToGenerate.map(async (finalPrompt) => {
        try {
          let fullPrompt = selectedStyleObj 
            ? `((${styleInstruction})), ${finalPrompt}, ${styleInstruction}, masterpiece, high quality, detailed`
            : `${finalPrompt}, masterpiece, high quality, detailed`;
          
          // Append aspect ratio instruction (handled by model or prompt engineering)
          if (aspectRatio === "16:9") fullPrompt += ", wide cinematic shot, 16:9 aspect ratio";
          else if (aspectRatio === "9:16") fullPrompt += ", tall portrait shot, 9:16 aspect ratio";
          
          // Append negative prompt if exists
          if (negativePrompt.trim()) {
            fullPrompt += ` --no ${negativePrompt.trim()}`;
          }

          const imageResult = await base44.integrations.Core.GenerateImage({
            prompt: fullPrompt,
            existing_image_urls: uploadedImages.length > 0 ? uploadedImages.map(u => u.url) : undefined
          });

          // Save to DB
          await base44.entities.Creation.create({
            title: prompt.slice(0, 100) || 'AI Generated Image',
            type: 'image',
            url: imageResult.url,
            thumbnail_url: imageResult.url,
            prompt: prompt,
            metadata: { 
              style: selectedStyle, 
              model: aiModel, 
              enhancedPrompt: finalPrompt, 
              batchSize: promptsToGenerate.length,
              aspectRatio,
              negativePrompt,
              imageStrength: uploadedImages.length > 0 ? imageStrength : null
            }
          });

          return {
            id: Date.now() + Math.random(),
            url: imageResult.url,
            prompt: prompt,
            enhancedPrompt: finalPrompt,
            style: selectedStyle,
            model: aiModel,
            timestamp: new Date().toISOString()
          };
        } catch (e) {
          console.error("Single generation failed:", e);
          return null;
        }
      });

      const results = await Promise.allSettled(promises);
      const successfulImages = results
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value);

      if (successfulImages.length === 0 && promptsToGenerate.length > 0) {
        throw new Error("Failed to generate any images.");
      }

      setGeneratedImages([...successfulImages, ...generatedImages]);
      
      if (prompt.trim()) {
        setPromptHistory(prev => [prompt, ...prev.filter(p => p !== prompt)].slice(0, 10));
      }
      
      setPrompt("");
      // Don't clear uploads automatically for workflow continuity? 
      // User might want to generate again with same images.
      // But usually reset is cleaner. Let's keep uploads but clear style?
      // Let's clear style but keep uploads as they take time to upload.
      setSelectedStyle(null);
    } catch (err) {
      console.error("Error generating image:", err);
      setError("Failed to generate. " + (err.message || "Please try again."));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteImage = (id) => {
    setGeneratedImages(generatedImages.filter(img => img.id !== id));
  };

  return (
    <div className="min-h-screen">
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div 
            initial={{ x: "-50%" }}
            animate={{ 
              scale: [1, 1.15, 1],
              opacity: [0.6, 1, 0.6],
              x: "-50%"
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
            className="absolute top-0 left-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-b from-[#FF6B35]/80 to-transparent blur-[100px]" 
          />
        </div>
        
        <div className="relative max-w-4xl mx-auto text-center">

          
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
                  placeholder="Describe your vision (e.g., 'A cat in 3 different styles')..."
                  className="w-full min-h-[140px] bg-transparent text-white placeholder:text-white/30 text-xl resize-none focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      handleGenerate();
                    }
                  }}
                />

                {/* Minimal Uploaded Images Preview */}
                {(uploadedImages.length > 0 || isUploading) && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {uploadedImages.map((img) => (
                      <div key={img.id} className="relative w-8 h-8 rounded-md overflow-hidden border border-white/10 group cursor-pointer shadow-lg">
                        <img src={img.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        <button 
                          onClick={() => setUploadedImages(prev => prev.filter(i => i.id !== img.id))} 
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                    {isUploading && (
                      <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center border border-white/10 animate-pulse">
                        <Loader2 className="w-3 h-3 text-white/50 animate-spin" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-between p-2 mt-2 bg-white/5 rounded-2xl flex-wrap gap-2">
                <div className="flex items-center gap-2 px-2 flex-wrap">
                  {/* Advanced Settings Popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="h-9 px-3 rounded-full flex items-center gap-2 text-xs font-medium transition-colors text-white/60 hover:bg-white/5 hover:text-white">
                        <Settings2 className="w-3.5 h-3.5" />
                        Settings
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-[#1a1a1a] border-white/10 text-white p-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-white/60 uppercase">Aspect Ratio</Label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={() => setAspectRatio("1:1")}
                              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                                aspectRatio === "1:1" ? "bg-[#FF6B35]/10 border-[#FF6B35] text-[#FF6B35]" : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10"
                              }`}
                            >
                              <Square className="w-4 h-4" />
                              <span className="text-[10px]">Square</span>
                            </button>
                            <button
                              onClick={() => setAspectRatio("9:16")}
                              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                                aspectRatio === "9:16" ? "bg-[#FF6B35]/10 border-[#FF6B35] text-[#FF6B35]" : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10"
                              }`}
                            >
                              <RectangleVertical className="w-4 h-4" />
                              <span className="text-[10px]">Portrait</span>
                            </button>
                            <button
                              onClick={() => setAspectRatio("16:9")}
                              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                                aspectRatio === "16:9" ? "bg-[#FF6B35]/10 border-[#FF6B35] text-[#FF6B35]" : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10"
                              }`}
                            >
                              <RectangleHorizontal className="w-4 h-4" />
                              <span className="text-[10px]">Landscape</span>
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-white/60 uppercase flex items-center gap-2">
                            <Ban className="w-3 h-3" />
                            Negative Prompt
                          </Label>
                          <Input
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            placeholder="What to avoid (e.g., blur, low quality)"
                            className="bg-black/20 border-white/10 text-xs h-8"
                          />
                        </div>

                        {uploadedImages.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <Label className="text-xs font-medium text-white/60 uppercase">Image Strength</Label>
                              <span className="text-xs text-white/40">{Math.round(imageStrength * 100)}%</span>
                            </div>
                            <Slider
                              value={[imageStrength]}
                              onValueChange={([val]) => setImageStrength(val)}
                              min={0}
                              max={1}
                              step={0.1}
                              className="py-1"
                            />
                            <p className="text-[10px] text-white/30 text-center">
                              Creativity &larr; &mdash; &rarr; Fidelity
                            </p>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <div className="w-px h-4 bg-white/10 mx-1" />

                  <Select value={aiModel} onValueChange={setAiModel}>
                    <SelectTrigger className="h-9 w-auto bg-transparent border-white/10 hover:bg-white/5 text-white text-xs rounded-full gap-2 px-3 focus:ring-0">
                      <Zap className={`w-3.5 h-3.5 ${aiModel === 'gemini' ? 'text-[#FF6B35]' : 'text-white/50'}`} />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Standard</SelectItem>
                      <SelectItem value="gemini">Smart Enhanced</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="w-px h-4 bg-white/10 mx-1" />

                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-9 px-3 rounded-full flex items-center gap-2 text-xs font-medium transition-colors ${
                      uploadedImages.length > 0
                        ? 'bg-[#FF6B35]/10 text-[#FF6B35]' 
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploadedImages.length > 0 ? `${uploadedImages.length} Added` : 'Add Images'}
                  </button>
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept="image/*" 
                    multiple
                    onChange={handleImageUpload} 
                    className="hidden" 
                  />

                  <button 
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className={`h-9 px-3 rounded-full flex items-center gap-2 text-xs font-medium transition-colors ${
                      isChatOpen
                        ? 'bg-[#FF6B35]/10 text-[#FF6B35]' 
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Discuss
                  </button>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={(!prompt.trim() && uploadedImages.length === 0) || isGenerating}
                  className="btn-gradient text-white rounded-xl px-6 h-10 shadow-lg shadow-[#FF6B35]/20 hover:shadow-[#FF6B35]/40 transition-all ml-auto"
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

              <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

            <StyleSelector 
              selectedStyle={selectedStyle} 
              onSelect={setSelectedStyle} 
              onClear={() => setSelectedStyle(null)} 
            />

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
          <ImageGrid 
            images={generatedImages} 
            onDelete={handleDeleteImage} 
            onClearAll={() => setGeneratedImages([])}
            isGenerating={isGenerating}
            stylePresets={stylePresets}
          />
        </div>
      </section>
    </div>
  );
}