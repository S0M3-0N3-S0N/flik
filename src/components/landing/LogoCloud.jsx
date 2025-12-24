import React from "react";
import { motion } from "framer-motion";

// Placeholder logos - in production use real SVGs
const Logo = ({ name }) => (
  <div className="flex items-center gap-2 text-white/30 font-bold text-xl uppercase tracking-widest cursor-default select-none mx-8">
    <div className="w-8 h-8 rounded bg-white/10" />
    {name}
  </div>
);

export default function LogoCloud() {
  const logos = ["Acme Corp", "GlobalArt", "NextGen", "Studio 44", "Visionary", "PixelPerfect", "DesignLab", "CreativeAI"];

  return (
    <section className="py-10 border-y border-white/5 bg-[#0A0A0A]/50 backdrop-blur-sm overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-6">
        <p className="text-center text-sm text-white/40 uppercase tracking-widest">Trusted by creative teams at</p>
      </div>
      
      <div className="relative flex overflow-hidden mask-gradient">
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[#0A0A0A] to-transparent" />
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#0A0A0A] to-transparent" />
        
        <motion.div 
          className="flex whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ 
            duration: 30, 
            ease: "linear", 
            repeat: Infinity 
          }}
        >
          {[...logos, ...logos].map((logo, i) => (
            <Logo key={i} name={logo} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}