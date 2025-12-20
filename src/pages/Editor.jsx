import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Undo2, Redo2, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import ImageUploader from "@/components/editor/ImageUploader";
import ToolPanel from "@/components/editor/ToolPanel";
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

  const handleImageSelect = (image) => {
    setCurrentImage(image);
    if (image) {
      setHistory([image]);
      setHistoryIndex(0);
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
      // Upload the current image first
      let imageUrl = currentImage.url;
      
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
      
      // Add to history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newImage);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
    setShowResult(false);
    setResultImage(null);
  };

  const handleDownload = async () => {
    const imageUrl = resultImage || currentImage?.url || currentImage?.preview;
    if (imageUrl) {
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = "flik_edited_image.png";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentImage(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentImage(history[historyIndex + 1]);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar - Tools */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-72 border-r border-white/5 glass-card hidden lg:block"
      >
        <ToolPanel 
          onToolSelect={handleToolSelect} 
          isProcessing={isProcessing}
          hasImage={!!currentImage}
        />
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
            <div className="w-px h-6 bg-white/10 mx-2" />
            <Button
              variant="ghost"
              size="icon"
              disabled={!currentImage}
              className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-white/40 w-12 text-center">100%</span>
            <Button
              variant="ghost"
              size="icon"
              disabled={!currentImage}
              className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              disabled={!currentImage}
              className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
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
          
          <ImageUploader 
            onImageSelect={handleImageSelect}
            currentImage={currentImage}
          />
          
          <AnimatePresence>
            {isProcessing && <ProcessingOverlay tool={activeTool} />}
          </AnimatePresence>
        </div>
        
        {/* Mobile Tools */}
        <div className="lg:hidden border-t border-white/5 p-4 glass-card overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            <ToolPanel 
              onToolSelect={handleToolSelect} 
              isProcessing={isProcessing}
              hasImage={!!currentImage}
            />
          </div>
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