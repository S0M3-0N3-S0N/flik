import React, { useRef, useState } from "react";
import { Paintbrush, Eraser, RotateCcw, Trash2, SlidersHorizontal, Plus } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import ColorPickerModal from "./ColorPickerModal";

const PRESET_COLORS = [
  "#000000", "#FF6B35", "#F72C25", "#FFB800", "#66BB6A", "#4FC3F7",
  "#CE93D8", "#FF8A65", "#FFFFFF", "#1A1A2E",
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
  brushOpacity = 100,
  onBrushOpacityChange,
}) {
  const colorInputRef = useRef(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <>
    {showColorPicker && (
      <ColorPickerModal
        color={brushColor}
        onColorChange={onBrushColorChange}
        onClose={() => setShowColorPicker(false)}
      />
    )}
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
        <button
          onClick={() => onPaintModeChange("draw")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
            paintMode === "draw"
              ? "bg-gradient-to-r from-[#FF6B35] to-[#F72C25] text-white shadow-lg"
              : "text-white/50 hover:text-white"
          )}
        >
          <Paintbrush className="w-4 h-4" />
          Brush
        </button>
        <button
          onClick={() => onPaintModeChange("erase")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
            paintMode === "erase"
              ? "bg-white/20 text-white shadow-lg"
              : "text-white/50 hover:text-white"
          )}
        >
          <Eraser className="w-4 h-4" />
          Eraser
        </button>
      </div>

      {/* Color Section */}
      {paintMode === "draw" && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Color</p>

          {/* Color Circles */}
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onBrushColorChange(color)}
                className={cn(
                  "w-9 h-9 rounded-full border-2 transition-all duration-150 flex-shrink-0",
                  brushColor === color
                    ? "border-[#FF6B35] scale-110 shadow-lg shadow-[#FF6B35]/40"
                    : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: color }}
              />
            ))}

            {/* Custom color picker button */}
            <button
              onClick={() => setShowColorPicker(true)}
              className={cn(
                "w-9 h-9 rounded-full border-2 transition-all duration-150 flex-shrink-0 flex items-center justify-center overflow-hidden",
                !PRESET_COLORS.includes(brushColor)
                  ? "border-[#FF6B35] scale-110 shadow-lg shadow-[#FF6B35]/40"
                  : "border-transparent hover:scale-105"
              )}
              style={{
                background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)"
              }}
              title="Custom color"
            >
              <div className="w-4 h-4 rounded-full bg-white/90 flex items-center justify-center">
                <Plus className="w-2.5 h-2.5 text-black" />
              </div>
            </button>

            {/* Currently selected custom color indicator */}
            {!PRESET_COLORS.includes(brushColor) && (
              <button
                className="w-9 h-9 rounded-full border-2 border-[#FF6B35] scale-110 shadow-lg shadow-[#FF6B35]/40 flex-shrink-0"
                style={{ backgroundColor: brushColor }}
                onClick={() => setShowColorPicker(true)}
              />
            )}
          </div>
        </div>
      )}

      {/* Weight / Size */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white/80">Weight</p>
          <span className="text-sm text-white/60 bg-white/10 rounded-lg px-3 py-1 font-mono min-w-[48px] text-center">{brushSize}</span>
        </div>
        <Slider
          value={[brushSize]}
          min={2}
          max={80}
          step={1}
          onValueChange={([v]) => onBrushSizeChange(v)}
          className="w-full [&_[data-slot=slider-track]]:bg-white/10 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-[#FF6B35] [&_[data-slot=slider-range]]:to-[#F72C25]"
        />
      </div>

      {/* Transparency / Opacity */}
      {paintMode === "draw" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white/80">Transparency</p>
            <span className="text-sm text-white/60 bg-white/10 rounded-lg px-3 py-1 font-mono min-w-[48px] text-center">{onBrushOpacityChange ? brushOpacity : 100}</span>
          </div>
          <Slider
            value={[onBrushOpacityChange ? brushOpacity : 100]}
            min={1}
            max={100}
            step={1}
            onValueChange={([v]) => onBrushOpacityChange?.(v)}
            className="w-full [&_[data-slot=slider-track]]:bg-white/10 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-[#FF6B35] [&_[data-slot=slider-range]]:to-[#F72C25]"
          />
        </div>
      )}

      {/* Stroke actions */}
      {hasStrokes && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs text-white/50">{strokeCount} stroke{strokeCount !== 1 ? "s" : ""}</span>
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
    </>
  );
}