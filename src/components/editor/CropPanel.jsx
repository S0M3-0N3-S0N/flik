import React from "react";
import { Button } from "@/components/ui/button";
import { Crop, Check, X } from "lucide-react";

const ASPECT_RATIOS = [
  { label: "Free", value: null, icon: "⊞" },
  { label: "1:1", value: 1, icon: "□" },
  { label: "16:9", value: 16/9, icon: "▭" },
  { label: "9:16", value: 9/16, icon: "▯" },
  { label: "4:3", value: 4/3, icon: "⬜" },
  { label: "3:4", value: 3/4, icon: "▬" },
];

export default function CropPanel({ onApplyCrop, onCancelCrop, onStartCrop, isCropping, onAspectRatioSelect, activeRatio }) {
  return (
    <div className="py-4 px-1 space-y-4">
      {/* Aspect Ratio Presets */}
      <div>
        <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Aspect Ratio</p>
        <div className="grid grid-cols-3 gap-2">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.label}
              onClick={() => onAspectRatioSelect && onAspectRatioSelect(ratio.value)}
              className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border transition-all ${
                activeRatio === ratio.value
                  ? "border-[#FF6B35] bg-[#FF6B35]/10 text-[#FF6B35]"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white"
              }`}
            >
              <span className="text-base leading-none">{ratio.icon}</span>
              <span className="text-[10px] font-medium">{ratio.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Crop action card */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center text-[#FF6B35]">
            <Crop className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-white font-medium text-sm">Crop & Resize</h4>
            <p className="text-xs text-white/40">
              {isCropping ? "Drag handles to adjust" : "Select ratio or start freeform"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {!isCropping ? (
          <Button
            onClick={onStartCrop}
            className="w-full btn-gradient text-white h-12 rounded-xl shadow-lg shadow-[#FF6B35]/20"
          >
            <Crop className="w-4 h-4 mr-2" />
            Start Crop
          </Button>
        ) : (
          <>
            <Button
              onClick={onApplyCrop}
              className="w-full btn-gradient text-white h-12 rounded-xl shadow-lg shadow-[#FF6B35]/20"
            >
              <Check className="w-4 h-4 mr-2" />
              Apply Crop
            </Button>
            <Button
              onClick={onCancelCrop}
              variant="ghost"
              className="w-full text-white/60 hover:text-white hover:bg-white/5 h-12 rounded-xl"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}