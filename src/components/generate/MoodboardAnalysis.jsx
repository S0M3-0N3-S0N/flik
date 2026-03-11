import React from "react";
import { Palette, Sun, Layers, Heart, Wand2, Tag } from "lucide-react";

export default function MoodboardAnalysis({ profile }) {
  if (!profile) return null;

  return (
    <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center gap-2">
        <Wand2 className="w-4 h-4 text-[#FF6B35]" />
        <h3 className="text-sm font-semibold text-white">Style Analysis</h3>
      </div>

      {/* Color Palette */}
      {profile.color_palette?.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Palette className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Color Palette</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {profile.color_palette.map((color, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-black/30 rounded-lg px-2 py-1 border border-white/10">
                <div
                  className="w-3.5 h-3.5 rounded-sm border border-white/20 flex-shrink-0"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-[10px] text-white/60 font-medium">{color.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lighting */}
      {profile.lighting && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sun className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Lighting</span>
          </div>
          <p className="text-xs text-white/70 bg-black/20 rounded-lg px-3 py-2 border border-white/10">{profile.lighting}</p>
        </div>
      )}

      {/* Textures */}
      {profile.textures?.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Layers className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Textures</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.textures.map((t, i) => (
              <span key={i} className="text-xs bg-white/5 border border-white/10 text-white/60 px-2 py-1 rounded-lg">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Mood */}
      {profile.mood?.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Heart className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Mood</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.mood.map((m, i) => (
              <span key={i} className="text-xs bg-[#FF6B35]/10 border border-[#FF6B35]/20 text-[#FF6B35]/90 px-2 py-1 rounded-lg">{m}</span>
            ))}
          </div>
        </div>
      )}

      {/* Keywords */}
      {profile.keywords?.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Tag className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Style Keywords</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.keywords.slice(0, 8).map((k, i) => (
              <span key={i} className="text-[10px] bg-white/5 border border-white/10 text-white/50 px-2 py-0.5 rounded-full">{k}</span>
            ))}
          </div>
        </div>
      )}

      {/* Style Summary */}
      {profile.style_summary && (
        <div className="pt-2 border-t border-white/10">
          <p className="text-xs text-white/50 leading-relaxed italic">{profile.style_summary}</p>
        </div>
      )}
    </div>
  );
}