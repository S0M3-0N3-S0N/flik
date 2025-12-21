import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wand2, Eraser, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export default function SpotRemoval({ onRemoveSpot, isProcessing }) {
  const [spots, setSpots] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center flex-shrink-0">
              <Wand2 className="w-5 h-5 text-[#FF6B35]" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium text-sm mb-2">How to use Magic Wand</h4>
              <ol className="text-xs text-white/60 space-y-1">
                <li>1. Click on areas you want to remove</li>
                <li>2. Mark all spots you'd like to erase</li>
                <li>3. Click "Remove Spots" to process</li>
              </ol>
            </div>
          </div>
        </div>

        <Button
          onClick={onRemoveSpot}
          disabled={isProcessing}
          className="w-full btn-gradient text-white h-12 text-base"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              Remove Marked Spots
            </>
          )}
        </Button>

        <div className="text-xs text-white/40 text-center">
          Click directly on the image to mark spots
        </div>
      </div>

      <div className="pt-4 border-t border-white/10">
        <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
          Quick Remove
        </h4>
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start text-white/60 hover:text-white hover:bg-white/5 border-white/10"
          >
            <Eraser className="w-4 h-4 mr-3" />
            Remove Background
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-white/60 hover:text-white hover:bg-white/5 border-white/10"
          >
            <Trash2 className="w-4 h-4 mr-3" />
            Remove Objects
          </Button>
        </div>
      </div>
    </motion.div>
  );
}