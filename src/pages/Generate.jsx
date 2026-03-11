import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutList, Loader2, Zap, Upload, X, MessageSquare, Settings2, RectangleHorizontal, RectangleVertical, Square, Ban, Image as ImageIcon, Check, AlertCircle, Grid3x3, Copy, Layers } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import StyleSelector, { stylePresets } from "@/components/generate/StyleSelector";
import ImageGrid from "@/components/generate/ImageGrid";
import ImageUploader from "@/components/editor/ImageUploader";
import PromptExtractor from "@/components/editor/PromptExtractor";
import { useFlikActions } from "@/components/useFlikActions";
import { 
  MAX_PROMPTS_PER_GENERATION, 
  GALLERY_FETCH_LIMIT, 
  PROMPT_HISTORY_LIMIT,
  IMAGE_COUNT_OPTIONS,
  ASPECT_RATIO_OPTIONS,
  AI_MODEL_OPTIONS,
  DEFAULT_IMAGE_COUNT,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_IMAGE_STRENGTH
} from "@/components/generate/GenerateConstants";

export default function Generate() {
  const [prompt, setPrompt] = useState("");
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState(null);
  const [aiModel, setAiModel] = useState(AI_MODEL_OPTIONS.DEFAULT);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [promptHistory, setPromptHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT_RATIO);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [imageStrength, setImageStrength] = useState(DEFAULT_IMAGE_STRENGTH);
  const [imageCount, setImageCount] = useState(DEFAULT_IMAGE_COUNT);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedGalleryImages, setSelectedGalleryImages] = useState([]);
  const [gallerySearchTerm, setGallerySearchTerm] = useState("");
  const [imageErrors, setImageErrors] = useState({});
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showExtractPrompt, setShowExtractPrompt] = useState(false);
  const [showImageToImage, setShowImageToImage] = useState(false);
  const [imgToImgSource, setImgToImgSource] = useState(null);
  const [isImgToImgGenerating, setIsImgToImgGenerating] = useState(false);
  const [imgToImgGallerySearch, setImgToImgGallerySearch] = useState("");
  const [showImgToImgGallery, setShowImgToImgGallery] = useState(false);
  const imgToImgFileRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const abortControllerRef = useRef(null);
  const uploadedImageURLsRef = useRef(new Set());

  // Register actions for FLIK
  useFlikActions('Generate', {
    apply_prompt: (payload) => {
      setPrompt(payload.prompt);
    },
    apply_style: (payload) => {
      const styleId = payload.style;
      if (!selectedStyles.includes(styleId)) {
        setSelectedStyles([...selectedStyles, styleId]);
      }
    }
  }, () => ({
    currentPrompt: prompt,
    hasReferenceImages: uploadedImages.length > 0,
    referenceImageCount: uploadedImages.length,
    selectedStyles: selectedStyles,
    imageCount: imageCount,
    aspectRatio: aspectRatio
  }));

  // Fetch user for gallery
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch gallery with React Query
  const { data: galleryCreations = [], isLoading: isLoadingGallery } = useQuery({
    queryKey: ['generateGalleryCreations', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Creation.filter(
        { created_by: user.email },
        '-created_date',
        GALLERY_FETCH_LIMIT
      );
    },
    enabled: !!user?.email && (showGallery || showImgToImgGallery),
    staleTime: 30000, // 30 seconds
  });

  useEffect(() => {
     const params = new URLSearchParams(window.location.search);
     const loadUrls = params.getAll('load');
     if (loadUrls.length > 0) {
       setUploadedImages(loadUrls.map((url, idx) => ({ 
         url: decodeURIComponent(url), 
         id: `${Date.now()}-${idx}` 
       })));
     }
     const promptParam = params.get('prompt');
     if (promptParam) {
       setPrompt(decodeURIComponent(promptParam));
     }

     return () => {
       // Cleanup uploaded image object URLs
            uploadedImageURLsRef.current.forEach(url => {
              try {
                URL.revokeObjectURL(url);
              } catch (e) {
                // Ignore errors from revoking URLs
              }
            });
            uploadedImageURLsRef.current.clear();
            // Cleanup abort controller
            if (abortControllerRef.current) {
              abortControllerRef.current.abort();
            }
          };
        }, []);

        // Track generation completion for analytics
        useEffect(() => {
          if (generatedImages.length > 0 && !isGenerating) {
            base44.analytics.track({
              eventName: 'generate_page_viewed',
              properties: { total_generated: generatedImages.length }
            });
          }
        }, [isGenerating]);

  const handleImageUpload = async (filesOrEvent) => {
    // Handle both event (from hidden input) and direct file array (from ImageUploader)
    let validFiles = [];
    if (filesOrEvent?.target?.files) {
       validFiles = Array.from(filesOrEvent.target.files).filter(f => f?.type?.startsWith('image/'));
    } else if (Array.isArray(filesOrEvent)) {
       validFiles = filesOrEvent;
    } else if (filesOrEvent?.file) {
       validFiles = [filesOrEvent.file];
    }

    if (validFiles.length === 0) return;

    // Validate file sizes (50MB max)
    const oversized = validFiles.filter(f => f.size > 50 * 1024 * 1024);
    if (oversized.length > 0) {
      setError(`${oversized.length} file(s) exceed 50MB limit`);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const newUploads = await Promise.all(validFiles.map(async (file) => {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Upload cancelled');
        }
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        if (!uploadResult?.file_url) throw new Error('Upload failed: no URL returned');
        return { url: uploadResult.file_url, file, id: Date.now() + Math.random() };
      }));
      setUploadedImages(prev => [...prev, ...newUploads]);
      base44.analytics.track({ 
        eventName: 'generate_images_uploaded', 
        properties: { count: validFiles.length } 
      });
    } catch (err) {
      console.error('Image upload error:', err);
      if (!(err instanceof Error && err.message === 'Upload cancelled')) {
        setError("Failed to upload images. Please try again.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && uploadedImages.length === 0) {
      setError("Please enter a prompt or upload an image");
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Setup abort controller
    abortControllerRef.current = new AbortController();

    setIsGenerating(true);
    setError(null);
    
    try {
      // Step 1: Analyze prompt for multiplicity and enhancement
      let promptsToGenerate = [];
      
      const selectedStyleObjects = selectedStyles.map(id => stylePresets.find(s => s.id === id)).filter(Boolean);
      const styleInstruction = selectedStyleObjects.map(s => s.prompt).join(", ");
      const styleLabels = selectedStyleObjects.map(s => s.label).join(" + ");
      
      const sanitizedPrompt = prompt.substring(0, 500).replace(/[<>]/g, '');
      
      const llmAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Act as an expert AI Art Prompt Engineer. Analyze this request: "${sanitizedPrompt}".
        
        ${uploadedImages.length > 0 ? `IMPORTANT: The user has attached reference images. You MUST analyze these images visually. Your enhanced prompt should describe the key visual elements of these images (subject, composition, colors) to ensure the generated image relates ${imageStrength > 0.7 ? "EXTREMELY STRICTLY (maintain exact composition and forms)" : imageStrength < 0.4 ? "loosely (use as vague inspiration)" : "strongly"} to them, while applying the user's text prompt as a modification or style.` : ""}
        ${aiModel === AI_MODEL_OPTIONS.GEMINI ? "SMART MODE ACTIVE: Use your internet capabilities to look up specific details about any real-world entities, current events, or specific character designs mentioned in the prompt to ensure maximum accuracy." : ""}

        CRITICAL RULES:
        1. User wants to generate EXACTLY ${imageCount} image(s). Return ${imageCount} enhanced prompt(s).
        2. ${imageCount > 1 ? 'Create variations with different angles, lighting, or composition while maintaining the core subject.' : 'Return a single enhanced prompt.'}

        Enhancement Tasks:
        1. Greatly improve the prompt quality. Add professional details: lighting (e.g., volumetric, cinematic, studio), camera parameters (e.g., 85mm, f/1.8, 4k, 8k), composition, and textures.
        2. Make it a masterpiece.
        3. Maintain the user's original core subject and intent perfectly.
        ${selectedStyleObjects.length > 0 ? `4. Apply the requested style blend strictly: ${styleLabels} (${styleInstruction}). Blend these styles harmoniously.` : ''}

        Return JSON format: { "prompts": ["enhanced prompt 1", ...] }`,
        file_urls: uploadedImages.length > 0 ? uploadedImages.map(u => u.url) : undefined,
        add_context_from_internet: aiModel === AI_MODEL_OPTIONS.GEMINI && uploadedImages.length === 0,
        response_json_schema: {
          type: "object",
          properties: {
            prompts: { type: "array", items: { type: "string" } }
          },
          required: ["prompts"]
        }
      });
      
      promptsToGenerate = llmAnalysis.prompts || [prompt];
      
      // Limit to max to prevent abuse/timeout
      if (promptsToGenerate.length > MAX_PROMPTS_PER_GENERATION) {
        promptsToGenerate = promptsToGenerate.slice(0, MAX_PROMPTS_PER_GENERATION);
      }

      // Step 2: Generate all images
      const promises = promptsToGenerate.map(async (finalPrompt) => {
        try {
          let fullPrompt = selectedStyleObjects.length > 0
            ? `((${styleInstruction})), ${finalPrompt}, ${styleInstruction}, masterpiece, high quality, detailed`
            : `${finalPrompt}, masterpiece, high quality, detailed`;
          
          // CRITICAL: Aspect ratio must be enforced at the START of the prompt for best results
          if (aspectRatio === "16:9") {
            fullPrompt = `CRITICAL REQUIREMENT: WIDE 16:9 LANDSCAPE FORMAT ONLY. Ultra-wide cinematic composition. ${fullPrompt}. MUST BE HORIZONTAL LANDSCAPE 16:9 RATIO`;
          } else if (aspectRatio === "9:16") {
            fullPrompt = `CRITICAL REQUIREMENT: TALL 9:16 PORTRAIT FORMAT ONLY. Vertical portrait composition. ${fullPrompt}. MUST BE VERTICAL PORTRAIT 9:16 RATIO`;
          }
          
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

          // Fetch the saved creation to get its DB id
          const savedCreations = await base44.entities.Creation.filter({ url: imageResult.url }, '-created_date', 1);
          const dbId = savedCreations?.[0]?.id;

          return {
            id: Date.now() + Math.random(),
            dbId,
            url: imageResult.url,
            prompt: prompt,
            enhancedPrompt: finalPrompt,
            style: selectedStyles,
            model: aiModel,
            timestamp: new Date().toISOString(),
            published_to_discover: false
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
        setPromptHistory(prev => [prompt, ...prev.filter(p => p !== prompt)].slice(0, PROMPT_HISTORY_LIMIT));
      }
      
      setPrompt("");
      // Don't clear uploads automatically for workflow continuity
      // But clearing styles is usually better for new starts
      setSelectedStyles([]);
      
      // Track generation
      base44.analytics.track({ 
        eventName: 'generate_images_created', 
        properties: { 
          count: successfulImages.length,
          hasReferenceImages: uploadedImages.length > 0,
          styles: selectedStyles.length,
          aiModel,
          aspectRatio,
          imageCount
        } 
      });
    } catch (err) {
      console.error("Error generating image:", err);
      if (err instanceof Error && err.name !== 'AbortError') {
        setError("Failed to generate. " + (err.message || "Please try again."));
        base44.analytics.track({ 
          eventName: 'generate_error', 
          properties: { error: err.message } 
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
    };

  const handleDeleteImage = useCallback((id) => {
    setGeneratedImages(prev => prev.filter(img => img.id !== id));
    base44.analytics.track({ eventName: 'generate_image_deleted' });
  }, []);

  const handleGalleryPick = useCallback(() => {
    setShowGallery(true);
    setSelectedGalleryImages([]);
    setGallerySearchTerm("");
    setImageErrors({});
    base44.analytics.track({ eventName: 'generate_gallery_opened' });
  }, []);

  const toggleGallerySelection = useCallback((creation) => {
    const imageUrl = creation.thumbnail_url || creation.url;
    const isSelected = selectedGalleryImages.some(img => img.url === imageUrl);
    
    if (isSelected) {
      setSelectedGalleryImages(prev => prev.filter(img => img.url !== imageUrl));
    } else {
      setSelectedGalleryImages(prev => [...prev, {
        url: imageUrl,
        name: creation.title || 'Creation',
        id: `creation-${creation.id}-${Date.now()}`
      }]);
    }
  }, [selectedGalleryImages]);

  const confirmGallerySelection = useCallback(() => {
    // Check if this is for extract prompt
    if (window.__extractPromptCallback && selectedGalleryImages.length === 1) {
      window.__extractPromptCallback({
        url: selectedGalleryImages[0].url,
        thumbnail_url: selectedGalleryImages[0].url
      });
      delete window.__extractPromptCallback;
      setShowExtractPrompt(true);
    } else {
      setUploadedImages(prev => [...prev, ...selectedGalleryImages]);
    }
    setShowGallery(false);
    setSelectedGalleryImages([]);
    setGallerySearchTerm("");
    base44.analytics.track({ 
      eventName: 'generate_gallery_images_selected', 
      properties: { count: selectedGalleryImages.length } 
    });
  }, [selectedGalleryImages]);

  const handleImageError = useCallback((creationId) => {
    setImageErrors(prev => ({ ...prev, [creationId]: true }));
  }, []);

  const handleExtractedPrompt = useCallback((extractedPrompt) => {
    setPrompt(extractedPrompt);
    setShowExtractPrompt(false);
  }, []);

  const handleImgToImgFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsImgToImgGenerating(true);
    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      if (!uploadResult?.file_url) throw new Error('Upload failed');
      setImgToImgSource({ url: uploadResult.file_url, name: file.name });
    } catch (err) {
      setError("Failed to upload image.");
    } finally {
      setIsImgToImgGenerating(false);
    }
  };

  const handleImgToImgGallerySelect = (creation) => {
    const url = creation.thumbnail_url || creation.url;
    setImgToImgSource({ url, name: creation.title || 'Gallery image' });
    setShowImgToImgGallery(false);
  };

  const handleImgToImgGenerate = async () => {
    if (!imgToImgSource) return;
    setIsImgToImgGenerating(true);
    setError(null);
    try {
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `Generate a visually similar image inspired by this reference. Maintain the same style, composition, colors, and subject matter. masterpiece, high quality, detailed`,
        existing_image_urls: [imgToImgSource.url]
      });
      await base44.entities.Creation.create({
        title: 'Image-to-Image Generation',
        type: 'image',
        url: result.url,
        thumbnail_url: result.url,
        prompt: 'Image-to-Image generation',
        metadata: { source: 'image_to_image' }
      });
      setGeneratedImages(prev => [{ id: Date.now(), url: result.url, prompt: 'Image-to-Image', timestamp: new Date().toISOString() }, ...prev]);
      setShowImageToImage(false);
      setImgToImgSource(null);
      base44.analytics.track({ eventName: 'generate_image_to_image', properties: { success: true } });
    } catch (err) {
      setError("Failed to generate. Please try again.");
    } finally {
      setIsImgToImgGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <section className="relative py-10 sm:py-16 md:py-20 px-4 sm:px-6 overflow-hidden">
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
            className="absolute top-0 left-1/2 w-[300px] sm:w-[500px] md:w-[600px] h-[300px] sm:h-[500px] md:h-[600px] rounded-full bg-gradient-to-b from-[#FF6B35]/80 to-transparent blur-[80px] sm:blur-[100px]" 
          />
        </div>
        
        <div className="relative max-w-4xl mx-auto text-center">

          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 px-2"
          >
            <span className="text-white">Create with </span>
            <span className="gradient-text">Imagination</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base md:text-lg text-white/50 mb-8 sm:mb-10 md:mb-12 max-w-2xl mx-auto px-4"
          >
            Describe your vision and watch AI bring it to life in seconds
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative max-w-3xl mx-auto"
          >
            <div className="relative bg-[#141414]/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10 p-1.5 sm:p-2 shadow-2xl transition-all duration-300 hover:border-white/20">
              {/* Input Area */}
              <div className="relative px-3 sm:px-4 pt-3 sm:pt-4 flex flex-col gap-3 sm:gap-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your vision (e.g., 'A cat in 3 different styles')..."
                className="w-full min-h-[80px] sm:min-h-[100px] bg-transparent text-white placeholder:text-white/30 text-base sm:text-lg md:text-xl resize-none focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleGenerate();
                  }
                }}
              />

              {/* Uploaded Images Preview */}
              {(uploadedImages.length > 0 || isUploading) && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {uploadedImages.map((img) => (
                    <div key={img.id} className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden border border-white/10 group flex-shrink-0">
                      <img src={img.url} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setUploadedImages(prev => prev.filter(i => i.id !== img.id))} 
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 active:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                      </button>
                    </div>
                  ))}
                  {isUploading && (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl bg-white/5 flex items-center justify-center border border-white/10 animate-pulse flex-shrink-0">
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-white/50 animate-spin" />
                    </div>
                  )}
                </div>
              )}
              </div>

              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-1.5 sm:p-2 mt-2 bg-white/5 rounded-xl sm:rounded-2xl gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 px-1 sm:px-2 flex-wrap">




                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-full flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap ${
                      uploadedImages.length > 0
                        ? 'bg-[#FF6B35]/10 text-[#FF6B35]' 
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Upload className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    {uploadedImages.length > 0 && <span>{uploadedImages.length} Added</span>}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  <button
                    onClick={handleGalleryPick}
                    className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-full flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors whitespace-nowrap"
                    title="Add from gallery"
                  >
                    <Grid3x3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden xs:inline">Gallery</span>
                  </button>

                  <button
                    onClick={() => setShowExtractPrompt(true)}
                    className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-full flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors whitespace-nowrap"
                    title="Extract prompt from image"
                  >
                    <LayoutList className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden xs:inline">Extract</span>
                  </button>

                  <button
                    onClick={() => { setShowImageToImage(true); setImgToImgSource(null); }}
                    className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-full flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors whitespace-nowrap"
                    title="Generate similar image from reference"
                  >
                    <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden xs:inline">Img2Img</span>
                  </button>

                  <Popover open={typeof window !== 'undefined' && window.innerWidth >= 768 ? undefined : false}>
                    <PopoverTrigger asChild>
                      <button 
                        onClick={(e) => {
                          if (typeof window !== 'undefined' && window.innerWidth < 768) {
                            e.preventDefault();
                            setShowAdvancedSettings(true);
                          }
                        }}
                        className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-full flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap ${
                          (aspectRatio !== "1:1" || negativePrompt || imageCount !== 1) 
                            ? 'bg-[#FF6B35]/10 text-[#FF6B35]' 
                            : 'text-white/60 hover:bg-white/5 hover:text-white'
                        }`}
                        title="Advanced Settings"
                      >
                        <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        {imageCount > 1 && <span className="font-bold text-[11px] sm:text-xs">×{imageCount}</span>}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-[#141414] border border-white/10 p-4 shadow-xl hidden md:block">
                     <div className="space-y-4">
                       <div className="space-y-2">
                         <Label className="text-xs font-medium text-white/60 uppercase tracking-wider">Number of Images</Label>
                         <div className="grid grid-cols-3 gap-2">
                           {IMAGE_COUNT_OPTIONS.map((count) => (
                             <button
                               key={count}
                               onClick={() => {
                                 setImageCount(count);
                                 base44.analytics.track({ eventName: 'generate_image_count_changed', properties: { count } });
                               }}
                               className={`flex items-center justify-center gap-1.5 p-3 rounded-lg border transition-all font-bold text-base ${
                                 imageCount === count 
                                   ? 'bg-[#FF6B35]/10 border-[#FF6B35] text-[#FF6B35]' 
                                   : 'bg-white/5 border-transparent text-white/50 hover:bg-white/10 hover:text-white'
                               }`}
                             >
                               {count}
                             </button>
                           ))}
                         </div>
                       </div>

                       <div className="space-y-2">
                         <Label className="text-xs font-medium text-white/60 uppercase tracking-wider">Aspect Ratio</Label>
                         <div className="grid grid-cols-3 gap-2">
                           {ASPECT_RATIO_OPTIONS.map((ratio) => {
                             const Icon = ratio.id === "1:1" ? Square : ratio.id === "16:9" ? RectangleHorizontal : RectangleVertical;
                             return (
                               <button
                                 key={ratio.id}
                                 onClick={() => {
                                   setAspectRatio(ratio.id);
                                   base44.analytics.track({ eventName: 'generate_aspect_ratio_changed', properties: { ratio: ratio.id } });
                                 }}
                                 className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border transition-all ${
                                   aspectRatio === ratio.id 
                                     ? 'bg-[#FF6B35]/10 border-[#FF6B35] text-[#FF6B35]' 
                                     : 'bg-white/5 border-transparent text-white/50 hover:bg-white/10 hover:text-white'
                                 }`}
                               >
                                 <Icon className="w-4 h-4" />
                                 <span className="text-[10px]">{ratio.label}</span>
                               </button>
                             );
                           })}
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
                  className="btn-gradient text-white rounded-lg sm:rounded-xl px-4 sm:px-6 h-9 sm:h-10 text-sm shadow-lg shadow-[#FF6B35]/20 hover:shadow-[#FF6B35]/40 transition-all w-full sm:w-auto sm:ml-auto"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 animate-spin" />
                      <span className="text-xs sm:text-sm">Generating</span>
                    </>
                  ) : (
                    <span className="text-xs sm:text-sm">Generate</span>
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
      
      <section className="px-4 sm:px-6 pb-12 sm:pb-16 md:pb-20">
        <div className="max-w-7xl mx-auto">
          <ImageGrid 
            images={generatedImages} 
            onDelete={handleDeleteImage} 
            onClearAll={() => setGeneratedImages([])}
            isGenerating={isGenerating}
            stylePresets={stylePresets}
            user={user}
          />
        </div>
      </section>

      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="max-w-7xl w-[96vw] h-[92vh] sm:h-[90vh] bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#0a0a0a] border border-white/10 sm:border-2 text-white flex flex-col shadow-2xl p-0 rounded-2xl sm:rounded-3xl overflow-hidden">
          <DialogHeader className="px-4 sm:px-5 md:px-7 pt-4 sm:pt-5 md:pt-6 pb-3 sm:pb-4 border-b border-white/10 bg-gradient-to-r from-[#1a1a1a] via-[#0f0f0f] to-[#1a1a1a] flex-shrink-0 relative">
            <div className="absolute inset-0 opacity-50 sm:opacity-100 bg-gradient-to-r from-[#FF6B35]/5 via-transparent to-[#FFB800]/5" />
            <div className="relative z-10">
              <DialogTitle className="text-xl sm:text-2xl md:text-3xl font-bold gradient-text flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#F72C25] p-[2px]">
                  <div className="w-full h-full rounded-[7px] sm:rounded-[10px] bg-[#0a0a0a] flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF6B35]" />
                  </div>
                </div>
                Gallery Picker
              </DialogTitle>
              <p className="text-xs sm:text-sm text-white/60 mb-3 sm:mb-4 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-[#FF6B35]/10 border border-[#FF6B35]/20 text-[#FF6B35] text-[10px] sm:text-xs font-medium">
                  <ImageIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {galleryCreations.length} image{galleryCreations.length !== 1 ? 's' : ''}
                </span>
                {selectedGalleryImages.length > 0 && (
                  <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] sm:text-xs font-medium animate-pulse">
                    ✓ {selectedGalleryImages.length} selected
                  </span>
                )}
              </p>
              <div className="relative">
                <Input
                  value={gallerySearchTerm}
                  onChange={(e) => setGallerySearchTerm(e.target.value)}
                  placeholder="🔍 Search by title or prompt..."
                  className="bg-black/40 border-white/20 text-white text-xs sm:text-sm focus-visible:ring-2 focus-visible:ring-[#FF6B35] placeholder:text-white/40 h-9 sm:h-11 pl-3 sm:pl-4 pr-3 sm:pr-4 rounded-lg sm:rounded-xl shadow-lg backdrop-blur-sm"
                />
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-[#FF6B35]/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[#FF6B35]/60 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-track]:rounded-full">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {isLoadingGallery ? (
                <>
                  {Array.from({ length: 18 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-white/5 to-white/10 border border-white/10 shadow-lg"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B35]/10 via-transparent to-[#FFB800]/10 animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 border-3 border-white/20 border-t-[#FF6B35] rounded-full animate-spin" />
                      </div>
                    </div>
                  ))}
                </>
              ) : galleryCreations.filter(c => {
                const term = gallerySearchTerm.toLowerCase();
                return !term || (c.title?.toLowerCase().includes(term)) || (c.prompt?.toLowerCase().includes(term));
              }).length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center mb-5 border border-white/10 shadow-lg">
                    <ImageIcon className="w-12 h-12 text-white/20" />
                  </div>
                  <h3 className="text-lg font-semibold text-white/80 mb-2">
                    {gallerySearchTerm ? 'No Matching Images' : 'No Creations Yet'}
                  </h3>
                  <p className="text-sm text-white/40">
                    {gallerySearchTerm ? 'Try a different search term' : 'Start creating amazing images to see them here'}
                  </p>
                </div>
              ) : (
                <>
                  {galleryCreations.filter(c => {
                    const term = gallerySearchTerm.toLowerCase();
                    return !term || (c.title?.toLowerCase().includes(term)) || (c.prompt?.toLowerCase().includes(term));
                  }).map((creation) => {
                    const imageUrl = creation.thumbnail_url || creation.url;
                    const isSelected = selectedGalleryImages.some(img => img.url === imageUrl);
                    const hasError = imageErrors[creation.id];

                    return (
                      <button
                        key={creation.id}
                        onClick={() => !hasError && toggleGallerySelection(creation)}
                        disabled={hasError}
                        className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 group active:scale-95 bg-gradient-to-br from-black/40 to-black/60 focus:outline-none shadow-lg hover:shadow-2xl ${
                          isSelected 
                            ? 'border-[#FF6B35] shadow-[0_0_30px_rgba(255,107,53,0.5)] scale-105' 
                            : hasError
                            ? 'border-red-500/30 opacity-50 cursor-not-allowed'
                            : 'border-white/10 hover:border-[#FF6B35]/50 hover:scale-105'
                        }`}
                      >
                        {hasError ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-red-400">
                            <AlertCircle className="w-8 h-8" />
                            <span className="text-xs">Failed to load</span>
                          </div>
                        ) : (
                          <>
                            <img 
                              src={imageUrl}
                              alt={creation.title || 'Creation'}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              loading="lazy"
                              decoding="async"
                              onError={() => handleImageError(creation.id)}
                            />
                            <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 ${
                              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`} />
                            <div className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-300 shadow-lg ${
                              isSelected 
                                ? 'bg-[#FF6B35] opacity-100 scale-100 ring-2 ring-white/30' 
                                : 'bg-white/20 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100'
                            }`}>
                              <Check className="w-4 h-4 text-white font-bold" />
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/90 to-transparent">
                              <p className="text-xs text-white font-semibold truncate drop-shadow-lg">
                                {creation.title || 'Untitled'}
                              </p>
                              {creation.prompt && (
                                <p className="text-[10px] text-white/60 truncate mt-0.5">
                                  {creation.prompt}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
          {selectedGalleryImages.length > 0 && (
            <div className="px-3 sm:px-5 md:px-7 py-3 sm:py-4 md:py-5 border-t border-white/10 sm:border-t-2 bg-gradient-to-r from-[#1a1a1a] via-[#0f0f0f] to-[#1a1a1a] backdrop-blur-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 md:gap-4 flex-shrink-0 relative">
              <div className="absolute inset-0 opacity-50 sm:opacity-100 bg-gradient-to-r from-[#FF6B35]/5 via-transparent to-[#FFB800]/5" />
              <div className="relative z-10 flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs sm:text-sm font-semibold truncate">
                    {selectedGalleryImages.length} Image{selectedGalleryImages.length !== 1 ? 's' : ''} Selected
                  </p>
                  <p className="text-white/50 text-[10px] sm:text-xs hidden sm:block">Ready to add as references</p>
                </div>
              </div>
              <div className="flex gap-2 relative z-10">
                <Button
                  onClick={() => setSelectedGalleryImages([])}
                  className="flex-1 sm:flex-none bg-white/10 border border-white/30 text-white hover:bg-white/20 hover:border-white/50 text-xs sm:text-sm px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all h-9 sm:h-auto font-medium"
                >
                  Clear
                </Button>
                <Button
                  onClick={confirmGallerySelection}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-[#FF6B35] to-[#F72C25] hover:from-[#FF8B55] hover:to-[#FF4C45] text-white text-xs sm:text-sm px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 rounded-lg sm:rounded-xl shadow-xl hover:shadow-2xl transition-all font-semibold h-9 sm:h-auto"
                >
                  <span className="hidden sm:inline">Add as References →</span>
                  <span className="sm:hidden">Add ({selectedGalleryImages.length})</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image to Image Dialog */}
      <Dialog open={showImageToImage} onOpenChange={(open) => { setShowImageToImage(open); if (!open) setImgToImgSource(null); }}>
        <DialogContent className="max-w-md w-[95vw] sm:w-[90vw] bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#0a0a0a] border border-white/10 text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold gradient-text flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#FF6B35]" />
              Image to Image
            </DialogTitle>
            <p className="text-white/40 text-xs mt-1">Upload or pick a reference image to generate a similar result</p>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Source image preview */}
            {imgToImgSource ? (
              <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-square max-h-56 mx-auto">
                <img src={imgToImgSource.url} alt="Reference" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImgToImgSource(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-xs text-white/70 truncate">{imgToImgSource.name}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => imgToImgFileRef.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FF6B35]/40 transition-all text-white/70 hover:text-white"
                >
                  <Upload className="w-5 h-5 text-[#FF6B35]" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Upload from device</p>
                    <p className="text-xs text-white/40">JPG, PNG, WEBP supported</p>
                  </div>
                </button>
                <button
                  onClick={() => setShowImgToImgGallery(true)}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FF6B35]/40 transition-all text-white/70 hover:text-white"
                >
                  <Grid3x3 className="w-5 h-5 text-[#FF6B35]" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Pick from Gallery</p>
                    <p className="text-xs text-white/40">Use one of your creations</p>
                  </div>
                </button>
              </div>
            )}

            <input ref={imgToImgFileRef} type="file" accept="image/*" onChange={handleImgToImgFileUpload} className="hidden" />

            {imgToImgSource && (
              <Button
                onClick={handleImgToImgGenerate}
                disabled={isImgToImgGenerating}
                className="w-full btn-gradient text-white rounded-xl h-11 shadow-lg shadow-[#FF6B35]/20"
              >
                {isImgToImgGenerating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  'Generate Similar Image'
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Img2Img Gallery Picker */}
      <Dialog open={showImgToImgGallery} onOpenChange={setShowImgToImgGallery}>
        <DialogContent className="max-w-3xl w-[96vw] h-[80vh] bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#0a0a0a] border border-white/10 text-white flex flex-col p-0 rounded-2xl overflow-hidden shadow-2xl">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-white/10 flex-shrink-0">
            <DialogTitle className="text-xl font-bold gradient-text">Pick Reference Image</DialogTitle>
            <Input
              value={imgToImgGallerySearch}
              onChange={(e) => setImgToImgGallerySearch(e.target.value)}
              placeholder="Search..."
              className="mt-3 bg-black/40 border-white/20 text-white text-sm h-9 rounded-lg"
            />
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {isLoadingGallery ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-white/5 animate-pulse border border-white/10" />
                ))
              ) : (
                galleryCreations.filter(c => {
                  const t = imgToImgGallerySearch.toLowerCase();
                  return !t || c.title?.toLowerCase().includes(t) || c.prompt?.toLowerCase().includes(t);
                }).map((creation) => (
                  <button
                    key={creation.id}
                    onClick={() => handleImgToImgGallerySelect(creation)}
                    className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-[#FF6B35] transition-all group"
                  >
                    <img
                      src={creation.thumbnail_url || creation.url}
                      alt={creation.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extract Prompt Dialog */}
      <Dialog open={showExtractPrompt} onOpenChange={setShowExtractPrompt}>
        <DialogContent className="max-w-md w-[95vw] sm:w-[90vw] bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#0a0a0a] border border-white/10 text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold gradient-text">Extract Prompt</DialogTitle>
          </DialogHeader>
          <PromptExtractor 
            onGalleryOpen={(callback) => {
              setShowGallery(true);
              // Store callback to be called when gallery image is selected
              window.__extractPromptCallback = callback;
            }} 
            currentImage={null}
            onExtracted={handleExtractedPrompt}
          />
        </DialogContent>
      </Dialog>

      {/* Mobile Advanced Settings Drawer */}
      <Drawer open={showAdvancedSettings} onOpenChange={setShowAdvancedSettings}>
        <DrawerContent className="bg-[#1a1a1a] border-white/10">
          <DrawerHeader>
            <DrawerTitle className="text-white">Advanced Settings</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-white/60 uppercase tracking-wider">Number of Images</Label>
              <div className="grid grid-cols-3 gap-2">
                {IMAGE_COUNT_OPTIONS.map((count) => (
                  <button
                    key={count}
                    onClick={() => {
                      setImageCount(count);
                      base44.analytics.track({ eventName: 'generate_image_count_changed', properties: { count } });
                    }}
                    className={`flex items-center justify-center gap-1.5 p-4 rounded-xl border transition-all font-bold text-lg ${
                      imageCount === count 
                        ? 'bg-[#FF6B35]/10 border-[#FF6B35] text-[#FF6B35]' 
                        : 'bg-white/5 border-transparent text-white/50 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-white/60 uppercase tracking-wider">Aspect Ratio</Label>
              <div className="grid grid-cols-3 gap-2">
                {ASPECT_RATIO_OPTIONS.map((ratio) => {
                  const Icon = ratio.id === "1:1" ? Square : ratio.id === "16:9" ? RectangleHorizontal : RectangleVertical;
                  return (
                    <button
                      key={ratio.id}
                      onClick={() => {
                        setAspectRatio(ratio.id);
                        base44.analytics.track({ eventName: 'generate_aspect_ratio_changed', properties: { aspectRatio: ratio.id } });
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                        aspectRatio === ratio.id 
                          ? 'bg-[#FF6B35]/10 border-[#FF6B35] text-[#FF6B35]' 
                          : 'bg-white/5 border-transparent text-white/50 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-xs font-medium">{ratio.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-white/60 uppercase tracking-wider">Negative Prompt (Optional)</Label>
              <Input 
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="Things to avoid (e.g. blurry, ugly)..."
                className="bg-black/20 border-white/10 h-11 text-sm text-white"
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
                <p className="text-xs text-white/40 leading-tight">
                  Higher values make the result look more like your reference images.
                </p>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}