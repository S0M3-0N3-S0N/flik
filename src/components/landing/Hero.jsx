import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { ArrowRight, Sparkles, Zap, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FF6B35]/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FFB800]/10 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 container mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-[#FF6B35]" />
            <span className="text-sm font-medium text-white/80">The Next Gen AI Creative Studio</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8">
            <span className="block text-white mb-2">Imagine. Create.</span>
            <span className="gradient-text">Inspire.</span>
          </h1>

          <p className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto mb-10 leading-relaxed">
            Unleash your creative potential with Flik. Transform text into breathtaking art, 
            edit photos with magic, and bring your wildest ideas to life in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={createPageUrl("Generate")}>
              <Button className="h-12 px-8 rounded-full btn-gradient text-white text-lg font-medium shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 transition-all">
                Start Creating Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to={createPageUrl("Gallery")}>
              <Button variant="outline" className="h-12 px-8 rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white transition-all backdrop-blur-sm">
                Explore Gallery
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Floating UI Elements Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-20 relative max-w-5xl mx-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent z-10" />
          <div className="glass-card rounded-2xl border border-white/10 p-2 shadow-2xl overflow-hidden">
             <img 
               src="https://images.unsplash.com/photo-1620641788421-7f1c918e0ce3?q=80&w=2600&auto=format&fit=crop" 
               alt="App Interface" 
               className="w-full h-auto rounded-xl opacity-80"
             />
          </div>
        </motion.div>
      </div>
    </section>
  );
}