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
        prompt: `You are a master prompt engineer specializing in reverse-engineering image descriptions. Your task is to analyze this image in EXTREME detail and generate a prompt so accurate that when used to generate a new image, it would be virtually indistinguishable from the original.

CRITICAL ANALYSIS REQUIREMENTS:
1. Subject Matter: Describe EVERY element in perfect detail - facial features, expressions, body language, clothing, accessories, every visible object
2. Composition: Exact framing, perspective, depth, foreground-midground-background separation, rule of thirds application
3. Lighting: Precise light direction, type (key light, fill light, backlighting), color temperature, shadows, highlights, dramatic effects
4. Colors: Exact color palette - dominant colors, secondary colors, accent colors, saturation levels, contrast
5. Texture & Materials: Surface quality of every visible material - fabric, skin, metal, wood, glass, paper, leather (rough, smooth, glossy, matte, etc.)
6. Style & Technique: Photography style (portrait, landscape, macro, wide-angle), painting style if applicable, artistic movements, post-processing effects
7. Mood & Atmosphere: Emotional tone, lighting mood, weather conditions, time of day, season
8. Technical Specs: Camera settings implied (aperture, focal length for photography), resolution quality, sharpness, focus point
9. Fine Details: Hair texture and movement, water reflections, shadows with specific angles, small background elements, any imperfections or unique characteristics

YOUR PROMPT MUST:
- Capture the EXACT visual state of the image
- Be 3-5 detailed sentences flowing naturally
- Include specific technical camera/art terms
- Mention specific colors by name (not just "blue" but "deep cobalt blue", "warm amber gold", etc.)
- Include quality descriptors (masterpiece, professional, intricate, ultra-detailed, high resolution, etc.)
- Be usable as-is to recreate this exact image with AI generation
- Read like a cinematographer or photographer's detailed shot description

Generate ONLY the final, complete prompt. Nothing else.`,
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