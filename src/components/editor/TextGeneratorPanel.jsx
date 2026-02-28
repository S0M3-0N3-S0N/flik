import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function TextGeneratorPanel({ onTextImageGenerated, isProcessing }) {
  const [textContent, setTextContent] = useState("");
  const [stylePrompt, setStylePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateText = async () => {
    if (!textContent.trim()) {
      toast.error("Please enter text");
      return;
    }
    if (!stylePrompt.trim()) {
      toast.error("Please describe the style");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate an image of stylized text. The text should say: "${textContent}". The style should be: ${stylePrompt}. Create visually appealing, artistic text that matches the description. Make sure the text is clearly readable and visually striking.`,
        add_context_from_internet: false,
      });

      // Use GenerateImage to create the actual styled text image
      const imageResult = await base44.integrations.Core.GenerateImage({
        prompt: `Create an image with stylized text that says "${textContent}". Style: ${stylePrompt}. Make the text visually striking, readable, and artistic. Transparent or white background preferred.`,
      });

      if (imageResult?.url) {
        onTextImageGenerated(imageResult.url);
        toast.success("Text generated successfully!");
        setTextContent("");
        setStylePrompt("");
      } else {
        toast.error("Failed to generate text");
      }
    } catch (error) {
      console.error("Error generating text:", error);
      toast.error("Error generating text. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">
          Text Content
        </label>
        <input
          type="text"
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="Enter text to stylize..."
          className="w-full mt-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#FF6B35]"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">
          Style Description
        </label>
        <textarea
          value={stylePrompt}
          onChange={(e) => setStylePrompt(e.target.value)}
          placeholder="Describe the font style (e.g., 'glowing neon, cyberpunk', 'elegant gold with flowers', 'fiery red script')..."
          rows={4}
          className="w-full mt-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#FF6B35] resize-none"
        />
      </div>

      <Button
        onClick={handleGenerateText}
        disabled={isGenerating || isProcessing || !textContent.trim() || !stylePrompt.trim()}
        className="btn-gradient w-full text-white disabled:opacity-30"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Generating...
          </>
        ) : (
          "Generate Text"
        )}
      </Button>
    </div>
  );
}