import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Settings2, Sparkles, Filter, Wand2, RotateCw, X, Crop as CropIcon, Layers, Sun, ZoomIn, ZoomOut, Move, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import ImageUploader from "@/components/editor/ImageUploader";
import ToolPanel from "@/components/editor/ToolPanel";
import AdjustmentsPanel from "@/components/editor/AdjustmentsPanel";
import FiltersPanel from "@/components/editor/FiltersPanel";
import TransformPanel from "@/components/editor/TransformPanel";
import SpotRemoval from "@/components/editor/SpotRemoval";
import CropPanel from "@/components/editor/CropPanel";
import ProcessingOverlay from "@/components/editor/ProcessingOverlay";
import ResultModal from "@/components/editor/ResultModal";
import ChatPanel from "@/components/generate/ChatPanel";

export default function Editor() {
  const [currentImage, setCurrentImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
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
  const [brushMode, setBrushMode] = useState('draw'); // 'draw' or 'erase'
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
  const [batchImages, setBatchImages] = useState([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [activeBatchIndex, setActiveBatchIndex] = useState(null);
  
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const cursorRef = useRef(null);
  const [activeTab, setActiveTab] = useState("ai");
  const [undoHistory, setUndoHistory] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: "Hi! I can help you refine your editing instructions. What would you like to do with this image?" }
  ]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const loadUrl = urlParams.get('load');
    if (loadUrl) {
      setCurrentImage({ url: loadUrl, preview: loadUrl, name: 'loaded_image.png' });
    }
  }, []);

  const handleImageSelect = (image) => {
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
    }
  };

  const handleBatchUpload = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const images = imageFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      adjustments: { brightness: 0, contrast: 0, saturation: 0, blur: 0, hue: 0, sepia: 0, grayscale: 0 },
      transform: { rotate: 0, flipH: false, flipV: false },
      filter: null,
      brushStrokes: []
    }));
    
    const newBatch = [...batchImages, ...images];
    setBatchImages(newBatch);
    
    if (activeBatchIndex === null && newBatch.length > 0) {
      switchToBatchImage(0, newBatch);
    }
  };

  const saveCurrentStateToBatch = () => {
    if (activeBatchIndex === null || !batchImages[activeBatchIndex]) return;
    
    const updatedBatch = [...batchImages];
    updatedBatch[activeBatchIndex] = {
      ...updatedBatch[activeBatchIndex],
      adjustments,
      filter: selectedFilter,
      transform,
      brushStrokes,
    };
    setBatchImages(updatedBatch);
  };

  const switchToBatchImage = (index, currentBatch = batchImages) => {
    // Save current state if we are already editing a batch image
    if (activeBatchIndex !== null && activeBatchIndex !== index && batchImages[activeBatchIndex]) {
       // We can't use saveCurrentStateToBatch here because we might be using 'currentBatch' which is newer
       // But typically we switch active index.
       // Let's just rely on the user explicit save or auto-save on switch? 
       // For simplicity, let's assume we are using the component state batchImages
    }

    const targetImage = currentBatch[index];
    if (!targetImage) return;
    
    setActiveBatchIndex(index);
    setCurrentImage(targetImage);

    setZoom(1);
    setPan({ x: 0, y: 0 });
    setAdjustments(targetImage.adjustments || {
      brightness: 0, contrast: 0, saturation: 0, blur: 0, hue: 0, sepia: 0, grayscale: 0
    });
    setSelectedFilter(targetImage.filter || null);
    setTransform(targetImage.transform || { rotate: 0, flipH: false, flipV: false });
    setBrushStrokes(targetImage.brushStrokes || []);
    setUndoHistory([]);
    setRedoHistory([]);
    };

  const [batchProgress, setBatchProgress] = useState(0);

  const [batchCancelled, setBatchCancelled] = useState(false);

  const handleBatchProcess = async (tool) => {
    if (batchImages.length === 0) return;
    
    setIsBatchProcessing(true);
    setBatchProgress(0);
    setBatchCancelled(false);
    const results = [];
    
    for (let i = 0; i < batchImages.length; i++) {
      if (batchCancelled) break;
      
      const image = batchImages[i];
      try {
        const uploadResult = await base44.integrations.Core.UploadFile({ file: image.file });
        const result = await base44.integrations.Core.GenerateImage({
          prompt: `${tool.prompt}. Reference image provided - apply the enhancement while maintaining the original composition.`,
          existing_image_urls: [uploadResult.file_url]
        });
        
        await base44.entities.Creation.create({
          title: `Batch ${tool.label} - ${image.name}`,
          type: 'image',
          url: result.url,
          thumbnail_url: result.url,
          prompt: tool.prompt,
          metadata: { batch: true, original: image.name }
        });
        
        results.push({ original: image, result: result.url });
        setBatchProgress(Math.round(((i + 1) / batchImages.length) * 100));
      } catch (err) {
        console.error('Batch error:', err);
      }
    }
    
    if (batchCancelled) {
      alert(`Batch processing cancelled. Processed ${results.length} of ${batchImages.length} images.`);
    } else {
      alert(`Successfully processed ${results.length} of ${batchImages.length} images! Saved to Gallery.`);
    }
    
    setIsBatchProcessing(false);
    setBatchImages([]);
    setBatchProgress(0);
  };

  const getProcessedImageBlob = async () => {
    if (!currentImage) return null;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = currentImage.preview || currentImage.url;
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    if (transform.rotate === 90 || transform.rotate === 270) {
      canvas.width = img.height;
      canvas.height = img.width;
    } else {
      canvas.width = img.width;
      canvas.height = img.height;
    }

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((transform.rotate * Math.PI) / 180);
    ctx.scale(transform.flipH ? -1 : 1, transform.flipV ? -1 : 1);

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
    
    ctx.filter = filters.join(" ") || "none";

    if (transform.rotate === 90 || transform.rotate === 270) {
      ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
    } else {
      ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
    }
    
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  };

  const handleToolSelect = async (tool) => {
    if (!currentImage) return;
    
    setActiveTool(tool);
    setIsProcessing(true);
    
    try {
      // Bake current edits into a new image for the AI
      const blob = await getProcessedImageBlob();
      const processedUrl = URL.createObjectURL(blob);
      setProcessedImage(processedUrl);
      
      const file = new File([blob], "processed_input.png", { type: "image/png" });
      
      const uploadResult = await base44.integrations.Core.UploadFile({
        file: file
      });
      const imageUrl = uploadResult.file_url;
      
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `${tool.prompt}. Reference image provided - apply the enhancement while maintaining the original composition, subject, and overall structure.`,
        existing_image_urls: [imageUrl]
      });
      
      setResultImage(result.url);
      setShowResult(true);
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Error processing image. Please try again.");
    } finally {
      setIsProcessing(false);
      setActiveTool(null);
    }
  };

  const handleApplyResult = () => {
    if (resultImage) {
      setUndoHistory([...undoHistory, currentImage]);
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
    }
    setShowResult(false);
    setResultImage(null);
    if (processedImage) {
      URL.revokeObjectURL(processedImage);
      setProcessedImage(null);
    }
  };

  const handleCloseResult = () => {
    setShowResult(false);
    if (processedImage) {
      URL.revokeObjectURL(processedImage);
      setProcessedImage(null);
    }
  };

  const [redoHistory, setRedoHistory] = useState([]);

  const handleUndo = () => {
    if (undoHistory.length > 0) {
      const previous = undoHistory[undoHistory.length - 1];
      setRedoHistory([...redoHistory, { image: currentImage, adjustments, filter: selectedFilter, transform }]);
      
      if (previous.image) {
        setCurrentImage(previous.image);
        if (previous.adjustments) setAdjustments(previous.adjustments);
        if (previous.filter !== undefined) setSelectedFilter(previous.filter);
        if (previous.transform) setTransform(previous.transform);
      } else {
        setCurrentImage(previous);
      }
      
      setUndoHistory(undoHistory.slice(0, -1));
    }
  };

  const handleRedo = () => {
    if (redoHistory.length > 0) {
      const next = redoHistory[redoHistory.length - 1];
      setUndoHistory([...undoHistory, { image: currentImage, adjustments, filter: selectedFilter, transform }]);
      
      if (next.image) {
        setCurrentImage(next.image);
        if (next.adjustments) setAdjustments(next.adjustments);
        if (next.filter !== undefined) setSelectedFilter(next.filter);
        if (next.transform) setTransform(next.transform);
      } else {
        setCurrentImage(next);
      }
      
      setRedoHistory(redoHistory.slice(0, -1));
    }
  };

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
        e.preventDefault(); // Prevent scrolling
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
  }, [undoHistory, redoHistory, currentImage]);

  const handleDownload = async () => {
    if (!currentImage) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = currentImage.preview || currentImage.url;
    
    img.onload = () => {
      if (transform.rotate === 90 || transform.rotate === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((transform.rotate * Math.PI) / 180);
      ctx.scale(transform.flipH ? -1 : 1, transform.flipV ? -1 : 1);

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
      
      ctx.filter = filters.join(" ") || "none";

      if (transform.rotate === 90 || transform.rotate === 270) {
        ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
      } else {
        ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
      }
      
      ctx.restore();

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "flik_edited_image.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    };
  };

  const handleAdjustmentChange = (newAdjustments) => {
    setUndoHistory([...undoHistory, { image: currentImage, adjustments, filter: selectedFilter, transform }]);
    setAdjustments(newAdjustments);
  };

  const handleFilterSelect = (filter) => {
    setUndoHistory([...undoHistory, { image: currentImage, adjustments, filter: selectedFilter, transform }]);
    setSelectedFilter(filter);
  };

  const handleTransform = async (type) => {
    if (!currentImage) return;

    setUndoHistory([...undoHistory, { image: currentImage, adjustments, filter: selectedFilter, transform }]);
    setIsProcessing(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = currentImage.preview || currentImage.url;
      
      await new Promise(resolve => img.onload = resolve);

      let rotate = 0;
      let scaleX = 1;
      let scaleY = 1;
      let newWidth = img.width;
      let newHeight = img.height;

      if (type === 'rotate-right') {
        rotate = 90;
        newWidth = img.height;
        newHeight = img.width;
      } else if (type === 'rotate-left') {
        rotate = -90;
        newWidth = img.height;
        newHeight = img.width;
      } else if (type === 'flip-horizontal') {
        scaleX = -1;
      } else if (type === 'flip-vertical') {
        scaleY = -1;
      }

      canvas.width = newWidth;
      canvas.height = newHeight;

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotate * Math.PI) / 180);
      ctx.scale(scaleX, scaleY);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        setCurrentImage({
          ...currentImage,
          url: url,
          preview: url,
          name: "transformed.png"
        });
        setTransform({ rotate: 0, flipH: false, flipV: false });
        setBrushStrokes([]);
        setIsProcessing(false);
      }, 'image/png');
    } catch (error) {
      console.error("Transform error:", error);
      setIsProcessing(false);
    }
  };

  const handleWheel = (e) => {
    if (currentImage) {
      const delta = e.deltaY * -0.001;
      setZoom(z => Math.min(Math.max(z + delta, 0.1), 5));
    }
  };

  const getRelativePosition = (e) => {
    if (!imageRef.current) return null;
    const rect = imageRef.current.getBoundingClientRect();
    
    // Handle both mouse and touch events
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
    
    if (clientX === undefined || clientY === undefined) return null;

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    // Allow some tolerance for touch interactions near the edge
    const tolerance = 5; 
    if (x < -tolerance || x > 100 + tolerance || y < -tolerance || y > 100 + tolerance) return null;
    
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  const handleMouseDown = (e) => {
    // Check for pan mode (Space key, middle mouse button, or active pan tool)
    if (isSpacePressed || e.button === 1 || isPanToolActive) {
      setIsPanning(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (activeTab === "remove" && currentImage) {
      const pos = getRelativePosition(e);
      if (pos) {
        setIsDrawing(true);
        setBrushStrokes([...brushStrokes, { points: [pos], type: brushMode, size: brushSize }]);
      }
    } else if (activeTab === "crop" && isCropping) {
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
  };

  const handleMouseMove = (e) => {
  // Prevent default touch actions (scrolling) if we are interacting
  if (e.cancelable && (isDrawing || isDragging || isPanning)) {
    e.preventDefault();
  }

  const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;

  if (isPanning && dragStart) {
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    setPan({ x: pan.x + deltaX, y: pan.y + deltaY });
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
        const newStrokes = [...brushStrokes];
        newStrokes[newStrokes.length - 1].points.push(pos);
        setBrushStrokes(newStrokes);
      }
    } else if (activeTab === "crop" && isDragging && dragStart && dragType) {
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
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setIsDragging(false);
    setIsPanning(false);
    setDragType(null);
  };
  
  const handleMouseLeave = () => {
    handleMouseUp();
    if (cursorRef.current) {
      cursorRef.current.style.display = 'none';
    }
  };

  const handleRemoveSpots = async () => {
    if (brushStrokes.length === 0 || !currentImage) return;
    
    setIsProcessing(true);
    setActiveTool({ label: "Spot Removal" });
    
    try {
      // Bake the current image state (transforms, adjustments)
      const blob = await getProcessedImageBlob();
      const file = new File([blob], "processed_cleanup.png", { type: "image/png" });
      
      const uploadResult = await base44.integrations.Core.UploadFile({
        file: file
      });
      const imageUrl = uploadResult.file_url;
      
      // We also need to potentially mask the brush strokes if the backend required it,
      // but GenerateImage generic prompt might just look at the image.
      // However, usually for inpainting we need to send the mask.
      // The current prompt says "at the marked painted areas". 
      // If we just send the clean image, the AI won't know WHERE to paint unless we draw the strokes ON the image?
      // Wait, the previous code sent `currentImage` and `prompt`. It didn't send a mask.
      // The previous code relied on the AI "figuring it out"? Or maybe the `ProcessingOverlay` drew on it? No.
      // Actually, if we look at `handleRemoveSpots` in the original code, it didn't seem to draw the red strokes onto the image sent to AI.
      // It just sent the original image and said "marked painted areas". 
      // This suggests the previous implementation might not have worked well for spot removal unless the "existing_image_urls" implies a state where the client draws on it?
      // No, `GenerateImage` takes a URL.
      // To make this work properly, I should probably DRAW the red strokes onto the baked image so the AI sees them!
      // OR send a separate mask. But `GenerateImage` schema doesn't show a mask input.
      // It assumes the prompt handles it or the image has the markings?
      // Let's assume for "Spot Removal" with a generic LLM/Image gen, drawing the mask on the image (e.g. in bright green/red) and telling it "remove the red areas" is a common strategy if no explicit mask input exists.
      // So, let's modify `getProcessedImageBlob` to optionally accept `drawStrokes`.
      // Or just draw them here manually.
      
      // Let's create a specific blob for spot removal that INCLUDES the brush strokes burned in
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = URL.createObjectURL(blob); // Load the baked image
      
      await new Promise(r => img.onload = r);
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Draw strokes
      if (brushStrokes.length > 0) {
        brushStrokes.forEach(stroke => {
          const points = stroke.points || stroke;
          if (!points || points.length === 0) return;
          
          const isErase = stroke.type === 'erase';
          const size = stroke.size || brushSize;
          
          ctx.globalCompositeOperation = isErase ? 'destination-out' : 'source-over';
          ctx.strokeStyle = `rgba(255, 0, 0, 1)`; 
          ctx.fillStyle = `rgba(255, 0, 0, 1)`;
          
          let scaledSize = size;
          if (imageRef.current) {
             const domWidth = imageRef.current.getBoundingClientRect().width;
             const scale = canvas.width / domWidth;
             scaledSize = size * scale;
          } else {
             scaledSize = size * (canvas.width / 800);
          }

          ctx.lineWidth = scaledSize;
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
      }
      
      const maskedBlob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      const maskedFile = new File([maskedBlob], "masked_input.png", { type: "image/png" });
      const maskedUpload = await base44.integrations.Core.UploadFile({ file: maskedFile });
      
      // 1. Optimize the instruction using LLM to make it robust for the image generator
      setActiveTool({ label: "Refining Instruction..." });

      const userInstruction = magicBrushPrompt.trim() || "remove the object completely";
      const hasReferences = magicBrushImages.length > 0;

      const llmResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert image editing assistant. The user has painted red marks on an image and wants to edit those areas.
        User instruction: "${userInstruction}"
        ${hasReferences ? "IMPORTANT: The user has provided REFERENCE IMAGES. The content of these reference images MUST be used to fill the masked area." : ""}

        Create a detailed prompt for an image generation model to execute this edit.
        The prompt MUST:
        1. Explicitly state that the bright RED areas are a mask to be modified.
        2. Describe exactly what to generate in place of the red areas. ${hasReferences ? "CRITICAL: Instruct the model to strictly use the visual characteristics (style, color, texture, object) from the provided additional reference images to replace the content in the masked area." : "Match the user's intent (removal/inpainting vs replacement/addition)."}
        3. EMPHASIZE that the red color must be completely gone in the result.
        4. Instruct to keep the rest of the image unchanged and blend the edits seamlessly.

        Output ONLY the prompt text.`
      });

      // 2. Generate the edit
      setActiveTool({ label: "Applying Magic..." });

      const result = await base44.integrations.Core.GenerateImage({
        prompt: llmResponse, // Use the smart optimized prompt
        existing_image_urls: [maskedUpload.file_url, ...magicBrushImages]
      });

      setResultImage(result.url);
      setShowResult(true);
      setBrushStrokes([]);
    } catch (error) {
      console.error("Error removing spots:", error);
      alert("Error removing spots. Please try again.");
    } finally {
      setIsProcessing(false);
      setActiveTool(null);
    }
  };

  const handleStartCrop = () => {
    setIsCropping(true);
    setCropArea({ x: 10, y: 10, width: 80, height: 80 });
  };

  const handleCancelCrop = () => {
    setIsCropping(false);
  };

  const handleApplyCrop = async () => {
    if (!currentImage) return;
    
    setIsProcessing(true);
    setUndoHistory([...undoHistory, { image: currentImage, adjustments, filter: selectedFilter, transform }]);
    
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = currentImage.preview || currentImage.url;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // 1. Setup dimensions for the "Visual" image (baked transforms)
      const isRotated90 = Math.abs(transform.rotate) === 90 || Math.abs(transform.rotate) === 270;
      const visualWidth = isRotated90 ? img.height : img.width;
      const visualHeight = isRotated90 ? img.width : img.height;

      // 2. Bake transforms into a temporary canvas
      const bakeCanvas = document.createElement('canvas');
      bakeCanvas.width = visualWidth;
      bakeCanvas.height = visualHeight;
      const bCtx = bakeCanvas.getContext('2d');
      
      bCtx.translate(visualWidth / 2, visualHeight / 2);
      bCtx.rotate((transform.rotate * Math.PI) / 180);
      bCtx.scale(transform.flipH ? -1 : 1, transform.flipV ? -1 : 1);
      bCtx.drawImage(img, -img.width / 2, -img.height / 2);

      // 3. Calculate crop coordinates on the baked canvas
      const cropX = Math.max(0, Math.min((cropArea.x / 100) * visualWidth, visualWidth));
      const cropY = Math.max(0, Math.min((cropArea.y / 100) * visualHeight, visualHeight));
      const cropWidth = Math.max(1, Math.min((cropArea.width / 100) * visualWidth, visualWidth - cropX));
      const cropHeight = Math.max(1, Math.min((cropArea.height / 100) * visualHeight, visualHeight - cropY));

      // 4. Draw the cropped region to the final canvas
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = cropWidth;
      finalCanvas.height = cropHeight;
      const fCtx = finalCanvas.getContext('2d');
      
      fCtx.drawImage(bakeCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

      finalCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        setCurrentImage({
          ...currentImage,
          url: url,
          preview: url,
          name: "cropped_image.png"
        });
        // Reset transform since we baked it in
        setTransform({ rotate: 0, flipH: false, flipV: false });
        setIsCropping(false);
        setIsProcessing(false);
      }, 'image/png', 1.0);
    } catch (error) {
      console.error("Error cropping:", error);
      setIsProcessing(false);
    }
  };

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
      const points = stroke.points || stroke; // Handle legacy format just in case
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
  }, [brushStrokes, brushSize, activeTab]);

  const getFilterStyle = () => {
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
  };

  const getTransformStyle = () => {
    const transforms = [];
    
    if (transform.rotate !== 0) transforms.push(`rotate(${transform.rotate}deg)`);
    if (transform.flipH) transforms.push(`scaleX(-1)`);
    if (transform.flipV) transforms.push(`scaleY(-1)`);
    
    return transforms.length > 0 ? transforms.join(" ") : "none";
  };

  return (
    <div className="h-[calc(100dvh-4rem)] flex flex-col lg:flex-row overflow-hidden">
      <motion.aside
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="order-2 lg:order-1 w-full lg:w-80 h-[40dvh] lg:h-auto flex-shrink-0 border-t lg:border-t-0 lg:border-r border-white/5 glass-card overflow-y-auto z-20 bg-[#0A0A0A] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex overflow-x-auto no-scrollbar lg:grid lg:grid-cols-7 bg-white/5 mx-2 my-4 p-1 rounded-xl h-auto gap-2 lg:gap-0 flex-shrink-0">
            <TabsTrigger value="ai" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B35] data-[state=active]:to-[#FFB800]">
              <Sparkles className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="batch" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B35] data-[state=active]:to-[#FFB800]">
              <Layers className="w-4 h-4" />
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
            <TabsTrigger value="crop" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B35] data-[state=active]:to-[#FFB800]">
              <CropIcon className="w-4 h-4" />
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

            <TabsContent value="batch" className="mt-0">
              <div className="py-6 px-4 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#FF6B35]"></span>
                    Batch Workspace
                  </h3>
                  
                  <label className="block cursor-pointer group">
                    <div className="relative overflow-hidden border border-dashed border-white/20 rounded-2xl p-8 hover:border-[#FF6B35]/50 hover:bg-[#FF6B35]/5 transition-all">
                      <div className="flex flex-col items-center gap-3 text-center relative z-10">
                        <div className="w-12 h-12 rounded-full bg-[#FF6B35]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Layers className="w-6 h-6 text-[#FF6B35]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-[#FF6B35] transition-colors">Import Images</p>
                          <p className="text-xs text-white/40 mt-1">Select multiple files to process</p>
                        </div>
                      </div>
                    </div>
                    <input type="file" accept="image/*" multiple onChange={handleBatchUpload} className="hidden" />
                  </label>
                </div>

                {batchImages.length > 0 && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-[#FF6B35]"></span>
                        Workflow
                      </h3>
                      
                      <button 
                        onClick={() => {
                          const updatedBatch = batchImages.map(img => ({
                            ...img,
                            adjustments: { ...adjustments },
                            filter: selectedFilter,
                            transform: { ...transform }
                          }));
                          setBatchImages(updatedBatch);
                          alert('Synced current edits to all images!');
                        }}
                        className="w-full p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 transition-all text-left flex items-center gap-3 group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                          <Settings2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">Sync Edits</p>
                          <p className="text-xs text-white/40">Apply current adjustments to all</p>
                        </div>
                      </button>

                      <button 
                        onClick={() => {
                          setBatchImages([]);
                          setCurrentImage(null);
                          setActiveBatchIndex(null);
                        }}
                        className="w-full p-4 rounded-xl bg-white/[0.03] hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all text-left flex items-center gap-3 group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                          <X className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-red-400 transition-colors">Clear All</p>
                          <p className="text-xs text-white/40">Remove all images</p>
                        </div>
                      </button>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-[#FF6B35]"></span>
                        AI Batch Actions
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { label: "Auto Enhance", icon: Sparkles, prompt: "Enhance this image with better colors, improved clarity, professional quality" },
                          { label: "Upscale 4x", icon: Wand2, prompt: "Upscale to higher resolution, enhance details" },
                          { label: "Fix Lighting", icon: Sun, prompt: "Fix lighting and exposure, balance highlights and shadows" },
                        ].map(tool => (
                          <Button
                            key={tool.label}
                            onClick={() => handleBatchProcess(tool)}
                            disabled={isBatchProcessing}
                            className="w-full h-12 bg-white/[0.03] hover:bg-[#FF6B35] border border-white/5 hover:border-[#FF6B35] text-white justify-start px-4 gap-3 group transition-all rounded-xl"
                          >
                            <tool.icon className="w-4 h-4 text-[#FF6B35] group-hover:text-white transition-colors" />
                            <span className="flex-1 text-left">
                              {isBatchProcessing ? `Processing ${batchProgress}%` : tool.label}
                            </span>
                            {isBatchProcessing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                          </Button>
                        ))}
                      </div>
                      
                      {isBatchProcessing && (
                        <Button
                          onClick={() => setBatchCancelled(true)}
                          variant="outline"
                          className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 mt-2"
                        >
                          Stop Processing
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
                    onRemoveSpot={handleRemoveSpots}
                    isProcessing={isProcessing}
                    brushSize={brushSize}
                    onBrushSizeChange={setBrushSize}
                    brushOpacity={brushOpacity}
                    onBrushOpacityChange={setBrushOpacity}
                    brushMode={brushMode}
                    onBrushModeChange={setBrushMode}
                    prompt={magicBrushPrompt}
                    onPromptChange={setMagicBrushPrompt}
                    onDiscuss={() => setIsChatOpen(true)}
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
                                setBrushStrokes(brushStrokes.slice(0, -1));
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
                  onStartCrop={handleStartCrop}
                  onApplyCrop={handleApplyCrop}
                  onCancelCrop={handleCancelCrop}
                  isCropping={isCropping}
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
                Drag to paint
              </div>
            )}
            {activeTab === "crop" && isCropping && (
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
                onClick={async () => {
                  try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.src = currentImage.preview || currentImage.url;
                    
                    img.onload = async () => {
                      canvas.width = img.width;
                      canvas.height = img.height;
                      ctx.drawImage(img, 0, 0);
                      
                      canvas.toBlob(async (blob) => {
                        const file = new File([blob], 'image.png', { type: 'image/png' });
                        const uploadResult = await base44.integrations.Core.UploadFile({ file });
                        
                        await base44.entities.Creation.create({
                          title: 'Edited Image',
                          type: 'image',
                          url: uploadResult.file_url,
                          thumbnail_url: uploadResult.file_url
                        });
                        
                        alert('Saved to Gallery!');
                      });
                    };
                  } catch (err) {
                    alert('Error saving: ' + err.message);
                  }
                }}
                className="bg-white/10 hover:bg-white/20 text-white text-sm border border-white/20"
                title="Save to Gallery"
              >
                <Sparkles className="w-4 h-4 lg:mr-2" />
                <span className="hidden lg:inline">Save</span>
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
              className="absolute pointer-events-none rounded-full border-2 border-white/80 shadow-[0_0_10px_rgba(0,0,0,0.5)] z-50 transition-none"
              style={{
                width: brushSize * zoom, // Scale cursor visual with zoom
                height: brushSize * zoom,
                transform: 'translate(-50%, -50%)',
                display: 'none',
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
                    activeTab === "remove" && !isSpacePressed && !isPanToolActive ? "cursor-none" : activeTab === "crop" && isCropping ? "cursor-move" : ""
                  }`}
                  style={{
                    filter: getFilterStyle(),
                    transform: getTransformStyle(),
                  }}
                  draggable={false}
                />
                
                {activeTab === "remove" && (
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 pointer-events-none rounded-lg md:rounded-2xl w-full h-full"
                    style={{ filter: 'none' }}
                  />
                )}

                {activeTab === "crop" && isCropping && (
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
                      {/* Hit areas are larger (6x6) but visible handles are 4x4 (w-4) inside to maintain visuals while improving usability */}
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
            {isProcessing && <ProcessingOverlay tool={activeTool} />}
          </AnimatePresence>

          {batchImages.length > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a]/90 backdrop-blur-md border border-white/10 rounded-2xl p-2 flex items-center gap-2 max-w-[80%] overflow-x-auto shadow-2xl z-20 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {batchImages.map((img, idx) => (
                <div 
                  key={img.id}
                  onClick={() => {
                    saveCurrentStateToBatch();
                    switchToBatchImage(idx);
                  }}
                  className={`relative w-16 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-all flex-shrink-0 group ${
                    activeBatchIndex === idx ? 'border-[#FF6B35]' : 'border-transparent hover:border-white/20'
                  }`}
                >
                  <img src={img.preview} className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newBatch = batchImages.filter((_, i) => i !== idx);
                      setBatchImages(newBatch);
                      if (activeBatchIndex === idx) {
                        if (newBatch.length > 0) switchToBatchImage(0, newBatch);
                        else {
                          setCurrentImage(null);
                          setActiveBatchIndex(null);
                        }
                      } else if (activeBatchIndex > idx) {
                        setActiveBatchIndex(activeBatchIndex - 1);
                      }
                    }}
                    className="absolute top-0 right-0 p-0.5 bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/5 hover:border-white/20 transition-all flex-shrink-0">
                <input type="file" accept="image/*" multiple onChange={handleBatchUpload} className="hidden" />
                <span className="text-2xl text-white/20">+</span>
              </label>
            </div>
          )}
          
          {currentImage && (
            <div className="absolute bottom-4 right-4 lg:bottom-6 lg:right-6 z-30">
              <div className="bg-black/20 backdrop-blur-2xl border border-white/10 rounded-full p-1.5 flex items-center gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.3)] ring-1 ring-white/5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPanToolActive(!isPanToolActive)}
                  className={`w-9 h-9 rounded-full transition-all ${isPanToolActive ? 'bg-white text-black hover:bg-white/90 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'hover:bg-white/10 text-white'}`}
                  title="Pan Tool (Space)"
                >
                  <Move className="w-4 h-4" />
                </Button>

                <div className="w-px h-4 bg-white/10 mx-1" />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom(z => Math.max(z - 0.1, 0.1))}
                  className="w-9 h-9 rounded-full hover:bg-white/10 text-white flex-shrink-0"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>

                <div className="w-20 lg:w-32 px-2 hidden sm:block">
                  <Slider 
                    value={[zoom]} 
                    min={0.1} 
                    max={5} 
                    step={0.1} 
                    onValueChange={(v) => setZoom(v[0])}
                    className="[&_.relative]:bg-white/10 [&_.absolute]:bg-white [&_.absolute]:shadow-[0_0_10px_rgba(255,255,255,0.5)] [&_span]:border-white/50 [&_span]:shadow-lg"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom(z => Math.min(z + 0.1, 5))}
                  className="w-9 h-9 rounded-full hover:bg-white/10 text-white flex-shrink-0"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>

                <span className="text-[10px] font-medium font-mono text-white/80 w-8 lg:w-10 text-center select-none hidden sm:block">
                  {Math.round(zoom * 100)}%
                </span>
                
                <div className="w-px h-4 bg-white/10 mx-1" />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setZoom(1); setPan({x: 0, y: 0}); setIsPanToolActive(false); }}
                  className="w-9 h-9 rounded-full hover:bg-white/10 text-white flex-shrink-0"
                  title="Reset View"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
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
      />
      
      <ChatPanel 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        messages={chatMessages}
        setMessages={setChatMessages}
        currentPrompt={magicBrushPrompt}
        currentStyle=""
        currentImages={currentImage ? [{ url: currentImage.url || currentImage.preview, id: 'current' }] : []}
        onApplyPrompt={(text) => {
          setMagicBrushPrompt(text);
        }}
      />
    </div>
  );
}