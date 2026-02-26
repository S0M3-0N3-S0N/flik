import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function GalleryPicker({ isOpen, onClose, onSelect }) {
  const [creations, setCreations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadCreations();
      setSelectedIds([]);
    }
  }, [isOpen]);

  const loadCreations = async () => {
    setLoading(true);
    try {
      const results = await base44.entities.Creation.filter(
        { type: 'image' },
        '-created_date',
        50
      );
      setCreations(results);
    } catch (error) {
      console.error("Error loading creations:", error);
      toast.error("Failed to load gallery");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (creationId) => {
    setSelectedIds(prev => 
      prev.includes(creationId) 
        ? prev.filter(id => id !== creationId)
        : [...prev, creationId]
    );
  };

  const handleConfirm = () => {
    const selectedCreations = creations.filter(c => selectedIds.includes(c.id));
    const images = selectedCreations.map(creation => ({
      url: creation.url,
      preview: creation.thumbnail_url || creation.url,
      name: creation.title || 'gallery_image.png'
    }));
    
    onSelect(images);
    onClose();
    toast.success(`${images.length} image${images.length > 1 ? 's' : ''} loaded from gallery`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-[#141414] border-white/10 flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            <span>Select from Gallery</span>
            {selectedIds.length > 0 && (
              <span className="text-sm text-[#FF6B35]">{selectedIds.length} selected</span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF6B35]" />
            </div>
          ) : creations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/60">
              <ImageIcon className="w-12 h-12 mb-4 opacity-40" />
              <p>No images in your gallery yet</p>
              <p className="text-sm mt-2">Create some images first to see them here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-4">
              {creations.map((creation) => {
                const isSelected = selectedIds.includes(creation.id);
                return (
                  <button
                    key={creation.id}
                    onClick={() => toggleSelection(creation.id)}
                    className={`group relative aspect-square rounded-lg overflow-hidden border transition-all ${
                      isSelected
                        ? 'border-[#FF6B35] ring-2 ring-[#FF6B35]/50'
                        : 'border-white/10 hover:border-[#FF6B35]'
                    }`}
                  >
                    <img
                      src={creation.thumbnail_url || creation.url}
                      alt={creation.title || 'Creation'}
                      className="w-full h-full object-cover"
                    />
                    <div className={`absolute inset-0 transition-all flex items-center justify-center ${
                      isSelected ? 'bg-[#FF6B35]/20' : 'bg-black/0 group-hover:bg-black/40'
                    }`}>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-[#FF6B35] border-[#FF6B35] scale-100'
                          : 'border-white opacity-0 group-hover:opacity-100 scale-75'
                      }`}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => setSelectedIds([])}
              className="bg-transparent border-white/20 text-white hover:bg-white/10"
            >
              Clear Selection
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-gradient-to-br from-[#FF6B35] to-[#F72C25] hover:from-[#FF8B55] hover:to-[#FF4C45] text-white"
            >
              Add {selectedIds.length} Layer{selectedIds.length > 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}