import React, { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, Trash2, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Tool icons ──────────────────────────────────────────────────────────────

function MarkerIcon({ color, active }) {
  // Thick Copic-style marker pointing down
  const bodyFill = active ? color : "#1e1e1e";
  const stroke = active ? color : "#333";
  return (
    <svg width="32" height="72" viewBox="0 0 32 72" fill="none">
      {/* rounded cap */}
      <rect x="9" y="2" width="14" height="10" rx="5" fill={color} />
      {/* neck ring */}
      <rect x="8" y="11" width="16" height="4" rx="1" fill={color} opacity="0.6" />
      {/* barrel */}
      <rect x="6" y="14" width="20" height="36" rx="4" fill={bodyFill} />
      {/* shine on barrel */}
      <rect x="8" y="16" width="3" height="28" rx="1.5" fill="white" opacity="0.07" />
      {/* color label band */}
      <rect x="6" y="38" width="20" height="12" rx="0" fill={color} opacity="0.9" />
      {/* bottom shoulder */}
      <rect x="8" y="50" width="16" height="4" rx="2" fill={color} />
      {/* bullet nib */}
      <rect x="11" y="54" width="10" height="6" rx="3" fill={color} />
      {/* nib tip dot */}
      <ellipse cx="16" cy="62" rx="4" ry="2.5" fill={color} />
      {active && <rect x="6" y="14" width="20" height="36" rx="4" stroke={color} strokeWidth="1.5" fill="none" />}
    </svg>
  );
}

function PenIcon({ color, active }) {
  // Sleek ballpoint pen
  const bodyFill = active ? color : "#1a1a1a";
  return (
    <svg width="32" height="72" viewBox="0 0 32 72" fill="none">
      {/* clip */}
      <rect x="19" y="2" width="3.5" height="26" rx="1.75" fill={color} opacity="0.75" />
      <rect x="19" y="27" width="3.5" height="3" rx="1" fill={color} />
      {/* cap top dome */}
      <ellipse cx="16" cy="5" rx="7" ry="4" fill={color} />
      {/* cap body */}
      <rect x="9" y="5" width="14" height="16" rx="1" fill={color} />
      {/* cap bottom edge */}
      <rect x="9" y="20" width="14" height="2" rx="1" fill={color} opacity="0.5" />
      {/* barrel */}
      <rect x="10" y="22" width="12" height="34" rx="2" fill={bodyFill} />
      {/* shine */}
      <rect x="12" y="24" width="2" height="28" rx="1" fill="white" opacity="0.06" />
      {/* grip section */}
      <rect x="10" y="52" width="12" height="4" rx="1" fill={color} opacity="0.3" />
      {/* cone to tip */}
      <path d="M12 56 L16 68 L20 56Z" fill={color} opacity="0.85" />
      {/* tiny ball tip */}
      <circle cx="16" cy="68" r="1.5" fill={color} />
      {active && <rect x="10" y="22" width="12" height="34" rx="2" stroke={color} strokeWidth="1.5" fill="none" />}
    </svg>
  );
}

function CrayonIcon({ color, active }) {
  // Classic chunky crayon with paper wrapper
  const bodyFill = active ? color : "#222";
  return (
    <svg width="32" height="72" viewBox="0 0 32 72" fill="none">
      {/* flat top */}
      <ellipse cx="16" cy="5" rx="8" ry="3.5" fill={color} />
      {/* upper paper wrapper band */}
      <rect x="8" y="4" width="16" height="10" rx="1" fill="white" opacity="0.12" />
      <rect x="8" y="4" width="16" height="10" rx="1" stroke="white" strokeWidth="0.5" opacity="0.2" fill="none" />
      {/* crayon body */}
      <rect x="8" y="13" width="16" height="38" rx="2" fill={color} opacity={active ? 1 : 0.85} />
      {/* body shine */}
      <rect x="10" y="15" width="3" height="32" rx="1.5" fill="white" opacity="0.12" />
      {/* lower paper wrapper */}
      <rect x="8" y="38" width="16" height="13" rx="1" fill="white" opacity="0.1" />
      <rect x="8" y="38" width="16" height="13" rx="1" stroke="white" strokeWidth="0.5" opacity="0.15" fill="none" />
      {/* text lines on label */}
      <rect x="11" y="42" width="10" height="1.5" rx="0.75" fill="white" opacity="0.2" />
      <rect x="11" y="46" width="7" height="1.5" rx="0.75" fill="white" opacity="0.15" />
      {/* wax tip taper */}
      <path d="M10 51 L16 64 L22 51Z" fill={color} />
      {/* tip point */}
      <circle cx="16" cy="64" r="1.5" fill={color} opacity="0.7" />
      {active && <rect x="8" y="13" width="16" height="38" rx="2" stroke="white" strokeWidth="1.5" opacity="0.5" fill="none" />}
    </svg>
  );
}

function EraserIcon({ active }) {
  return (
    <svg width="32" height="72" viewBox="0 0 32 72" fill="none">
      {/* white paper/cardboard top */}
      <rect x="8" y="4" width="16" height="10" rx="3" fill="#e8e8e8" />
      <rect x="8" y="4" width="16" height="10" rx="3" stroke="#bbb" strokeWidth="1" fill="none" />
      {/* shine on white part */}
      <rect x="10" y="6" width="3" height="6" rx="1.5" fill="white" opacity="0.6" />
      {/* pink eraser body */}
      <rect x="7" y="13" width="18" height="40" rx="3" fill={active ? "#ff5577" : "#FF8FAB"} />
      {/* body shine */}
      <rect x="9" y="15" width="3.5" height="34" rx="1.75" fill="white" opacity="0.15" />
      {/* horizontal stripe */}
      <rect x="7" y="30" width="18" height="5" fill="white" opacity="0.12" />
      {/* used/rubbed bottom edge */}
      <rect x="7" y="51" width="18" height="2" rx="1" fill={active ? "#cc2244" : "#e07090"} />
      {/* worn bottom face */}
      <rect x="9" y="53" width="14" height="6" rx="2" fill={active ? "#cc2244" : "#e07090"} opacity="0.8" />
      {active && <rect x="7" y="13" width="18" height="40" rx="3" stroke="#F72C25" strokeWidth="2" fill="none" />}
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
          <SlidersHorizontal className="w-4 h-4" />
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