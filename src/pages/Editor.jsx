import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Undo2, Redo2, Settings2, Sparkles, Filter, Type, Crop, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import ImageUploader from "@/components/editor/ImageUploader";
import ToolPanel from "@/components/editor/ToolPanel";
import AdjustmentsPanel from "@/components/editor/AdjustmentsPanel";
import FiltersPanel from "@/components/editor/FiltersPanel";
import TransformPanel from "@/components/editor/TransformPanel";
import TextOverlay from "@/components/editor/TextOverlay";
import ProcessingOverlay from "@/components/editor/ProcessingOverlay";
import ResultModal from "@/components/editor/ResultModal";

export default function Editor() {
  const [currentImage, setCurrentImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Manual editing states
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
  const [textLayers, setTextLayers] = useState([]);
  
  const canvasRef = useRef(null);
  const [activeTab, setActiveTab] = useState("ai");

  const handleImageSelect = (image) => {
    setCurrentImage(image);
    if (image) {
      setHistory([{ image, adjustments: { ...adjustments }, filter: null, transform: { ...transform }, textLayers: [] }]);
      setHistoryIndex(0);
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
      setTextLayers([]);
    } else {
      setHistory([]);
      setHistoryIndex(-1);
    }
  };

  const handleToolSelect = async (tool) => {
    if (!currentImage) return;
    
    setActiveTool(tool);
    setIsProcessing(true);
    
    try {
      // First, render the current canvas state to get the edited image
      const editedImageUrl = await getCanvasImage();
      
      // Upload the edited image
      const blob = await fetch(editedImageUrl).then(r => r.blob());
      const file = new File([blob], "edited.png", { type: "image/png" });
      
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      // Generate enhanced image using AI
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `${tool.prompt}. Reference image provided - apply the enhancement while maintaining the original composition, subject, and overall structure.`,
        existing_image_urls: [uploadResult.file_url]
      });
      
      setResultImage(result.url);
      setShowResult(true);
    } catch (error) {
      console.error("Error processing image:", error);
    } finally {
      setIsProcessing(false);
      setActiveTool(null);
    }
  };

  const handleApplyResult = () => {
    if (resultImage) {
      const newImage = {
        url: resultImage,
        preview: resultImage,
        name: "enhanced_image.png"
      };
      setCurrentImage(newImage);
      
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({ 
        image: newImage, 
        adjustments: { ...adjustments }, 
        filter: selectedFilter,
        transform: { ...transform },
        textLayers: [...textLayers]
      });
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
    setShowResult(false);
    setResultImage(null);
  };

  const getCanvasImage = () => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        resolve(currentImage?.preview || currentImage?.url);
        return;
      }
      resolve(canvas.toDataURL("image/png"));
    });
  };

  const handleDownload = async () => {
    const imageUrl = await getCanvasImage();
    if (imageUrl) {
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = "flik_edited_image.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setCurrentImage(prevState.image);
      setAdjustments(prevState.adjustments);
      setSelectedFilter(prevState.filter);
      setTransform(prevState.transform);
      setTextLayers(prevState.textLayers);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setCurrentImage(nextState.image);
      setAdjustments(nextState.adjustments);
      setSelectedFilter(nextState.filter);
      setTransform(nextState.transform);
      setTextLayers(nextState.textLayers);
    }
  };

  const saveToHistory = () => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ 
      image: currentImage, 
      adjustments: { ...adjustments },
      filter: selectedFilter,
      transform: { ...transform },
      textLayers: [...textLayers]
    });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleAdjustmentChange = (newAdjustments) => {
    setAdjustments(newAdjustments);
  };

  const handleFilterSelect = (filter) => {
    setSelectedFilter(filter);
    saveToHistory();
  };

  const handleTransform = (type) => {
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
    saveToHistory();
  };

  const handleAddText = (textData) => {
    setTextLayers([...textLayers, { ...textData, id: Date.now() }]);
    saveToHistory();
  };

  // Render canvas with all effects
  useEffect(() => {
    if (!currentImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = currentImage.preview || currentImage.url;

    img.onload = () => {
      // Set canvas size based on rotation
      if (transform.rotate === 90 || transform.rotate === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply transforms
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((transform.rotate * Math.PI) / 180);
      ctx.scale(transform.flipH ? -1 : 1, transform.flipV ? -1 : 1);

      // Build filter string
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
      
      ctx.filter = filters.join(" ");

      // Draw image
      if (transform.rotate === 90 || transform.rotate === 270) {
        ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
      } else {
        ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
      }
      
      ctx.restore();

      // Draw text layers
      ctx.filter = "none";
      textLayers.forEach((layer) => {
        ctx.font = `${layer.fontSize}px ${layer.fontFamily}`;
        ctx.fillStyle = layer.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const x = (canvas.width * layer.x) / 100;
        const y = (canvas.height * layer.y) / 100;
        
        // Add stroke for better visibility
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 2;
        ctx.strokeText(layer.text, x, y);
        ctx.fillText(layer.text, x, y);
      });
    };
  }, [currentImage, adjustments, selectedFilter, transform, textLayers]);

  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar - Tools */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-80 border-r border-white/5 glass-card hidden lg:block overflow-y-auto"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-5 bg-white/5 m-4">
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
            <TabsTrigger value="text" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B35] data-[state=active]:to-[#FFB800]">
              <Type className="w-4 h-4" />
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

            <TabsContent value="text" className="mt-0">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Add Text</h3>
              {currentImage ? (
                <TextOverlay onAddText={handleAddText} />
              ) : (
                <p className="text-white/40 text-sm">Upload an image to start</p>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </motion.aside>
      
      {/* Main Canvas Area */}
      <main className="flex-1 flex flex-col">
        {/* Toolbar */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="h-14 border-b border-white/5 flex items-center justify-between px-6 glass-card"
        >
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              disabled={historyIndex <= 0}
              onClick={handleUndo}
              className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={historyIndex >= history.length - 1}
              onClick={handleRedo}
              className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              disabled={!currentImage}
              onClick={handleDownload}
              className="btn-gradient border-0 text-white text-sm disabled:opacity-30"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </motion.div>
        
        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden bg-[#0A0A0A]">
          {/* Grid background */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px"
            }}
          />
          
          {/* Gradient orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#FF6B35]/5 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#FFB800]/5 blur-[100px] pointer-events-none" />
          
          {currentImage ? (
            <div className="w-full h-full flex items-center justify-center p-8">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                style={{ display: 'block' }}
              />
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
      
      {/* Result Modal */}
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