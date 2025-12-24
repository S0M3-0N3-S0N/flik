import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Wand2, Zap, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background Gradients - Stripe-esque */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Main large diagonal gradient */}
        <div 
            className="absolute top-[-20%] left-[-10%] w-[80%] h-[150%] bg-gradient-to-br from-[#FF6B35]/20 via-[#F72C25]/10 to-transparent blur-[120px] transform -rotate-12 opacity-80"
        />
        <div 
            className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[100%] bg-gradient-to-tl from-[#FFB800]/20 via-[#FF6B35]/10 to-transparent blur-[100px] opacity-60"
        />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px"
          }}
        />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          
          {/* Left Column: Text */}
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-[#FF6B35] animate-pulse"></span>
                <span className="text-xs font-medium text-white/80 tracking-wide uppercase">AI Creative Studio 2.0</span>
                <ArrowRight className="w-3 h-3 text-white/40 ml-1" />
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
                Creative infrastructure for your <br/>
                <span className="gradient-text">imagination</span>
              </h1>
              
              <p className="text-xl text-white/60 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Join thousands of creators using Flik to generate stunning artwork, 
                edit photos with AI, and build professional assets in seconds.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Button 
                  onClick={() => base44.auth.redirectToLogin()}
                  className="h-12 px-8 rounded-full btn-gradient text-base font-semibold group"
                >
                  Start creating now
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button 
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  variant="ghost" 
                  className="h-12 px-8 rounded-full text-white/80 hover:text-white hover:bg-white/5 font-medium"
                >
                  View features
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Visual Component (Stripe-like Card) */}
          <div className="flex-1 w-full max-w-[600px] lg:max-w-none perspective-1000">
            <motion.div
              initial={{ opacity: 0, rotateY: -20, rotateX: 10, scale: 0.9 }}
              animate={{ opacity: 1, rotateY: -10, rotateX: 5, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
              style={{ transformStyle: "preserve-3d" }}
            >
                {/* Abstract decorative elements behind card */}
                <div className="absolute top-10 -right-10 w-40 h-40 bg-[#FF6B35] rounded-full blur-[80px] opacity-40 animate-pulse-glow" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#FFB800] rounded-full blur-[80px] opacity-40 animate-pulse-glow" style={{ animationDelay: '1s' }} />

                {/* Simplified Visual Component */}
                <div className="relative perspective-1000">
                    {/* Main Mockup */}
                    <div className="relative z-10 bg-[#141414] border border-white/10 rounded-2xl shadow-2xl overflow-hidden group">
                        {/* Browser-like Header */}
                        <div className="h-10 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                            <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                            <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                            <div className="ml-4 flex-1 h-5 bg-black/20 rounded-md max-w-[200px]" />
                        </div>

                        {/* Content */}
                        <div className="relative aspect-[4/3] bg-black">
                            <img 
                                src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop" 
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
                                alt="AI Generation"
                            />
                            
                            {/* Minimal Prompt Overlay */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm">
                                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-full p-2 pl-4 flex items-center gap-3 shadow-2xl">
                                    <div className="w-1.5 h-4 bg-[#FF6B35] animate-pulse rounded-full" />
                                    <span className="text-sm text-white/90 font-medium truncate">A futuristic glass city...</span>
                                    <div className="ml-auto w-8 h-8 rounded-full bg-[#FF6B35] flex items-center justify-center">
                                        <Wand2 className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Subtle Glow Behind */}
                    <div className="absolute -inset-4 bg-gradient-to-r from-[#FF6B35] to-[#FFB800] opacity-20 blur-3xl -z-10 rounded-full" />
                </div>
            </motion.div>
          </div>
          
        </div>
      </div>
    </section>
  );
}