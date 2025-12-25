import React from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";

import { Sun, Contrast, Droplets, Activity, Palette, Ghost, Aperture } from "lucide-react";

export default function AdjustmentsPanel({ adjustments, onChange }) {
  const handleChange = (key, value) => {
    onChange({ ...adjustments, [key]: value[0] });
  };

  const controls = [
    { key: "brightness", label: "Brightness", icon: Sun, min: -100, max: 100, step: 1 },
    { key: "contrast", label: "Contrast", icon: Contrast, min: -100, max: 100, step: 1 },
    { key: "saturation", label: "Saturation", icon: Droplets, min: -100, max: 100, step: 1 },
    { key: "blur", label: "Blur", icon: Aperture, min: 0, max: 20, step: 1 },
    { key: "hue", label: "Hue", icon: Palette, min: 0, max: 360, step: 1 },
    { key: "sepia", label: "Sepia", icon: Ghost, min: 0, max: 100, step: 1 },
    { key: "grayscale", label: "B&W", icon: Activity, min: 0, max: 100, step: 1 },
  ];

  return (
    <div className="py-6 px-4 space-y-6">
      {controls.map((item, index) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white/[0.03] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors"
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center text-[#FF6B35]">
                <item.icon className="w-4 h-4" />
              </div>
              <Label className="text-white/90 text-sm font-medium">{item.label}</Label>
            </div>
            <span className="text-xs font-mono text-white/50 bg-black/20 px-2 py-1 rounded-md min-w-[3rem] text-center">
              {adjustments[item.key] || 0}
            </span>
          </div>
          <Slider
            value={[adjustments[item.key] || 0]}
            onValueChange={(value) => handleChange(item.key, value)}
            min={item.min}
            max={item.max}
            step={item.step}
            className="[&_.relative]:bg-white/10 [&_.absolute]:bg-gradient-to-r [&_.absolute]:from-[#FF6B35] [&_.absolute]:to-[#FFB800] [&_span]:border-none [&_span]:shadow-lg"
          />
        </motion.div>
      ))}
    </div>
  );
}