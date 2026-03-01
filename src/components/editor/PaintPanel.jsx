import React from "react";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  { label: "Red", value: "#F72C25" },
  { label: "Orange", value: "#FF6B35" },
  { label: "Yellow", value: "#FFD600" },
  { label: "Green", value: "#4CAF50" },
  { label: "Blue", value: "#2196F3" },
  { label: "Purple", value: "#9C27B0" },
  { label: "Pink", value: "#FF69B4" },
  { label: "Cyan", value: "#00BCD4" },
  { label: "White", value: "#FFFFFF" },
  { label: "Black", value: "#111111" },
];

// Marker SVG icon — styled like the image reference
function MarkerIcon({ color, isActive }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 cursor-pointer transition-transform duration-150",
        isActive ? "scale-110" : "scale-100 hover:scale-105"
      )}
    >
      <svg width="28" height="52" viewBox="0 0 28 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Cap */}
        <rect x="7" y="1" width="14" height="18" rx="4" fill={color} stroke={isActive ? "#fff" : "rgba(255,255,255,0.15)"} strokeWidth={isActive ? 2 : 1} />
        {/* Body */}
        <rect x="5" y="17" width="18" height="28" rx="3" fill="white" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
        {/* Color stripe on body */}
        <rect x="8" y="22" width="12" height="4" rx="1.5" fill={color} opacity="0.7" />
        {/* Tip */}
        <path d="M10 45 L14 51 L18 45 Z" fill={color} />
      </svg>
    </div>
  );
}

export default function PaintPanel({
  brushColor,
  onBrushColorChange,
  brushSize,
  onBrushSizeChange,
  brushOpacity,
  onBrushOpacityChange,
  onClearStrokes,
  onUndoLastStroke,
  hasStrokes,
  strokeCount,
}) {
  return (
    <div className="space-y-5">
      {/* Marker color picker */}
      <div>
        <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Color</p>
        <div className="flex items-end gap-3 overflow-x-auto pb-2 no-scrollbar">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onBrushColorChange(c.value)}
              title={c.label}
              className="flex-shrink-0"
            >
              <MarkerIcon color={c.value} isActive={brushColor === c.value} />
            </button>
          ))}
          {/* Custom color dot */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            <label
              htmlFor="custom-paint-color"
              className={cn(
                "w-7 h-7 rounded-full border-2 cursor-pointer block transition-transform hover:scale-110",
                !PRESET_COLORS.some(c => c.value === brushColor)
                  ? "border-white scale-110 shadow-lg"
                  : "border-white/20"
              )}
              style={{ backgroundColor: brushColor }}
              title="Custom color"
            />
            <span className="text-[10px] text-white/40">Custom</span>
            <input
              id="custom-paint-color"
              type="color"
              value={brushColor}
              onChange={(e) => onBrushColorChange(e.target.value)}
              className="sr-only"
            />
          </div>
        </div>
      </div>

      {/* Brush size */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-white/40 uppercase tracking-wider">Size</p>
          <span className="text-xs text-white/60">{brushSize}px</span>
        </div>
        <Slider
          value={[brushSize]}
          min={2}
          max={80}
          step={1}
          onValueChange={([v]) => onBrushSizeChange(v)}
        />
      </div>

      {/* Opacity */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-white/40 uppercase tracking-wider">Opacity</p>
          <span className="text-xs text-white/60">{Math.round(brushOpacity * 100)}%</span>
        </div>
        <Slider
          value={[Math.round(brushOpacity * 100)]}
          min={5}
          max={100}
          step={1}
          onValueChange={([v]) => onBrushOpacityChange(v / 100)}
        />
      </div>

      {/* Stroke actions */}
      {hasStrokes && (
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
          <span className="text-xs text-white/50">{strokeCount} stroke{strokeCount !== 1 ? "s" : ""}</span>
          <div className="flex gap-2">
            <button
              onClick={onUndoLastStroke}
              className="flex items-center gap-1 text-xs text-white/50 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
              title="Undo last stroke"
            >
              <RotateCcw className="w-3 h-3" />
              Undo
            </button>
            <button
              onClick={onClearStrokes}
              className="flex items-center gap-1 text-xs text-white/50 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
              title="Clear all strokes"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-white/30 text-center pt-1">Draw freely on your image with the selected marker</p>
    </div>
  );
}