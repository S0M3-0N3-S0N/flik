import React from "react";
import { motion } from "framer-motion";
import { Heart, Share2 } from "lucide-react";

export default function DiscoverCard({ creation, likeCount, isLiked, onClick, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group relative rounded-2xl overflow-hidden cursor-pointer bg-[#141414] border border-white/5 hover:border-[#FF6B35]/40 transition-all duration-300 hover:shadow-2xl hover:shadow-[#FF6B35]/10"
      onClick={onClick}
    >
      <div className="aspect-[3/4] relative overflow-hidden">
        <img
          src={creation.thumbnail_url || creation.url}
          alt={creation.title || "Discovery"}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Bottom info on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          {creation.prompt && (
            <p className="text-xs text-white/70 line-clamp-2 mb-2">{creation.prompt}</p>
          )}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-white/80 text-xs">
              <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-[#FF6B35] text-[#FF6B35]" : ""}`} />
              <span>{likeCount}</span>
            </div>
            <div className="flex items-center gap-1 text-white/80 text-xs">
              <Share2 className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}