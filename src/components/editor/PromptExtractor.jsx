import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Loader2, Upload, Grid3x3 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function PromptExtractor({ onGalleryOpen, currentImage, onExtracted }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [extractedPrompt, setExtractedPrompt] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const fileInputRef = useRef(null);

  // Use currentImage from parent if available
  React.useEffect(() => {
    if (currentImage && !selectedImage) {
      setSelectedImage({ url: currentImage.url, preview: currentImage.preview || currentImage.url });
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
      setSelectedImage({ url: ev.target.result, preview: ev.target.result });
    };
    reader.readAsDataURL(imageFile);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGallerySelect = () => {
    onGalleryOpen((selectedImage) => {
      setSelectedImage({ url: selectedImage.url, preview: selectedImage.thumbnail_url || selectedImage.url });
    });
  };

  const handleExtractPrompt = async () => {
    if (!selectedImage) {
      toast.error("Please upload an image first");
      return;
    }

    setIsExtracting(true);
    try {
      let imageUrl = selectedImage.url;
      
      // If image is a data URL (local preview), upload it first
      if (!imageUrl || imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
        const response = await fetch(selectedImage.preview || selectedImage.url);
        const blob = await response.blob();
        const file = new File([blob], `image_${Date.now()}.png`, { type: 'image/png' });
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        if (!uploadResult?.file_url) throw new Error('Failed to upload image');
        imageUrl = uploadResult.file_url;
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this image with extreme detail and generate a highly accurate, comprehensive text prompt that will enable AI image generation to recreate a similar image. Include:
1. Main subject(s) and their characteristics (size, position, detail)
2. Setting/environment and background elements
3. Artistic style and medium (photography, painting, digital art, etc.)
4. Lighting quality, direction, and intensity
5. Color palette and dominant colors
6. Mood, atmosphere, and emotional tone
7. Camera angle, perspective, and composition
8. Any distinctive features, patterns, or textures
9. Time of day/season if applicable
10. Technical aspects (depth of field, focus, resolution feel)

Be specific and precise. Use descriptive adjectives. Avoid vague terms. The prompt should be detailed enough for an AI to understand and recreate the exact visual style and subject matter.`,
        file_urls: [imageUrl],
      });

      if (response && typeof response === "string") {
        setExtractedPrompt(response);
        setShowPrompt(true);
        toast.success("Prompt extracted successfully!");
        if (onExtracted) {
          onExtracted(response);
        }
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
          {selectedImage && (
            <>
              <div className="relative w-full h-32 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                <img
                  src={selectedImage.preview}
                  alt="Selected"
                  className="max-w-full max-h-full object-contain"
                />
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
          <textarea
            value={extractedPrompt}
            onChange={(e) => setExtractedPrompt(e.target.value)}
            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/30 resize-none"
            rows={5}
          />
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
                if (onExtracted) {
                  onExtracted(extractedPrompt);
                }
              }}
              className="flex-1 btn-gradient text-white"
            >
              Use This
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