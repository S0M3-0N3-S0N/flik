import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function GalleryPicker({ isOpen, onClose, onSelect }) {
  const [creations, setCreations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCreations();
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

  const handleSelect = (creation) => {
    onSelect({
      url: creation.url,
      preview: creation.thumbnail_url || creation.url,
      name: creation.title || 'gallery_image.png'
    });
    onClose();
    toast.success("Image loaded from gallery");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-[#141414] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Select from Gallery</DialogTitle>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-4">
            {creations.map((creation) => (
              <button
                key={creation.id}
                onClick={() => handleSelect(creation)}
                className="group relative aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-[#FF6B35] transition-all hover:scale-105"
              >
                <img
                  src={creation.thumbnail_url || creation.url}
                  alt={creation.title || 'Creation'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                  <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                    Select
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}