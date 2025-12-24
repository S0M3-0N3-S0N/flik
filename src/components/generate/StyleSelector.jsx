import React from "react";
import { Zap, Sparkles } from "lucide-react";

export const stylePresets = [
  { id: "photo", label: "Photorealistic", prompt: "ultra realistic photograph, 8k, highly detailed, professional photography" },
  { id: "cinematic", label: "Cinematic", prompt: "cinematic shot, movie still, dramatic lighting, film grain" },
  { id: "anime", label: "Anime", prompt: "anime style, studio ghibli inspired, vibrant colors, detailed" },
  { id: "oil", label: "Oil Painting", prompt: "oil painting, classic art style, visible brush strokes, artistic" },
  { id: "3d", label: "3D Render", prompt: "3d render, octane render, volumetric lighting, high quality" },
  { id: "watercolor", label: "Watercolor", prompt: "watercolor painting, soft edges, artistic, flowing colors" },
  { id: "pixel", label: "Pixel Art", prompt: "pixel art, 16-bit style, retro game aesthetic" },
  { id: "minimalist", label: "Minimalist", prompt: "minimalist design, clean lines, simple, modern" },
];

export default function StyleSelector({ selectedStyles = [], onSelect, onClear }) {
  const toggleStyle = (id) => {
    if (selectedStyles.includes(id)) {
      onSelect(selectedStyles.filter(s => s !== id));
    } else {
      onSelect([...selectedStyles, id]);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Style Presets</p>
          {selectedStyles.length > 0 && (
            <span className="text-[10px] bg-[#FF6B35]/20 text-[#FF6B35] px-1.5 py-0.5 rounded-full font-medium">
              {selectedStyles.length}
            </span>
          )}
        </div>
        {selectedStyles.length > 0 && (
          <button 
            onClick={onClear}
            className="text-xs text-[#FF6B35] hover:text-[#FF8B55] transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stylePresets.map((style) => {
          const isSelected = selectedStyles.includes(style.id);
          return (
            <button
              key={style.id}
              onClick={() => toggleStyle(style.id)}
              className={`
                relative group overflow-hidden rounded-xl p-3 text-left transition-all duration-300 border
                ${isSelected 
                  ? "bg-[#FF6B35]/10 border-[#FF6B35] shadow-[0_0_20px_rgba(255,107,53,0.15)]" 
                  : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                }
              `}
            >
              <div className={`absolute inset-0 bg-gradient-to-br from-[#FF6B35]/20 to-transparent opacity-0 transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'group-hover:opacity-50'}`} />
              
              <div className="relative z-10 flex flex-col gap-1">
                <span className={`text-sm font-medium transition-colors ${isSelected ? 'text-[#FF6B35]' : 'text-white/80'}`}>
                  {style.label}
                </span>
                <span className="text-[10px] text-white/40 line-clamp-1">
                  {style.prompt.split(',')[0]}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}