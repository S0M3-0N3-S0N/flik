import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Copy, Check, Trash2, Image as ImageIcon, Edit, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "../../utils";

export default function ImageGrid({ 
  images, 
  onDelete, 
  onClearAll, 
  isGenerating, 
  stylePresets 
}) {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = React.useState(null);

  const handleCopyPrompt = (prompt, id) => {
    navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = async (imageUrl, imagePrompt) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `flik_${imagePrompt.slice(0, 30).replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      window.open(imageUrl, '_blank');
    }
  };

  if (images.length === 0 && !isGenerating) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-20"
      >
        <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
          <ImageIcon className="w-8 h-8 text-white/30" />
        </div>
        <p className="text-white/40 text-lg mb-2">Your generated images will appear here</p>
        <p className="text-white/30 text-sm">Enter a prompt above to create your first AI image</p>
      </motion.div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {images.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8 flex items-center justify-between"
        >
          <h2 className="text-xl font-semibold text-white">
            Your Creations ({images.length})
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </motion.div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {images.map((image, index) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              className="group relative aspect-square rounded-2xl overflow-hidden bg-[#1a1a1a] border border-white/10"
            >
              <img
                src={image.url}
                alt={image.prompt}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                <div className="absolute top-4 right-4">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDelete(image.id)}
                    className="bg-black/50 hover:bg-black/70 text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  {image.model === "gemini" && (
                    <div className="mb-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-[#FF6B35]/20 text-[#FF6B35] border border-[#FF6B35]/30 flex items-center gap-1 w-fit">
                        <Zap className="w-3 h-3" />
                        Gemini Enhanced
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-white/80 line-clamp-2 mb-2">
                    {image.prompt}
                  </p>
                  {image.enhancedPrompt && (
                    <p className="text-xs text-white/50 line-clamp-1 mb-3">
                      Enhanced: {image.enhancedPrompt}
                    </p>
                  )}
                  {image.style && (
                    <div className="mb-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/60">
                        {stylePresets.find(s => s.id === image.style)?.label}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => navigate(createPageUrl("Editor") + "?load=" + encodeURIComponent(image.url))}
                      className="flex-1 bg-[#FF6B35] hover:bg-[#FF8B55] text-white border-0"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDownload(image.url, image.prompt)}
                      className="bg-white/10 hover:bg-white/20 text-white border-0"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopyPrompt(image.prompt, image.id)}
                      className="text-white hover:bg-white/10"
                    >
                      {copiedId === image.id ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}