import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Settings2, Sparkles, Filter, Wand2, RotateCw, X, Crop as CropIcon, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function Editor() {
  const [currentImage, setCurrentImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [resultImage, setResultImage] = useState(null);
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
  
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragType, setDragType] = useState(null);
  const [batchImages, setBatchImages] = useState([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [activeTab, setActiveTab] = useState("ai");
  const [undoHistory, setUndoHistory] = useState([]);

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
    }));
    setBatchImages(images);
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

  const handleToolSelect = async (tool) => {
    if (!currentImage) return;
    
    setActiveTool(tool);
    setIsProcessing(true);
    
    try {
      let imageUrl = currentImage.url || currentImage.preview;
      
      if (currentImage.file) {
        const uploadResult = await base44.integrations.Core.UploadFile({
          file: currentImage.file
        });
        imageUrl = uploadResult.file_url;
      }
      
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
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
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

  const handleTransform = (type) => {
    setUndoHistory([...undoHistory, { image: currentImage, adjustments, filter: selectedFilter, transform }]);
    const newTransform = { ...transform };
    switch (type) {
      case "rotate-right":
        newTransform.rotate = (newTransform.rotate + 90) % 360;
        break;
      case "rotate-left":
        newTransform.rotate = (newTransform.rotate - 90 + 360) % 360;
        break;
      case "flip-horizontal":
        newTransform.flipH = !newTransform.flipH;
        break;
      case "flip-vertical":
        newTransform.flipV = !newTransform.flipV;
        break;
    }
    setTransform(newTransform);
  };

  const getRelativePosition = (e) => {
    if (!imageRef.current) return null;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return null;
    return { x, y };
  };

  const handleMouseDown = (e) => {
    if (activeTab === "remove" && currentImage) {
      const pos = getRelativePosition(e);
      if (pos) {
        setIsDrawing(true);
        setBrushStrokes([...brushStrokes, [pos]]);
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
    if (activeTab === "remove" && isDrawing && currentImage) {
      const pos = getRelativePosition(e);
      if (pos && brushStrokes.length > 0) {
        const newStrokes = [...brushStrokes];
        newStrokes[newStrokes.length - 1].push(pos);
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
    setDragType(null);
  };

  const handleRemoveSpots = async () => {
    if (brushStrokes.length === 0 || !currentImage) return;
    
    setIsProcessing(true);
    setActiveTool({ label: "Spot Removal" });
    
    try {
      let imageUrl = currentImage.url || currentImage.preview;
      
      if (currentImage.file) {
        const uploadResult = await base44.integrations.Core.UploadFile({
          file: currentImage.file
        });
        imageUrl = uploadResult.file_url;
      }
      
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `Remove unwanted spots, blemishes, and objects from this image at the marked painted areas. Clean up the image by intelligently filling in the removed areas to match the surrounding context. Maintain the original composition, colors, and quality. Make it look natural and seamless with no visible artifacts.`,
        existing_image_urls: [imageUrl]
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
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = currentImage.preview || currentImage.url;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const cropX = Math.max(0, Math.min((cropArea.x / 100) * img.width, img.width - 10));
      const cropY = Math.max(0, Math.min((cropArea.y / 100) * img.height, img.height - 10));
      const cropWidth = Math.min((cropArea.width / 100) * img.width, img.width - cropX);
      const cropHeight = Math.min((cropArea.height / 100) * img.height, img.height - cropY);

      canvas.width = cropWidth;
      canvas.height = cropHeight;

      ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        setCurrentImage({
          url: url,
          preview: url,
          name: "cropped_image.png"
        });
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
    
    ctx.strokeStyle = `rgba(255, 107, 53, ${brushOpacity})`;
    ctx.fillStyle = `rgba(255, 107, 53, ${brushOpacity})`;
    ctx.lineWidth = brushSize / 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    brushStrokes.forEach(stroke => {
      if (stroke.length === 0) return;
      
      if (stroke.length === 1) {
        ctx.beginPath();
        ctx.arc((stroke[0].x / 100) * canvas.width, (stroke[0].y / 100) * canvas.height, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo((stroke[0].x / 100) * canvas.width, (stroke[0].y / 100) * canvas.height);
        
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo((stroke[i].x / 100) * canvas.width, (stroke[i].y / 100) * canvas.height);
        }
        
        ctx.stroke();
      }
    });
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
    <div className="min-h-screen flex">
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-80 border-r border-white/5 glass-card hidden lg:block overflow-y-auto"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-7 bg-white/5 m-4">
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
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">AI Tools</h3>
              <ToolPanel 
                onToolSelect={handleToolSelect} 
                isProcessing={isProcessing}
                hasImage={!!currentImage}
              />
            </TabsContent>

            <TabsContent value="batch" className="mt-0">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Batch Processing</h3>

              <label className="block cursor-pointer mb-4">
                <div className="border-2 border-dashed border-white/20 rounded-xl p-6 hover:border-white/40 transition-colors">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Layers className="w-8 h-8 text-[#FF6B35]" />
                    <div>
                      <p className="text-sm font-medium text-white">Upload Multiple Images</p>
                      <p className="text-xs text-white/50 mt-1">Process many images at once</p>
                    </div>
                  </div>
                </div>
                <input type="file" accept="image/*" multiple onChange={handleBatchUpload} className="hidden" />
              </label>

              {batchImages.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-white/70">{batchImages.length} images selected</p>
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                    {batchImages.map(img => (
                      <img key={img.id} src={img.preview} className="w-full h-20 object-cover rounded" />
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-white/60">Apply to all:</p>
                    {[
                      { label: "AI Enhance", prompt: "Enhance this image with better colors, improved clarity, professional quality" },
                      { label: "Upscale 4x", prompt: "Upscale to higher resolution, enhance details" },
                      { label: "Fix Lighting", prompt: "Fix lighting and exposure, balance highlights and shadows" },
                    ].map(tool => (
                      <Button
                        key={tool.label}
                        onClick={() => handleBatchProcess(tool)}
                        disabled={isBatchProcessing}
                        className="w-full btn-gradient text-white"
                      >
                        {isBatchProcessing ? `Processing ${batchProgress}%` : tool.label}
                      </Button>
                    ))}
                    {isBatchProcessing && (
                      <Button
                        onClick={() => setBatchCancelled(true)}
                        variant="outline"
                        className="w-full border-white/20 text-white hover:bg-white/10"
                      >
                        Cancel Processing
                      </Button>
                    )}
                  </div>
                </div>
              )}
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
                            className="text-white/60 hover:text-white h-7 px-2"
                            title="Undo last stroke"
                          >
                            <RotateCw className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setBrushStrokes([])}
                            className="text-white/60 hover:text-white h-7 px-2"
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
      
      <main className="flex-1 flex flex-col">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="h-14 border-b border-white/5 flex items-center justify-between px-6 glass-card"
        >
          <div className="flex items-center gap-2">
            {activeTab === "remove" && currentImage && (
              <div className="text-sm text-white/60 bg-white/5 px-3 py-1 rounded-lg flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" />
                Drag to paint areas to remove
              </div>
            )}
            {activeTab === "crop" && isCropping && (
              <div className="text-sm text-white/60 bg-white/5 px-3 py-1 rounded-lg flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" />
                Drag corners to resize, center to move
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {undoHistory.length > 0 && (
              <Button
                onClick={handleUndo}
                variant="ghost"
                className="text-white hover:bg-white/10"
                title="Undo (Ctrl+Z)"
              >
                <RotateCw className="w-4 h-4 mr-2" />
                Undo
              </Button>
            )}
            {redoHistory.length > 0 && (
              <Button
                onClick={handleRedo}
                variant="ghost"
                className="text-white hover:bg-white/10"
                title="Redo (Ctrl+Shift+Z)"
              >
                <RotateCw className="w-4 h-4 mr-2 scale-x-[-1]" />
                Redo
              </Button>
            )}
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
                <Sparkles className="w-4 h-4 mr-2" />
                Save
              </Button>
            )}
            <Button
              disabled={!currentImage}
              onClick={handleDownload}
              className="btn-gradient text-white text-sm disabled:opacity-30"
              title="Download (Ctrl+S)"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </motion.div>
        
        <div 
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-[#0A0A0A]"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
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
            <div className="w-full h-full flex items-center justify-center p-8">
              <div className="relative">
                <img
                  ref={imageRef}
                  src={currentImage.preview || currentImage.url}
                  alt="Editor"
                  className={`max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl ${
                    activeTab === "remove" ? "cursor-crosshair" : activeTab === "crop" && isCropping ? "cursor-move" : ""
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
                    className="absolute top-0 left-0 pointer-events-none rounded-2xl"
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
                      <div className="absolute -top-2 -left-2 w-4 h-4 bg-[#FF6B35] rounded-full cursor-nw-resize" />
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-[#FF6B35] rounded-full cursor-ne-resize" />
                      <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-[#FF6B35] rounded-full cursor-sw-resize" />
                      <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-[#FF6B35] rounded-full cursor-se-resize" />
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
        </div>
      </main>
      
      <ResultModal
        isOpen={showResult}
        onClose={() => setShowResult(false)}
        originalImage={currentImage}
        resultImage={resultImage}
        onApply={handleApplyResult}
        onDownload={handleDownload}
      />
    </div>
  );
}