import React, { useRef, useState } from "react";
import { Paintbrush, Eraser, RotateCcw, Trash2, Plus } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

// Rainbow-ordered color palette: one long row per hue family, dark → light
// Includes all primary + secondary + tertiary colors. Only 1 black and 1 white.
const COLOR_FAMILIES = [
  // ❤️ Reds
  ["#3D0000","#660000","#8B0000","#B22222","#CC0000","#E50000","#FF0000","#FF3333","#FF6666","#FF9999","#FFCCCC"],
  // 🟧 Red-Oranges
  ["#4D1100","#7A1A00","#A02000","#C83200","#E84400","#FF4500","#FF6622","#FF8855","#FFAA88","#FFCCBB"],
  // 🟠 Oranges
  ["#3D1A00","#6B2E00","#994400","#CC5500","#E56600","#FF6600","#FF8800","#FFAA33","#FFCC77","#FFEEBB"],
  // 🟡 Yellow-Oranges
  ["#4D3300","#7A5000","#A07000","#CC9000","#E5AA00","#FFC000","#FFD000","#FFE033","#FFEE88","#FFF5CC"],
  // 💛 Yellows
  ["#3D3D00","#6B6B00","#999900","#CCCC00","#E5E500","#FFFF00","#FFFF33","#FFFF77","#FFFFAA","#FFFFDD"],
  // 🟢 Yellow-Greens
  ["#1E3300","#3A5C00","#558000","#70AA00","#88CC00","#AAEE00","#BBFF00","#CCFF44","#DDFF88","#EEFFBB"],
  // 🟢 Greens
  ["#003300","#005500","#007700","#009900","#00BB00","#00CC00","#00EE00","#33FF33","#77FF77","#AAFFAA","#DDFFDD"],
  // 🌿 Blue-Greens / Teals
  ["#002B1A","#004D33","#007755","#009966","#00BB88","#00CCAA","#00EEBB","#33FFCC","#77FFDD","#AAFFF0"],
  // 🩵 Cyans
  ["#003333","#005555","#007777","#009999","#00BBBB","#00CCCC","#00EEEE","#33FFFF","#77FFFF","#AAFFFF"],
  // 🩵 Sky Blues
  ["#001F3F","#003366","#005599","#0077CC","#1199EE","#33AAFF","#55BBFF","#88CCFF","#BBDDFF","#DDEEFF"],
  // 💙 Blues
  ["#000044","#000077","#0000AA","#0000DD","#2222FF","#5555FF","#7777FF","#9999FF","#BBBBFF","#DDDDFF"],
  // 🟣 Indigos / Blue-Purples
  ["#0D0033","#1A0066","#2E0099","#4400CC","#5500EE","#6611FF","#8844FF","#AA77FF","#CCAAFF","#EEDDFF"],
  // 💜 Purples / Violets
  ["#220033","#440066","#660099","#8800BB","#AA00CC","#BB11DD","#CC33EE","#DD66FF","#EE99FF","#FFCCFF"],
  // 🩷 Magentas / Hot Pinks
  ["#330022","#660044","#990066","#BB0088","#DD00AA","#FF00CC","#FF33DD","#FF66EE","#FF99F5","#FFCCFF"],
  // 🌸 Pinks / Rose
  ["#440022","#770044","#AA0055","#CC2266","#EE4488","#FF55AA","#FF77BB","#FF99CC","#FFBBDD","#FFDDEE"],
  // 🤎 Browns / Earth
  ["#1A0800","#3D1500","#6B2D00","#8B4513","#A0522D","#BC6C25","#D4935A","#E8B48A","#F5D0B0","#FFF0E8"],
  // ⬛⬜ Black & White only
  ["#000000","#FFFFFF"],
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
  const [recentColors, setRecentColors] = useState([]);

  const handleColorSelect = (color) => {
    onBrushColorChange(color);
    setRecentColors(prev => {
      const filtered = prev.filter(c => c !== color);
      return [color, ...filtered].slice(0, 7);
    });
  };

  // Flatten all colors into one scrollable row (color-coordinated order)
  const allColors = COLOR_FAMILIES.flat();

  return (
    <div className="space-y-4 md:space-y-0 md:grid md:grid-rows-[auto,1fr,auto] md:h-full md:gap-4">
      {/* Top Controls Row - Desktop */}
      <div className="hidden md:grid md:grid-cols-3 md:gap-3">
        {/* Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
          <button
            onClick={() => onPaintModeChange("draw")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all",
              paintMode === "draw"
                ? "bg-gradient-to-r from-[#FF6B35] to-[#F72C25] text-white shadow-lg"
                : "text-white/50 hover:text-white"
            )}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            Brush
          </button>
          <button
            onClick={() => onPaintModeChange("erase")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all",
              paintMode === "erase"
                ? "bg-white/20 text-white shadow-lg"
                : "text-white/50 hover:text-white"
            )}
          >
            <Eraser className="w-3.5 h-3.5" />
            Erase
          </button>
        </div>

        {/* Weight */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
          <p className="text-xs font-medium text-white/80 whitespace-nowrap">Weight</p>
          <Slider
            value={[brushSize]}
            min={2}
            max={80}
            step={1}
            onValueChange={([v]) => onBrushSizeChange(v)}
            className="flex-1"
          />
          <span className="text-xs text-white/60 font-mono w-6 text-right">{brushSize}</span>
        </div>

        {/* Transparency */}
        {paintMode === "draw" && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs font-medium text-white/80 whitespace-nowrap">Opac.</p>
            <Slider
              value={[onBrushOpacityChange ? brushOpacity : 100]}
              min={1}
              max={100}
              step={1}
              onValueChange={([v]) => onBrushOpacityChange?.(v)}
              className="flex-1"
            />
            <span className="text-xs text-white/60 font-mono w-6 text-right">{onBrushOpacityChange ? brushOpacity : 100}%</span>
          </div>
        )}
      </div>

      {/* Mobile Controls - Hidden on Desktop */}
      <div className="md:hidden flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
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
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Color</p>
            {/* Custom color picker */}
            <button
              onClick={() => colorInputRef.current?.click()}
              className="relative w-7 h-7 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/20"
              style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}
              title="Custom color"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-black/60 flex items-center justify-center">
                <Plus className="w-2 h-2 text-white" />
              </div>
              <input
                ref={colorInputRef}
                type="color"
                value={brushColor}
                onChange={(e) => handleColorSelect(e.target.value)}
                className="absolute opacity-0 w-0 h-0 pointer-events-none"
              />
            </button>
          </div>

          {/* Currently selected color preview */}
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/10">
            <div
              className="w-8 h-8 rounded-full flex-shrink-0 border-2 border-white/30 shadow-lg"
              style={{ backgroundColor: brushColor }}
            />
            <div>
              <p className="text-xs text-white/80 font-medium">Selected</p>
              <p className="text-xs text-white/40 font-mono">{brushColor.toUpperCase()}</p>
            </div>
          </div>

          {/* Recent colors */}
          {recentColors.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">Recent</p>
              <div className="flex gap-2">
                {recentColors.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => handleColorSelect(color)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all duration-150 flex-shrink-0",
                      brushColor === color
                        ? "border-[#FF6B35] scale-110 shadow-lg shadow-[#FF6B35]/40"
                        : "border-white/20 hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Scrollable color rows — one per hue family */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">All Colors · swipe →</p>
            <div
              className="space-y-1.5 overflow-x-auto pb-1"
              style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <style>{`.color-row::-webkit-scrollbar { display: none; }`}</style>
              {COLOR_FAMILIES.map((family, fi) => (
                <div key={fi} className="color-row flex gap-1.5 md:gap-2 overflow-x-auto pb-0.5 w-full" style={{ scrollbarWidth: "none" }}>
                  {family.map((color, i) => (
                    <button
                      key={i}
                      onClick={() => handleColorSelect(color)}
                      className={cn(
                        "w-8 h-8 md:w-10 md:h-10 rounded-full border-2 transition-all duration-150 flex-shrink-0",
                        brushColor === color
                          ? "border-[#FF6B35] scale-125 shadow-lg shadow-[#FF6B35]/50"
                          : "border-transparent hover:scale-110",
                        color === "#FFFFFF" || color === "#FFFFDD" || color === "#FFDDFF" ? "border-white/20" : ""
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              ))}
            </div>
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
          className="w-full"
        />
      </div>

      {/* Transparency / Opacity */}
      {paintMode === "draw" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white/80">Transparency</p>
            <span className="text-sm text-white/60 bg-white/10 rounded-lg px-3 py-1 font-mono min-w-[48px] text-center">{onBrushOpacityChange ? brushOpacity : 100}%</span>
          </div>
          <Slider
            value={[onBrushOpacityChange ? brushOpacity : 100]}
            min={1}
            max={100}
            step={1}
            onValueChange={([v]) => onBrushOpacityChange?.(v)}
            className="w-full"
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
  );
}