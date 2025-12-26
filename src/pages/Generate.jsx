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

import StyleSelector, { stylePresets } from "@/components/generate/StyleSelector";
import ImageGrid from "@/components/generate/ImageGrid";
import ImageUploader from "@/components/editor/ImageUploader";
import { useAssistant } from "@/components/context/AssistantContext";

export default function Generate() {
  const { setPageContext, openAssistant, isOpen } = useAssistant();
  const [prompt, setPrompt] = useState("");
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState(null);
  const [aiModel, setAiModel] = useState("default");
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [promptHistory, setPromptHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
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

  // Sync Context with Global Assistant
  useEffect(() => {
      setPageContext({
          page: 'generate',
          data: {
              currentPrompt: prompt,
              currentImages: uploadedImages.map(u => u.url),
              onApplyPrompt: (text) => setPrompt(text)
          },
          actionHandler: null // Generate page doesn't have complex actions yet
      });
  }, [prompt, uploadedImages, setPageContext]);

  const handleImageUpload = async (filesOrEvent) => {
    // Handle both event (from hidden input) and direct file array (from ImageUploader)
    let validFiles = [];
    if (filesOrEvent.target) {
       validFiles = Array.from(filesOrEvent.target.files).filter(f => f.type.startsWith('image/'));
    } else if (Array.isArray(filesOrEvent)) {
       validFiles = filesOrEvent; // Already filtered in ImageUploader
    } else if (filesOrEvent.file) {
       validFiles = [filesOrEvent.file]; // Single file object from ImageUploader (legacy mode)
    }

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
      
      const selectedStyleObjects = selectedStyles.map(id => stylePresets.find(s => s.id === id)).filter(Boolean);
      const styleInstruction = selectedStyleObjects.map(s => s.prompt).join(", ");
      const styleLabels = selectedStyleObjects.map(s => s.label).join(" + ");
      
      const llmAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Act as an expert AI Art Prompt Engineer. Analyze this request: "${prompt}".
        
        ${uploadedImages.length > 0 ? `IMPORTANT: The user has attached reference images. You MUST analyze these images visually. Your enhanced prompt should describe the key visual elements of these images (subject, composition, colors) to ensure the generated image relates ${imageStrength > 0.7 ? "EXTREMELY STRICTLY (maintain exact composition and forms)" : imageStrength < 0.4 ? "loosely (use as vague inspiration)" : "strongly"} to them, while applying the user's text prompt as a modification or style.` : ""}
        ${aiModel === 'gemini' ? "SMART MODE ACTIVE: Use your internet capabilities to look up specific details about any real-world entities, current events, or specific character designs mentioned in the prompt to ensure maximum accuracy." : ""}

        CRITICAL RULES:
        1. DEFAULT to generating EXACTLY ONE prompt. 
        2. ONLY generate multiple prompts if the user EXPLICITLY specifies a quantity (e.g., "3 images", "5 variations") or explicitly asks for "variations" or "different angles".
        3. If no quantity/variation is requested, return an array with ONLY ONE prompt.

        Enhancement Tasks:
        1. Greatly improve the prompt quality. Add professional details: lighting (e.g., volumetric, cinematic, studio), camera parameters (e.g., 85mm, f/1.8, 4k, 8k), composition, and textures.
        2. Make it a masterpiece.
        3. Maintain the user's original core subject and intent perfectly.
        ${selectedStyleObjects.length > 0 ? `4. Apply the requested style blend strictly: ${styleLabels} (${styleInstruction}). Blend these styles harmoniously.` : ''}

        Return JSON format: { "prompts": ["enhanced prompt 1", ...] }`,
        file_urls: uploadedImages.length > 0 ? uploadedImages.map(u => u.url) : undefined,
        add_context_from_internet: aiModel === 'gemini' && uploadedImages.length === 0,
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
          let fullPrompt = selectedStyleObjects.length > 0
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
              style: selectedStyles, 
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
            style: selectedStyles,
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
      // Don't clear uploads automatically for workflow continuity
      // But clearing styles is usually better for new starts
      setSelectedStyles([]);
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
    <div className="h-[calc(100dvh-4rem)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
              <div className="relative px-4 pt-4 flex flex-col gap-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your vision (e.g., 'A cat in 3 different styles')..."
                className="w-full min-h-[100px] bg-transparent text-white placeholder:text-white/30 text-xl resize-none focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleGenerate();
                  }
                }}
              />

              {/* Uploaded Images Preview */}
              {(uploadedImages.length > 0 || isUploading) && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
                  {uploadedImages.map((img) => (
                    <div key={img.id} className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 group flex-shrink-0">
                      <img src={img.url} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setUploadedImages(prev => prev.filter(i => i.id !== img.id))} 
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                  {isUploading && (
                    <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 animate-pulse flex-shrink-0">
                      <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
                    </div>
                  )}
                </div>
              )}
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-between p-2 mt-2 bg-white/5 rounded-2xl flex-wrap gap-2">
                <div className="flex items-center gap-2 px-2 flex-wrap">


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

                  <Popover>
                    <PopoverTrigger asChild>
                      <button 
                        className={`h-9 px-3 rounded-full flex items-center gap-2 text-xs font-medium transition-colors ${
                          uploadedImages.length > 0
                            ? 'bg-[#FF6B35]/10 text-[#FF6B35]' 
                            : 'text-white/60 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {uploadedImages.length > 0 ? `${uploadedImages.length} Added` : 'Add Images'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0 bg-[#141414] border border-white/10" align="start">
                      <div className="p-4">
                        <h4 className="text-sm font-medium text-white mb-2">Reference Images</h4>
                        <div className="h-40">
                          <ImageUploader 
                            onImageSelect={handleImageUpload} 
                            multiple={true} 
                          />
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <button 
                    onClick={() => openAssistant()}
                    className={`h-9 px-3 rounded-full flex items-center gap-2 text-xs font-medium transition-colors ${
                      isOpen
                        ? 'bg-[#FF6B35]/10 text-[#FF6B35]' 
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Discuss
                  </button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <button 
                        className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${
                          (aspectRatio !== "1:1" || negativePrompt) 
                            ? 'bg-[#FF6B35]/10 text-[#FF6B35]' 
                            : 'text-white/60 hover:bg-white/5 hover:text-white'
                        }`}
                        title="Advanced Settings"
                      >
                        <Settings2 className="w-4 h-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-[#141414] border border-white/10 p-4 shadow-xl">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-white/60 uppercase tracking-wider">Aspect Ratio</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: "1:1", icon: Square, label: "Square" },
                              { id: "16:9", icon: RectangleHorizontal, label: "Landscape" },
                              { id: "9:16", icon: RectangleVertical, label: "Portrait" }
                            ].map((ratio) => (
                              <button
                                key={ratio.id}
                                onClick={() => setAspectRatio(ratio.id)}
                                className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border transition-all ${
                                  aspectRatio === ratio.id 
                                    ? 'bg-[#FF6B35]/10 border-[#FF6B35] text-[#FF6B35]' 
                                    : 'bg-white/5 border-transparent text-white/50 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                <ratio.icon className="w-4 h-4" />
                                <span className="text-[10px]">{ratio.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-white/60 uppercase tracking-wider">Negative Prompt</Label>
                          <Input 
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            placeholder="Things to avoid (e.g. blurry, ugly)..."
                            className="bg-black/20 border-white/10 h-8 text-xs text-white"
                          />
                        </div>

                        {uploadedImages.length > 0 && (
                          <div className="space-y-3">
                             <div className="flex justify-between">
                                <Label className="text-xs font-medium text-white/60 uppercase tracking-wider">Image Influence</Label>
                                <span className="text-xs text-white/40">{Math.round(imageStrength * 100)}%</span>
                             </div>
                             <Slider 
                               value={[imageStrength]} 
                               min={0.1} 
                               max={0.9} 
                               step={0.1} 
                               onValueChange={(v) => setImageStrength(v[0])}
                               className="[&_.relative]:bg-white/10 [&_.absolute]:bg-[#FF6B35]"
                             />
                             <p className="text-[10px] text-white/40 leading-tight">
                               Higher values make the result look more like your reference images.
                             </p>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

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



            <StyleSelector 
              selectedStyles={selectedStyles} 
              onSelect={setSelectedStyles} 
              onClear={() => setSelectedStyles([])} 
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