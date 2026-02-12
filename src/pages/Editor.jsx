import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Settings2, Sparkles, Filter, Wand2, RotateCw, X, Crop as CropIcon, Layers, Sun, ZoomIn, ZoomOut, Move, Maximize2, Loader2, Paintbrush, Palette, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import ImageUploader from "@/components/editor/ImageUploader";
import { useCanvas } from "@/components/hooks/useCanvas";
import { useMagicBrush } from "@/components/hooks/useMagicBrush";
import ToolPanel from "@/components/editor/ToolPanel";
import AdjustmentsPanel from "@/components/editor/AdjustmentsPanel";
import FiltersPanel from "@/components/editor/FiltersPanel";
import TransformPanel from "@/components/editor/TransformPanel";
import SpotRemoval from "@/components/editor/SpotRemoval";
import CropPanel from "@/components/editor/CropPanel";
import ProcessingOverlay from "@/components/editor/ProcessingOverlay";
import ResultModal from "@/components/editor/ResultModal";


import { useFlikActions } from "@/components/useFlikActions";

export default function Editor() {
  const [currentImage, setCurrentImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [showResult, setShowResult] = useState(false);
  
  const [adjustments, setAdjustments] = useState({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    blur: 0,
    hue: 0,
    sepia: 0,
    grayscale: 0,
  });
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [transform, setTransform] = useState({ rotate: 0, flipH: false, flipV: false });
  
  const [brushStrokes, setBrushStrokes] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [brushOpacity, setBrushOpacity] = useState(0.8);
  const [brushMode, setBrushMode] = useState('draw');
  const [magicBrushPrompt, setMagicBrushPrompt] = useState("");
  const [magicBrushImages, setMagicBrushImages] = useState([]);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanToolActive, setIsPanToolActive] = useState(false);

  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragType, setDragType] = useState(null);

  const [toolbarVisible, setToolbarVisible] = useState(true);
  const toolbarHideTimeoutRef = useRef(null);

  const { generateCanvas, getProcessedImageBlob } = useCanvas();
  const { isProcessing: isMagicBrushProcessing, processMagicBrush } = useMagicBrush();
  
  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  const containerRef = useRef(null);
  const cursorRef = useRef(null);
  const [activeTab, setActiveTab] = useState("ai");
  const [undoHistory, setUndoHistory] = useState([]);
  const [redoHistory, setRedoHistory] = useState([]);
  const [regenerateAction, setRegenerateAction] = useState(null);

  // Track object URLs for proper cleanup
  const objectURLsRef = useRef(new Set());

  // Register actions for FLIK
  useFlikActions('Editor', {
    tool: (payload) => {
      setActiveTab(payload.id);
    },
    adjustment: (payload) => {
      const newAdjustments = { ...adjustments, [payload.key]: payload.value };
      handleAdjustmentChange(newAdjustments);
      setActiveTab('adjust');
    },
    filter: (payload) => {
      setActiveTab('filters');
    },
    crop: (payload) => {
      setActiveTab('crop');
      if (payload.active) handleStartCrop();
    }
  }, () => ({
    currentTool: activeTab,
    magicBrushPrompt: magicBrushPrompt,
    hasMaskDrawn: brushStrokes.length > 0,
    hasImage: !!currentImage
  }));

  // Load image from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const loadUrl = urlParams.get('load');
    if (loadUrl) {
      setCurrentImage({ url: loadUrl, preview: loadUrl, name: 'loaded_image.png' });
    }
  }, []);

  // Cleanup all object URLs on unmount
  useEffect(() => {
    return () => {
      objectURLsRef.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
      objectURLsRef.current.clear();
    };
  }, []);

  const createObjectURL = useCallback((blob) => {
    const url = URL.createObjectURL(blob);
    objectURLsRef.current.add(url);
    return url;
  }, []);

  const revokeObjectURL = useCallback((url) => {
    if (url && url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
        objectURLsRef.current.delete(url);
      } catch (e) {
        // Ignore errors
      }
    }
  }, []);

  const handleImageSelect = useCallback((image) => {
    setCurrentImage(image);
    if (image) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setAdjustments({
        brightness: 0,
        contrast: 0,
        saturation: 0,
        blur: 0,
        hue: 0,
        sepia: 0,
        grayscale: 0,
      });
      setSelectedFilter(null);
      setTransform({ rotate: 0, flipH: false, flipV: false });
      setBrushStrokes([]);
      setIsCropping(false);
      setCropArea({ x: 10, y: 10, width: 80, height: 80 });
      setUndoHistory([]);
      setRedoHistory([]);
    }
  }, []);



  const handleGenerateCanvas = useCallback(() => generateCanvas(currentImage, adjustments, transform, selectedFilter), [currentImage, adjustments, transform, selectedFilter, generateCanvas]);
  const handleGetProcessedBlob = useCallback(() => getProcessedImageBlob(currentImage, adjustments, transform, selectedFilter), [currentImage, adjustments, transform, selectedFilter, getProcessedImageBlob]);

  const handleToolSelect = useCallback(async (tool) => {
    if (!currentImage) return;
    
    setActiveTool(tool);
    setIsProcessing(true);
    setRegenerateAction(() => () => handleToolSelect(tool));
    
    try {
      const blob = await handleGetProcessedBlob();
      const processedUrl = createObjectURL(blob);
      setProcessedImage(processedUrl);
      
      const file = new File([blob], "processed_input.png", { type: "image/png" });
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `${tool.prompt}. Reference image provided - apply the enhancement while maintaining the original composition, subject, and overall structure.`,
        existing_image_urls: [uploadResult.file_url]
      });
      
      setResultImage(result.url);
      setShowResult(true);
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Error processing image. Please try again.");
    } finally {
      setIsProcessing(false);
      setActiveTool(null);
    }
  }, [currentImage, handleGetProcessedBlob, createObjectURL]);

  const handleApplyResult = useCallback(() => {
    if (resultImage) {
      setUndoHistory(prev => [...prev, { image: currentImage, adjustments, filter: selectedFilter, transform }]);
      setCurrentImage({ 
        url: resultImage, 
        preview: resultImage, 
        name: "enhanced_image.png" 
      });
      
      setAdjustments({
        brightness: 0,
        contrast: 0,
        saturation: 0,
        blur: 0,
        hue: 0,
        sepia: 0,
        grayscale: 0,
      });
      setSelectedFilter(null);
      setTransform({ rotate: 0, flipH: false, flipV: false });
      setBrushStrokes([]);
      setRedoHistory([]);
    }
    setShowResult(false);
    setResultImage(null);
    if (processedImage) {
      revokeObjectURL(processedImage);
      setProcessedImage(null);
    }
  }, [resultImage, currentImage, adjustments, selectedFilter, transform, processedImage, revokeObjectURL]);

  const handleCloseResult = useCallback(() => {
    setShowResult(false);
    if (processedImage) {
      revokeObjectURL(processedImage);
      setProcessedImage(null);
    }
  }, [processedImage, revokeObjectURL]);

  const handleUndo = useCallback(() => {
    if (undoHistory.length > 0) {
      const previous = undoHistory[undoHistory.length - 1];
      setRedoHistory(prev => [...prev, { image: currentImage, adjustments, filter: selectedFilter, transform }]);
      
      setCurrentImage(previous.image);
      setAdjustments(previous.adjustments || { brightness: 0, contrast: 0, saturation: 0, blur: 0, hue: 0, sepia: 0, grayscale: 0 });
      setSelectedFilter(previous.filter !== undefined ? previous.filter : null);
      setTransform(previous.transform || { rotate: 0, flipH: false, flipV: false });
      
      setUndoHistory(prev => prev.slice(0, -1));
    }
  }, [undoHistory, currentImage, adjustments, selectedFilter, transform]);

  const handleRedo = useCallback(() => {
    if (redoHistory.length > 0) {
      const next = redoHistory[redoHistory.length - 1];
      setUndoHistory(prev => [...prev, { image: currentImage, adjustments, filter: selectedFilter, transform }]);

      setCurrentImage(next.image);
      setAdjustments(next.adjustments || { brightness: 0, contrast: 0, saturation: 0, blur: 0, hue: 0, sepia: 0, grayscale: 0 });
      setSelectedFilter(next.filter !== undefined ? next.filter : null);
      setTransform(next.transform || { rotate: 0, flipH: false, flipV: false });
      
      setRedoHistory(prev => prev.slice(0, -1));
    }
  }, [redoHistory, currentImage, adjustments, selectedFilter, transform]);

  const handleDownload = useCallback(async () => {
    if (!currentImage) return;
    try {
      const blob = await handleGetProcessedBlob();
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
  }, [currentImage, handleGetProcessedBlob, createObjectURL, revokeObjectURL]);



  const handleAdjustmentChange = useCallback((newAdjustments) => {
    setUndoHistory(prev => [...prev, { image: currentImage, adjustments, filter: selectedFilter, transform }]);
    setAdjustments(newAdjustments);
    setRedoHistory([]);
  }, [currentImage, adjustments, selectedFilter, transform]);

  const handleFilterSelect = useCallback((filter) => {
    setUndoHistory(prev => [...prev, { image: currentImage, adjustments, filter: selectedFilter, transform }]);
    setSelectedFilter(filter);
    setRedoHistory([]);
  }, [currentImage, adjustments, selectedFilter, transform]);

  const handleTransform = useCallback(async (type) => {
    if (!currentImage) return;

    setUndoHistory(prev => [...prev, { image: currentImage, adjustments, filter: selectedFilter, transform }]);
    setIsProcessing(true);

    try {
      let tempTransform = { rotate: 0, flipH: false, flipV: false };
      if (type === 'rotate-right') tempTransform.rotate = 90;
      else if (type === 'rotate-left') tempTransform.rotate = -90;
      else if (type === 'flip-horizontal') tempTransform.flipH = true;
      else if (type === 'flip-vertical') tempTransform.flipV = true;

      const canvas = await generateCanvas(
        currentImage, 
        adjustments, 
        tempTransform, 
        selectedFilter
      );

      if (!canvas) {
        toast.error("Failed to generate canvas for transform.");
        throw new Error("Failed to generate canvas");
      }

      canvas.toBlob((blob) => {
        const url = createObjectURL(blob);
        setCurrentImage({
          ...currentImage,
          url: url,
          preview: url,
          name: "transformed.png"
        });
        setTransform({ rotate: 0, flipH: false, flipV: false });
        setBrushStrokes([]);
        setRedoHistory([]);
        setIsProcessing(false);
      }, 'image/png');
    } catch (error) {
      console.error("Transform error:", error);
      setIsProcessing(false);
      toast.error("Transform failed. Please try again.");
    }
  }, [currentImage, adjustments, selectedFilter, transform, generateCanvas, createObjectURL]);

  const handleMagicBrush = useCallback(async () => {
    setRegenerateAction(() => () => handleMagicBrush());

    try {
      const resultUrl = await processMagicBrush({
        imageRef,
        brushStrokes,
        brushSize,
        magicBrushPrompt,
        magicBrushImages,
        getProcessedImageBlob,
        currentImage,
        adjustments,
        transform,
        selectedFilter,
        setActiveTool
      });

      if (resultUrl) {
        setResultImage(resultUrl);
        setShowResult(true);
      }
    } catch (error) {
      console.error("Magic brush error:", error);
      toast.error("Error executing magic brush. Please try again.");
    }
  }, [brushStrokes, brushSize, magicBrushPrompt, magicBrushImages, getProcessedImageBlob, currentImage, adjustments, transform, selectedFilter, processMagicBrush]);

  const handleStartCrop = useCallback(() => {
    setIsCropping(true);
    setCropArea({ x: 10, y: 10, width: 80, height: 80 });
  }, []);

  const handleCancelCrop = useCallback(() => {
    setIsCropping(false);
  }, []);

  const handleApplyCrop = useCallback(async () => {
    if (!currentImage) return;

    setIsProcessing(true);
    setUndoHistory(prev => [...prev, { image: currentImage, adjustments, filter: selectedFilter, transform }]);

    try {
      const bakeCanvas = await handleGenerateCanvas();
      if (!bakeCanvas) {
        toast.error("Failed to generate canvas for cropping.");
        throw new Error("Failed to generate canvas");
      }

      const cropX = Math.max(0, Math.min((cropArea.x / 100) * bakeCanvas.width, bakeCanvas.width));
      const cropY = Math.max(0, Math.min((cropArea.y / 100) * bakeCanvas.height, bakeCanvas.height));
      const cropWidth = Math.max(1, Math.min((cropArea.width / 100) * bakeCanvas.width, bakeCanvas.width - cropX));
      const cropHeight = Math.max(1, Math.min((cropArea.height / 100) * bakeCanvas.height, bakeCanvas.height - cropY));

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = cropWidth;
      finalCanvas.height = cropHeight;
      const fCtx = finalCanvas.getContext('2d');

      fCtx.drawImage(bakeCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

      finalCanvas.toBlob((blob) => {
        const url = createObjectURL(blob);
        setCurrentImage({
          ...currentImage,
          url: url,
          preview: url,
          name: "cropped_image.png"
        });
        setTransform({ rotate: 0, flipH: false, flipV: false });
        setAdjustments({
          brightness: 0, contrast: 0, saturation: 0, blur: 0, hue: 0, sepia: 0, grayscale: 0
        });
        setSelectedFilter(null);
        setIsCropping(false);
        setRedoHistory([]);
        setIsProcessing(false);
        toast.success("Image cropped successfully!");
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
      const blob = await handleGetProcessedBlob();
      if (!blob) {
        toast.error("Could not get image data to save.");
        return;
      }
      const file = new File([blob], `flik_creation_${Date.now()}.png`, { type: blob.type });
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Creation.create({
        title: `Edited Image (${new Date().toLocaleString()})`,
        type: 'image',
        url: uploadResult.file_url,
        thumbnail_url: uploadResult.file_url
      }, { data_env: "dev" });
      toast.success('Saved to Gallery!');
    } catch (err) {
      console.error("Error saving to gallery:", err);
      toast.error('Error saving to gallery. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [currentImage, handleGetProcessedBlob]);





  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleDownload();
      }
    };

    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUndo, handleRedo, handleDownload]);

  const handleWheel = useCallback((e) => {
    if (currentImage) {
      const delta = e.deltaY * -0.001;
      setZoom(z => Math.min(Math.max(z + delta, 0.1), 5));
    }
  }, [currentImage]);

  const getRelativePosition = useCallback((e) => {
    if (!imageRef.current) return null;
    const rect = imageRef.current.getBoundingClientRect();
    
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
    
    if (clientX === undefined || clientY === undefined) return null;

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    const tolerance = 5; 
    if (x < -tolerance || x > 100 + tolerance || y < -tolerance || y > 100 + tolerance) return null;
    
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (isSpacePressed || e.button === 1 || isPanToolActive) {
      setIsPanning(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (activeTab === "remove" && currentImage) {
      const pos = getRelativePosition(e);
      if (pos) {
        setIsDrawing(true);
        setBrushStrokes(prev => [...prev, { points: [pos], type: brushMode, size: brushSize }]);
      }
    } else if (isCropping) {
      const pos = getRelativePosition(e);
      if (pos) {
        const handleSize = 5;
        let type = null;
        
        if (Math.abs(pos.x - cropArea.x) < handleSize && Math.abs(pos.y - cropArea.y) < handleSize) {
          type = 'nw';
        } else if (Math.abs(pos.x - (cropArea.x + cropArea.width)) < handleSize && Math.abs(pos.y - cropArea.y) < handleSize) {
          type = 'ne';
        } else if (Math.abs(pos.x - cropArea.x) < handleSize && Math.abs(pos.y - (cropArea.y + cropArea.height)) < handleSize) {
          type = 'sw';
        } else if (Math.abs(pos.x - (cropArea.x + cropArea.width)) < handleSize && Math.abs(pos.y - (cropArea.y + cropArea.height)) < handleSize) {
          type = 'se';
        } else if (pos.x >= cropArea.x && pos.x <= cropArea.x + cropArea.width && pos.y >= cropArea.y && pos.y <= cropArea.y + cropArea.height) {
          type = 'move';
        }
        
        if (type) {
          setDragType(type);
          setIsDragging(true);
          setDragStart(pos);
        }
      }
    }
  }, [isSpacePressed, isPanToolActive, activeTab, currentImage, getRelativePosition, brushMode, brushSize, isCropping, cropArea]);

  const handleMouseMove = useCallback((e) => {
    if (e.cancelable && (isDrawing || isDragging || isPanning)) {
      e.preventDefault();
    }

    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;

    if (isPanning && dragStart) {
      const deltaX = clientX - dragStart.x;
      const deltaY = clientY - dragStart.y;
      setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      setDragStart({ x: clientX, y: clientY });
      return;
    }

    if (activeTab === "remove" && cursorRef.current && containerRef.current && clientX !== undefined) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      cursorRef.current.style.left = `${x}px`;
      cursorRef.current.style.top = `${y}px`;
      cursorRef.current.style.display = 'block';
    }

    if (activeTab === "remove" && isDrawing && currentImage) {
      const pos = getRelativePosition(e);
      if (pos && brushStrokes.length > 0) {
        setBrushStrokes(prev => {
          const newStrokes = [...prev];
          newStrokes[newStrokes.length - 1].points.push(pos);
          return newStrokes;
        });
      }
    } else if (isCropping && isDragging && dragStart && dragType) {
      const pos = getRelativePosition(e);
      if (pos) {
        const deltaX = pos.x - dragStart.x;
        const deltaY = pos.y - dragStart.y;
        let newCrop = { ...cropArea };

        if (dragType === 'move') {
          newCrop.x = Math.max(0, Math.min(100 - cropArea.width, cropArea.x + deltaX));
          newCrop.y = Math.max(0, Math.min(100 - cropArea.height, cropArea.y + deltaY));
        } else if (dragType === 'nw') {
          const newX = Math.max(0, Math.min(cropArea.x + cropArea.width - 10, cropArea.x + deltaX));
          const newY = Math.max(0, Math.min(cropArea.y + cropArea.height - 10, cropArea.y + deltaY));
          newCrop.width = cropArea.width + (cropArea.x - newX);
          newCrop.height = cropArea.height + (cropArea.y - newY);
          newCrop.x = newX;
          newCrop.y = newY;
        } else if (dragType === 'ne') {
          const newWidth = Math.max(10, Math.min(100 - cropArea.x, cropArea.width + deltaX));
          const newY = Math.max(0, Math.min(cropArea.y + cropArea.height - 10, cropArea.y + deltaY));
          newCrop.width = newWidth;
          newCrop.height = cropArea.height + (cropArea.y - newY);
          newCrop.y = newY;
        } else if (dragType === 'sw') {
          const newX = Math.max(0, Math.min(cropArea.x + cropArea.width - 10, cropArea.x + deltaX));
          const newHeight = Math.max(10, Math.min(100 - cropArea.y, cropArea.height + deltaY));
          newCrop.width = cropArea.width + (cropArea.x - newX);
          newCrop.height = newHeight;
          newCrop.x = newX;
        } else if (dragType === 'se') {
          newCrop.width = Math.max(10, Math.min(100 - cropArea.x, cropArea.width + deltaX));
          newCrop.height = Math.max(10, Math.min(100 - cropArea.y, cropArea.height + deltaY));
        }

        setCropArea(newCrop);
        setDragStart(pos);
      }
    }
  }, [activeTab, isDrawing, currentImage, getRelativePosition, brushStrokes, isDragging, dragStart, dragType, cropArea, isPanning, pan]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    setIsDragging(false);
    setIsPanning(false);
    setDragType(null);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    handleMouseUp();
    if (cursorRef.current) {
      cursorRef.current.style.display = 'none';
    }
  }, [handleMouseUp]);

  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || activeTab !== "remove") return;

    const canvas = canvasRef.current;
    const img = imageRef.current;
    const rect = img.getBoundingClientRect();
    
    canvas.width = rect.width;
    canvas.height = rect.height;
    
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



  const getFilterStyle = useCallback(() => {
    const filters = [];
    
    if (adjustments.brightness !== 0) filters.push(`brightness(${100 + adjustments.brightness}%)`);
    if (adjustments.contrast !== 0) filters.push(`contrast(${100 + adjustments.contrast}%)`);
    if (adjustments.saturation !== 0) filters.push(`saturate(${100 + adjustments.saturation}%)`);
    if (adjustments.blur > 0) filters.push(`blur(${adjustments.blur}px)`);
    if (adjustments.hue !== 0) filters.push(`hue-rotate(${adjustments.hue}deg)`);
    if (adjustments.sepia > 0) filters.push(`sepia(${adjustments.sepia}%)`);
    if (adjustments.grayscale > 0) filters.push(`grayscale(${adjustments.grayscale}%)`);
    
    if (selectedFilter && selectedFilter.id !== "none") {
      filters.push(selectedFilter.filter);
    }
    
    return filters.length > 0 ? filters.join(" ") : "none";
  }, [adjustments, selectedFilter]);

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
        className="order-2 lg:order-1 w-full lg:w-80 h-[40dvh] lg:h-auto flex-shrink-0 border-t lg:border-t-0 lg:border-r border-white/5 glass-card overflow-y-auto z-20 bg-[#0A0A0A] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex overflow-x-auto no-scrollbar lg:grid lg:grid-cols-5 bg-white/5 mx-2 my-4 p-1 rounded-xl h-auto gap-2 lg:gap-0 flex-shrink-0">
            <TabsTrigger value="ai" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B35] data-[state=active]:to-[#FFB800]">
              <Sparkles className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="adjust" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B35] data-[state=active]:to-[#FFB800]">
              <Settings2 className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="filters" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B35] data-[state=active]:to-[#FFB800]">
              <Filter className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="transform" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B35] data-[state=active]:to-[#FFB800]">
              <RotateCw className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="remove" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B35] data-[state=active]:to-[#FFB800]">
              <Wand2 className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          <div className="px-4 pb-4">
            <TabsContent value="ai" className="mt-0">
              <ToolPanel 
                onToolSelect={handleToolSelect} 
                isProcessing={isProcessing}
                hasImage={!!currentImage}
              />
            </TabsContent>

            <TabsContent value="adjust" className="mt-0">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Adjustments</h3>
              {currentImage ? (
                <AdjustmentsPanel 
                  adjustments={adjustments} 
                  onChange={handleAdjustmentChange}
                />
              ) : (
                <p className="text-white/40 text-sm">Upload an image to start</p>
              )}
            </TabsContent>

            <TabsContent value="filters" className="mt-0">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Filters</h3>
              {currentImage ? (
                <FiltersPanel 
                  selectedFilter={selectedFilter}
                  onFilterSelect={handleFilterSelect}
                  previewImage={currentImage?.preview || currentImage?.url}
                />
              ) : (
                <p className="text-white/40 text-sm">Upload an image to start</p>
              )}
            </TabsContent>

            <TabsContent value="transform" className="mt-0">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Transform</h3>
              {currentImage ? (
                <TransformPanel onTransform={handleTransform} />
              ) : (
                <p className="text-white/40 text-sm">Upload an image to start</p>
              )}
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
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (brushStrokes.length > 0) {
                                setBrushStrokes(prev => prev.slice(0, -1));
                              }
                            }}
                            className="text-white/60 hover:text-white h-7 px-2 hover:bg-white/10"
                            title="Undo last stroke"
                          >
                            <RotateCw className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setBrushStrokes([])}
                            className="text-white/60 hover:text-white h-7 px-2 hover:bg-white/10"
                          >
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
              {currentImage ? (
                <CropPanel
                  onApplyCrop={handleApplyCrop}
                  onCancelCrop={handleCancelCrop}
                />
              ) : (
                <p className="text-white/40 text-sm">Upload an image to start</p>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </motion.aside>
      
      <main className="flex-1 flex flex-col order-1 lg:order-2 h-[60dvh] lg:h-auto relative min-h-0">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="h-14 border-b border-white/5 flex items-center justify-between px-4 lg:px-6 glass-card flex-shrink-0"
        >
          <div className="flex items-center gap-2">
            {activeTab === "remove" && currentImage && (
              <div className="text-xs lg:text-sm text-white/60 bg-white/5 px-2 lg:px-3 py-1 rounded-lg flex items-center gap-2 hidden sm:flex">
                <div className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" />
                Drag to mask
              </div>
            )}
            {isCropping && (
              <div className="text-xs lg:text-sm text-white/60 bg-white/5 px-2 lg:px-3 py-1 rounded-lg flex items-center gap-2 hidden sm:flex">
                <div className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" />
                Drag to crop
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="flex items-center gap-1">
              <Button
                onClick={handleUndo}
                variant="ghost"
                size="sm"
                disabled={undoHistory.length === 0}
                className="text-white hover:bg-white/10 disabled:opacity-30 px-2 lg:px-4"
                title="Undo (Ctrl+Z)"
              >
                <RotateCw className="w-4 h-4 lg:mr-2" />
                <span className="hidden lg:inline">Undo</span>
              </Button>
              <Button
                onClick={handleRedo}
                variant="ghost"
                size="sm"
                disabled={redoHistory.length === 0}
                className="text-white hover:bg-white/10 disabled:opacity-30 px-2 lg:px-4"
                title="Redo (Ctrl+Shift+Z)"
              >
                <RotateCw className="w-4 h-4 lg:mr-2 scale-x-[-1]" />
                <span className="hidden lg:inline">Redo</span>
              </Button>
            </div>
            {currentImage && (
              <Button
                onClick={handleSaveToGallery}
                disabled={isSaving}
                className="bg-white/10 hover:bg-white/20 text-white text-sm border border-white/20"
                title="Save to Gallery"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 lg:mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 lg:mr-2" />
                )}
                <span className="hidden lg:inline">{isSaving ? "Saving..." : "Save"}</span>
              </Button>
            )}
            <Button
              disabled={!currentImage}
              onClick={handleDownload}
              className="btn-gradient text-white text-sm disabled:opacity-30 px-3 lg:px-4"
              title="Download (Ctrl+S)"
            >
              <Download className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Export</span>
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
          onWheel={handleWheel}
          style={{ touchAction: 'none' }}
        >
          {activeTab === "remove" && !isSpacePressed && !isPanning && !isPanToolActive && (
            <div
              ref={cursorRef}
              className="absolute pointer-events-none rounded-full border-2 shadow-[0_0_10px_rgba(0,0,0,0.5)] z-50 transition-none"
              style={{
                width: brushSize * zoom,
                height: brushSize * zoom,
                transform: 'translate(-50%, -50%)',
                display: 'none',
                borderColor: brushMode === 'erase' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 107, 53, 0.8)',
                backgroundColor: brushMode === 'erase' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 107, 53, 0.2)'
              }}
            />
          )}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "40px 40px"
            }}
          />
          
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#FF6B35]/5 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#FFB800]/5 blur-[100px] pointer-events-none" />
          
          {currentImage ? (
            <div className="w-full h-full flex items-center justify-center p-2 md:p-8 overflow-hidden">
              <div 
                className={`relative inline-flex max-w-full max-h-full no-invert transition-transform duration-75 ease-out ${
                  (isPanning || isSpacePressed) ? 'cursor-move' : ''
                }`}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  cursor: (isPanning || isSpacePressed || isPanToolActive) ? (isPanning ? 'grabbing' : 'grab') : undefined
                }}
              >
                <img
                  ref={imageRef}
                  src={currentImage.preview || currentImage.url}
                  alt="Editor"
                  className={`max-w-full max-h-full object-contain rounded-lg md:rounded-2xl shadow-2xl ${
                    activeTab === "remove" && !isSpacePressed && !isPanToolActive ? "cursor-none" : isCropping ? "cursor-move" : ""
                  }`}
                  style={{
                    filter: getFilterStyle(),
                    transform: getTransformStyle(),
                  }}
                  draggable={false}
                />
                
                {activeTab === "remove" && currentImage && (
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 pointer-events-none rounded-lg md:rounded-2xl w-full h-full"
                    style={{ filter: 'none' }}
                  />
                )}

                {isCropping && (
                  <>
                    <div className="absolute inset-0 bg-black/50 pointer-events-none rounded-2xl" />
                    <div
                      className="absolute border-2 border-[#FF6B35] bg-transparent"
                      style={{
                        left: `${cropArea.x}%`,
                        top: `${cropArea.y}%`,
                        width: `${cropArea.width}%`,
                        height: `${cropArea.height}%`,
                      }}
                    >
                      <div className="absolute -top-3 -left-3 w-8 h-8 flex items-center justify-center cursor-nw-resize z-10 touch-none">
                        <div className="w-4 h-4 bg-[#FF6B35] rounded-full shadow-sm" />
                      </div>
                      <div className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center cursor-ne-resize z-10 touch-none">
                        <div className="w-4 h-4 bg-[#FF6B35] rounded-full shadow-sm" />
                      </div>
                      <div className="absolute -bottom-3 -left-3 w-8 h-8 flex items-center justify-center cursor-sw-resize z-10 touch-none">
                        <div className="w-4 h-4 bg-[#FF6B35] rounded-full shadow-sm" />
                      </div>
                      <div className="absolute -bottom-3 -right-3 w-8 h-8 flex items-center justify-center cursor-se-resize z-10 touch-none">
                        <div className="w-4 h-4 bg-[#FF6B35] rounded-full shadow-sm" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <ImageUploader 
              onImageSelect={handleImageSelect}
              currentImage={currentImage}
            />
          )}
          
          <AnimatePresence>
            {(isProcessing || isMagicBrushProcessing) && <ProcessingOverlay tool={activeTool} />}
          </AnimatePresence>
          
          {currentImage && (
            <motion.div 
              className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:translate-x-0 lg:bottom-6 lg:right-6 z-30 max-w-full"
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: toolbarVisible ? 1 : 0, scale: toolbarVisible ? 1 : 0.8 }}
              transition={{ duration: 0.3 }}
              onMouseEnter={() => {
                setToolbarVisible(true);
                if (toolbarHideTimeoutRef.current) clearTimeout(toolbarHideTimeoutRef.current);
              }}
              onMouseLeave={() => {
                if (toolbarHideTimeoutRef.current) clearTimeout(toolbarHideTimeoutRef.current);
                toolbarHideTimeoutRef.current = setTimeout(() => setToolbarVisible(false), 3000);
              }}
            >
              <div className="relative bg-gradient-to-r from-black/60 via-black/50 to-black/60 backdrop-blur-2xl border border-white/10 rounded-full p-1.5 sm:p-2.5 flex items-center gap-1 sm:gap-1.5 shadow-[0_25px_50px_rgba(255,107,53,0.15),0_0_0_1px_rgba(255,107,53,0.2)_inset] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ backgroundImage: 'linear-gradient(135deg, rgba(255,107,53,0.05) 0%, rgba(0,0,0,0) 50%, rgba(255,184,0,0.03) 100%)' }}>
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPanToolActive(!isPanToolActive)}
                  className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all flex-shrink-0 ${isPanToolActive ? 'bg-gradient-to-br from-white to-white/90 text-black hover:from-white/95 hover:to-white/85 shadow-[0_0_20px_rgba(255,255,255,0.4)]' : 'hover:bg-white/10 text-white'}`}
                  title="Pan Tool (Space)"
                >
                  <Move className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </Button>

                <div className="w-px h-5 bg-white/10 mx-1" />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom(z => Math.max(z - 0.1, 0.1))}
                  className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/10 text-white/80 hover:text-white flex-shrink-0 transition-all"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </Button>



                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom(z => Math.min(z + 0.1, 5))}
                  className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/10 text-white/80 hover:text-white flex-shrink-0 transition-all"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </Button>

                <div className="w-px h-5 bg-white/10 mx-1" />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setZoom(1); setPan({x: 0, y: 0}); setIsPanToolActive(false); }}
                  className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/10 text-white/80 hover:text-white flex-shrink-0 transition-all"
                  title="Reset View"
                >
                  <Maximize2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </Button>

                <div className="w-px h-5 bg-white/10 mx-1" />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (isCropping) {
                      handleCancelCrop();
                    } else {
                      setActiveTab('crop');
                      handleStartCrop();
                    }
                  }}
                  className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all flex-shrink-0 ${
                    isCropping 
                      ? 'bg-gradient-to-br from-[#FF6B35] to-[#F72C25] text-white hover:from-[#FF8B55] hover:to-[#FF4C45] shadow-[0_0_20px_rgba(255,107,53,0.5)]' 
                      : 'hover:bg-white/10 text-white/80 hover:text-white'
                  }`}
                  title="Crop & Resize"
                >
                  <CropIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </Button>
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
      />
    </div>
  );
}