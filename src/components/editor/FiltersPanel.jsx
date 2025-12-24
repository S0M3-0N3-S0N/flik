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
];

export default function FiltersPanel({ selectedFilter, onFilterSelect, previewImage }) {
  return (
    <div className="space-y-4 px-1">
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3">
        {filters.map((filter, index) => (
          <motion.button
            key={filter.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => onFilterSelect(filter)}
            className={`
              relative group rounded-xl overflow-hidden aspect-square no-invert
              ${selectedFilter?.id === filter.id ? "ring-2 ring-[#FF6B35]" : ""}
            `}
          >
            {/* Preview */}
            <div 
              className="w-full h-full bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20"
              style={{
                filter: filter.filter || 'none',
                backgroundImage: previewImage ? `url(${previewImage})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center"
              }}
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-end p-1.5 sm:p-2">
              <span className="text-white text-[10px] sm:text-xs font-medium truncate w-full">{filter.name}</span>
            </div>
            
            {/* Selected indicator */}
            {selectedFilter?.id === filter.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#FF6B35] flex items-center justify-center"
              >
                <Check className="w-4 h-4 text-white" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}