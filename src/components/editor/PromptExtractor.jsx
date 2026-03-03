import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Loader2, Upload, Grid3x3 } from "lucide-react";
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
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error('Please select image files');
      return;
    }
    
    let loadedCount = 0;
    const newImages = [];
    imageFiles.forEach((imageFile, index) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        newImages[index] = { url: ev.target.result, preview: ev.target.result };
        loadedCount++;
        if (loadedCount === imageFiles.length) {
          setSelectedImages(prev => [...prev, ...newImages]);
          toast.success(`${imageFiles.length} image(s) added`);
        }
      };
      reader.readAsDataURL(imageFile);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGallerySelect = () => {
    onGalleryOpen((selectedImage) => {
      setSelectedImages(prev => [...prev, { url: selectedImage.url, preview: selectedImage.thumbnail_url || selectedImage.url }]);
    });
  };

  const handleExtractPrompt = async () => {
    if (selectedImages.length === 0) {
      toast.error("Please upload images first");
      return;
    }

    setIsExtracting(true);
    try {
      const uploadedUrls = [];
      
      for (const image of selectedImages) {
        let imageUrl = image.url;
        
        // If image is a data URL (local preview), upload it first
        if (!imageUrl || imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
          const response = await fetch(image.preview || image.url);
          const blob = await response.blob();
          const file = new File([blob], `image_${Date.now()}.png`, { type: 'image/png' });
          const uploadResult = await base44.integrations.Core.UploadFile({ file });
          if (!uploadResult?.file_url) throw new Error('Failed to upload image');
          imageUrl = uploadResult.file_url;
        }
        uploadedUrls.push(imageUrl);
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze these images in detail and generate comprehensive, descriptive text prompts that capture the scenes, styles, compositions, moods, colors, and notable elements. This prompt will be used to generate new images with similar aesthetics and styles. Make the prompts detailed, vivid, and suitable for an AI image generation model. Return one prompt per image.`,
        file_urls: uploadedUrls,
      });

      if (response && typeof response === "string") {
        setExtractedPrompt(response);
        setShowPrompt(true);
        toast.success(`Prompt(s) extracted successfully from ${selectedImages.length} image(s)!`);
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
                        alt="Selected"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <button
                      onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      ×
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
                  <>Extract Prompt{selectedImages.length > 1 && `s (${selectedImages.length})`}</>
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