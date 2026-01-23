import React from "react";

export default function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-[#141414] to-[#0a0a0a] border border-white/5 animate-pulse"
        >
          <div className="w-full h-full bg-white/5" />
        </div>
      ))}
    </div>
  );
}