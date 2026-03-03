import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Instagram, Share2, Camera, Images } from "lucide-react";

export default function ExportModal({ isOpen, onClose, onDownload, imageUrl }) {
  if (!isOpen) return null;

  const handleSaveToCameraRoll = async () => {
    await onDownload();
    onClose();
  };

  const handleInstagramStories = () => {
    // Download then open Instagram
    onDownload();
    setTimeout(() => {
      window.open("instagram://story-camera", "_blank");
    }, 500);
    onClose();
  };

  const handleShare = async () => {
    if (navigator.share && imageUrl) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], "flik_creation.png", { type: "image/png" });
        await navigator.share({
          title: "My FLIK Creation",
          files: [file],
        });
      } catch (e) {
        // Fallback to download if share fails
        await onDownload();
      }
    } else {
      await onDownload();
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[101] md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-sm md:w-full"
          >
            <div className="bg-[#1a1a1a] rounded-t-3xl md:rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
              style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10">
                <h3 className="text-white font-semibold text-lg">Save</h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Options */}
              <div className="divide-y divide-white/5">
                <button
                  onClick={handleSaveToCameraRoll}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#F72C25] flex items-center justify-center flex-shrink-0">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-medium">Save to Camera Roll</span>
                </button>

                <button
                  onClick={handleInstagramStories}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] flex items-center justify-center flex-shrink-0">
                    <Instagram className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-medium">Instagram Stories</span>
                </button>

                <button
                  onClick={handleShare}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFB800] to-[#FF6B35] flex items-center justify-center flex-shrink-0">
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-medium">Share</span>
                </button>
              </div>

              {/* Footer note */}
              <div className="px-6 pt-4 pb-1 text-center">
                <p className="text-white/40 text-xs leading-relaxed">
                  Tag us <span className="text-[#FF6B35] font-medium">@flik_app</span> in your stories or posts!<br />
                  The best works will be featured
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}