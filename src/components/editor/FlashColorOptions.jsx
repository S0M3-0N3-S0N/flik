import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

export const FLASH_COLOR_OPTIONS = [
  { id: "white", label: "White Flash", color: "#FFFFFF", prompt: "Apply a realistic white camera flash effect to this photo: bright direct white flash lighting on the subject, high contrast, sharp highlights blown out slightly, deep rich shadows in background, vivid colors with slight overexposure on the subject, authentic point-and-shoot flash photography aesthetic" },
  { id: "warm", label: "Warm Flash", color: "#FFD700", prompt: "Apply a warm golden camera flash effect to this photo: bright golden-yellow flash lighting on the subject, warm highlights, enhanced skin tones, deep shadows with warm undertones, cozy ambient feel with professional flash photography aesthetic" },
  { id: "cool", label: "Cool Flash", color: "#87CEEB", prompt: "Apply a cool blue camera flash effect to this photo: bright cool-toned flash lighting on the subject, blue-white highlights, cool shadows, crisp high contrast, modern aesthetic with professional cool-toned flash photography look" },
  { id: "magenta", label: "Magenta Flash", color: "#FF00FF", prompt: "Apply a magenta camera flash effect to this photo: vibrant magenta flash lighting on the subject, dramatic colors, high contrast, artistic flash photography style with bold magenta undertones" },
  { id: "cyan", label: "Cyan Flash", color: "#00FFFF", prompt: "Apply a cyan camera flash effect to this photo: bright cyan flash lighting on the subject, cool bright highlights, artistic neon-like flash effect, modern vibrant flash photography aesthetic" },
];

export default function FlashColorOptions({ onSelect, onBack }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="py-4 px-4"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-white/50 hover:text-white text-xs mb-4 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </button>

      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-[#FF6B35]"></span>
        Flash Color
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {FLASH_COLOR_OPTIONS.map((option, index) => (
          <motion.button
            key={option.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            onClick={() => onSelect({ id: "flash", label: `Flash Effect: ${option.label}`, prompt: option.prompt, flashColor: option.id })}
            className="group relative p-3 rounded-2xl text-left transition-all duration-300 border bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-[#FF6B35]/30 cursor-pointer shadow-sm hover:shadow-lg hover:shadow-[#FF6B35]/5"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FF6B35]/10 group-hover:bg-[#FF6B35]/20 text-white transition-colors mb-1">
              <div 
                className="w-6 h-6 rounded-lg" 
                style={{ backgroundColor: option.color }}
              />
            </div>
            <p className="text-sm font-medium text-white group-hover:text-[#FF6B35] transition-colors truncate">
              {option.label}
            </p>
            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5 group-hover:ring-[#FF6B35]/20 pointer-events-none" />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}