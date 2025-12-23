import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function ProcessingOverlay({ tool }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-[#0A0A0A]/90 backdrop-blur-xl flex items-center justify-center z-50 rounded-2xl overflow-hidden"
    >
      {/* Breathing Gradient Background */}
      <motion.div 
        animate={{ 
          scale: [1, 1.15, 1],
          opacity: [0.5, 0.8, 0.5]
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity,
          ease: "easeInOut" 
        }}
        className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-b from-[#FF6B35]/40 to-transparent blur-[100px]" 
      />

      <div className="text-center relative z-10">

        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h3 className="text-3xl font-bold text-white">
            {tool?.label || "Processing"}...
          </h3>
          <p className="text-xs text-white/50 font-medium tracking-[0.3em] uppercase">
            AI IS WORKING ITS MAGIC
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}