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

                {/* Main Visual Composition */}
                <div className="relative group perspective-1000">
                    {/* Layer 1: Base Dark Panel */}
                    <div className="bg-[#141414]/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-4 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] transform rotate-y-6 rotate-x-2 transition-transform duration-500 hover:rotate-y-0 hover:rotate-x-0 relative z-10 overflow-hidden h-[500px] w-full flex flex-col">
                        
                        {/* Top Bar */}
                        <div className="flex items-center justify-between px-4 py-2 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                            </div>
                            <div className="h-8 px-4 rounded-full bg-white/5 border border-white/5 flex items-center gap-2 text-xs text-white/40">
                                <span className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" />
                                Generating...
                            </div>
                        </div>

                        {/* Central Artwork (Floating) */}
                        <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/5 group-hover:border-[#FF6B35]/30 transition-colors mx-2 mb-2">
                             <img 
                                src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop" 
                                className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700 ease-out opacity-60 group-hover:opacity-100"
                                alt="AI Artwork"
                            />
                            
                            {/* Scanning Effect Overlay */}
                            <motion.div 
                                className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FF6B35]/20 to-transparent w-full h-[20%] blur-xl"
                                animate={{ top: ["-20%", "120%"] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            />

                            {/* Floating UI Elements on top of image */}
                            <motion.div 
                                className="absolute bottom-6 left-6 right-6"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#FFB800] flex items-center justify-center shadow-lg shadow-orange-500/20">
                                        <Wand2 className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs text-[#FF6B35] font-medium mb-0.5">Prompt</div>
                                        <div className="text-sm text-white truncate">"A futuristic glass city in the clouds..."</div>
                                    </div>
                                    <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-[#FF6B35] animate-spin" />
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Floating Elements (Parallax) */}
                    
                    {/* Top Right Floating Badge */}
                    <motion.div 
                        className="absolute -top-6 -right-6 z-20 bg-[#1a1a1a] border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-xl"
                        animate={{ y: [-10, 10, -10] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <div className="flex flex-col items-center gap-2">
                            <ImageIcon className="w-6 h-6 text-[#FF6B35]" />
                            <div className="text-xs font-bold text-white">4K Ready</div>
                        </div>
                    </motion.div>

                    {/* Bottom Left Floating Palette */}
                    <motion.div 
                        className="absolute -bottom-8 -left-8 z-20 bg-[#1a1a1a]/90 border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-xl"
                        animate={{ y: [10, -10, 10] }}
                        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Sparkles className="w-4 h-4 text-yellow-400" />
                            <span className="text-xs font-bold text-white">Styles</span>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 border border-white/20" />
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 border border-white/20" />
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 border border-white/20" />
                        </div>
                    </motion.div>

                    {/* Decorative blurred blobs behind */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-[#FF6B35]/10 to-[#FFB800]/10 blur-[100px] -z-10" />
                </div>
            </motion.div>
          </div>
          
        </div>
      </div>
    </section>
  );
}