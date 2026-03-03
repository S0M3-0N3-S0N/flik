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
    if (onGalleryOpen) {
      onGalleryOpen((selection) => {
        if (selection && selection.url) {
          setSelectedImage({ url: selection.url, preview: selection.thumbnail_url || selection.url });
        }
      });
    }
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
        prompt: `You are an expert prompt engineer for AI image generation. Analyze this image deeply and generate a highly detailed, flowing text prompt optimized for AI image generation models.

Break down the image into these elements:
1. Main subject/object (with precise descriptors)
2. Setting/environment (location, atmosphere, time period if applicable)
3. Visual style (art style, photography style, illustration style, etc.)
4. Color palette (dominant and accent colors)
5. Lighting (type, direction, intensity, mood created by lighting)
6. Composition (framing, perspective, camera angle, depth of field)
7. Mood/atmosphere (emotional tone, ambiance)
8. Technical details (texture, materials, surface quality, detail level)

Then synthesize all these elements into ONE cohesive, detailed, flowing paragraph prompt that is vivid and specific. The prompt should:
- Use descriptive adjectives and specific art/photography terminology
- Include style references if applicable (e.g., "in the style of", "inspired by")
- Mention specific technical details (f2.8 portrait, cinematic lighting, 4K, etc.)
- Flow naturally as a single continuous prompt, not a list
- Be 2-3 sentences long but information-dense
- Be directly usable to generate images with similar aesthetic and quality

Generate ONLY the final prompt text, nothing else.`,
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