import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const flashColors = [
  { id: "white", label: "Classic White", color: "#FFFFFF", prompt: "Apply a realistic camera flash effect: bright white flash lighting, high contrast, sharp highlights, deep rich shadows, vivid colors, authentic point-and-shoot flash photography" },
  { id: "warm", label: "Warm Flash", color: "#FFB800", prompt: "Apply a warm golden camera flash effect: warm white flash lighting with golden tones, soft highlights, natural shadows, warm skin tones, cozy photography aesthetic" },
  { id: "cool", label: "Cool Blue", color: "#4D9AFF", prompt: "Apply a cool blue-tinted camera flash effect: cool white flash with subtle blue tones, crisp highlights, enhanced shadows, cool color temperature, modern cool aesthetic" },
  { id: "pink", label: "Pink Glow", color: "#FF6B9D", prompt: "Apply a pink-tinted camera flash effect: pink flash lighting, vibrant highlights, rich shadows, enhanced pink and magenta tones, trendy pink aesthetic" },
  { id: "flik", label: "FLIK Orange", color: "#FF6B35", prompt: "Apply an orange-tinted camera flash effect: orange flash lighting with the FLIK brand gradient, warm highlights, enhanced orange and red tones, creative flashy aesthetic" }
];

export default function FlashColorOptions({ onSelect, onBack }) {
  return (
    <div className="py-6 px-4 space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </button>

      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Flash Colors</h3>

      <div className="grid grid-cols-2 gap-3">
        {flashColors.map((flashColor, index) => (
          <motion.button
            key={flashColor.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelect({
              id: "flash",
              label: `Flash Effect - ${flashColor.label}`,
              prompt: flashColor.prompt,
              flashColor: flashColor.id
            })}
            className="group relative p-4 rounded-2xl text-left transition-all duration-300 border bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/10 cursor-pointer shadow-sm hover:shadow-lg"
          >
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl border-2 border-white/20 group-hover:border-white/40 transition-all shadow-lg"
                style={{ backgroundColor: flashColor.color }}
              />
              <p className="text-sm font-medium text-center text-white group-hover:text-[#FF6B35] transition-colors">
                {flashColor.label}
              </p>
            </div>
            
            {(
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5 group-hover:ring-white/10 pointer-events-none" />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}