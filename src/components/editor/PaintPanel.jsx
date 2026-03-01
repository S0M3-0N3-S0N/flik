import React, { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, Trash2, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const TOOLS = [
  {
    id: "marker",
    label: "Marker",
    defaultColor: "#2196F3",
    render: (color, isActive) => <MarkerSVG color={color} isActive={isActive} />,
  },
  {
    id: "pen",
    label: "Pen",
    defaultColor: "#F72C25",
    render: (color, isActive) => <PenSVG color={color} isActive={isActive} />,
  },
  {
    id: "highlighter",
    label: "Highlighter",
    defaultColor: "#FFD600",
    render: (color, isActive) => <HighlighterSVG color={color} isActive={isActive} />,
  },
  {
    id: "eraser",
    label: "Eraser",
    defaultColor: "#FFB5C0",
    render: (color, isActive) => <EraserSVG isActive={isActive} />,
  },
];

function MarkerSVG({ color, isActive }) {
  return (
    <svg width="36" height="80" viewBox="0 0 36 80" fill="none">
      {/* Cap */}
      <rect x="9" y="2" width="18" height="22" rx="5" fill={color} />
      {/* Lightning bolt on cap */}
      <path d="M17 8 L13 16 H17 L15 22 L21 14 H17 L19 8Z" fill="white" opacity="0.7" />
      {/* Body */}
      <rect x="7" y="22" width="22" height="42" rx="4" fill="white" stroke="#e0e0e0" strokeWidth="1" />
      {/* Color band */}
      <rect x="10" y="28" width="16" height="5" rx="2" fill={color} opacity="0.85" />
      {/* Tip taper */}
      <path d="M13 64 L18 74 L23 64 Z" fill={color} />
      {isActive && <rect x="7" y="22" width="22" height="42" rx="4" fill="none" stroke={color} strokeWidth="2" />}
    </svg>
  );
}

function PenSVG({ color, isActive }) {
  return (
    <svg width="36" height="80" viewBox="0 0 36 80" fill="none">
      {/* Cap */}
      <rect x="11" y="2" width="14" height="20" rx="4" fill={color} />
      {/* Body */}
      <rect x="8" y="20" width="20" height="40" rx="3" fill="white" stroke="#e0e0e0" strokeWidth="1" />
      {/* Color band bottom of body */}
      <rect x="8" y="52" width="20" height="8" rx="0" fill={color} opacity="0.85" />
      {/* Taper to tip */}
      <path d="M12 60 L18 72 L24 60 Z" fill={color} />
      {isActive && <rect x="8" y="20" width="20" height="40" rx="3" fill="none" stroke={color} strokeWidth="2" />}
    </svg>
  );
}

function HighlighterSVG({ color, isActive }) {
  return (
    <svg width="36" height="80" viewBox="0 0 36 80" fill="none">
      {/* Wide cap */}
      <rect x="8" y="2" width="20" height="16" rx="4" fill={color} />
      {/* Wide body */}
      <rect x="6" y="16" width="24" height="46" rx="3" fill="white" stroke="#e0e0e0" strokeWidth="1" />
      {/* Color accent */}
      <rect x="9" y="22" width="18" height="5" rx="2" fill={color} opacity="0.85" />
      {/* Flat tip */}
      <rect x="10" y="62" width="16" height="10" rx="2" fill={color} />
      {isActive && <rect x="6" y="16" width="24" height="46" rx="3" fill="none" stroke={color} strokeWidth="2" />}
    </svg>
  );
}

function EraserSVG({ isActive }) {
  return (
    <svg width="36" height="80" viewBox="0 0 36 80" fill="none">
      {/* Eraser body - pink rectangular block */}
      <rect x="8" y="10" width="20" height="56" rx="4" fill="#FFB5C0" stroke="#f090a0" strokeWidth="1" />
      {/* White stripe */}
      <rect x="8" y="10" width="20" height="14" rx="4" fill="white" stroke="#e0e0e0" strokeWidth="1" />
      {/* Bottom flat */}
      <rect x="8" y="62" width="20" height="4" rx="2" fill="#f090a0" />
      {isActive && <rect x="8" y="10" width="20" height="56" rx="4" fill="none" stroke="#F72C25" strokeWidth="2" />}
    </svg>
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
  activeTool,
  onToolChange,
}) {
  const [showSettings, setShowSettings] = useState(false);

  const currentTool = TOOLS.find(t => t.id === activeTool) || TOOLS[0];

  const handleToolClick = (tool) => {
    if (onToolChange) onToolChange(tool.id);
    if (tool.id !== "eraser") {
      onBrushColorChange(tool.defaultColor);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Main toolbar — floating pill */}
      <div className="flex items-end justify-center gap-4 bg-white rounded-2xl shadow-xl px-5 py-3">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool)}
            className={cn(
              "flex items-end justify-center transition-transform duration-150",
              (activeTool || "marker") === tool.id ? "translate-y-[-8px]" : "hover:translate-y-[-4px]"
            )}
            title={tool.label}
          >
            {tool.render(
              tool.id === "eraser" ? "#FFB5C0" : (activeTool === tool.id ? brushColor : tool.defaultColor),
              (activeTool || "marker") === tool.id
            )}
          </button>
        ))}

        {/* Active color dot */}
        <label
          htmlFor="paint-color-picker"
          className="flex items-center justify-center mb-2 cursor-pointer"
          title="Pick color"
        >
          <div
            className="w-10 h-10 rounded-full shadow-inner border-2 border-white"
            style={{ backgroundColor: activeTool === "eraser" ? "#FFB5C0" : brushColor, boxShadow: "inset 0 2px 6px rgba(0,0,0,0.2)" }}
          />
          <input
            id="paint-color-picker"
            type="color"
            value={brushColor}
            onChange={(e) => onBrushColorChange(e.target.value)}
            className="sr-only"
          />
        </label>

        {/* Settings toggle */}
        <button
          onClick={() => setShowSettings(s => !s)}
          className={cn(
            "flex items-center justify-center mb-2 w-10 h-10 rounded-xl transition-colors",
            showSettings ? "bg-gray-200" : "bg-gray-100 hover:bg-gray-200"
          )}
          title="Settings"
        >
          <Menu className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Expanded settings */}
      {showSettings && (
        <div className="w-full space-y-4 bg-white/5 border border-white/10 rounded-2xl p-4">
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
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-white/40">{strokeCount} stroke{strokeCount !== 1 ? "s" : ""}</span>
              <div className="flex gap-2">
                <button
                  onClick={onUndoLastStroke}
                  className="flex items-center gap-1 text-xs text-white/50 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Undo
                </button>
                <button
                  onClick={onClearStrokes}
                  className="flex items-center gap-1 text-xs text-white/50 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
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