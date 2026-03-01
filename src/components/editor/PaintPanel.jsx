import React from "react";
import { Paintbrush, Eraser, RotateCcw, Trash2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#FF6B35", "#F72C25", "#FFB800", "#FFFFFF", "#000000",
  "#4FC3F7", "#66BB6A", "#CE93D8", "#FF8A65", "#80DEEA",
];

export default function PaintPanel({
  brushColor,
  onBrushColorChange,
  brushSize,
  onBrushSizeChange,
  paintMode,
  onPaintModeChange,
  onClearStrokes,
  onUndoLastStroke,
  hasStrokes,
  strokeCount,
}) {
  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
        {/* Paintbrush */}
        <button
          onClick={() => onPaintModeChange("draw")}
          className={cn(
            "relative flex flex-col items-center justify-end w-14 h-20 rounded-xl border-2 transition-all duration-200 overflow-hidden group",
            paintMode === "draw"
              ? "border-[#FF6B35] bg-[#FF6B35]/15 shadow-lg shadow-[#FF6B35]/30"
              : "border-white/10 bg-white/5 hover:border-white/20"
          )}
          title="Paintbrush"
        >
          {/* Brush body */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Paintbrush
              className="w-8 h-8"
              style={{ color: paintMode === "draw" ? brushColor : "#888" }}
            />
          </div>
          <span className="absolute bottom-1 text-[9px] font-semibold text-white/60">Brush</span>
        </button>

        {/* Eraser */}
        <button
          onClick={() => onPaintModeChange("erase")}
          className={cn(
            "relative flex flex-col items-center justify-end w-14 h-20 rounded-xl border-2 transition-all duration-200 overflow-hidden",
            paintMode === "erase"
              ? "border-white/60 bg-white/10 shadow-lg shadow-white/20"
              : "border-white/10 bg-white/5 hover:border-white/20"
          )}
          title="Eraser"
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            {/* Eraser body */}
            <div className="w-6 h-9 rounded-md bg-pink-300/80" />
            {/* Band */}
            <div className="w-6 h-1.5 rounded-sm bg-pink-500/60" />
            {/* Base */}
            <div className="w-6 h-3 rounded-b-sm bg-white/30" />
          </div>
          <span className="absolute bottom-1 text-[9px] font-semibold text-white/60">Eraser</span>
        </button>
      </div>

      {/* Color Picker (hidden when eraser is active) */}
      {paintMode === "draw" && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Color</p>
          <div className="grid grid-cols-5 gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onBrushColorChange(color)}
                className={cn(
                  "w-full aspect-square rounded-lg border-2 transition-all duration-150",
                  brushColor === color
                    ? "border-white scale-110 shadow-lg"
                    : "border-transparent hover:scale-105 hover:border-white/30"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <label className="text-xs text-white/50">Custom</label>
            <input
              type="color"
              value={brushColor}
              onChange={(e) => onBrushColorChange(e.target.value)}
              className="w-8 h-8 rounded-md cursor-pointer border border-white/20 bg-transparent"
            />
            <div
              className="flex-1 h-8 rounded-lg border border-white/10"
              style={{ backgroundColor: brushColor }}
            />
          </div>
        </div>
      )}

      {/* Brush Size */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Size</p>
          <span className="text-xs text-white/60 font-mono">{brushSize}px</span>
        </div>
        <Slider
          value={[brushSize]}
          min={2}
          max={80}
          step={1}
          onValueChange={([v]) => onBrushSizeChange(v)}
          className="w-full"
        />
        {/* Size preview dot */}
        <div className="flex justify-center">
          <div
            className="rounded-full transition-all duration-150"
            style={{
              width: Math.min(brushSize, 60),
              height: Math.min(brushSize, 60),
              backgroundColor: paintMode === "erase" ? "rgba(255,255,255,0.4)" : brushColor,
              opacity: 0.8,
            }}
          />
        </div>
      </div>

      {/* Stroke actions */}
      {hasStrokes && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#FF6B35]/10 border border-[#FF6B35]/20">
          <span className="text-xs text-white/60">{strokeCount} stroke{strokeCount !== 1 ? "s" : ""}</span>
          <div className="flex gap-1">
            <button
              onClick={onUndoLastStroke}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title="Undo last stroke"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClearStrokes}
              className="p-1.5 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Clear all strokes"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}