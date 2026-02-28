import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="relative bg-[#141414]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-4 space-y-4">
        <div>
          <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">
            Text Content
          </label>
          <input
            type="text"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleGenerateText();
              }
            }}
            placeholder="Enter text to stylize..."
            className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-white/30 text-base focus:outline-none focus:border-[#FF6B35] transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">
            Style Description
          </label>
          <textarea
            value={stylePrompt}
            onChange={(e) => setStylePrompt(e.target.value)}
            placeholder="Describe the font style (e.g., 'glowing neon, cyberpunk', 'elegant gold with flowers', 'fiery red script')..."
            rows={4}
            className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-white/30 text-base focus:outline-none focus:border-[#FF6B35] transition-colors resize-none"
          />
        </div>
      </div>

      <Button
        onClick={handleGenerateText}
        disabled={isGenerating || isProcessing || !textContent.trim() || !stylePrompt.trim()}
        className="btn-gradient w-full text-white rounded-lg h-10 shadow-lg shadow-[#FF6B35]/20 hover:shadow-[#FF6B35]/40 transition-all disabled:opacity-30"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Generating...
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4 mr-2" />
            Generate Text
          </>
        )}
      </Button>
    </motion.div>
  );
}