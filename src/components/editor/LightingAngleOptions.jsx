import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sun } from "lucide-react";
import Lighting3DInteractive from "./Lighting3DInteractive";

export default function LightingAngleOptions({ onSelect, onBack }) {
  const [selectedAngle, setSelectedAngle] = useState(null);

  const LIGHTING_ANGLES = [
    {
      id: "top",
      label: "Top",
      prompt: "Apply top-down lighting to this image, create dramatic shadows under features, studio-style overhead light, emphasize depth and contours"
    },
    {
      id: "front",
      label: "Front",
      prompt: "Apply even front lighting to this image, flattering soft light from the front, minimal harsh shadows, perfectly balanced illumination"
    },
    {
      id: "right",
      label: "Right",
      prompt: "Apply right-side lighting to this image, strong light from the right, emphasize texture and depth, create modeling shadows on the left"
    },
    {
      id: "left",
      label: "Left",
      prompt: "Apply left-side lighting to this image, strong light from the left, emphasize texture and dimension, create shadows on the right side"
    },
    {
      id: "back",
      label: "Back",
      prompt: "Apply backlit effect to this image, rim lighting around the edges, subject glowing against darker background, dramatic separation from background"
    },
    {
      id: "bottom",
      label: "Bottom",
      prompt: "Apply bottom-up lighting to this image, dramatic uplighting effect, create moody atmospheric shadows, theatrical lighting style"
    }
  ];

  const handleSelect = (angle) => {
    setSelectedAngle(angle.id);
    onSelect({
      id: "lighting",
      label: "Fix Lighting",
      prompt: angle.prompt,
      selectedAngle: angle.id
    });
  };

  const handle3DSelect = (tool) => {
    setSelectedAngle(null);
    onSelect(tool);
  };

  return (
    <div className="py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/5">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white/60 hover:text-white" />
        </button>
        <div className="flex items-center gap-2">
          <Sun className="w-5 h-5 text-[#FF6B35]" />
          <h2 className="text-lg font-semibold text-white">Relight</h2>
        </div>
      </div>

      {/* Quick Select */}
      <div>
        <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-4">
          Quick select
        </p>
        <div className="grid grid-cols-3 gap-3">
          {LIGHTING_ANGLES.map((angle, index) => (
            <motion.button
              key={angle.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleSelect(angle)}
              className={`
                py-3 px-4 rounded-2xl font-medium transition-all duration-300 border text-sm
                ${selectedAngle === angle.id
                  ? "bg-[#FF6B35] border-[#FF6B35] text-white"
                  : "bg-white/[0.03] border-white/5 text-white hover:bg-white/[0.08] hover:border-white/10"
                }
              `}
            >
              {angle.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Interactive Preview */}
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className={`w-40 h-40 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center relative cursor-grab ${
            isDragging ? "cursor-grabbing" : ""
          }`}
        >
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="60" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <circle cx="80" cy="80" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <g transform={`rotate(${rotation} 80 80)`}>
              <polygon points="80,20 95,75 80,65 65,75" fill="rgba(255, 107, 53, 0.3)" />
            </g>
          </svg>
        </div>
        <p className="text-center text-xs text-white/40 leading-relaxed">
          Hold and drag to change<br />light direction
        </p>
      </div>

      {/* Navigation Arrows */}
      <div className="flex items-center justify-between px-4">
        <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          <span className="text-white/40 text-xl">‹</span>
        </button>
        <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/5" />
        <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          <span className="text-white/40 text-xl">›</span>
        </button>
      </div>
    </div>
  );
}