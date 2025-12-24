import React from "react";
import { Button } from "@/components/ui/button";
import { Crop, Check, X } from "lucide-react";
import { motion } from "framer-motion";

export default function CropPanel({ onStartCrop, onApplyCrop, onCancelCrop, isCropping }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center flex-shrink-0">
            <Crop className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF6B35]" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-medium text-sm mb-1 sm:mb-2">How to Crop</h4>
            <div className="text-[10px] sm:text-xs text-white/60 space-y-1 hidden sm:block">
              <p>1. Click "Start Cropping" to begin</p>
              <p>2. Drag corners to resize crop area</p>
              <p>3. Drag center to move crop position</p>
              <p>4. Click "Apply" to crop the image</p>
            </div>
            <p className="text-[10px] text-white/60 sm:hidden">
              Use drag handles to resize and move crop area.
            </p>
          </div>
        </div>
      </div>

      {!isCropping ? (
        <Button
          onClick={onStartCrop}
          className="w-full btn-gradient text-white h-12 text-base"
        >
          <Crop className="w-4 h-4 mr-2" />
          Start Cropping
        </Button>
      ) : (
        <div className="space-y-2">
          <Button
            onClick={onApplyCrop}
            className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base"
          >
            <Check className="w-4 h-4 mr-2" />
            Apply Crop
          </Button>
          <Button
            onClick={onCancelCrop}
            className="w-full bg-white/5 border border-white/20 text-white hover:bg-white/10 h-10"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}

      <div className="text-xs text-white/40 text-center">
        {isCropping ? "Adjust the crop area then apply" : "Click to enable crop mode"}
      </div>
    </motion.div>
  );
}