import React from "react";
import { Button } from "@/components/ui/button";
import { RotateCw, RotateCcw, FlipHorizontal, FlipVertical } from "lucide-react";
import { motion } from "framer-motion";

export default function TransformPanel({ onTransform }) {
  const transforms = [
    { id: "rotate-right", label: "Rotate Right", icon: RotateCw },
    { id: "rotate-left", label: "Rotate Left", icon: RotateCcw },
    { id: "flip-horizontal", label: "Flip Horizontal", icon: FlipHorizontal },
    { id: "flip-vertical", label: "Flip Vertical", icon: FlipVertical },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {transforms.map((transform, index) => (
        <motion.div
          key={transform.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Button
            onClick={() => onTransform(transform.id)}
            variant="outline"
            className="w-full h-16 sm:h-24 flex flex-col items-center justify-center gap-1 sm:gap-2 bg-white/5 hover:bg-white/10 border-white/10 text-white"
          >
            <transform.icon className="w-4 h-4 sm:w-6 sm:h-6 text-[#FF6B35]" />
            <span className="text-[10px] sm:text-xs">{transform.label}</span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}