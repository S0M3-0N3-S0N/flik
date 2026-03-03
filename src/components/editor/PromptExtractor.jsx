import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Loader2, Upload, Grid3x3, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function PromptExtractor({ onGalleryOpen, currentImage }) {
  const [selectedImages, setSelectedImages] = useState([]);
  const [extractedPrompt, setExtractedPrompt] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const fileInputRef = useRef(null);

  // Use currentImage from parent if available
  React.useEffect(() => {
    if (currentImage && selectedImages.length === 0) {
      setSelectedImages([{ url: currentImage.url, preview: currentImage.preview || currentImage.url }]);
    }
  }, [currentImage]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const imageFile = files.find(f => f.type.startsWith('image/'));
    if (!imageFile) {
      toast.error('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSelectedImages(prev => [...prev, { url: ev.target.result, preview: ev.target.result }]);
    };
    reader.readAsDataURL(imageFile);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGallerySelect = () => {
    onGalleryOpen((selectedImage) => {
      setSelectedImages(prev => [...prev, { url: selectedImage.url, preview: selectedImage.thumbnail_url || selectedImage.url }]);
    });
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleExtractPrompt = async () => {
    if (selectedImages.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }

    setIsExtracting(true);
    try {
      // Upload all images and get URLs
      const imageUrls = [];
      for (const img of selectedImages) {
        let imageUrl = img.url;
        
        // If image is a data URL (local preview), upload it first
        if (!imageUrl || imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
          const response = await fetch(img.preview || img.url);
          const blob = await response.blob();
          const file = new File([blob], `image_${Date.now()}.png`, { type: 'image/png' });
          const uploadResult = await base44.integrations.Core.UploadFile({ file });
          if (!uploadResult?.file_url) throw new Error('Failed to upload image');
          imageUrl = uploadResult.file_url;
        }
        imageUrls.push(imageUrl);
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze these images in detail and generate a comprehensive, descriptive text prompt that captures the combined scene, style, composition, mood, colors, and any notable elements. This prompt will be used to generate new images with a similar aesthetic and style. Make the prompt detailed, vivid, and suitable for an AI image generation model.`,
        file_urls: imageUrls,
      });

      if (response && typeof response === "string") {
        setExtractedPrompt(response);
        setShowPrompt(true);
        toast.success("Prompt extracted successfully!");
      } else {
        toast.error("Failed to extract prompt");
      }
    } catch (error) {
      console.error("Error extracting prompt:", error);
      toast.error("Error extracting prompt. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopyPrompt = () => {
    if (extractedPrompt) {
      navigator.clipboard.writeText(extractedPrompt);
      toast.success("Prompt copied to clipboard!");
    }
  };

  return (
    <div className="space-y-4">
      {!showPrompt ? (
        <>
          <p className="text-sm text-white/60">
            Extract a detailed text prompt from your image that captures style, composition, mood, and elements.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex-1 text-white border-white/30 hover:bg-white/10 bg-white/5"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
            <Button
              onClick={handleGallerySelect}
              variant="outline"
              className="flex-1 text-white border-white/30 hover:bg-white/10 bg-white/5"
            >
              <Grid3x3 className="w-4 h-4 mr-2" />
              Gallery
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
          {selectedImages.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {selectedImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                      <img
                        src={img.preview}
                        alt={`Selected ${idx + 1}`}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1 rounded bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleExtractPrompt}
                disabled={isExtracting}
                className="btn-gradient text-white w-full py-2"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Extracting...
                  </>
                ) : (
                  <>Extract Prompt</>
                )}
              </Button>
            </>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap break-words">
              {extractedPrompt}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCopyPrompt}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/30"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button
              onClick={() => {
                setShowPrompt(false);
                setSelectedImage(null);
              }}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/30"
            >
              Extract Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}