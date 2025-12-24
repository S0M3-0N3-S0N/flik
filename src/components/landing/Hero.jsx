import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "../../utils";

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden pt-20">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[#FF6B35]/20 blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4
          }}
          className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-[#FFB800]/20 blur-[120px]" 
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm"
        >
          <Sparkles className="w-4 h-4 text-[#FF6B35]" />
          <span className="text-sm font-medium text-white/80">The Future of Creative AI is Here</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
        >
          Your Vision, <br />
          <span className="gradient-text">Unleashed by AI.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Generate stunning art, edit photos like a pro, and bring your ideas to life with advanced artificial intelligence. No skills required.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={() => base44.auth.redirectToLogin(createPageUrl("Generate"))}
            className="btn-gradient px-8 py-4 rounded-full text-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            Start Creating for Free
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => {
              const el = document.getElementById('features');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-8 py-4 rounded-full text-lg font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <PlayCircle className="w-5 h-5" />
            See How It Works
          </button>
        </motion.div>

        {/* Hero Visual */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-20 relative"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-[#FF6B35] to-[#FFB800] rounded-2xl blur opacity-20" />
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#141414] aspect-[16/9]">
             {/* Abstract Gradient Mesh mimicking a high-end AI result */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#000] to-[#1a1a1a]">
               <div className="absolute inset-0 opacity-60" style={{ 
                 backgroundImage: "radial-gradient(circle at 50% 50%, rgba(255,107,53,0.15), transparent 60%)",
               }} />
                {/* Mock UI Elements floating */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex items-center justify-center">
                    <img 
                        src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop" 
                        alt="Abstract AI Art" 
                        className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute bottom-8 left-8 right-8 h-20 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 flex items-center px-6 gap-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FFB800] flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                            <div className="h-2 w-24 bg-white/20 rounded-full mb-2" />
                            <div className="h-2 w-48 bg-white/10 rounded-full" />
                        </div>
                        <div className="px-4 py-2 bg-white/10 rounded-lg text-xs font-medium text-white/80">
                            Generating...
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}