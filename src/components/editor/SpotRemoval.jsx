import React from "react";
import { Button } from "@/components/ui/button";
import { Wand2, Paintbrush, Eraser, MessageSquare } from "lucide-react";
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
  onBrushModeChange,
  prompt,
  onPromptChange,
  onDiscuss
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-6 px-4 space-y-6"
    >
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FF6B35]/10 to-[#FFB800]/10 border border-[#FF6B35]/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/20 flex items-center justify-center flex-shrink-0 text-[#FF6B35]">
            <Wand2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-medium text-sm mb-1">Magic Brush</h4>
            <p className="text-xs text-white/60 leading-relaxed">
              Paint over areas to modify them. Use the AI prompt to describe what should change.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-white/80 text-xs font-medium uppercase tracking-wider mb-3 block">Brush Mode</Label>
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => onBrushModeChange('draw')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
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
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                brushMode === 'erase' 
                  ? 'bg-white/20 text-white shadow-lg' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Eraser className="w-4 h-4" />
              Eraser
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-white/80 text-xs font-medium uppercase tracking-wider">Brush Size</Label>
            <span className="text-xs font-mono text-white/50 bg-white/5 px-2 py-1 rounded">{brushSize}px</span>
          </div>
          <Slider
            value={[brushSize]}
            onValueChange={(value) => onBrushSizeChange(value[0])}
            min={10}
            max={100}
            step={5}
            className="[&_.relative]:bg-white/10 [&_.absolute]:bg-[#FF6B35] [&_span]:border-none [&_span]:shadow-lg"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <Label className="text-white/80 text-xs font-medium uppercase tracking-wider">Instructions</Label>
            <Button variant="ghost" size="sm" onClick={onDiscuss} className="h-6 text-[10px] gap-1.5 text-[#FF6B35] bg-[#FF6B35]/10 hover:bg-[#FF6B35]/20 rounded-full px-3">
              <MessageSquare className="w-3 h-3" />
              Discuss
            </Button>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="What should happen to the painted area? (e.g. 'remove it', 'change to red flower')"
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF6B35]/50 focus:bg-white/5 min-h-[100px] resize-none transition-all"
          />
        </div>

        <Button
          onClick={onRemoveSpot}
          disabled={isProcessing}
          className="w-full btn-gradient text-white h-12 text-sm font-medium rounded-xl mt-2 shadow-lg shadow-[#FF6B35]/20 hover:shadow-[#FF6B35]/30 hover:translate-y-[-1px] transition-all"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              Generate Changes
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}