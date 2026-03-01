import React, { useRef, useState } from "react";
import { Paintbrush, Eraser, RotateCcw, Trash2, Plus } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

// Full color-coordinated palette organized by hue family (dark → light per row)
const COLOR_FAMILIES = [
  // Reds
  ["#4A0000","#6B0000","#8B0000","#A00000","#B22222","#CC2200","#DD2222","#EE3333","#FF4444","#FF6666","#FF8888","#FFAAAA","#FFCCCC","#FFE5E5"],
  // Red-Oranges
  ["#5C1100","#7A1A00","#991500","#BB2200","#CC3300","#DD4400","#EE5500","#FF6633","#FF7744","#FF8855","#FFAA88","#FFCCAA","#FFDDCC","#FFEEEE"],
  // Oranges
  ["#4D1A00","#6B2800","#883300","#AA4400","#BB5500","#CC6600","#DD7700","#EE8800","#FF9900","#FFAA22","#FFBB55","#FFCC88","#FFDDAA","#FFEEDD"],
  // Yellow-Oranges
  ["#4D2D00","#6B4000","#886600","#AA8800","#BB9900","#CCAA00","#DDBB00","#EECC00","#FFD700","#FFE033","#FFE866","#FFF099","#FFF5BB","#FFFADD"],
  // Yellows
  ["#3D3D00","#5C5C00","#7A7A00","#999900","#AAAA00","#BBBB00","#CCCC00","#DDDD00","#EEEE00","#FFFF00","#FFFF44","#FFFF88","#FFFFAA","#FFFFDD"],
  // Yellow-Greens
  ["#1A3300","#2B4A00","#3D6600","#4F7F00","#669900","#77AA00","#88BB00","#99CC00","#AADD00","#BBEE00","#CCFF00","#DDFF55","#EEFF99","#F5FFCC"],
  // Greens
  ["#003300","#004D00","#006600","#007700","#008800","#009900","#00AA00","#00BB00","#00CC00","#00DD00","#00EE00","#44FF44","#88FF88","#CCFFCC"],
  // Blue-Greens
  ["#003322","#004D33","#006644","#007755","#008866","#009977","#00AA88","#00BB99","#00CCAA","#00DDBB","#00EECC","#44FFDD","#88FFEE","#CCFFF5"],
  // Teals / Cyans
  ["#003333","#004D4D","#006666","#007777","#008888","#009999","#00AAAA","#00BBBB","#00CCCC","#00DDDD","#00EEEE","#44FFFF","#88FFFF","#CCFFFF"],
  // Sky Blues
  ["#002244","#003366","#004488","#0055AA","#0066BB","#0077CC","#1188DD","#22AAEE","#33BBFF","#66CCFF","#99DDFF","#BBEEFF","#DDEEFF","#EEF8FF"],
  // Blues
  ["#000066","#000099","#0000BB","#0000DD","#1111EE","#2222FF","#4444FF","#6666FF","#8888FF","#AAAAFF","#CCCCFF","#DDDDFF","#EEEEFF","#F5F5FF"],
  // Blue-Purples / Indigos
  ["#1A0044","#280066","#380088","#4800AA","#5500BB","#6600CC","#7711DD","#8822EE","#9933FF","#AA55FF","#BB88FF","#CCAAFF","#DDCCFF","#EEEEFF"],
  // Purples / Violets
  ["#330033","#4D004D","#660066","#770077","#880088","#990099","#AA00AA","#BB22BB","#CC44CC","#DD66DD","#EE88EE","#FF99FF","#FFBBFF","#FFDDFF"],
  // Magentas / Pinks
  ["#440022","#660033","#880044","#AA0055","#CC0066","#DD1177","#EE2288","#FF33AA","#FF55BB","#FF77CC","#FF99DD","#FFBBEE","#FFDDFF","#FFF0FF"],
  // Hot Pinks / Rose
  ["#550022","#770033","#990044","#BB0055","#CC1166","#DD2277","#EE3388","#FF4499","#FF66AA","#FF88BB","#FFAACC","#FFCCDD","#FFEEEE","#FFF5F5"],
  // Browns / Earth tones
  ["#1A0A00","#2B1200","#3D1C00","#4F2800","#613300","#7A4400","#8B5513","#A0522D","#B8621A","#C8813A","#D4A574","#E8C4A0","#F0D8C0","#FFF0E8"],
  // Grays
  ["#000000","#111111","#222222","#333333","#444444","#555555","#666666","#777777","#888888","#999999","#AAAAAA","#BBBBBB","#CCCCCC","#DDDDDD"],
  // Light grays to white
  ["#AAAAAA","#BBBBBB","#CCCCCC","#DDDDDD","#E0E0E0","#E8E8E8","#EEEEEE","#F2F2F2","#F5F5F5","#F8F8F8","#FAFAFA","#FCFCFC","#FEFEFE","#FFFFFF"],
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
    <div className="space-y-5">
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

          {/* Scrollable color row */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">All Colors — swipe to explore</p>
            <div
              className="overflow-x-auto pb-2"
              style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <style>{`.color-scroll::-webkit-scrollbar { display: none; }`}</style>
              <div className="color-scroll flex gap-2 w-max">
                {allColors.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => handleColorSelect(color)}
                    className={cn(
                      "w-9 h-9 rounded-full border-2 transition-all duration-150 flex-shrink-0",
                      brushColor === color
                        ? "border-[#FF6B35] scale-110 shadow-lg shadow-[#FF6B35]/40"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
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