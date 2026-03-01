import React, { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Tool icons ──────────────────────────────────────────────────────────────

function MarkerIcon({ color, active }) {
  return (
    <svg width="28" height="64" viewBox="0 0 28 64" fill="none">
      {/* cap */}
      <rect x="6" y="1" width="16" height="16" rx="4" fill={color} />
      <rect x="9" y="4" width="4" height="8" rx="2" fill="white" opacity="0.35" />
      {/* body */}
      <rect x="5" y="16" width="18" height="34" rx="3" fill={active ? color : "#f5f5f5"} opacity={active ? 0.15 : 1} />
      <rect x="5" y="16" width="18" height="34" rx="3" stroke={color} strokeWidth={active ? 2 : 1.5} fill="none" />
      {/* label band */}
      <rect x="7" y="22" width="14" height="4" rx="2" fill={color} opacity="0.6" />
      {/* tip taper */}
      <path d="M10 50 L14 61 L18 50Z" fill={color} />
    </svg>
  );
}

function PenIcon({ color, active }) {
  return (
    <svg width="28" height="64" viewBox="0 0 28 64" fill="none">
      {/* clip */}
      <rect x="16" y="1" width="5" height="20" rx="2.5" fill={color} opacity="0.7" />
      {/* cap */}
      <rect x="7" y="1" width="14" height="14" rx="3" fill={color} />
      <rect x="10" y="3" width="3" height="7" rx="1.5" fill="white" opacity="0.35" />
      {/* body */}
      <rect x="6" y="14" width="16" height="34" rx="2" fill={active ? color : "#f5f5f5"} opacity={active ? 0.15 : 1} />
      <rect x="6" y="14" width="16" height="34" rx="2" stroke={color} strokeWidth={active ? 2 : 1.5} fill="none" />
      {/* tip */}
      <path d="M10 48 L14 60 L18 48Z" fill={color} />
      <circle cx="14" cy="60" r="1.5" fill={color} />
    </svg>
  );
}

function CrayonIcon({ color, active }) {
  return (
    <svg width="28" height="64" viewBox="0 0 28 64" fill="none">
      {/* wrapper band top */}
      <rect x="6" y="1" width="16" height="8" rx="2" fill={color} />
      {/* body - textured crayon look */}
      <rect x="7" y="8" width="14" height="38" rx="2" fill={active ? color : "#f5f5f5"} opacity={active ? 0.15 : 1} />
      <rect x="7" y="8" width="14" height="38" rx="2" stroke={color} strokeWidth={active ? 2 : 1.5} fill="none" />
      {/* label area */}
      <rect x="9" y="16" width="10" height="14" rx="1" fill={color} opacity="0.12" />
      <rect x="9" y="16" width="10" height="14" rx="1" stroke={color} strokeWidth="0.75" opacity="0.4" fill="none" />
      {/* wrapper band bottom */}
      <rect x="6" y="42" width="16" height="8" rx="2" fill={color} opacity="0.85" />
      {/* waxy tip */}
      <path d="M10 50 L14 62 L18 50Z" fill={color} />
    </svg>
  );
}

function EraserIcon({ active }) {
  const pink = "#FF8FAB";
  return (
    <svg width="28" height="64" viewBox="0 0 28 64" fill="none">
      {/* white top */}
      <rect x="6" y="6" width="16" height="14" rx="3" fill="#f0f0f0" stroke="#d0d0d0" strokeWidth="1.2" />
      {/* pink body */}
      <rect x="6" y="19" width="16" height="32" rx="2" fill={active ? "#ff6b8a" : pink} />
      <rect x="6" y="19" width="16" height="32" rx="2" stroke={active ? "#F72C25" : "#e07090"} strokeWidth={active ? 2 : 1.2} fill="none" />
      {/* stripe */}
      <rect x="6" y="28" width="16" height="5" fill="white" opacity="0.3" />
      {/* flat bottom */}
      <rect x="8" y="51" width="12" height="6" rx="1" fill={active ? "#F72C25" : "#e07090"} />
    </svg>
  );
}

const TOOLS = [
  { id: "marker",     label: "Marker",     defaultColor: "#2196F3", Icon: MarkerIcon },
  { id: "pen",        label: "Pen",        defaultColor: "#F72C25", Icon: PenIcon },
  { id: "highlighter",label: "Crayon",     defaultColor: "#FFB800", Icon: CrayonIcon },
  { id: "eraser",     label: "Eraser",     defaultColor: "#FF8FAB", Icon: EraserIcon },
];

// ── Component ───────────────────────────────────────────────────────────────

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
  activeTool,
  onToolChange,
}) {
  const [showSettings, setShowSettings] = useState(false);

  const active = activeTool || "marker";
  const currentTool = TOOLS.find(t => t.id === active) || TOOLS[0];

  const handleToolClick = (tool) => {
    if (onToolChange) onToolChange(tool.id);
    if (tool.id !== "eraser") onBrushColorChange(tool.defaultColor);
  };

  return (
    <div className="flex flex-col items-center gap-3">

      {/* ── Floating toolbar pill ── */}
      <div className="flex items-end justify-center gap-3 bg-[#111] border border-white/10 rounded-2xl shadow-2xl px-4 py-3">
        {TOOLS.map((tool) => {
          const isActive = active === tool.id;
          const displayColor = tool.id === "eraser" ? "#FF8FAB"
            : (isActive ? brushColor : tool.defaultColor);
          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all duration-200",
                isActive ? "-translate-y-3" : "hover:-translate-y-1"
              )}
              title={tool.label}
            >
              <tool.Icon color={displayColor} active={isActive} />
              <span className={cn(
                "text-[10px] font-semibold tracking-wide transition-colors",
                isActive ? "text-[#FF6B35]" : "text-white/30"
              )}>
                {tool.label}
              </span>
            </button>
          );
        })}

        {/* divider */}
        <div className="w-px h-12 bg-white/10 self-center mx-1" />

        {/* color swatch */}
        <label
          htmlFor="paint-color-picker"
          className={cn(
            "flex flex-col items-center gap-1 self-end mb-1 cursor-pointer group",
            active === "eraser" && "pointer-events-none opacity-40"
          )}
          title="Pick color"
        >
          <div
            className="w-9 h-9 rounded-full border-[3px] border-white/20 group-hover:border-[#FF6B35] transition-colors shadow-lg"
            style={{ backgroundColor: brushColor }}
          />
          <span className="text-[10px] text-white/30 font-medium">Color</span>
          <input
            id="paint-color-picker"
            type="color"
            value={brushColor}
            onChange={(e) => onBrushColorChange(e.target.value)}
            className="sr-only"
          />
        </label>

        {/* settings toggle */}
        <button
          onClick={() => setShowSettings(s => !s)}
          className={cn(
            "flex flex-col items-center gap-1 self-end mb-1 w-9 h-9 rounded-xl transition-colors",
            showSettings
              ? "bg-gradient-to-br from-[#FF6B35] to-[#F72C25] text-white"
              : "bg-white/5 hover:bg-white/10 text-white/50"
          )}
          title="Settings"
        >
          {showSettings ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Expanded settings ── */}
      {showSettings && (
        <div className="w-full space-y-4 bg-[#111] border border-white/10 rounded-2xl p-4">

          {/* Size */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Size</p>
              <span className="text-xs text-white/60 font-mono">{brushSize}px</span>
            </div>
            <Slider
              value={[brushSize]}
              min={2} max={80} step={1}
              onValueChange={([v]) => onBrushSizeChange(v)}
              className="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-[#FF6B35] [&_[role=slider]]:to-[#FFB800]"
            />
          </div>

          {/* Opacity */}
          {active !== "eraser" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Opacity</p>
                <span className="text-xs text-white/60 font-mono">{Math.round(brushOpacity * 100)}%</span>
              </div>
              <Slider
                value={[Math.round(brushOpacity * 100)]}
                min={5} max={100} step={1}
                onValueChange={([v]) => onBrushOpacityChange(v / 100)}
                className="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-[#FF6B35] [&_[role=slider]]:to-[#FFB800]"
              />
            </div>
          )}

          {/* Stroke actions */}
          {hasStrokes && (
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-xs text-white/30 font-mono">{strokeCount} stroke{strokeCount !== 1 ? "s" : ""}</span>
              <div className="flex gap-2">
                <button
                  onClick={onUndoLastStroke}
                  className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Undo
                </button>
                <button
                  onClick={onClearStrokes}
                  className="flex items-center gap-1.5 text-xs text-white/50 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}