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
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center flex-shrink-0">
            <Crop className="w-5 h-5 text-[#FF6B35]" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-medium text-sm mb-2">How to Crop</h4>
            <ol className="text-xs text-white/60 space-y-1">
              <li>1. Click "Start Cropping" to begin</li>
              <li>2. Drag corners to resize crop area</li>
              <li>3. Drag center to move crop position</li>
              <li>4. Click "Apply" to crop the image</li>
            </ol>
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
            variant="outline"
            className="w-full border-white/20 text-white hover:bg-white/10 h-10"
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