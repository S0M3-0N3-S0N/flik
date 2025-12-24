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

                {/* Main Card */}
                <div className="bg-[#141414]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF6B35] via-[#F72C25] to-[#FFB800]" />
                    
                    {/* Header of the mock app */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#F72C25] flex items-center justify-center text-white">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">New Project</div>
                                <div className="text-xs text-white/40">AI Generation</div>
                            </div>
                        </div>
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
                        </div>
                    </div>

                    {/* Content of the mock app */}
                    <div className="space-y-4">
                        {/* Prompt Input Mock */}
                        <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                            <div className="flex items-center gap-3 mb-2">
                                <Wand2 className="w-4 h-4 text-[#FF6B35]" />
                                <span className="text-xs font-medium text-[#FF6B35]">Prompt</span>
                            </div>
                            <p className="text-sm text-white/80 font-mono">
                                "A futuristic cityscape with neon lights, cyberpunk style, 8k resolution, cinematic lighting..."
                                <span className="animate-pulse">|</span>
                            </p>
                        </div>

                        {/* Image Grid Mock */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="aspect-square rounded-lg bg-white/5 overflow-hidden relative group/img">
                                <img src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80" className="w-full h-full object-cover opacity-80 group-hover/img:opacity-100 transition-opacity" alt="AI Gen 1" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end p-2">
                                    <span className="text-[10px] text-white font-medium">Cyber City #1</span>
                                </div>
                            </div>
                            <div className="aspect-square rounded-lg bg-white/5 overflow-hidden relative group/img">
                                <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80" className="w-full h-full object-cover opacity-80 group-hover/img:opacity-100 transition-opacity" alt="AI Gen 2" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end p-2">
                                    <span className="text-[10px] text-white font-medium">Abstract Flow</span>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar Mock */}
                        <div className="bg-white/5 rounded-full h-1.5 w-full overflow-hidden">
                            <motion.div 
                                className="h-full bg-gradient-to-r from-[#FF6B35] to-[#FFB800]" 
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-white/40 uppercase tracking-wider font-medium">
                            <span>Processing</span>
                            <span>98%</span>
                        </div>
                    </div>

                    {/* Floating Badge */}
                    <motion.div 
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -right-4 top-1/2 -translate-y-1/2 bg-[#1a1a1a] border border-white/10 p-3 rounded-2xl shadow-xl backdrop-blur-md"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                <Zap className="w-4 h-4 text-green-500" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-white">Fast Gen</div>
                                <div className="text-[10px] text-white/50">0.8s latency</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
          </div>
          
        </div>
      </div>
    </section>
  );
}