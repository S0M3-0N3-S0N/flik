import React from "react";
import { motion } from "framer-motion";
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
  Trash2,
  CloudRain,
  Smile,
  Grid3x3,
  Zap,
  CircleDot,
  Scan,
  Blend,
  Mountain,
  User,
  Sparkle,
  Film,
  Eye,
  Copy,
  Scissors
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const tools = [
  { 
    id: "enhance", 
    icon: Sparkles, 
    label: "AI Enhance", 
    description: "Auto-enhance colors, clarity & details",
    prompt: "Enhance this image with better colors, improved clarity, professional photo quality, and optimal lighting balance"
  },
  { 
    id: "lighting", 
    icon: Sun, 
    label: "Fix Lighting", 
    description: "Correct exposure & lighting",
    prompt: "Fix the lighting and exposure of this image, correct shadows, balance highlights, make it look professionally lit"
  },
  { 
    id: "upscale", 
    icon: Maximize2, 
    label: "AI Upscale", 
    description: "Increase resolution 4x",
    prompt: "Upscale this image to higher resolution, enhance details, reduce noise, sharpen edges while maintaining natural look"
  },
  { 
    id: "recolor", 
    icon: Palette, 
    label: "Color Grade", 
    description: "Apply cinematic color grading",
    prompt: "Apply professional cinematic color grading to this image, enhance colors, add film-like tones, make it look like a movie still"
  },
  { 
    id: "background", 
    icon: Eraser, 
    label: "Remove BG", 
    description: "Remove background instantly",
    prompt: "Remove the background from this image, keep only the main subject, make background transparent or pure white"
  },
  { 
    id: "style", 
    icon: Paintbrush, 
    label: "Style Transfer", 
    description: "Apply artistic styles",
    prompt: "Transform this image with an artistic style, make it look like a painting, add artistic brush strokes and textures"
  },
  { 
    id: "portrait", 
    icon: Focus, 
    label: "Portrait Mode", 
    description: "Add depth blur effect",
    prompt: "Add portrait mode effect to this image, blur the background naturally, keep the subject sharp, create professional bokeh"
  },
  { 
    id: "hdr", 
    icon: Contrast, 
    label: "HDR Effect", 
    description: "Enhance dynamic range",
    prompt: "Apply HDR effect to this image, enhance dynamic range, bring out details in shadows and highlights, make it more vivid"
  },
  { 
    id: "remove_object", 
    icon: Trash2, 
    label: "Remove Object", 
    description: "Remove unwanted objects",
    prompt: "Remove unwanted objects and people from this image, clean up the scene, fill in the areas naturally"
  },
  { 
    id: "sky_replace", 
    icon: CloudRain, 
    label: "Replace Sky", 
    description: "Change sky to dramatic sunset",
    prompt: "Replace the sky in this image with a dramatic sunset sky, golden hour colors, clouds, maintain natural lighting on the scene"
  },
  { 
    id: "face_enhance", 
    icon: Smile, 
    label: "Face Enhance", 
    description: "Perfect skin & features",
    prompt: "Enhance facial features, perfect skin texture, remove blemishes, natural beauty enhancement, professional portrait quality"
  },
  { 
    id: "denoise", 
    icon: Grid3x3, 
    label: "Denoise", 
    description: "Remove grain & noise",
    prompt: "Remove all noise and grain from this image, clean it up, make it crystal clear while preserving detail"
  },
  { 
    id: "sharpen", 
    icon: Zap, 
    label: "Super Sharp", 
    description: "Ultra sharp details",
    prompt: "Make this image super sharp, enhance all details and edges, crystal clear focus, professional sharpness"
  },
  { 
    id: "colorize", 
    icon: Droplets, 
    label: "Colorize", 
    description: "Add color to B&W photos",
    prompt: "Colorize this black and white image with realistic natural colors, historically accurate tones"
  },
  { 
    id: "relighting", 
    icon: CircleDot, 
    label: "Relight Scene", 
    description: "Change lighting direction",
    prompt: "Relight this scene with dramatic lighting from a different angle, add depth with shadows and highlights"
  },
  { 
    id: "restore", 
    icon: Scan, 
    label: "Photo Restore", 
    description: "Fix old damaged photos",
    prompt: "Restore this old or damaged photo, remove scratches, tears, stains, improve quality, make it look new"
  },
  { 
    id: "blend", 
    icon: Blend, 
    label: "Smart Blur", 
    description: "Selective background blur",
    prompt: "Add selective blur to background while keeping main subject in perfect focus, professional depth of field"
  },
  { 
    id: "landscape", 
    icon: Mountain, 
    label: "Landscape Pro", 
    description: "Enhance landscapes",
    prompt: "Enhance this landscape photo, vivid colors, dramatic sky, sharp details, professional nature photography"
  },
  { 
    id: "age_change", 
    icon: User, 
    label: "Age Modify", 
    description: "Make younger or older",
    prompt: "Modify the age of the person in this image, make them look younger with smooth skin and youthful features"
  },
  { 
    id: "glamour", 
    icon: Sparkle, 
    label: "Glamour Shot", 
    description: "Magazine quality portrait",
    prompt: "Transform this portrait into a glamour magazine cover shot, professional makeup look, perfect lighting, high fashion"
  },
  { 
    id: "motion_blur", 
    icon: Film, 
    label: "Motion Blur", 
    description: "Add dynamic motion",
    prompt: "Add professional motion blur effect to create sense of speed and movement, dynamic action shot"
  },
  { 
    id: "depth_map", 
    icon: Eye, 
    label: "Depth Control", 
    description: "Adjust depth of field",
    prompt: "Create professional depth of field effect, control focus zones, cinematic bokeh, adjust depth map"
  },
  { 
    id: "duplicate", 
    icon: Copy, 
    label: "Clone & Fix", 
    description: "Clone parts of image",
    prompt: "Intelligently clone and duplicate parts of this image to fill in areas or remove unwanted elements seamlessly"
  },
  { 
    id: "crop_smart", 
    icon: Scissors, 
    label: "Smart Crop", 
    description: "AI-powered cropping",
    prompt: "Intelligently crop this image to improve composition, rule of thirds, remove distractions, perfect framing"
  },
];

export default function ToolPanel({ onToolSelect, isProcessing, hasImage }) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-full overflow-y-auto py-6 px-4">
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4 px-2">
            AI Tools
            <span className="ml-2 text-[#FF6B35] font-bold">{tools.length}</span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {tools.map((tool, index) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onToolSelect(tool)}
                    disabled={isProcessing || !hasImage}
                    className={`
                      group relative p-4 rounded-xl text-left transition-all duration-300
                      ${hasImage 
                        ? "bg-white/5 hover:bg-white/10 cursor-pointer" 
                        : "bg-white/[0.02] cursor-not-allowed opacity-50"
                      }
                      ${isProcessing ? "pointer-events-none" : ""}
                    `}
                  >
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center mb-3
                      ${hasImage 
                        ? "bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 group-hover:from-[#FF6B35]/30 group-hover:to-[#FFB800]/30" 
                        : "bg-white/5"
                      }
                    `}>
                      <tool.icon className={`w-5 h-5 ${hasImage ? "text-[#FF6B35]" : "text-white/30"}`} />
                    </div>
                    <p className={`text-sm font-medium ${hasImage ? "text-white" : "text-white/40"}`}>
                      {tool.label}
                    </p>
                    
                    {/* Hover gradient border */}
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={{
                        background: "linear-gradient(135deg, rgba(255,107,53,0.1) 0%, transparent 50%)"
                      }}
                    />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#1a1a1a] border-white/10 text-white">
                  <p className="text-sm">{tool.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-8 pt-6 border-t border-white/5">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4 px-2">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-white/60 hover:text-white hover:bg-white/5"
              disabled={!hasImage}
            >
              <Layers className="w-4 h-4 mr-3" />
              Add Layer
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-white/60 hover:text-white hover:bg-white/5"
              disabled={!hasImage}
            >
              <Droplets className="w-4 h-4 mr-3" />
              Add Filter
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}