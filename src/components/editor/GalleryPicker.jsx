import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Loader2, Image as ImageIcon, AlertCircle, Check, Grid3x3, X } from "lucide-react";
import { toast } from "sonner";

export default function GalleryPicker({ isOpen, onClose, onSelect, onSelectMultiple }) {
  const [creations, setCreations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadCreations();
      setSelectedIds([]);
      setSearchTerm("");
      setImageErrors({});
    }
  }, [isOpen]);

  const loadCreations = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const results = await base44.entities.Creation.filter(
        { type: 'image', created_by: user.email },
        '-created_date',
        200
      );
      setCreations(results);
    } catch (error) {
      console.error("Error loading creations:", error);
      toast.error("Failed to load gallery");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (creation) => {
    const imageUrl = creation.thumbnail_url || creation.url;
    setSelectedIds(prev => {
      const isSelected = prev.includes(creation.id);
      if (isSelected) {
        return prev.filter(id => id !== creation.id);
      } else {
        return [...prev, creation.id];
      }
    });
  };

  const handleLoadSelected = () => {
    if (selectedIds.length === 0) return;
    
    const selectedCreations = creations.filter(c => selectedIds.includes(c.id));
    const images = selectedCreations.map(c => ({
      url: c.url,
      preview: c.thumbnail_url || c.url,
      name: c.title || 'gallery_image.png'
    }));
    
    if (selectedIds.length === 1) {
      onSelect(images[0]);
      toast.success("Image loaded from gallery");
    } else if (onSelectMultiple) {
      onSelectMultiple(images);
      toast.success(`${images.length} images loaded from gallery`);
    }
    setSelectedIds([]);
    onClose();
  };

  const handleImageError = (creationId) => {
    setImageErrors(prev => ({ ...prev, [creationId]: true }));
  };

  const filteredCreations = searchTerm.trim()
    ? creations.filter(c => 
        (c.title?.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (c.prompt?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : creations;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[96vw] h-[92vh] bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#0a0a0a] border-2 border-white/10 text-white flex flex-col shadow-2xl p-0 rounded-3xl overflow-hidden">
        <DialogHeader className="px-5 sm:px-7 pt-3 sm:pt-4 pb-3 border-b border-white/10 bg-gradient-to-r from-[#1a1a1a] via-[#0f0f0f] to-[#1a1a1a] flex-shrink-0 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B35]/5 via-transparent to-[#FFB800]/5" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-1">
              <div className="w-8" />
              <DialogTitle className="text-2xl sm:text-3xl font-bold gradient-text text-center">
                Gallery
              </DialogTitle>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Search by title or prompt..."
                className="bg-black/40 border-white/20 text-white text-sm focus-visible:ring-2 focus-visible:ring-[#FF6B35] placeholder:text-white/40 h-11 pl-4 pr-4 rounded-xl shadow-lg backdrop-blur-sm"
              />
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-[#FF6B35]/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[#FF6B35]/60 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-track]:rounded-full">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {loading ? (
              <>
                {Array.from({ length: 18 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-white/5 to-white/10 border border-white/10 shadow-lg"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B35]/10 via-transparent to-[#FFB800]/10 animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-3 border-white/20 border-t-[#FF6B35] rounded-full animate-spin" />
                    </div>
                  </div>
                ))}
              </>
            ) : filteredCreations.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center mb-5 border border-white/10 shadow-lg">
                  <ImageIcon className="w-12 h-12 text-white/20" />
                </div>
                <h3 className="text-lg font-semibold text-white/80 mb-2">
                  {searchTerm ? 'No Matching Images' : 'No Creations Yet'}
                </h3>
                <p className="text-sm text-white/40 mb-4">
                  {searchTerm ? 'Try a different search term' : 'Start creating amazing images to see them here'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="px-4 py-2 bg-gradient-to-r from-[#FF6B35] to-[#F72C25] hover:from-[#FF8B55] hover:to-[#FF4C45] text-white text-sm rounded-xl transition-all shadow-lg"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              filteredCreations.map((creation) => {
                const imageUrl = creation.thumbnail_url || creation.url;
                const isSelected = selectedIds.includes(creation.id);
                const hasError = imageErrors[creation.id];

                return (
                  <button
                    key={creation.id}
                    onClick={() => !hasError && toggleSelection(creation)}
                    disabled={hasError}
                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 group active:scale-95 bg-gradient-to-br from-black/40 to-black/60 focus:outline-none shadow-lg hover:shadow-2xl ${
                      isSelected 
                        ? 'border-[#FF6B35] shadow-[0_0_30px_rgba(255,107,53,0.5)] scale-105' 
                        : hasError
                        ? 'border-red-500/30 opacity-50 cursor-not-allowed'
                        : 'border-white/10 hover:border-[#FF6B35]/50 hover:scale-105'
                    }`}
                  >
                    {hasError ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-red-400">
                        <AlertCircle className="w-8 h-8" />
                        <span className="text-xs">Failed to load</span>
                      </div>
                    ) : (
                      <>
                        <img 
                          src={imageUrl}
                          alt={creation.title || 'Creation'}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                          onError={() => handleImageError(creation.id)}
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
                        <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/90 to-transparent">
                          <p className="text-xs text-white font-semibold truncate drop-shadow-lg">
                            {creation.title || 'Untitled'}
                          </p>
                          {creation.prompt && (
                            <p className="text-[10px] text-white/60 truncate mt-0.5">
                              {creation.prompt}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="px-5 sm:px-7 py-4 sm:py-5 border-t-2 border-white/10 bg-gradient-to-r from-[#1a1a1a] via-[#0f0f0f] to-[#1a1a1a] backdrop-blur-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 flex-shrink-0 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B35]/5 via-transparent to-[#FFB800]/5" />
            <div className="flex gap-2 sm:gap-3 relative z-10 ml-auto">
              <Button
                onClick={() => setSelectedIds([])}
                className="flex-1 sm:flex-none bg-white/10 border border-white/30 text-white hover:bg-white/20 hover:border-white/50 text-xs px-3 py-1.5 rounded-lg transition-all font-medium"
              >
                Clear
              </Button>
              <Button
                onClick={handleLoadSelected}
                className="flex-1 sm:flex-none bg-gradient-to-r from-[#FF6B35] to-[#F72C25] hover:from-[#FF8B55] hover:to-[#FF4C45] text-white text-xs px-4 py-1.5 rounded-lg shadow-xl hover:shadow-2xl transition-all font-semibold"
              >
                Load →
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}