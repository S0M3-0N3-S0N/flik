import React, { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageIcon, Loader2, AlertCircle, Check } from "lucide-react";
import { motion } from "framer-motion";

const GalleryPicker = React.memo(function GalleryPicker({
  isOpen,
  onClose,
  galleryCreations,
  isLoadingGallery,
  isLoadingMore,
  galleryHasMore,
  selectedGalleryImages,
  gallerySearchTerm,
  onToggleSelection,
  onLoadMore,
  onConfirm,
  onSearchChange,
  imageErrors,
  onImageError,
  displayedCount
}) {
  const filteredGalleryCreations = useMemo(() => {
    if (!gallerySearchTerm.trim()) return galleryCreations;
    const term = gallerySearchTerm.toLowerCase();
    return galleryCreations.filter(c => 
      (c.title?.toLowerCase().includes(term)) || 
      (c.prompt?.toLowerCase().includes(term))
    );
  }, [galleryCreations, gallerySearchTerm]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[96vw] h-[92vh] bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#0a0a0a] border-2 border-white/10 text-white flex flex-col shadow-2xl p-0 rounded-3xl overflow-hidden">
        <DialogHeader className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-white/10 bg-gradient-to-r from-[#1a1a1a] via-[#0f0f0f] to-[#1a1a1a] flex-shrink-0 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B35]/5 via-transparent to-[#FFB800]/5" />
          <div className="relative z-10">
            <DialogTitle className="text-2xl sm:text-3xl font-bold flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#F72C25] p-[2px]">
                <div className="w-full h-full rounded-[10px] bg-[#0a0a0a] flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-[#FF6B35]" />
                </div>
              </div>
              Gallery Picker
            </DialogTitle>
            <p className="text-sm text-white/60 mb-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FF6B35]/10 border border-[#FF6B35]/20 text-[#FF6B35] text-xs font-medium">
                <ImageIcon className="w-3.5 h-3.5" />
                {filteredGalleryCreations.length} image{filteredGalleryCreations.length !== 1 ? 's' : ''}
              </span>
              {selectedGalleryImages.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium animate-pulse">
                  ✓ {selectedGalleryImages.length} selected
                </span>
              )}
            </p>
            <div className="relative">
              <Input
                value={gallerySearchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="🔍 Search by title or prompt..."
                className="bg-black/40 border-white/20 text-white text-sm focus-visible:ring-2 focus-visible:ring-[#FF6B35] placeholder:text-white/40 h-11 pl-4 pr-4 rounded-xl shadow-lg backdrop-blur-sm"
              />
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-[#FF6B35]/40 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {isLoadingGallery ? (
              <>
                {Array.from({ length: 18 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-white/5 to-white/10 border border-white/10 shadow-lg animate-pulse"
                  />
                ))}
              </>
            ) : filteredGalleryCreations.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center mb-5 border border-white/10">
                  <ImageIcon className="w-12 h-12 text-white/20" />
                </div>
                <h3 className="text-lg font-semibold text-white/80 mb-2">
                  {gallerySearchTerm ? 'No Matching Images' : 'No Creations Yet'}
                </h3>
                <p className="text-sm text-white/40 mb-4">
                  {gallerySearchTerm ? 'Try a different search term' : 'Start creating amazing images to see them here'}
                </p>
                {gallerySearchTerm && (
                  <button
                    onClick={() => onSearchChange("")}
                    className="px-4 py-2 bg-gradient-to-r from-[#FF6B35] to-[#F72C25] hover:from-[#FF8B55] hover:to-[#FF4C45] text-white text-sm rounded-xl transition-all shadow-lg"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <>
                {filteredGalleryCreations.map((creation) => {
                  const imageUrl = creation.thumbnail_url || creation.url;
                  const isSelected = selectedGalleryImages.some(img => img.url === imageUrl);
                  const hasError = imageErrors[creation.id];

                  return (
                    <motion.button
                      key={creation.id}
                      onClick={() => !hasError && onToggleSelection(creation)}
                      disabled={hasError}
                      className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 group active:scale-95 bg-gradient-to-br from-black/40 to-black/60 focus:outline-none shadow-lg hover:shadow-2xl ${
                        isSelected 
                          ? 'border-[#FF6B35] shadow-[0_0_30px_rgba(255,107,53,0.5)] scale-105' 
                          : hasError
                          ? 'border-red-500/30 opacity-50 cursor-not-allowed'
                          : 'border-white/10 hover:border-[#FF6B35]/50 hover:scale-105'
                      }`}
                      whileHover={!hasError ? { scale: 1.05 } : {}}
                      whileTap={!hasError ? { scale: 0.95 } : {}}
                    >
                      {hasError ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-red-400">
                          <AlertCircle className="w-8 h-8" />
                          <span className="text-xs">Failed</span>
                        </div>
                      ) : (
                        <>
                          <img 
                            src={imageUrl}
                            alt={creation.title || 'Creation'}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                            decoding="async"
                            onError={() => onImageError(creation.id)}
                          />
                          <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 ${
                            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`} />
                          <div className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-300 shadow-lg ${
                            isSelected 
                              ? 'bg-[#FF6B35] opacity-100 scale-100 ring-2 ring-white/30' 
                              : 'bg-white/20 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100'
                          }`}>
                            <Check className="w-4 h-4 text-white font-bold" />
                          </div>
                        </>
                      )}
                    </motion.button>
                  );
                })}
              </>
            )}
          </div>

          {galleryHasMore && (
            <div className="flex justify-center py-6">
              <Button
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="bg-gradient-to-r from-[#FF6B35] to-[#F72C25] hover:from-[#FF8B55] hover:to-[#FF4C45] text-white px-8 py-3 rounded-xl text-sm font-semibold shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Load More Images
                    <span className="ml-2 opacity-70">↓</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {selectedGalleryImages.length > 0 && (
          <div className="px-5 sm:px-7 py-4 sm:py-5 border-t-2 border-white/10 bg-gradient-to-r from-[#1a1a1a] via-[#0f0f0f] to-[#1a1a1a] backdrop-blur-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 flex-shrink-0 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B35]/5 via-transparent to-[#FFB800]/5" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">
                  {selectedGalleryImages.length} Image{selectedGalleryImages.length !== 1 ? 's' : ''} Selected
                </p>
                <p className="text-white/50 text-xs">Ready to add to conversation</p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3 relative z-10">
              <Button
                variant="outline"
                onClick={() => {
                  // Clear all selected images properly
                  onSearchChange("");
                }}
                className="flex-1 sm:flex-none border-white/20 text-white hover:bg-white/10 hover:border-white/40 text-sm px-6 py-2.5 rounded-xl transition-all"
              >
                Clear
              </Button>
              <Button
                onClick={onConfirm}
                className="flex-1 sm:flex-none bg-gradient-to-r from-[#FF6B35] to-[#F72C25] hover:from-[#FF8B55] hover:to-[#FF4C45] text-white text-sm px-8 py-2.5 rounded-xl shadow-xl hover:shadow-2xl transition-all font-semibold"
              >
                Add to Chat →
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});

export default GalleryPicker;