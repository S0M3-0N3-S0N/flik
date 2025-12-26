import React, { useCallback, useState } from "react";
import { Upload, Image, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ImageUploader({ onImageSelect, currentImage, multiple = false }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith("image/"));
    
    if (files.length > 0) {
      if (multiple) {
        processFiles(files);
      } else {
        processFile(files[0]);
      }
    }
  }, [multiple]);

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      if (multiple) {
        processFiles(files);
      } else {
        processFile(files[0]);
      }
    }
  };

  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      onImageSelect({
        file,
        preview: e.target.result,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const processFiles = (files) => {
    // For multiple files, we might need to handle them differently depending on parent expectation
    // If parent expects array, we should pass array.
    // However, onImageSelect usually expects a single object in the legacy code.
    // If multiple=true, we assume onImageSelect handles array OR we pass them one by one?
    // Let's assume onImageSelect handles an array if multiple is true.
    onImageSelect(files);
  };

  if (currentImage) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full h-full flex items-center justify-center p-8"
      >
        <div className="relative max-w-full max-h-full">
          <img 
            src={currentImage.preview || currentImage.url} 
            alt="Uploaded" 
            className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl"
          />
          <button
            onClick={() => onImageSelect(null)}
            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full flex items-center justify-center p-4 sm:p-8"
    >
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative w-full max-w-2xl aspect-square sm:aspect-video cursor-pointer
          rounded-2xl sm:rounded-3xl border-2 border-dashed transition-all duration-300
          flex flex-col items-center justify-center gap-4 sm:gap-6
          ${isDragging 
            ? "border-[#FF6B35] bg-[#FF6B35]/10" 
            : "border-white/20 hover:border-white/40 bg-white/5"
          }
        `}
      >
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
        />
        
        <motion.div 
          animate={{ y: isDragging ? -10 : 0 }}
          className={`
            w-20 h-20 rounded-2xl flex items-center justify-center
            ${isDragging ? "btn-gradient" : "bg-white/10"}
          `}
        >
          <Upload className={`w-8 h-8 ${isDragging ? "text-white" : "text-white/60"}`} />
        </motion.div>
        
        <div className="text-center">
          <p className="text-lg font-medium text-white/90">
            {isDragging ? "Drop your image here" : "Drag & drop an image"}
          </p>
          <p className="text-sm text-white/50 mt-2">
            or click to browse from your device
          </p>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-white/40">
          <span className="flex items-center gap-1">
            <Image className="w-3 h-3" />
            PNG, JPG, WEBP
          </span>
          <span>Up to 10MB</span>
        </div>
        
        {/* Gradient border effect */}
        <div className="absolute inset-0 rounded-3xl opacity-50 pointer-events-none"
          style={{
            background: isDragging 
              ? "linear-gradient(135deg, rgba(255,107,53,0.2) 0%, rgba(247,44,37,0.2) 50%, rgba(255,184,0,0.2) 100%)"
              : "transparent"
          }}
        />
      </label>
    </motion.div>
  );
}