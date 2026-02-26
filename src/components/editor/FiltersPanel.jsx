import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const filters = [
  { id: "none", name: "Original", filter: "" },
  { id: "vintage", name: "Vintage", filter: "sepia(50%) saturate(120%) hue-rotate(-10deg)" },
  { id: "cool", name: "Cool", filter: "saturate(120%) brightness(105%) hue-rotate(10deg)" },
  { id: "warm", name: "Warm", filter: "saturate(130%) brightness(105%) hue-rotate(-10deg)" },
  { id: "dramatic", name: "Dramatic", filter: "contrast(150%) saturate(80%)" },
  { id: "dreamy", name: "Dreamy", filter: "brightness(110%) contrast(90%) saturate(120%)" },
  { id: "noir", name: "Noir", filter: "grayscale(100%) contrast(120%)" },
  { id: "fade", name: "Fade", filter: "brightness(110%) saturate(70%) contrast(80%)" },
  { id: "sunset", name: "Sunset", filter: "sepia(30%) saturate(140%) hue-rotate(-20deg)" },
  { id: "arctic", name: "Arctic", filter: "brightness(110%) saturate(60%) hue-rotate(180deg)" },
  { id: "vibrant", name: "Vibrant", filter: "saturate(200%) contrast(110%)" },
  { id: "soft", name: "Soft", filter: "brightness(105%) contrast(85%) saturate(90%)" },
  { id: "film", name: "Film", filter: "contrast(110%) saturate(90%) sepia(10%) brightness(95%)" },
];

export default function FiltersPanel({ selectedFilter, onFilterSelect, previewImage }) {
  return (
    <div className="py-6 px-4 grid grid-cols-2 gap-3 overflow-y-auto max-h-full pb-20">
      {filters.map((filter, index) => (
        <motion.button
          key={filter.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onFilterSelect(filter)}
          className={`
            relative group rounded-2xl overflow-hidden border transition-all text-left bg-[#141414]
            ${selectedFilter?.id === filter.id 
              ? "border-[#FF6B35] shadow-[0_0_20px_rgba(255,107,53,0.2)]" 
              : "border-white/5 hover:border-white/20"
            }
          `}
        >
          <div className="aspect-[4/3] overflow-hidden relative">
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
              style={{ 
                backgroundImage: previewImage ? `url(${previewImage})` : undefined,
                filter: filter.filter || 'none'
              }}
            />
            {selectedFilter?.id === filter.id && (
              <div className="absolute inset-0 bg-[#FF6B35]/20 mix-blend-overlay" />
            )}
          </div>
          
          <div className="p-3 bg-[#141414]">
            <p className={`text-xs font-medium transition-colors ${selectedFilter?.id === filter.id ? "text-[#FF6B35]" : "text-white/80 group-hover:text-white"}`}>
              {filter.name}
            </p>
          </div>
        </motion.button>
      ))}
    </div>
  );
}