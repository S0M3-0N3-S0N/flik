import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Undo2, Redo2, Settings2, Sparkles, Filter, Wand2, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import ImageUploader from "@/components/editor/ImageUploader";
import ToolPanel from "@/components/editor/ToolPanel";
import AdjustmentsPanel from "@/components/editor/AdjustmentsPanel";
import FiltersPanel from "@/components/editor/FiltersPanel";
import TransformPanel from "@/components/editor/TransformPanel";
import SpotRemoval from "@/components/editor/SpotRemoval";
import ProcessingOverlay from "@/components/editor/ProcessingOverlay";
import ResultModal from "@/components/editor/ResultModal";

export default function Editor() {
  const [currentImage, setCurrentImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [showResult, setShowResult] = useState(false);
  
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
  const [spots, setSpots] = useState([]);
  
  const imageContainerRef = useRef(null);
  const [activeTab, setActiveTab] = useState("ai");

  const handleImageSelect = (image) => {
    setCurrentImage(image);
    if (image) {
      // Reset all edits when new image is uploaded
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
      setSpots([]);
    }
  };

  const handleToolSelect = async (tool) => {
    if (!currentImage) return;
    
    setActiveTool(tool);
    setIsProcessing(true);
    
    try {
      // Get the current display image URL
      let imageUrl = currentImage.url || currentImage.preview;
      
      // If we have a file, upload it first
      if (currentImage.file) {
        const uploadResult = await base44.integrations.Core.UploadFile({
          file: currentImage.file
        });
        imageUrl = uploadResult.file_url;
      }
      
      // Generate enhanced image using AI
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
      const newImage = { 
        url: resultImage, 
        preview: resultImage, 
        name: "enhanced_image.png" 
      };
      setCurrentImage(newImage);
      
      // Reset adjustments after applying AI result
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
    }
    setShowResult(false);
    setResultImage(null);
  };

  const handleDownload = async () => {
    if (!currentImage) return;
    
    // Create a temporary canvas to render the final image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
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
      
      ctx.filter = filters.join(" ") || "none";

      if (transform.rotate === 90 || transform.rotate === 270) {
        ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
      } else {
        ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
      }
      
      ctx.restore();

      // Download
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
    setAdjustments(newAdjustments);
  };

  const handleFilterSelect = (filter) => {
    setSelectedFilter(filter);
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
  };

  const handleImageClick = (e) => {
    if (activeTab !== "remove" || !currentImage) return;
    
    const container = imageContainerRef.current;
    if (!container) return;
    
    const img = container.querySelector('img');
    if (!img) return;
    
    const rect = img.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100; // Percentage
    const y = ((e.clientY - rect.top) / rect.height) * 100; // Percentage
    
    setSpots([...spots, { x, y, id: Date.now() }]);
  };

  const handleRemoveSpots = async () => {
    if (spots.length === 0 || !currentImage) return;
    
    setIsProcessing(true);
    setActiveTool({ label: "Spot Removal" });
    
    try {
      // Get the current display image URL
      let imageUrl = currentImage.url || currentImage.preview;
      
      // If we have a file, upload it first
      if (currentImage.file) {
        const uploadResult = await base44.integrations.Core.UploadFile({
          file: currentImage.file
        });
        imageUrl = uploadResult.file_url;
      }
      
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `Remove unwanted spots, blemishes, and objects from this image at the marked locations. Clean up the image by intelligently filling in the removed areas to match the surrounding context. Maintain the original composition, colors, and quality. Make it look natural and seamless with no visible artifacts.`,
        existing_image_urls: [imageUrl]
      });
      
      setResultImage(result.url);
      setShowResult(true);
      setSpots([]);
    } catch (error) {
      console.error("Error removing spots:", error);
      alert("Error removing spots. Please try again.");
    } finally {
      setIsProcessing(false);
      setActiveTool(null);
    }
  };

  // Build CSS filter string for real-time preview
  const getFilterStyle = () => {
    const filters = [];
    
    if (adjustments.brightness !== 0) {
      filters.push(`brightness(${100 + adjustments.brightness}%)`);
    }
    if (adjustments.contrast !== 0) {
      filters.push(`contrast(${100 + adjustments.contrast}%)`);
    }
    if (adjustments.saturation !== 0) {
      filters.push(`saturate(${100 + adjustments.saturation}%)`);
    }
    if (adjustments.blur > 0) {
      filters.push(`blur(${adjustments.blur}px)`);
    }
    if (adjustments.hue !== 0) {
      filters.push(`hue-rotate(${adjustments.hue}deg)`);
    }
    if (adjustments.sepia > 0) {
      filters.push(`sepia(${adjustments.sepia}%)`);
    }
    if (adjustments.grayscale > 0) {
      filters.push(`grayscale(${adjustments.grayscale}%)`);
    }
    
    if (selectedFilter && selectedFilter.id !== "none") {
      filters.push(selectedFilter.filter);
    }
    
    return filters.length > 0 ? filters.join(" ") : "none";
  };

  // Build transform style
  const getTransformStyle = () => {
    const transforms = [];
    
    if (transform.rotate !== 0) {
      transforms.push(`rotate(${transform.rotate}deg)`);
    }
    if (transform.flipH) {
      transforms.push(`scaleX(-1)`);
    }
    if (transform.flipV) {
      transforms.push(`scaleY(-1)`);
    }
    
    return transforms.length > 0 ? transforms.join(" ") : "none";
  };

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
            <TabsTrigger value="remove" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B35] data-[state=active]:to-[#FFB800]">
              <Wand2 className="w-4 h-4" />
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

            <TabsContent value="remove" className="mt-0">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Magic Wand</h3>
              {currentImage ? (
                <>
                  <SpotRemoval 
                    onRemoveSpot={handleRemoveSpots}
                    isProcessing={isProcessing}
                  />
                  {spots.length > 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-[#FF6B35]/10 border border-[#FF6B35]/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/80">{spots.length} spot(s) marked</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSpots([])}
                          className="text-white/60 hover:text-white h-7 px-2"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Clear
                        </Button>
                      </div>
                    </div>
                  )}
                </>
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
            {activeTab === "remove" && currentImage && (
              <div className="text-sm text-white/60 bg-white/5 px-3 py-1 rounded-lg flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" />
                Click on image to mark spots
              </div>
            )}
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
            <div 
              ref={imageContainerRef}
              className="w-full h-full flex items-center justify-center p-8"
              onClick={handleImageClick}
            >
              <div className="relative max-w-full max-h-full">
                <img
                  src={currentImage.preview || currentImage.url}
                  alt="Editor"
                  className={`max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl transition-all duration-200 ${
                    activeTab === "remove" ? "cursor-crosshair" : ""
                  }`}
                  style={{
                    filter: getFilterStyle(),
                    transform: getTransformStyle(),
                  }}
                />
                
                {/* Spot markers overlay */}
                {activeTab === "remove" && spots.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none">
                    {spots.map((spot) => (
                      <div
                        key={spot.id}
                        className="absolute w-10 h-10 rounded-full border-4 border-[#FF6B35] bg-[#FF6B35]/30 animate-pulse"
                        style={{
                          left: `${spot.x}%`,
                          top: `${spot.y}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      />
                    ))}
                  </div>
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