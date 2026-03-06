import React, { useState } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

export default function DiscoverCard({ creation, likeCount, isLiked, onClick, index }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.5), duration: 0.35 }}
      className="group relative rounded-xl overflow-hidden cursor-pointer bg-[#141414] border border-white/5 hover:border-white/15 transition-all duration-300 hover:shadow-xl"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative overflow-hidden">
        {!imgLoaded && (
          <div className="absolute inset-0 bg-[#1a1a1a] animate-pulse" style={{ minHeight: 120 }} />
        )}
        <img
          src={creation.thumbnail_url || creation.url}
          alt={creation.title || "Discovery"}
          className={`w-full h-auto block transition-transform duration-500 group-hover:scale-105 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          {creation.prompt && (
            <p className="text-[11px] text-white/75 line-clamp-2 mb-2 leading-relaxed">{creation.prompt}</p>
          )}
          <div className="flex items-center gap-1.5 text-white/90 text-xs">
            <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-[#FF6B35] text-[#FF6B35]" : ""}`} />
            <span className="font-medium">{likeCount || 0}</span>
          </div>
        </div>
      </div>

      {/* Like badge - always visible when liked */}
      {isLiked && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <Heart className="w-3 h-3 fill-[#FF6B35] text-[#FF6B35]" />
        </div>
      )}
    </motion.div>
  );
}