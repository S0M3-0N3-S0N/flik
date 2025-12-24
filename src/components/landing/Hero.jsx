import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "../../utils";

export default function Hero() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={containerRef} className="relative min-h-[120vh] flex flex-col items-center pt-32 px-6 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-[#FF6B35]/20 via-[#FF6B35]/5 to-transparent blur-[120px] rounded-full" />
      </div>

      <motion.div 
        style={{ y, opacity }}
        className="relative z-10 text-center max-w-5xl mx-auto"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-[#FF6B35] mb-8 backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            <span>The Next Generation of AI Art</span>
          </span>

          <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter mb-8 leading-[0.9]">
            Create. <br />
            <span className="gradient-text">Reimagine.</span>
          </h1>

          <p className="text-xl md:text-2xl text-white/60 max-w-2xl mx-auto mb-12 leading-relaxed">
            Professional photo studio and AI generation tools in one seamless interface. 
            Designed for creators who demand perfection.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button 
              onClick={() => navigate(createPageUrl("Generate"))}
              className="h-14 px-8 rounded-full text-lg btn-gradient"
            >
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              className="h-14 px-8 rounded-full text-lg text-white hover:bg-white/10"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn more
            </Button>
          </div>
        </motion.div>

        {/* Floating UI Card Preview */}
        <motion.div
          initial={{ opacity: 0, y: 100, rotateX: 20 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
          className="mt-20 relative mx-auto max-w-5xl perspective-1000"
        >
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-[#FF6B35]/10 bg-[#141414] aspect-[16/9]">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none z-20" />
            
            {/* Abstract UI representation */}
            <div className="absolute inset-0 flex">
              {/* Sidebar */}
              <div className="w-64 border-r border-white/5 bg-[#0A0A0A] p-4 hidden md:flex flex-col gap-4">
                <div className="w-full h-8 bg-white/10 rounded-lg animate-pulse" />
                <div className="w-3/4 h-4 bg-white/5 rounded-lg" />
                <div className="w-1/2 h-4 bg-white/5 rounded-lg" />
                <div className="mt-8 flex-1 space-y-3">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className="w-full h-10 bg-white/5 rounded-lg" />
                    ))}
                </div>
              </div>
              {/* Main Area */}
              <div className="flex-1 p-8 flex items-center justify-center bg-[#141414]">
                 <div className="relative w-full max-w-md aspect-square rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                    <img 
                        src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
                        alt="Abstract Art" 
                        className="w-full h-full object-cover"
                    />
                    {/* Floating Controls */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                        <div className="w-8 h-8 rounded-full bg-[#FF6B35] flex items-center justify-center">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <div className="h-4 w-24 bg-white/20 rounded-full" />
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}