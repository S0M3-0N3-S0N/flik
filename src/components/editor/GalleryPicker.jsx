import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function GalleryPicker({ isOpen, onClose, onSelect, onSelectMultiple }) {
  const [creations, setCreations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadCreations();
    }
  }, [isOpen]);

  const loadCreations = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const results = await base44.entities.Creation.filter(
        { type: 'image', created_by: user.email },
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

  const handleSelect = (creation) => {
    toggleSelection(creation.id);
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-[#141414] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            <span>Select from Gallery</span>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/60">{selectedIds.length} selected</span>
                <Button
                  onClick={handleLoadSelected}
                  className="bg-gradient-to-r from-[#FF6B35] to-[#F72C25] text-white hover:opacity-90"
                  size="sm"
                >
                  Load Selected
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        
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
          <>
            <p className="text-xs text-white/40 mb-2">
              Click images to select, then click "Load Selected"
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-4 max-h-[50vh] overflow-y-auto">
              {creations.map((creation) => (
                <button
                  key={creation.id}
                  onClick={() => handleSelect(creation)}
                  className={`group relative aspect-square rounded-lg overflow-hidden border transition-all hover:scale-105 ${
                    selectedIds.includes(creation.id)
                      ? 'border-[#FF6B35] ring-2 ring-[#FF6B35]/50'
                      : 'border-white/10 hover:border-[#FF6B35]'
                  }`}
                >
                  <img
                    src={creation.thumbnail_url || creation.url}
                    alt={creation.title || 'Creation'}
                    className="w-full h-full object-cover"
                  />
                  {selectedIds.includes(creation.id) && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-[#FF6B35] rounded-full flex items-center justify-center text-white text-xs font-bold">
                      ✓
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                      {selectedIds.includes(creation.id) ? 'Selected' : 'Select'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}