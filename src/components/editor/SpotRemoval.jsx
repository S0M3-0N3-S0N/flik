import React from "react";
import { Button } from "@/components/ui/button";
import { Wand2, Paintbrush, Eraser } from "lucide-react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function SpotRemoval({ 
  onRemoveSpot, 
  isProcessing, 
  brushSize, 
  onBrushSizeChange,
  brushMode,
  onBrushModeChange
}) {
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
              <Paintbrush className="w-5 h-5 text-[#FF6B35]" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium text-sm mb-2">How to use Magic Brush</h4>
              <ol className="text-xs text-white/60 space-y-1">
                <li>1. Drag over areas you want to remove</li>
                <li>2. Paint all spots you'd like to erase</li>
                <li>3. Click "Remove Painted Areas" to process</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-white/80 text-sm">Brush Size</Label>
            <span className="text-xs text-white/50 w-12 text-right">{brushSize}px</span>
          </div>
          <Slider
            value={[brushSize]}
            onValueChange={(value) => onBrushSizeChange(value[0])}
            min={10}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-white/80 text-sm">Tool Mode</Label>
          <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => onBrushModeChange('draw')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                brushMode === 'draw' 
                  ? 'bg-[#FF6B35] text-white shadow-lg' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Paintbrush className="w-4 h-4" />
              Draw
            </button>
            <button
              onClick={() => onBrushModeChange('erase')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                brushMode === 'erase' 
                  ? 'bg-[#FF6B35] text-white shadow-lg' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Eraser className="w-4 h-4" />
              Eraser
            </button>
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
              Remove Painted Areas
            </>
          )}
        </Button>

        <div className="text-xs text-white/40 text-center">
          Drag on the image to paint areas to remove
        </div>
      </div>
    </motion.div>
  );
}