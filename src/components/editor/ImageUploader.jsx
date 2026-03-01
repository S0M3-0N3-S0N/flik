import React, { useCallback, useState, useRef } from "react";
import { Upload, Image, FileType, HardDrive } from "lucide-react";
import { motion } from "framer-motion";

export default function ImageUploader({ onImageSelect, multiple = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = useCallback((file) => {
    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      alert('File exceeds 50MB limit');
      return;
    }
    
    const reader = new FileReader();
    reader.onerror = () => {
      console.error('File read error');
      alert('Failed to read file');
    };
    reader.onload = (e) => {
      onImageSelect({
        file,
        url: e.target.result,
        preview: e.target.result,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  }, [onImageSelect]);

  const processFiles = useCallback((files) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/') && f.size <= 50 * 1024 * 1024);
    
    // Check for duplicates
    const seen = new Set();
    const uniqueFiles = imageFiles.filter(f => {
      const key = `${f.name}-${f.size}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    if (imageFiles.length !== uniqueFiles.length) {
      alert('Some duplicate or oversized files were skipped');
    }
    
    const readers = uniqueFiles.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onerror = () => resolve(null);
      reader.onload = (e) => resolve({ file, url: e.target.result, preview: e.target.result, name: file.name });
      reader.readAsDataURL(file);
    }));
    Promise.all(readers).then(images => onImageSelect(images.filter(Boolean)));
  }, [onImageSelect]);

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
  }, [multiple, processFile, processFiles]);

  const handleFileInput = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (multiple) {
        processFiles(files);
      } else {
        processFile(files[0]);
      }
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  }, [multiple, processFile, processFiles]);

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
          rounded-3xl border-2 border-dashed overflow-hidden transition-all duration-300
          flex flex-col items-center justify-center gap-6
          ${isDragging 
            ? "border-[#FF6B35] bg-[#FF6B35]/15 shadow-lg shadow-[#FF6B35]/30" 
            : "border-white/15 hover:border-white/30 bg-gradient-to-br from-white/8 to-white/3 hover:shadow-lg hover:shadow-white/10"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
        />
        
        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
        
        {/* Icon with enhanced animation */}
        <motion.div 
          animate={{ 
            y: isDragging ? -15 : 0,
            scale: isDragging ? 1.1 : 1
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`
            w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-300
            ${isDragging 
              ? "bg-gradient-to-br from-[#FF6B35] to-[#F72C25] shadow-2xl shadow-[#FF6B35]/50" 
              : "bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10"
            }
          `}
        >
          <motion.div
            animate={{ rotate: isDragging ? 360 : 0 }}
            transition={{ duration: isDragging ? 0.6 : 0.3 }}
          >
            <Upload className={`w-10 h-10 transition-colors ${isDragging ? "text-white" : "text-white/70"}`} />
          </motion.div>
        </motion.div>
        
        {/* Main text with gradient */}
        <div className="text-center relative z-10">
          <motion.p 
            animate={{ scale: isDragging ? 1.05 : 1 }}
            className={`text-xl sm:text-2xl font-bold transition-colors ${isDragging ? "text-white gradient-text" : "text-white/95"}`}
          >
            {isDragging ? "Drop your image" : "Upload an Image"}
          </motion.p>
          <p className="text-sm text-white/50 mt-3">
            Drag & drop or{" "}
            <motion.button
              onClick={() => fileInputRef.current?.click()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-[#FF6B35] hover:text-[#FFB800] font-semibold inline underline transition-colors"
            >
              browse files
            </motion.button>
          </p>
        </div>
        
        {/* Specs section with icons */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row items-center gap-6 text-xs text-white/50 relative z-10"
        >
          <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-colors">
            <FileType className="w-4 h-4 text-[#FF6B35]" />
            <span>PNG, JPG, WEBP, GIF</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-colors">
            <HardDrive className="w-4 h-4 text-[#FFB800]" />
            <span>Up to 10MB</span>
          </div>
        </motion.div>
        
        {/* Gradient border effect on drag */}
        <motion.div 
          className="absolute inset-0 rounded-3xl pointer-events-none opacity-0"
          animate={{ opacity: isDragging ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          style={{
            background: "linear-gradient(135deg, rgba(255,107,53,0.3) 0%, rgba(247,44,37,0.2) 50%, rgba(255,184,0,0.2) 100%)"
          }}
        />
      </label>
    </motion.div>
  );
}