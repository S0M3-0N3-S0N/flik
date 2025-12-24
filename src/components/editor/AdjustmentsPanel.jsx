import React from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";

export default function AdjustmentsPanel({ adjustments, onChange }) {
  const handleChange = (key, value) => {
    onChange({ ...adjustments, [key]: value[0] });
  };

  const controls = [
    { key: "brightness", label: "Brightness", min: -100, max: 100, step: 1 },
    { key: "contrast", label: "Contrast", min: -100, max: 100, step: 1 },
    { key: "saturation", label: "Saturation", min: -100, max: 100, step: 1 },
    { key: "blur", label: "Blur", min: 0, max: 20, step: 1 },
    { key: "hue", label: "Hue Rotate", min: 0, max: 360, step: 1 },
    { key: "sepia", label: "Sepia", min: 0, max: 100, step: 1 },
    { key: "grayscale", label: "Grayscale", min: 0, max: 100, step: 1 },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
      {controls.map((control, index) => (
        <motion.div
          key={control.key}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="space-y-1 sm:space-y-2"
        >
          <div className="flex items-center justify-between">
            <Label className="text-white/80 text-xs sm:text-sm">{control.label}</Label>
            <span className="text-[10px] sm:text-xs text-white/50 w-12 text-right">
              {adjustments[control.key] || 0}
            </span>
          </div>
          <Slider
            value={[adjustments[control.key] || 0]}
            onValueChange={(value) => handleChange(control.key, value)}
            min={control.min}
            max={control.max}
            step={control.step}
            className="w-full"
          />
        </motion.div>
      ))}
    </div>
  );
}