import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { Download, Settings2, Sparkles, Filter, Wand2, RotateCw, RotateCcw, X, Crop as CropIcon, ZoomIn, ZoomOut, Move, Maximize2, Loader2, Save, Upload, Grid3x3, ChevronLeft, ChevronRight, Lock, Unlock, Type, Paintbrush, Droplet, Zap, Hand } from "lucide-react";
import { toast } from "sonner";
import useEmblaCarousel from "embla-carousel-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import ImageUploader from "@/components/editor/ImageUploader";
import GalleryPicker from "@/components/editor/GalleryPicker";
import { useCanvas } from "@/components/hooks/useCanvas";
import { useMagicBrush } from "@/components/hooks/useMagicBrush";
import ToolPanel from "@/components/editor/ToolPanel";
import AdjustmentsPanel from "@/components/editor/AdjustmentsPanel";
import FiltersPanel from "@/components/editor/FiltersPanel";
import TransformPanel from "@/components/editor/TransformPanel";
import SpotRemoval from "@/components/editor/SpotRemoval";
import CropPanel from "@/components/editor/CropPanel";
import TextGeneratorPanel from "@/components/editor/TextGeneratorPanel";
import PaintPanel from "@/components/editor/PaintPanel";
import ProcessingOverlay from "@/components/editor/ProcessingOverlay";
import ResultModal from "@/components/editor/ResultModal";
import StickerOverlay from "@/components/editor/StickerOverlay";
import PromptExtractor from "@/components/editor/PromptExtractor";
import { useFlikActions } from "@/components/useFlikActions";

async function removeWhiteBackground(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r > 200 && g > 200 && b > 200) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}

const DEFAULT_ADJUSTMENTS = {
  brightness: 0, contrast: 0, saturation: 0,
  blur: 0, hue: 0, sepia: 0, grayscale: 0,
};

export default function Editor() {
  const [currentImage, setCurrentImage] = useState(null);
  const [loadedImages, setLoadedImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageLocked, setIsImageLocked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [showResult, setShowResult] = useState(false);
  
  const [adjustments, setAdjustments] = useState({ ...DEFAULT_ADJUSTMENTS });
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [transform, setTransform] = useState({ rotate: 0, flipH: false, flipV: false });
  
  const [brushStrokes, setBrushStrokes] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [brushOpacity, setBrushOpacity] = useState(0.8);
  const [brushMode, setBrushMode] = useState('draw');
  const [magicBrushPrompt, setMagicBrushPrompt] = useState("");
  const [magicBrushImages, setMagicBrushImages] = useState([]);

  // Paint tool state
  const [paintStrokes, setPaintStrokes] = useState([]);
  const [paintColor, setPaintColor] = useState("#FF6B35");
  const [paintBrushSize, setPaintBrushSize] = useState(20);
  const [paintMode, setPaintMode] = useState("draw");
  const [paintOpacity, setPaintOpacity] = useState(1);
  const paintCanvasRef = useRef(null);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanToolActive, setIsPanToolActive] = useState(false);
  const [needsFit, setNeedsFit] = useState(false);

  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragType, setDragType] = useState(null);
  const [activeRatio, setActiveRatio] = useState(null);
  const dragInitialCropRef = useRef(null);
  const dragInitialPosRef = useRef(null);

  const { generateCanvas, getProcessedImageBlob } = useCanvas();
  const { isProcessing: isMagicBrushProcessing, processMagicBrush } = useMagicBrush();
  
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const cursorRef = useRef(null);
  const adjustmentUndoTimerRef = useRef(null);
  const objectURLsRef = useRef(new Set());
  const fileInputRef = useRef(null);
  const imageEditStateRef = useRef({}); // Store edit state per image
  const MAX_EDIT_CACHE_SIZE = 50; // Prevent unbounded memory growth
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ skipSnaps: false, containScroll: false });

  const [activeTab, setActiveTab] = useState("ai");
  const [undoHistory, setUndoHistory] = useState([]);
  const [redoHistory, setRedoHistory] = useState([]);
  const [regenerateAction, setRegenerateAction] = useState(null);
  const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState(false);
  const [galleryCallback, setGalleryCallback] = useState(null);
  const [isToolboxExpanded, setIsToolboxExpanded] = useState(false);
  const [user, setUser] = useState(null);
  const [isEyeDropperActive, setIsEyeDropperActive] = useState(false);
  const [stickers, setStickers] = useState([]);

  const location = useLocation();

  // Fetch user on mount
  useEffect(() => {
    let isMounted = true;
    base44.auth.me()
      .then(u => isMounted && setUser(u))
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Define resetImageState early so it can be used in useEffect dependencies
  const resetImageState = useCallback(() => {
    setAdjustments({ ...DEFAULT_ADJUSTMENTS });
    setSelectedFilter(null);
    setTransform({ rotate: 0, flipH: false, flipV: false });
    setBrushStrokes([]);
    setPaintStrokes([]);
    setIsCropping(false);
    setCropArea({ x: 10, y: 10, width: 80, height: 80 });
    setActiveRatio(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setUndoHistory([]);
    setRedoHistory([]);
    setMagicBrushPrompt("");
    setMagicBrushImages([]);
    setStickers([]);
    setNeedsFit(true);
  }, []);

  // Register actions for FLIK
  useFlikActions('Editor', {
    tool: (payload) => { setActiveTab(payload.id === 'text' ? 'text' : payload.id); },
    adjustment: (payload) => {
      const newAdjustments = { ...adjustments, [payload.key]: payload.value };
      handleAdjustmentChange(newAdjustments);
      setActiveTab('adjust');
    },
    filter: () => { setActiveTab('filters'); },
    crop: (payload) => {
      setActiveTab('crop');
      if (payload.active) handleStartCrop();
    },
    paint: (payload) => {
      setActiveTab('paint');
      if (payload.color) setPaintColor(payload.color);
      if (payload.size) setPaintBrushSize(payload.size);
      if (payload.opacity !== undefined) setPaintOpacity(payload.opacity / 100);
      if (payload.mode) setPaintMode(payload.mode);
      if (payload.clear) setPaintStrokes([]);
      if (payload.undo) setPaintStrokes(prev => prev.slice(0, -1));
    }
  }, () => ({
    currentTool: activeTab,
    magicBrushPrompt,
    hasMaskDrawn: brushStrokes.length > 0,
    hasImage: !!currentImage,
    paintColor,
    paintBrushSize,
    paintOpacity: paintOpacity * 100,
    paintMode,
    paintStrokes: paintStrokes.length
  }));

  // Load image from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const loadUrls = urlParams.getAll('load');
    if (loadUrls.length > 0) {
      const images = loadUrls.map((url, idx) => ({
        url: decodeURIComponent(url),
        preview: decodeURIComponent(url),
        name: `loaded_image_${idx}.png`,
        id: `${Date.now()}-${idx}`
      }));
      setLoadedImages(images);
      setCurrentImage(images[0]);
      setNeedsFit(true);
      setTimeout(() => emblaApi?.scrollTo(0), 0);
    }
  }, [location.search, emblaApi]);

  // Cleanup all object URLs on unmount and image switch
  const cleanupObjectURLs = useCallback((urlToKeep) => {
    Array.from(objectURLsRef.current).forEach(url => {
      if (url !== urlToKeep && url !== currentImage?.url) {
        try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
        objectURLsRef.current.delete(url);
      }
    });
  }, [currentImage?.url]);

  useEffect(() => {
    return () => {
      // Clear all object URLs on unmount
      try {
        objectURLsRef.current.forEach(url => {
          try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
        });
        objectURLsRef.current.clear();
      } catch (e) {
        console.error('Error cleaning up object URLs:', e);
      }

      if (adjustmentUndoTimerRef.current) clearTimeout(adjustmentUndoTimerRef.current);
    };
  }, []);

  // Handle carousel slide changes - save/restore edit state per image
  useEffect(() => {
    if (!emblaApi || isImageLocked) return;
    const onSelect = () => {
      const idx = emblaApi.selectedScrollSnap();
      if (idx !== currentImageIndex && idx >= 0 && idx < loadedImages.length) {
        // Save current image edit state before switching
            if (currentImage) {
              const imgKey = currentImage.url || currentImage.id;
              imageEditStateRef.current[imgKey] = {
                adjustments, selectedFilter, transform, brushStrokes, paintStrokes, zoom, pan
              };

              // Keep cache size bounded - remove oldest
              const keys = Object.keys(imageEditStateRef.current);
              if (keys.length > MAX_EDIT_CACHE_SIZE) {
                const keysToDelete = keys.slice(0, keys.length - MAX_EDIT_CACHE_SIZE);
                keysToDelete.forEach(k => delete imageEditStateRef.current[k]);
              }
            }
        
        // Switch to new image
        setCurrentImageIndex(idx);
        setCurrentImage(loadedImages[idx]);
        
        // Restore edit state for new image if it exists, otherwise reset
        const newImgKey = loadedImages[idx].url || loadedImages[idx].id;
        const savedState = imageEditStateRef.current[newImgKey];
        
        if (savedState) {
          setAdjustments(savedState.adjustments);
          setSelectedFilter(savedState.selectedFilter);
          setTransform(savedState.transform);
          setBrushStrokes(savedState.brushStrokes || []);
          setPaintStrokes(savedState.paintStrokes || []);
          setZoom(savedState.zoom);
          setPan(savedState.pan);
          setNeedsFit(false);
        } else {
          resetImageState();
        }
      }
    };
    emblaApi.on('select', onSelect);
    return () => emblaApi.off('select', onSelect);
  }, [emblaApi, isImageLocked]);

  // Fit image to container when needsFit is true
  useEffect(() => {
    if (!needsFit || !currentImage || !imageRef.current || !containerRef.current) return;

    const fitImage = () => {
      const img = imageRef.current;
      const container = containerRef.current;
      if (!img || !container) return;

      const imgW = img?.naturalWidth || 0;
      const imgH = img?.naturalHeight || 0;
      if (!imgW || !imgH) return;

      const rect = container.getBoundingClientRect();
      const padding = window.innerWidth >= 768 ? 64 : 16;
      const availW = rect.width - padding;
      const availH = rect.height - padding;

      if (availW <= 0 || availH <= 0) return;

      const fitZoom = Math.min(availW / imgW, availH / imgH, 1);
      setZoom(fitZoom);
      setPan({ x: 0, y: 0 });
      setNeedsFit(false);
    };

    const img = imageRef.current;
    if (img?.complete && img?.naturalWidth > 0) {
      fitImage();
    } else if (img) {
      img.addEventListener('load', fitImage, { once: true });
      return () => img.removeEventListener('load', fitImage);
    }
  }, [needsFit, currentImage]);

  const createObjectURL = useCallback((blob) => {
    if (!blob) throw new Error('Cannot create object URL from null blob');
    const url = URL.createObjectURL(blob);
    objectURLsRef.current.add(url);
    return url;
  }, []);

  const revokeObjectURL = useCallback((url) => {
    if (url && url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
        objectURLsRef.current.delete(url);
      } catch {}
    }
  }, []);

  const handleImageSelect = useCallback((image) => {
    // If there's a pending callback (from PromptExtractor), use it instead
    if (galleryCallback) {
      galleryCallback(image);
      setGalleryCallback(null);
      setIsGalleryPickerOpen(false);
      return;
    }
    
    cleanupObjectURLs(image?.url);
    setCurrentImage(image);
    setLoadedImages([image]);
    setCurrentImageIndex(0);
    if (image) resetImageState();
    setTimeout(() => emblaApi?.scrollTo(0), 0);
  }, [resetImageState, emblaApi, cleanupObjectURLs, galleryCallback]);

  const handleMultipleImagesSelect = useCallback((images) => {
    if (images && Array.isArray(images) && images.length > 0) {
      const processedImages = images.map(img => 
        img.url ? img : { url: img, preview: img, name: 'image' }
      );
      setLoadedImages(processedImages);
      setCurrentImageIndex(0);
      setCurrentImage(processedImages[0]);
      resetImageState();
      setTimeout(() => emblaApi?.scrollTo(0), 0);
    }
  }, [resetImageState, emblaApi]);

  const switchToImage = useCallback((index) => {
    if (index >= 0 && index < loadedImages.length) {
      setCurrentImageIndex(index);
      setCurrentImage(loadedImages[index]);
      resetImageState();
      setTimeout(() => emblaApi?.scrollTo(index), 0);
    }
  }, [loadedImages, resetImageState, emblaApi]);

  const handleGenerateCanvas = useCallback(
    () => generateCanvas(currentImage, adjustments, transform, selectedFilter, brushStrokes.length > 0 ? brushStrokes : paintStrokes),
    [currentImage, adjustments, transform, selectedFilter, brushStrokes, paintStrokes, generateCanvas]
  );
  const handleGetProcessedBlob = useCallback(
    () => getProcessedImageBlob(currentImage, adjustments, transform, selectedFilter, brushStrokes.length > 0 ? brushStrokes : paintStrokes),
    [currentImage, adjustments, transform, selectedFilter, brushStrokes, paintStrokes, getProcessedImageBlob]
  );

  const handleToolSelect = useCallback(async (tool) => {
    if (!currentImage) {
      toast.error("Please upload an image first");
      return;
    }
    toast.loading(`Applying ${tool.label}...`, { id: `tool-${tool.id}` });
    setActiveTool(tool);
    setIsProcessing(true);
    setRegenerateAction(() => () => handleToolSelect(tool));
    try {
      const blob = await handleGetProcessedBlob();
      if (!blob) throw new Error("Failed to process image");
      const processedUrl = createObjectURL(blob);
      setProcessedImage(processedUrl);
      const file = new File([blob], "processed_input.png", { type: "image/png" });
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      if (!uploadResult?.file_url) throw new Error("Failed to upload image");
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `${tool.prompt}. Maintain all existing adjustments, colors, filters and edits. Reference image provided - apply the enhancement while maintaining the original composition, subject, and overall structure.`,
        existing_image_urls: [uploadResult.file_url]
      });
      if (!result?.url) throw new Error("Failed to generate image");
      // For background removal, apply canvas-based white background removal
      const finalUrl = tool.id === "background" ? await removeWhiteBackground(result.url) : result.url;
      setResultImage(finalUrl);
      setShowResult(true);
      base44.analytics.track({ eventName: "tool_applied", properties: { tool_id: tool.id, success: true } });
      toast.success(`${tool.label} applied successfully!`, { id: `tool-${tool.id}` });
      base44.entities.PromptLearning.create({
        prompt: tool.prompt, tool_type: "ai_tool", was_successful: true,
        context: { tool_id: tool.id, tool_label: tool.label }
      }).catch(() => {});
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error(error.message || "Error processing image. Please try again.", { id: `tool-${tool.id}` });
      base44.entities.PromptLearning.create({
        prompt: tool.prompt, tool_type: "ai_tool", was_successful: false,
        context: { tool_id: tool.id, tool_label: tool.label, error: error.message }
      }).catch(() => {});
    } finally {
      setIsProcessing(false);
      setActiveTool(null);
    }
  }, [currentImage, handleGetProcessedBlob, createObjectURL]);

  const handleApplyResult = useCallback(() => {
    if (resultImage) {
      setUndoHistory(prev => [...prev, { image: currentImage, adjustments, filter: selectedFilter, transform, brushStrokes, paintStrokes }]);
      const enhancedImage = { url: resultImage, preview: resultImage, name: "enhanced_image.png" };
      setCurrentImage(enhancedImage);
      setLoadedImages(prev => prev.map((img, i) => i === currentImageIndex ? enhancedImage : img));
      setAdjustments({ ...DEFAULT_ADJUSTMENTS });
      setSelectedFilter(null);
      setBrushStrokes([]);
      setPaintStrokes([]);
      setMagicBrushPrompt("");
      setTransform({ rotate: 0, flipH: false, flipV: false });
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setRedoHistory([]);
      setNeedsFit(true);
    }
    setShowResult(false);
    setResultImage(null);
    if (processedImage) {
      revokeObjectURL(processedImage);
      setProcessedImage(null);
    }
  }, [resultImage, currentImage, adjustments, selectedFilter, transform, brushStrokes, paintStrokes, processedImage, revokeObjectURL, currentImageIndex]);

  const handleCloseResult = useCallback(() => {
    setShowResult(false);
    if (processedImage) {
      revokeObjectURL(processedImage);
      setProcessedImage(null);
    }
  }, [processedImage, revokeObjectURL]);

  const handleUndo = useCallback(() => {
    if (undoHistory.length === 0) return;
    const previous = undoHistory[undoHistory.length - 1];
    setRedoHistory(prev => [...prev, { image: currentImage, adjustments, filter: selectedFilter, transform, brushStrokes, paintStrokes }]);
    setCurrentImage(previous.image);
    setAdjustments(previous.adjustments || { ...DEFAULT_ADJUSTMENTS });
    setSelectedFilter(previous.filter !== undefined ? previous.filter : null);
    setTransform(previous.transform || { rotate: 0, flipH: false, flipV: false });
    setBrushStrokes(previous.brushStrokes || []);
    setPaintStrokes(previous.paintStrokes || []);
    setUndoHistory(prev => prev.slice(0, -1));
  }, [undoHistory, currentImage, adjustments, selectedFilter, transform, brushStrokes, paintStrokes]);

  const handleRedo = useCallback(() => {
    if (redoHistory.length === 0) return;
    const next = redoHistory[redoHistory.length - 1];
    setUndoHistory(prev => [...prev, { image: currentImage, adjustments, filter: selectedFilter, transform, brushStrokes, paintStrokes }]);
    setCurrentImage(next.image);
    setAdjustments(next.adjustments || { ...DEFAULT_ADJUSTMENTS });
    setSelectedFilter(next.filter !== undefined ? next.filter : null);
    setTransform(next.transform || { rotate: 0, flipH: false, flipV: false });
    setBrushStrokes(next.brushStrokes || []);
    setPaintStrokes(next.paintStrokes || []);
    setRedoHistory(prev => prev.slice(0, -1));
  }, [redoHistory, currentImage, adjustments, selectedFilter, transform, brushStrokes, paintStrokes]);

  const handleDownload = useCallback(async () => {
    if (!currentImage) return;
    try {
      const blob = await getProcessedImageBlob(currentImage, adjustments, transform, selectedFilter, brushStrokes.length > 0 ? brushStrokes : paintStrokes);
      if (!blob) { 
        toast.error("Could not get image data to download."); 
        return; 
      }
      const url = createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `flik_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      revokeObjectURL(url);
      toast.success("Image downloaded successfully!");
    } catch (e) {
      console.error("Download failed", e);
      toast.error("Download failed. Please try again.");
    }
  }, [currentImage, adjustments, transform, selectedFilter, brushStrokes, paintStrokes, getProcessedImageBlob, createObjectURL, revokeObjectURL]);

  const handleAdjustmentChange = useCallback((newAdjustments) => {
    if (adjustmentUndoTimerRef.current) clearTimeout(adjustmentUndoTimerRef.current);
    adjustmentUndoTimerRef.current = setTimeout(() => {
      setUndoHistory(prev => [...prev, { image: currentImage, adjustments, filter: selectedFilter, transform, brushStrokes, paintStrokes }]);
    }, 500);
    setAdjustments(newAdjustments);
    setRedoHistory([]);
    }, [currentImage, adjustments, selectedFilter, transform, brushStrokes, paintStrokes]);

  const handleFilterSelect = useCallback((filter) => {
    setUndoHistory(prev => [...prev, { image: currentImage, adjustments, filter: selectedFilter, transform, brushStrokes, paintStrokes }]);
    setSelectedFilter(filter);
    setRedoHistory([]);
  }, [currentImage, adjustments, selectedFilter, transform, brushStrokes, paintStrokes]);

  const handleTransform = useCallback(async (type) => {
    if (!currentImage) return;
    setUndoHistory(prev => [...prev, { image: currentImage, adjustments, filter: selectedFilter, transform, brushStrokes, paintStrokes }]);
    setIsProcessing(true);
    let blobUrl = null;
    try {
      let tempTransform = { rotate: 0, flipH: false, flipV: false };
      if (type === 'rotate-right') tempTransform.rotate = 90;
      else if (type === 'rotate-left') tempTransform.rotate = -90;
      else if (type === 'flip-horizontal') tempTransform.flipH = true;
      else if (type === 'flip-vertical') tempTransform.flipV = true;
      const canvas = await generateCanvas(currentImage, adjustments, tempTransform, selectedFilter, []);
      if (!canvas) { toast.error("Failed to generate canvas for transform."); throw new Error("Failed to generate canvas"); }

      blobUrl = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Blob creation timeout')), 10000);
        canvas.toBlob((blob) => {
          clearTimeout(timeout);
          if (!blob) {
            reject(new Error('Blob is null'));
            return;
          }
          try {
            const url = createObjectURL(blob);
            resolve(url);
          } catch (e) {
            reject(e);
          }
        }, 'image/png', 1.0);
      });

      const transformedImage = { url: blobUrl, preview: blobUrl, name: "transformed.png" };
      setCurrentImage(prev => prev ? transformedImage : null);
      setLoadedImages(prev => prev.map((img, i) => i === currentImageIndex ? transformedImage : img));
      setAdjustments({ ...DEFAULT_ADJUSTMENTS });
      setSelectedFilter(null);
      setTransform({ rotate: 0, flipH: false, flipV: false });
      setBrushStrokes([]);
      setPaintStrokes([]);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setRedoHistory([]);
      setNeedsFit(true);
    } catch (error) {
      console.error("Transform error:", error);
      if (blobUrl) revokeObjectURL(blobUrl);
      setIsProcessing(false);
      toast.error("Transform failed. Please try again.");
      return;
    }
    setIsProcessing(false);
  }, [currentImage, adjustments, selectedFilter, transform, generateCanvas, createObjectURL, revokeObjectURL, currentImageIndex]);

  const handleMagicBrush = useCallback(async () => {
    if (!magicBrushPrompt.trim()) {
      toast.error("Please enter a prompt for the magic brush");
      return;
    }
    if (brushStrokes.length === 0) {
      toast.error("Please draw on the image to create a mask");
      return;
    }
    setRegenerateAction(() => () => handleMagicBrush());
    try {
      const resultUrl = await processMagicBrush({
        imageRef, brushStrokes, brushSize, magicBrushPrompt, magicBrushImages,
        getProcessedImageBlob, currentImage, adjustments, transform, selectedFilter, setActiveTool
      });
      if (resultUrl) {
        setResultImage(resultUrl);
        setShowResult(true);
        base44.entities.PromptLearning.create({
          prompt: magicBrushPrompt, tool_type: "magic_brush", was_successful: true,
          context: { has_reference_images: magicBrushImages.length > 0 }
        }).catch(() => {});
      }
    } catch (error) {
      console.error("Magic brush error:", error);
      toast.error("Error executing magic brush. Please try again.");
      base44.entities.PromptLearning.create({
        prompt: magicBrushPrompt, tool_type: "magic_brush", was_successful: false,
        context: { has_reference_images: magicBrushImages.length > 0, error: error.message }
      }).catch(() => {});
    }
  }, [brushStrokes, brushSize, magicBrushPrompt, magicBrushImages, getProcessedImageBlob, currentImage, adjustments, transform, selectedFilter, processMagicBrush]);

  const applyCropAreaWithRatio = useCallback((ratio) => {
    if (!ratio || !imageRef.current) {
      if (!ratio) return;
      setCropArea({ x: 10, y: 10, width: 80, height: 80 });
      return;
    }
    const { naturalWidth: imgW, naturalHeight: imgH } = imageRef.current;
    if (!imgW || !imgH) return;
    const imageAspect = imgW / imgH;
    let cropW, cropH;
    if (ratio > imageAspect) {
      cropW = 80;
      cropH = cropW * (imageAspect / ratio);
    } else {
      cropH = 80;
      cropW = cropH * ratio / imageAspect;
    }
    const cropX = (100 - cropW) / 2;
    const cropY = (100 - cropH) / 2;
    setCropArea({ x: cropX, y: cropY, width: cropW, height: cropH });
  }, []);

  const handleAspectRatioSelect = useCallback((ratio) => {
    setActiveRatio(ratio);
    setIsCropping(true);
    setNeedsFit(true);
    applyCropAreaWithRatio(ratio);
  }, [applyCropAreaWithRatio]);

  const handleStartCrop = useCallback(() => {
    setIsCropping(true);
    setNeedsFit(true);
    setCropArea({ x: 10, y: 10, width: 80, height: 80 });
    if (activeRatio) applyCropAreaWithRatio(activeRatio);
  }, [activeRatio, applyCropAreaWithRatio]);

  const handleCancelCrop = useCallback(() => { setIsCropping(false); }, []);

  const handleApplyCrop = useCallback(async () => {
    if (!currentImage) return;
    setIsProcessing(true);
    setUndoHistory(prev => [...prev, { image: currentImage, adjustments, filter: selectedFilter, transform, brushStrokes, paintStrokes }]);
    try {
      const bakeCanvas = await handleGenerateCanvas();
      if (!bakeCanvas || bakeCanvas.width <= 0 || bakeCanvas.height <= 0) { toast.error("Failed to generate canvas for cropping."); throw new Error("Invalid canvas"); }
      let cropX = Math.max(0, Math.min((cropArea.x / 100) * bakeCanvas.width, bakeCanvas.width - 1));
      let cropY = Math.max(0, Math.min((cropArea.y / 100) * bakeCanvas.height, bakeCanvas.height - 1));
      let cropWidth = Math.max(2, Math.min((cropArea.width / 100) * bakeCanvas.width, bakeCanvas.width - cropX));
      let cropHeight = Math.max(2, Math.min((cropArea.height / 100) * bakeCanvas.height, bakeCanvas.height - cropY));
      cropX = Math.max(0, cropX);
      cropY = Math.max(0, cropY);
      if (cropWidth <= 0 || cropHeight <= 0) {
        toast.error("Crop area too small. Increase the selection.");
        setIsProcessing(false);
        return;
      }
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = cropWidth;
      finalCanvas.height = cropHeight;
      finalCanvas.getContext('2d').drawImage(bakeCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      finalCanvas.toBlob((blob) => {
        if (!blob) { 
          setIsProcessing(false); 
          toast.error("Crop failed."); 
          return; 
        }
        const url = createObjectURL(blob);
        const croppedImage = { url, preview: url, name: "cropped_image.png" };
          setCurrentImage(prev => prev ? croppedImage : null);
          setLoadedImages(prev => prev.map((img, i) => i === currentImageIndex ? croppedImage : img));
          setAdjustments({ ...DEFAULT_ADJUSTMENTS });
          setSelectedFilter(null);
          setBrushStrokes([]);
          setPaintStrokes([]);
          setMagicBrushPrompt("");
          setTransform({ rotate: 0, flipH: false, flipV: false });
          setZoom(1);
          setPan({ x: 0, y: 0 });
          setIsCropping(false);
        setRedoHistory([]);
        setIsProcessing(false);
        setNeedsFit(true);
        toast.success("Image cropped successfully!");
        try { finalCanvas.remove(); } catch (e) { /* ignore */ }
        try { bakeCanvas.remove(); } catch (e) { /* ignore */ }
      }, 'image/png', 1.0);
    } catch (error) {
      console.error("Error cropping:", error);
      setIsProcessing(false);
      toast.error("Crop failed. Please try again.");
    }
  }, [currentImage, adjustments, selectedFilter, transform, cropArea, handleGenerateCanvas, createObjectURL]);

  const handleSaveToGallery = useCallback(async () => {
    if (!currentImage) return;
    setIsSaving(true);
    try {
      const blob = await getProcessedImageBlob(currentImage, adjustments, transform, selectedFilter, brushStrokes.length > 0 ? brushStrokes : paintStrokes);
      if (!blob) { 
        toast.error("Could not get image data to save."); 
        setIsSaving(false);
        return; 
      }

      let finalBlob = blob;

      // If there are stickers, composite them onto the image
      if (stickers.length > 0) {
        finalBlob = await new Promise((resolve) => {
          const baseImg = new Image();
          baseImg.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = baseImg.width;
            canvas.height = baseImg.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(baseImg, 0, 0);

            let loadedCount = 0;
            const drawSticker = () => {
              stickers.forEach(sticker => {
                const sImg = new Image();
                sImg.crossOrigin = 'anonymous';
                sImg.onload = () => {
                  const x = (sticker.x / 100) * canvas.width;
                  const y = (sticker.y / 100) * canvas.height;
                  const w = (sticker.width / 100) * canvas.width;
                  const h = (sImg.naturalHeight / sImg.naturalWidth) * w;
                  ctx.save();
                  ctx.translate(x + w / 2, y + h / 2);
                  ctx.rotate(((sticker.rotation || 0) * Math.PI) / 180);
                  ctx.drawImage(sImg, -w / 2, -h / 2, w, h);
                  ctx.restore();
                  loadedCount++;
                  if (loadedCount === stickers.length) {
                    canvas.toBlob(b => resolve(b || blob), 'image/png');
                  }
                };
                sImg.onerror = () => { loadedCount++; if (loadedCount === stickers.length) canvas.toBlob(b => resolve(b || blob), 'image/png'); };
                sImg.src = sticker.url;
              });
            };
            drawSticker();
          };
          baseImg.onerror = () => resolve(blob);
          baseImg.src = URL.createObjectURL(blob);
        });
      }

      const file = new File([finalBlob], `flik_creation_${Date.now()}.png`, { type: 'image/png' });
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      if (!uploadResult?.file_url) throw new Error('Upload failed');
      await base44.entities.Creation.create({
        title: `Edited Image (${new Date().toLocaleString()})`,
        type: 'image', url: uploadResult.file_url, thumbnail_url: uploadResult.file_url
      });
      toast.success('Saved to Gallery!');
    } catch (err) {
      console.error("Error saving to gallery:", err);
      toast.error('Error saving to gallery. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [currentImage, adjustments, transform, selectedFilter, brushStrokes, paintStrokes, stickers, getProcessedImageBlob]);

  const handleTextImageGenerated = useCallback((imageUrl) => {
    setStickers(prev => [...prev, {
      url: imageUrl,
      x: 50,
      y: 50,
      width: 20,
      rotation: 0,
      id: `sticker-${Date.now()}`
    }]);
  }, []);

  const handleFileUpload = useCallback((e) => {
    if (!e?.target?.files) return;
    const files = Array.from(e.target.files);
    // Reset input so same file can be re-uploaded
    if (e.target) e.target.value = '';
    if (files.length === 0) return;
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) { toast.error('Please select image files'); return; }

    const loadedImgs = [];
    let loadedCount = 0;
    imageFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onerror = () => {
        console.error(`Failed to read file: ${file.name}`);
        toast.error(`Failed to read ${file.name}`);
      };
      reader.onload = (ev) => {
        if (!ev.target?.result) {
          console.error(`No result for file: ${file.name}`);
          return;
        }
        loadedImgs[index] = { url: ev.target.result, preview: ev.target.result, name: file.name };
        loadedCount++;
        if (loadedCount === imageFiles.length) {
          // Append to existing images instead of replacing
          setLoadedImages(prev => {
            const combined = [...prev, ...loadedImgs];
            const newIndex = prev.length;
            setCurrentImageIndex(newIndex);
            setCurrentImage(loadedImgs[0]);
            resetImageState();
            setTimeout(() => emblaApi?.scrollTo(newIndex), 0);
            return combined;
          });
          toast.success(`${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} added`);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [resetImageState, emblaApi]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!e || !currentImage) return;
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault(); handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault(); handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); handleSaveToGallery();
      }
    };
    const handleKeyDown = (e) => {
      if (!e || e.code !== 'Space' || e.repeat) return;
      const activeTag = document.activeElement?.tagName;
      if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
        e.preventDefault(); setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e) => {
      if (e?.code === 'Space') { setIsSpacePressed(false); setIsPanning(false); }
    };
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUndo, handleRedo, handleSaveToGallery]);



  const getRelativePosition = useCallback((e) => {
    if (!imageRef.current) return null;
    const rect = imageRef.current.getBoundingClientRect();
    const clientX = e.touches?.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches?.length > 0 ? e.touches[0].clientY : e.clientY;
    if (clientX === undefined || clientY === undefined) return null;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    const tolerance = 5;
    if (x < -tolerance || x > 100 + tolerance || y < -tolerance || y > 100 + tolerance) return null;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  }, []);

  const handleMouseDown = useCallback((e) => {
    const clientX = e.touches?.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches?.length > 0 ? e.touches[0].clientY : e.clientY;
    
    // Eyedropper color picking
    if (isEyeDropperActive && currentImage && imageRef.current) {
      e.preventDefault();
      const pos = getRelativePosition(e);
      if (pos) {
        const imgElement = imageRef.current;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imgElement.naturalWidth;
        tempCanvas.height = imgElement.naturalHeight;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

        try {
          tempCtx.drawImage(imgElement, 0, 0, tempCanvas.width, tempCanvas.height);
          const pixelX = Math.round((pos.x / 100) * tempCanvas.width);
          const pixelY = Math.round((pos.y / 100) * tempCanvas.height);
          const imageData = tempCtx.getImageData(pixelX, pixelY, 1, 1).data;
          const r = imageData[0];
          const g = imageData[1];
          const b = imageData[2];
          const hexColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
          setPaintColor(hexColor);
          setIsEyeDropperActive(false);
          toast.success(`Color picked: ${hexColor}`);
        } catch (error) {
          console.error("Eyedropper error:", error);
          toast.error("Could not pick color from this image.");
        } finally {
          tempCanvas.remove();
        }
      }
    }
    
    if (isSpacePressed || e.button === 1 || isPanToolActive) {
      setIsPanning(true);
      setDragStart({ x: clientX, y: clientY });
      return;
    }
    if (activeTab === "paint" && currentImage) {
      const pos = getRelativePosition(e);
      if (pos) {
        setIsDrawing(true);
        setPaintStrokes(prev => [...prev, { points: [pos], color: paintColor, size: paintBrushSize, mode: paintMode, opacity: paintOpacity * 100 }]);
      }
    } else if (activeTab === "remove" && currentImage) {
      const pos = getRelativePosition(e);
      if (pos) {
        setIsDrawing(true);
        setBrushStrokes(prev => [...prev, { points: [pos], type: brushMode, size: brushSize }]);
      }
    } else if (isCropping) {
      const pos = getRelativePosition(e);
      if (pos) {
        const handleSize = 8;
        let type = null;
        if (Math.abs(pos.x - cropArea.x) < handleSize && Math.abs(pos.y - cropArea.y) < handleSize) type = 'nw';
        else if (Math.abs(pos.x - (cropArea.x + cropArea.width)) < handleSize && Math.abs(pos.y - cropArea.y) < handleSize) type = 'ne';
        else if (Math.abs(pos.x - cropArea.x) < handleSize && Math.abs(pos.y - (cropArea.y + cropArea.height)) < handleSize) type = 'sw';
        else if (Math.abs(pos.x - (cropArea.x + cropArea.width)) < handleSize && Math.abs(pos.y - (cropArea.y + cropArea.height)) < handleSize) type = 'se';
        else if (pos.x >= cropArea.x && pos.x <= cropArea.x + cropArea.width && pos.y >= cropArea.y && pos.y <= cropArea.y + cropArea.height) type = 'move';
        if (type) {
          setDragType(type);
          setIsDragging(true);
          setDragStart(pos);
          dragInitialCropRef.current = { ...cropArea };
          dragInitialPosRef.current = { ...pos };
        }
      }
    }
  }, [isSpacePressed, isPanToolActive, activeTab, currentImage, getRelativePosition, brushMode, brushSize, isCropping, cropArea, paintColor, paintBrushSize, paintMode, isEyeDropperActive]);

  const handleMouseMove = useCallback((e) => {
    if (e?.cancelable && (isDrawing || isDragging || isPanning)) {
      try {
        e.preventDefault();
      } catch (err) {
        // preventDefault can fail on non-cancelable events
      }
    }
    const clientX = e.touches?.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches?.length > 0 ? e.touches[0].clientY : e.clientY;

    if (isPanning && dragStart) {
      const deltaX = clientX - dragStart.x;
      const deltaY = clientY - dragStart.y;
      setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      setDragStart({ x: clientX, y: clientY });
      return;
    }

    if (isEyeDropperActive && containerRef.current && clientX !== undefined) {
      containerRef.current.style.cursor = "crosshair";
    } else if ((activeTab === "remove" || activeTab === "paint") && cursorRef.current && containerRef.current && clientX !== undefined) {
      const rect = containerRef.current.getBoundingClientRect();
      cursorRef.current.style.left = `${clientX - rect.left}px`;
      cursorRef.current.style.top = `${clientY - rect.top}px`;
      cursorRef.current.style.display = 'block';
    }

    if (activeTab === "paint" && isDrawing && currentImage) {
      const pos = getRelativePosition(e);
      if (pos && paintStrokes.length > 0) {
        setPaintStrokes(prev => {
          const newStrokes = [...prev];
          newStrokes[newStrokes.length - 1].points.push(pos);
          return newStrokes;
        });
      }
    } else if (activeTab === "remove" && isDrawing && currentImage) {
      const pos = getRelativePosition(e);
      if (pos && brushStrokes.length > 0) {
        setBrushStrokes(prev => {
          const newStrokes = [...prev];
          newStrokes[newStrokes.length - 1].points.push(pos);
          return newStrokes;
        });
      }
    } else if (isCropping && isDragging && dragType && dragInitialCropRef.current && dragInitialPosRef.current) {
      const pos = getRelativePosition(e);
      if (pos) {
        const initial = dragInitialCropRef.current;
        const initPos = dragInitialPosRef.current;
        const deltaX = pos.x - initPos.x;
        const deltaY = pos.y - initPos.y;
        const minSize = 5;
        let newCrop = { ...initial };
        if (dragType === 'move') {
          newCrop.x = Math.max(0, Math.min(100 - initial.width, initial.x + deltaX));
          newCrop.y = Math.max(0, Math.min(100 - initial.height, initial.y + deltaY));
        } else {
          if (dragType.includes('n')) {
            newCrop.y = Math.max(0, Math.min(initial.y + initial.height - minSize, initial.y + deltaY));
            newCrop.height = initial.height + (initial.y - newCrop.y);
          } else if (dragType.includes('s')) {
            newCrop.height = Math.max(minSize, Math.min(100 - initial.y, initial.height + deltaY));
          }
          if (dragType.includes('w')) {
            newCrop.x = Math.max(0, Math.min(initial.x + initial.width - minSize, initial.x + deltaX));
            newCrop.width = initial.width + (initial.x - newCrop.x);
          } else if (dragType.includes('e')) {
            newCrop.width = Math.max(minSize, Math.min(100 - initial.x, initial.width + deltaX));
          }
        }
        setCropArea(newCrop);
      }
    }
  }, [activeTab, isDrawing, currentImage, getRelativePosition, brushStrokes, paintStrokes, isDragging, dragStart, dragType, isPanning, isEyeDropperActive]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    setIsDragging(false);
    setIsPanning(false);
    setDragType(null);
    setDragStart(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDrawing(false);
    setIsDragging(false);
    setIsPanning(false);
    setDragType(null);
    setDragStart(null);
    if (cursorRef.current) cursorRef.current.style.display = 'none';
    if (containerRef.current) {
      containerRef.current.style.cursor = "";
    }
    setIsEyeDropperActive(false);
  }, [isEyeDropperActive]);

  // Draw paint strokes on canvas overlay
  useEffect(() => {
    if (!paintCanvasRef.current || !imageRef.current || activeTab !== "paint") return;
    const canvas = paintCanvasRef.current;
    const img = imageRef.current;
    // Use rendered size as fallback for cross-origin / small images
    canvas.width = img.naturalWidth || img.getBoundingClientRect().width || 0;
    canvas.height = img.naturalHeight || img.getBoundingClientRect().height || 0;
    if (canvas.width === 0 || canvas.height === 0) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    paintStrokes.forEach(stroke => {
      const points = stroke.points || [];
      if (!points.length) return;
      const size = stroke.size || paintBrushSize;
      const color = stroke.color || paintColor;
      const opacity = stroke.opacity !== undefined ? stroke.opacity / 100 : 1;
      ctx.globalCompositeOperation = stroke.mode === "erase" ? 'destination-out' : 'source-over';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = stroke.mode === "erase" ? 1 : opacity;
      if (points.length === 1) {
        ctx.beginPath();
        ctx.arc((points[0].x / 100) * canvas.width, (points[0].y / 100) * canvas.height, size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo((points[0].x / 100) * canvas.width, (points[0].y / 100) * canvas.height);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo((points[i].x / 100) * canvas.width, (points[i].y / 100) * canvas.height);
        }
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }, [paintStrokes, paintBrushSize, paintColor, paintOpacity, activeTab]);

  // Draw brush strokes on canvas overlay
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || activeTab !== "remove") return;
    const canvas = canvasRef.current;
    const img = imageRef.current;
    canvas.width = img.naturalWidth || img.getBoundingClientRect().width || 0;
    canvas.height = img.naturalHeight || img.getBoundingClientRect().height || 0;
    if (canvas.width === 0 || canvas.height === 0) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (brushStrokes.length === 0) return;
    brushStrokes.forEach(stroke => {
      const points = stroke.points || stroke;
      if (!points || points.length === 0) return;
      const isErase = stroke.type === 'erase';
      const size = stroke.size || brushSize;
      ctx.globalCompositeOperation = isErase ? 'destination-out' : 'source-over';
      ctx.strokeStyle = `rgba(255, 107, 53, ${brushOpacity})`;
      ctx.fillStyle = `rgba(255, 107, 53, ${brushOpacity})`;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (points.length === 1) {
        ctx.beginPath();
        ctx.arc((points[0].x / 100) * canvas.width, (points[0].y / 100) * canvas.height, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo((points[0].x / 100) * canvas.width, (points[0].y / 100) * canvas.height);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo((points[i].x / 100) * canvas.width, (points[i].y / 100) * canvas.height);
        }
        ctx.stroke();
      }
    });
    ctx.globalCompositeOperation = 'source-over';
  }, [brushStrokes, brushSize, brushOpacity, activeTab]);
  
  // Non-passive wheel listener to allow preventDefault (prevents page scroll during zoom)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      if (currentImage) {
        e.preventDefault();
        const delta = e.deltaY * -0.001;
        setZoom(prev => {
          const newZoom = Math.min(Math.max(prev + delta, 0.1), 5);
          const maxPan = Math.max((newZoom - 1) * 100, 0);
          setPan(p => ({
            x: Math.max(-maxPan, Math.min(maxPan, p.x)),
            y: Math.max(-maxPan, Math.min(maxPan, p.y))
          }));
          return newZoom;
        });
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [currentImage]);

  // Reset canvas context when switching tabs
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    if (paintCanvasRef.current) {
      const ctx = paintCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, paintCanvasRef.current.width, paintCanvasRef.current.height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }, [activeTab]);

  const getFilterStyle = useCallback(() => {
    if (!currentImage || currentImage.preview === null) return "none";
    const filters = [];
    if (adjustments.brightness !== 0) filters.push(`brightness(${100 + adjustments.brightness}%)`);
    if (adjustments.contrast !== 0) filters.push(`contrast(${100 + adjustments.contrast}%)`);
    if (adjustments.saturation !== 0) filters.push(`saturate(${100 + adjustments.saturation}%)`);
    if (adjustments.blur > 0) filters.push(`blur(${adjustments.blur}px)`);
    if (adjustments.hue !== 0) filters.push(`hue-rotate(${adjustments.hue}deg)`);
    if (adjustments.sepia > 0) filters.push(`sepia(${adjustments.sepia}%)`);
    if (adjustments.grayscale > 0) filters.push(`grayscale(${adjustments.grayscale}%)`);
    if (selectedFilter && selectedFilter.id !== "none") filters.push(selectedFilter.filter);
    return filters.length > 0 ? filters.join(" ") : "none";
  }, [adjustments, selectedFilter, currentImage]);

  const getTransformStyle = useCallback(() => {
    const transforms = [];
    if (transform.rotate !== 0) transforms.push(`rotate(${transform.rotate}deg)`);
    if (transform.flipH) transforms.push(`scaleX(-1)`);
    if (transform.flipV) transforms.push(`scaleY(-1)`);
    return transforms.length > 0 ? transforms.join(" ") : "none";
  }, [transform]);

  return (
    <div className="h-[calc(100dvh-4rem)] flex flex-col lg:flex-row overflow-hidden">
      <motion.aside
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="order-2 lg:order-1 w-full lg:w-80 h-[45dvh] lg:h-auto flex-shrink-0 border-t lg:border-t-0 lg:border-r border-white/5 glass-card overflow-y-auto z-20 bg-[#0A0A0A] scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex overflow-x-auto no-scrollbar bg-white/5 mx-1 sm:mx-2 my-4 p-1 rounded-xl h-auto gap-1 flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
              {[
                { value: "ai", icon: <Sparkles className="w-4 h-4" />, title: "AI Tools" },
                { value: "adjust", icon: <Settings2 className="w-4 h-4" />, title: "Adjustments" },
                { value: "filters", icon: <Filter className="w-4 h-4" />, title: "Filters" },
                { value: "transform", icon: <RotateCw className="w-4 h-4" />, title: "Transform" },
                { value: "crop", icon: <CropIcon className="w-4 h-4" />, title: "Crop" },
                { value: "remove", icon: <Wand2 className="w-4 h-4" />, title: "Magic Brush" },
                ...(user?.role === 'admin' ? [
                  { value: "paint", icon: <Paintbrush className="w-4 h-4" />, title: "Paint" },
                  { value: "text", icon: <Type className="w-4 h-4" />, title: "Text Generator" },
                ] : [])
              ].map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="flex-shrink-0 min-w-[40px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B35] data-[state=active]:to-[#FFB800]" title={tab.title}>
                  {tab.icon}
                </TabsTrigger>
              ))}

            </TabsList>

          <div className="px-4 pb-4">
            <TabsContent value="ai" className="mt-0">
              <ToolPanel onToolSelect={handleToolSelect} isProcessing={isProcessing} hasImage={!!currentImage} />
            </TabsContent>

            <TabsContent value="adjust" className="mt-0">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Adjustments</h3>
              {currentImage
                ? <AdjustmentsPanel adjustments={adjustments} onChange={handleAdjustmentChange} />
                : <p className="text-white/40 text-sm">Upload an image to start</p>
              }
            </TabsContent>

            <TabsContent value="filters" className="mt-0">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Filters</h3>
              {currentImage
                ? <FiltersPanel selectedFilter={selectedFilter} onFilterSelect={handleFilterSelect} previewImage={currentImage?.preview || currentImage?.url} />
                : <p className="text-white/40 text-sm">Upload an image to start</p>
              }
            </TabsContent>

            <TabsContent value="transform" className="mt-0">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Transform</h3>
              {currentImage
                ? <TransformPanel onTransform={handleTransform} isProcessing={isProcessing} />
                : <p className="text-white/40 text-sm">Upload an image to start</p>
              }
            </TabsContent>

            <TabsContent value="remove" className="mt-0">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Magic Brush</h3>
              {currentImage ? (
                <>
                  <SpotRemoval
                    onRemoveSpot={handleMagicBrush}
                    isProcessing={isMagicBrushProcessing}
                    brushSize={brushSize}
                    onBrushSizeChange={setBrushSize}
                    brushOpacity={brushOpacity}
                    onBrushOpacityChange={setBrushOpacity}
                    brushMode={brushMode}
                    onBrushModeChange={setBrushMode}
                    prompt={magicBrushPrompt}
                    onPromptChange={setMagicBrushPrompt}
                    referenceImages={magicBrushImages}
                    onReferenceImagesChange={setMagicBrushImages}
                  />
                  {brushStrokes.length > 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-[#FF6B35]/10 border border-[#FF6B35]/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/80">{brushStrokes.length} stroke(s)</span>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setBrushStrokes(prev => prev.slice(0, -1))} className="text-white/60 hover:text-white h-7 px-2 hover:bg-white/10" title="Undo last stroke">
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setBrushStrokes([])} className="text-white/60 hover:text-white h-7 px-2 hover:bg-white/10">
                            <X className="w-3 h-3 mr-1" />
                            Clear
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-white/40 text-sm">Upload an image to start</p>
              )}
            </TabsContent>

            <TabsContent value="crop" className="mt-0">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Crop & Resize</h3>
              {currentImage
                ? <CropPanel onApplyCrop={handleApplyCrop} onCancelCrop={handleCancelCrop} onStartCrop={handleStartCrop} isCropping={isCropping} onAspectRatioSelect={handleAspectRatioSelect} activeRatio={activeRatio} />
                : <p className="text-white/40 text-sm">Upload an image to start</p>
              }
            </TabsContent>

            <TabsContent value="paint" className="mt-0">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Paint</h3>
              {currentImage ? (
                <PaintPanel
                   brushColor={paintColor}
                   onBrushColorChange={setPaintColor}
                   brushSize={paintBrushSize}
                   onBrushSizeChange={setPaintBrushSize}
                   brushOpacity={paintOpacity * 100}
                   onBrushOpacityChange={(v) => setPaintOpacity(v / 100)}
                   paintMode={paintMode}
                   onPaintModeChange={setPaintMode}
                   onClearStrokes={() => setPaintStrokes([])}
                   onUndoLastStroke={() => setPaintStrokes(prev => prev.slice(0, -1))}
                   hasStrokes={paintStrokes.length > 0}
                   strokeCount={paintStrokes.length}
                   onEyeDropperActivate={() => setIsEyeDropperActive(prev => !prev)}
                   isEyeDropperActive={isEyeDropperActive}
                   />
              ) : (
                <p className="text-white/40 text-sm">Upload an image to start</p>
              )}
            </TabsContent>

            <TabsContent value="text" className="mt-0">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">AI Text Generator</h3>
              <TextGeneratorPanel onTextImageGenerated={handleTextImageGenerated} isProcessing={isProcessing} user={user} />
            </TabsContent>


          </div>
        </Tabs>
      </motion.aside>
      
      <main className="flex-1 flex flex-col order-1 lg:order-2 h-[55dvh] lg:h-auto relative min-h-0">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="h-14 border-b border-white/5 flex items-center justify-between px-4 lg:px-6 glass-card flex-shrink-0"
        >
          <div className="flex items-center gap-2">
            {activeTab === "remove" && currentImage && (
              <div className="text-xs lg:text-sm text-white/60 bg-white/5 px-2 lg:px-3 py-1 rounded-lg items-center gap-2 hidden sm:flex">
                <div className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" />
                Drag to mask
              </div>
            )}
            {isCropping && (
              <div className="text-xs lg:text-sm text-white/60 bg-white/5 px-2 lg:px-3 py-1 rounded-lg items-center gap-2 hidden sm:flex">
                <div className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" />
                Drag to crop
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="flex items-center gap-0.5 bg-white/5 backdrop-blur rounded-lg p-1">
              <Button onClick={handleUndo} variant="ghost" size="sm" disabled={undoHistory.length === 0} className="text-white hover:bg-white/10 disabled:opacity-30 px-2" title="Undo (Ctrl+Z)">
                <RotateCcw className="w-4 h-4 scale-x-[-1]" />
              </Button>
              <Button onClick={handleRedo} variant="ghost" size="sm" disabled={redoHistory.length === 0} className="text-white hover:bg-white/10 disabled:opacity-30 px-2" title="Redo (Ctrl+Shift+Z)">
                <RotateCw className="w-4 h-4 scale-x-[-1]" />
              </Button>
            </div>
            {currentImage && (
              <Button onClick={handleSaveToGallery} disabled={isSaving} className="text-xs text-white border border-white/20 hover:border-white/40 hover:bg-white/5 transition-all px-3" title="Save to Gallery">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Grid3x3 className="w-4 h-4" />}
                <span className="hidden sm:inline ml-1">{isSaving ? "Saving..." : "Save"}</span>
              </Button>
            )}
            <Button disabled={!currentImage} onClick={handleDownload} className="btn-gradient text-white text-xs disabled:opacity-30 px-3" title="Download">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Export</span>
            </Button>
          </div>
        </motion.div>
        
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-[#0A0A0A]"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}

          style={{ 
            touchAction: (activeTab === "paint" || activeTab === "remove" || isCropping) 
              ? 'none' 
              : loadedImages.length > 1 ? 'pan-x' : 'auto' 
          }}
        >
          {(activeTab === "remove" || activeTab === "paint") && !isSpacePressed && !isPanning && !isPanToolActive && (
            <div
              ref={cursorRef}
              className="absolute pointer-events-none rounded-full border-2 shadow-[0_0_10px_rgba(0,0,0,0.5)] z-50 transition-none"
              style={{
                width: (activeTab === "paint" ? paintBrushSize : brushSize) * zoom,
                height: (activeTab === "paint" ? paintBrushSize : brushSize) * zoom,
                transform: 'translate(-50%, -50%)', display: 'none',
                borderColor: activeTab === "paint"
                  ? (paintMode === "erase" ? 'rgba(255,255,255,0.8)' : paintColor)
                  : (brushMode === 'erase' ? 'rgba(255,255,255,0.8)' : 'rgba(255,107,53,0.8)'),
                backgroundColor: activeTab === "paint"
                  ? (paintMode === "erase" ? 'rgba(255,255,255,0.15)' : `${paintColor}33`)
                  : (brushMode === 'erase' ? 'rgba(255,255,255,0.2)' : 'rgba(255,107,53,0.2)')
              }}
            />
          )}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#FF6B35]/5 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#FFB800]/5 blur-[100px] pointer-events-none" />
          
          {!currentImage ? (
            <ImageUploader onImageSelect={handleImageSelect} onGalleryOpen={() => setIsGalleryPickerOpen(true)} />
          ) : (
           <>
             <div ref={emblaRef} className={`w-full h-full overflow-hidden ${isImageLocked ? 'pointer-events-none' : ''}`}>
               <div className="flex h-full">
                 {loadedImages.map((img, idx) => (
                   <div key={idx} className="min-w-full h-full flex items-center justify-center overflow-hidden relative">
                     {idx === currentImageIndex && (
                       <button
                         onClick={() => setIsImageLocked(!isImageLocked)}
                         className={`absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto transition-colors ${isImageLocked ? 'text-[#FF6B35]' : 'text-white/60 hover:text-white'}`}
                         title={isImageLocked ? 'Unlock image' : 'Lock image'}
                       >
                         {isImageLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                       </button>
                     )}
                     <div
                       className={`relative flex items-center justify-center no-invert transition-transform duration-75 ease-out ${(isPanning || isSpacePressed) ? 'cursor-move' : ''}`}
                       style={{
                         transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                         cursor: (isPanning || isSpacePressed || isPanToolActive) ? (isPanning ? 'grabbing' : 'grab') : undefined
                       }}
                     >
                       <img
                         ref={idx === currentImageIndex ? imageRef : null}
                         src={img.preview || img.url}
                         alt="Editor"
                         className={`block max-w-none rounded-lg md:rounded-2xl shadow-2xl ${(activeTab === "remove" || activeTab === "paint") && !isSpacePressed && !isPanToolActive ? "cursor-none" : isCropping ? "cursor-move" : ""}`}
                         style={{ filter: idx === currentImageIndex ? getFilterStyle() : 'none', transform: idx === currentImageIndex ? getTransformStyle() : 'none' }}
                         draggable={false}
                         crossOrigin="anonymous"
                         onLoad={() => { if (idx === currentImageIndex && needsFit) { setNeedsFit(false); setNeedsFit(true); } }}
                       />

                       {activeTab === "remove" && idx === currentImageIndex && (
                         <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none rounded-lg md:rounded-2xl w-full h-full" style={{ filter: 'none' }} />
                       )}

                       {activeTab === "paint" && idx === currentImageIndex && (
                          <canvas ref={paintCanvasRef} className="absolute inset-0 pointer-events-none rounded-lg md:rounded-2xl w-full h-full" style={{ filter: 'none' }} />
                        )}

                        {idx === currentImageIndex && stickers.length > 0 && (
                          <StickerOverlay
                            stickers={stickers}
                            onStickersChange={setStickers}
                            zoom={zoom}
                            pan={pan}
                            containerRef={containerRef}
                          />
                        )}

                       {isCropping && idx === currentImageIndex && (
                         <>
                           <div className="absolute pointer-events-none rounded-2xl" style={{ top: 0, left: 0, right: 0, height: `${cropArea.y}%`, background: 'rgba(0,0,0,0.65)' }} />
                           <div className="absolute pointer-events-none" style={{ top: `${cropArea.y}%`, left: 0, width: `${cropArea.x}%`, height: `${cropArea.height}%`, background: 'rgba(0,0,0,0.65)' }} />
                           <div className="absolute pointer-events-none" style={{ top: `${cropArea.y}%`, left: `${cropArea.x + cropArea.width}%`, right: 0, height: `${cropArea.height}%`, background: 'rgba(0,0,0,0.65)' }} />
                           <div className="absolute pointer-events-none rounded-2xl" style={{ top: `${cropArea.y + cropArea.height}%`, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)' }} />
                           <div
                             className="absolute border-[3px] border-[#FF6B35] shadow-lg shadow-[#FF6B35]/30"
                             style={{
                               left: `${cropArea.x}%`, top: `${cropArea.y}%`,
                               width: `${cropArea.width}%`, height: `${cropArea.height}%`,
                               background: 'transparent',
                               backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                               backgroundSize: '33.33% 33.33%',
                               boxShadow: 'inset 0 0 0 1px rgba(255,107,53,0.3)',
                             }}
                           >
                             <div className="absolute -top-4 -left-4 w-10 h-10 flex items-center justify-center cursor-nw-resize z-10 touch-none group hover:scale-125 transition-transform" style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.9) 0%, rgba(255,107,53,0.6) 100%)', borderRadius: '50%', boxShadow: '0 0 12px rgba(255,107,53,0.5)' }}><div className="w-1.5 h-1.5 bg-white rounded-full" /></div>
                             <div className="absolute -top-4 -right-4 w-10 h-10 flex items-center justify-center cursor-ne-resize z-10 touch-none group hover:scale-125 transition-transform" style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.9) 0%, rgba(255,107,53,0.6) 100%)', borderRadius: '50%', boxShadow: '0 0 12px rgba(255,107,53,0.5)' }}><div className="w-1.5 h-1.5 bg-white rounded-full" /></div>
                             <div className="absolute -bottom-4 -left-4 w-10 h-10 flex items-center justify-center cursor-sw-resize z-10 touch-none group hover:scale-125 transition-transform" style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.9) 0%, rgba(255,107,53,0.6) 100%)', borderRadius: '50%', boxShadow: '0 0 12px rgba(255,107,53,0.5)' }}><div className="w-1.5 h-1.5 bg-white rounded-full" /></div>
                             <div className="absolute -bottom-4 -right-4 w-10 h-10 flex items-center justify-center cursor-se-resize z-10 touch-none group hover:scale-125 transition-transform" style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.9) 0%, rgba(255,107,53,0.6) 100%)', borderRadius: '50%', boxShadow: '0 0 12px rgba(255,107,53,0.5)' }}><div className="w-1.5 h-1.5 bg-white rounded-full" /></div>
                           </div>
                           </>
                           )}
                           </div>
                           </div>
                           ))}
                           </div>
                           </div>

                           {loadedImages.length > 1 && (
                           <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
                           <button onClick={() => switchToImage(Math.max(0, currentImageIndex - 1))} disabled={isImageLocked} className="text-white/60 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
                           <div className="flex items-center gap-1">
                           {loadedImages.map((_, idx) => (
                           <button key={idx} onClick={() => switchToImage(idx)} disabled={isImageLocked} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-[#FF6B35] w-4' : 'bg-white/30 hover:bg-white/50'} disabled:opacity-40 disabled:cursor-not-allowed`} />
                           ))}
                           </div>
                           <button onClick={() => switchToImage(Math.min(loadedImages.length - 1, currentImageIndex + 1))} disabled={isImageLocked} className="text-white/60 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
                           <div className="h-4 w-px bg-white/20" />
                           <button onClick={() => setIsImageLocked(!isImageLocked)} className={`transition-colors ${isImageLocked ? 'text-[#FF6B35]' : 'text-white/60 hover:text-white'}`} title={isImageLocked ? 'Unlock image' : 'Lock image'}>{isImageLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}</button>
                           </div>
                           )}
                           </>
                           )}
          
          <AnimatePresence>
            {(isProcessing || isMagicBrushProcessing) && <ProcessingOverlay tool={activeTool} />}
          </AnimatePresence>
          
          {currentImage && (
            <motion.div
              className="absolute bottom-4 right-4 lg:bottom-6 lg:right-6 z-30"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col gap-2 items-end relative">
                <AnimatePresence>
                  {isToolboxExpanded && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="bg-gradient-to-br from-[#1a1a1a]/95 via-[#141414]/95 to-[#0f0f0f]/95 backdrop-blur-xl border border-white/15 rounded-lg p-0.5 shadow-2xl mb-0.5"
                    >
                      <div className="flex flex-col gap-px">
                        <button onClick={() => { fileInputRef.current?.click(); setIsToolboxExpanded(false); }} className="w-8 h-8 rounded-md flex items-center justify-center text-white/60 hover:bg-white/5 hover:text-white transition-colors active:scale-95" title="Upload">
                          <Upload className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setIsGalleryPickerOpen(true); setIsToolboxExpanded(false); }} className="w-8 h-8 rounded-md flex items-center justify-center text-white/60 hover:bg-white/5 hover:text-white transition-colors active:scale-95" title="Gallery">
                          <Grid3x3 className="w-3.5 h-3.5" />
                        </button>
                        <div className="h-px bg-white/10 mx-1" />
                        <button onClick={() => { setIsPanToolActive(!isPanToolActive); setIsToolboxExpanded(false); }} className={`w-8 h-8 rounded-md transition-all flex items-center justify-center active:scale-95 ${isPanToolActive ? 'bg-[#FF6B35] text-white' : 'hover:bg-white/5 text-white/60 hover:text-white'}`} title="Pan">
                           <Hand className="w-3.5 h-3.5" />
                        </button>
                        <div className="h-px bg-white/10 mx-1" />
                        <button onClick={() => setZoom(z => Math.min(z + 0.2, 5))} className="w-8 h-8 rounded-md flex items-center justify-center text-white/60 hover:bg-white/5 hover:text-white transition-colors active:scale-95" title="Zoom In">
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.1))} className="w-8 h-8 rounded-md flex items-center justify-center text-white/60 hover:bg-white/5 hover:text-white transition-colors active:scale-95" title="Zoom Out">
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setNeedsFit(true); setIsPanToolActive(false); }} className="w-8 h-8 rounded-md flex items-center justify-center text-white/60 hover:bg-white/5 hover:text-white transition-colors active:scale-95" title="Fit to screen">
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <motion.button
                  onClick={() => setIsToolboxExpanded(!isToolboxExpanded)}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#F72C25] hover:from-[#FF8B55] hover:to-[#FF4C45] text-white shadow-md hover:shadow-[#FF6B35]/40 transition-all flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div animate={{ rotate: isToolboxExpanded ? 45 : 0 }} transition={{ duration: 0.15 }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </motion.div>
                </motion.button>
                
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
              </div>
            </motion.div>
          )}
        </div>
      </main>
      
      <ResultModal
         isOpen={showResult}
         onClose={handleCloseResult}
         originalImage={processedImage || currentImage}
         resultImage={resultImage}
         onApply={handleApplyResult}
         onDownload={handleDownload}
         transform={processedImage ? undefined : transform}
         onRegenerate={regenerateAction}
         isRegenerating={isProcessing || isMagicBrushProcessing}
         metadata={{
           adjustments: adjustments,
           filter: selectedFilter,
           transform: transform
         }}
       />
      
      <GalleryPicker
        isOpen={isGalleryPickerOpen}
        onClose={() => setIsGalleryPickerOpen(false)}
        onSelect={handleImageSelect}
        onSelectMultiple={handleMultipleImagesSelect}
      />
    </div>
  );
}