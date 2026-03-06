import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, Sun, Droplets, Flame, Sparkles } from "lucide-react";

const flashColors = [
  { id: "white", label: "Classic White", icon: Zap, color: "#FFFFFF", prompt: "Apply a realistic camera flash effect: bright white flash lighting, high contrast, sharp highlights, deep rich shadows, vivid colors, authentic point-and-shoot flash photography" },
  { id: "warm", label: "Warm Flash", icon: Sun, color: "#FFB800", prompt: "Apply a warm golden camera flash effect: warm white flash lighting with golden tones, soft highlights, natural shadows, warm skin tones, cozy photography aesthetic" },
  { id: "cool", label: "Cool Blue", icon: Droplets, color: "#4D9AFF", prompt: "Apply a cool blue-tinted camera flash effect: cool white flash with subtle blue tones, crisp highlights, enhanced shadows, cool color temperature, modern cool aesthetic" },
  { id: "pink", label: "Pink Glow", icon: Sparkles, color: "#FF6B9D", prompt: "Apply a pink-tinted camera flash effect: pink flash lighting, vibrant highlights, rich shadows, enhanced pink and magenta tones, trendy pink aesthetic" },
  { id: "flik", label: "FLIK Orange", icon: Flame, color: "#FF6B35", prompt: "Apply an orange-tinted camera flash effect: orange flash lighting with the FLIK brand gradient, warm highlights, enhanced orange and red tones, creative flashy aesthetic" }
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
        Flash Effect Options
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {flashColors.map((flashColor, index) => (
          <motion.button
            key={flashColor.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            onClick={() => onSelect({
              id: "flash",
              label: `Flash Effect: ${flashColor.label}`,
              prompt: flashColor.prompt,
              flashColor: flashColor.id
            })}
            className="group relative p-3 rounded-2xl text-left transition-all duration-300 border bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-[#FF6B35]/30 cursor-pointer shadow-sm hover:shadow-lg hover:shadow-[#FF6B35]/5"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FF6B35]/10 group-hover:bg-[#FF6B35]/20 text-[#FF6B35] transition-colors mb-1">
              <flashColor.icon className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-white group-hover:text-[#FF6B35] transition-colors truncate">
              {flashColor.label}
            </p>
            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5 group-hover:ring-[#FF6B35]/20 pointer-events-none" />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}