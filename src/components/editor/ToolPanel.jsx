import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Sun, 
  Palette, 
  Eraser, 
  Maximize2, 
  Wand2,
  ImagePlus,
  Paintbrush,
  Layers,
  Focus,
  Contrast,
  Droplets,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ToolOptions from "@/components/editor/ToolOptions";
import FlashColorOptions from "@/components/editor/FlashColorOptions";

const tools = [
  { 
    id: "enhance", 
    icon: Sparkles, 
    label: "Enhance", 
    description: "Auto-enhance colors & details",
    category: "Enhancement",
    prompt: "Enhance this image with better colors, improved clarity, professional photo quality, and optimal lighting balance"
  },
  { 
    id: "lighting", 
    icon: Sun, 
    label: "Fix Lighting", 
    description: "Correct exposure & shadows",
    category: "Enhancement",
    prompt: "Fix the lighting and exposure of this image, correct shadows, balance highlights, make it look professionally lit"
  },
  { 
    id: "upscale", 
    icon: Maximize2, 
    label: "Upscale", 
    description: "Increase resolution 4x",
    category: "Enhancement",
    prompt: "Upscale and enhance the attached source image to true 8K UHD (7680x4320) with a 4x upscale factor, delivering a masterpiece-level, ultra-detailed, hyper-realistic result. Preserve the exact same face with 100% facial similarity-no alterations, morphing, or distortion of facial features. Maintain original skin and surface textures while subtly enhancing micro-details and increasing sharpness (1.5) for crisp clarity. Apply low denoising strength (0.25) to retain natural realism. Enhance with cinematic lighting, sharp focus, intricate texture depth, seamless high-quality gradients, and vibrant yet natural colors with professional color correction and strong gradient refinement. Avoid any plastic, over-smoothed, blurry, waxy skin, flat textures, pixelation, noise, JPEG artifacts, washed-out tones, CGI/cartoon/3D-render look, loss of detail, distorted eyes, or identity changes. Use DPM++ 2M Karras sampler, 50 steps, and CFG scale 7.0 to ensure a photorealistic, raw photography finish that significantly improves clarity and depth while staying faithful to the original image."
  },
  { 
    id: "portrait", 
    icon: Focus, 
    label: "Portrait", 
    description: "Add depth blur effect",
    category: "Enhancement",
    prompt: "Add portrait mode effect to this image, blur the background naturally, keep the subject sharp, create professional bokeh"
  },
  { 
    id: "recolor", 
    icon: Palette, 
    label: "Color Grade", 
    description: "Cinematic color grading",
    category: "Creative",
    prompt: "Apply professional cinematic color grading to this image, enhance colors, add film-like tones, make it look like a movie still"
  },
  { 
    id: "style", 
    icon: Paintbrush, 
    label: "Style", 
    description: "Apply artistic styles",
    category: "Creative",
    prompt: "Transform this image with an artistic style, make it look like a painting, add artistic brush strokes and textures"
  },
  { 
    id: "hdr", 
    icon: Contrast, 
    label: "HDR", 
    description: "Enhance dynamic range",
    category: "Creative",
    prompt: "Apply HDR effect to this image, enhance dynamic range, bring out details in shadows and highlights, make it more vivid"
  },
  { 
    id: "flash", 
    icon: Zap, 
    label: "Flash Effect", 
    description: "Dramatic flash photography look",
    category: "Creative",
    prompt: "Apply a realistic camera flash effect to this photo: bright direct flash lighting on the subject, high contrast, sharp highlights blown out slightly, deep rich shadows in background, vivid colors with slight overexposure on the subject, authentic point-and-shoot flash photography aesthetic"
  },
  { 
    id: "background", 
    icon: Eraser, 
    label: "Remove BG", 
    description: "Transparent background",
    category: "Edit",
    prompt: "Remove the background from this image, keep only the main subject, make background transparent or pure white"
  },
  { 
    id: "4k", 
    icon: Zap, 
    label: "4K Ultra", 
    description: "Super high quality upscale",
    category: "Enhancement",
    prompt: "Upscale this image to 4K ultra high resolution, maximize clarity and detail, enhance sharpness, reduce any noise, maintain natural appearance with professional quality"
  },
];

const categories = ["Enhancement", "Creative", "Edit"];

const TOOLS_WITH_OPTIONS = ["recolor", "style", "flash"];

export default function ToolPanel({ onToolSelect, isProcessing, hasImage }) {
  const [selectedTool, setSelectedTool] = useState(null);

  if (!onToolSelect) {
    console.warn('ToolPanel: onToolSelect callback is missing');
    return null;
  }

  const handleToolClick = (tool) => {
    if (TOOLS_WITH_OPTIONS.includes(tool.id)) {
      setSelectedTool(tool);
    } else {
      onToolSelect(tool);
    }
  };

  if (selectedTool) {
    if (selectedTool.id === "flash") {
      return (
        <FlashColorOptions
          onSelect={(toolWithOption) => {
            setSelectedTool(null);
            onToolSelect(toolWithOption);
          }}
          onBack={() => setSelectedTool(null)}
        />
      );
    }
    return (
      <ToolOptions
        tool={selectedTool}
        onSelect={(toolWithOption) => {
          setSelectedTool(null);
          onToolSelect(toolWithOption);
        }}
        onBack={() => setSelectedTool(null)}
      />
    );
  }
  
  return (
    <div className="py-6 px-4 space-y-8">
      {categories.map((category, catIndex) => (
        <div key={category}>
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-[#FF6B35]"></span>
            {category}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {tools.filter(t => t.category === category).map((tool, index) => (
              <motion.button
                key={tool.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (catIndex * 0.1) + (index * 0.05) }}
                onClick={() => handleToolClick(tool)}
                disabled={isProcessing || !hasImage}
                className={`
                  group relative p-3 rounded-2xl text-left transition-all duration-300 border
                  ${hasImage 
                    ? "bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/10 cursor-pointer shadow-sm hover:shadow-lg hover:shadow-[#FF6B35]/5" 
                    : "bg-white/[0.02] border-transparent cursor-not-allowed opacity-40"
                  }
                  ${isProcessing ? "pointer-events-none opacity-50" : ""}
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300
                    ${hasImage 
                      ? "bg-[#FF6B35]/10 group-hover:bg-[#FF6B35]/20 text-[#FF6B35]" 
                      : "bg-white/5 text-white/20"
                    }
                  `}>
                    <tool.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium mb-1 truncate ${hasImage ? "text-white group-hover:text-[#FF6B35] transition-colors" : "text-white/40"}`}>
                      {tool.label}
                    </p>
                    <p className="text-[10px] text-white/40 leading-tight line-clamp-2 group-hover:text-white/60 transition-colors">
                      {TOOLS_WITH_OPTIONS.includes(tool.id) ? "Choose a style →" : tool.description}
                    </p>
                  </div>
                </div>
                
                {hasImage && (
                  <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5 group-hover:ring-white/10 pointer-events-none" />
                )}
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}