import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function ProcessingOverlay({ tool }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 rounded-2xl"
    >
      <div className="text-center relative">
        <div className="relative w-24 h-24 mx-auto mb-8 flex items-center justify-center">
          {/* Outer glow pulse */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#FF6B35] to-[#FFB800] blur-xl"
          />
          
          {/* Rotating gradient ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{
              background: "linear-gradient(135deg, #FF6B35, #F72C25, #FFB800) border-box",
              WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude"
            }}
          />
          
          {/* Inner icon container */}
          <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center relative z-10 border border-white/10">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="w-8 h-8 text-[#FF6B35]" />
            </motion.div>
          </div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70">
            {tool?.label || "Processing"}...
          </h3>
          <p className="text-sm text-white/40 font-medium tracking-wide uppercase text-[10px]">
            AI IS WORKING ITS MAGIC
          </p>
        </motion.div>
        
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ height: [4, 12, 4], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
              className="w-1 rounded-full bg-gradient-to-b from-[#FF6B35] to-[#FFB800]"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}