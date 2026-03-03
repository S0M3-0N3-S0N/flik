import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Loader2, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function PromptExtractor({ currentImage }) {
  const [extractedPrompt, setExtractedPrompt] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const handleExtractPrompt = async () => {
    if (!currentImage) {
      toast.error("Please upload an image first");
      return;
    }

    setIsExtracting(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this image in detail and generate a comprehensive, descriptive text prompt that captures the scene, style, composition, mood, colors, and any notable elements. This prompt will be used to generate new images with a similar aesthetic and style. Make the prompt detailed, vivid, and suitable for an AI image generation model.`,
        file_urls: [currentImage.url || currentImage.preview],
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
        <div className="flex flex-col gap-3">
          <p className="text-sm text-white/60">
            Extract a detailed text prompt from your image to use for generating new images with similar style.
          </p>
          <Button
            onClick={handleExtractPrompt}
            disabled={isExtracting || !currentImage}
            className="btn-gradient text-white w-full py-2"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Extracting...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Extract Prompt from Image
              </>
            )}
          </Button>
        </div>
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
              variant="outline"
              className="flex-1 text-white border-white/20 hover:bg-white/5"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button
              onClick={() => setShowPrompt(false)}
              variant="outline"
              className="flex-1 text-white border-white/20 hover:bg-white/5"
            >
              Extract Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}